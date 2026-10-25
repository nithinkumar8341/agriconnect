# ADR 0008: Photo upload pipeline

- Status: accepted (owner approved the recommended option for all three choices)
- Date: 2026-10-25

## 1. Photos go through our server, not straight from the phone to Cloudinary

**Path:** phone → `POST /uploads/photos` → sharp processing → storage.

**What the server does in one trusted place:**
- checks the file really is an image;
- removes all metadata, including GPS;
- fixes the orientation;
- makes the thumbnail;
- computes the duplicate fingerprint.

The Cloudinary secret never leaves the server.

**Cost:** about 200 KB of server bandwidth per photo. The phone has already compressed it.

**Alternative rejected:** signed direct upload. It would make metadata stripping and fingerprinting depend on Cloudinary-side features, and would put validation outside our code.

## 2. Two layers of compression and metadata stripping

- **The phone:** re-encodes through a canvas to at most 1280 px and ≤ 300 KB. This saves the farmer's data, and a canvas carries pixels only, so EXIF is dropped.
- **The server:** re-encodes again with sharp, which keeps no metadata by default. A modified or broken client can't leak a farm's GPS location.

**Measured** in a real browser: 7.6 MB → 195 KB; the server copy is 159 KB.

## 3. Validation by decoding, not by name or type

The file extension and the browser's `Content-Type` are ignored. sharp decodes the bytes, and only `jpeg`, `png` and `webp` are accepted.

**Rejected:**
- **SVG** (could carry scripts) and GIF;
- truncated files;
- **anything over 50 megapixels**, which stops decompression bombs: a 10,000×6,000 PNG compresses to a few KB but would need gigabytes to decode.

Multer stops bodies over 8 MB before decoding starts.

## 4. Storage behind an interface

`LocalDiskStorage` (development) and `CloudinaryStorage` (production) both implement `put` and `remove`, the same pattern as the SMS provider.

- **Keys** are generated on the server (UUIDs), and the local store also checks the resolved path stays inside the upload folder.
- **Production config refuses local disk:** Render wipes the disk on every deploy.

## 5. Duplicate photos: difference hash plus band pre-filter

**The fingerprint** is a 64-bit difference hash: the image is shrunk to 9×8 greys, and each bit records whether a pixel is darker than its right neighbour. Resizing and recompression change only a few bits.

**Finding near-duplicates:**
- The hash is split into 4 indexed 16-bit bands. Candidates must share at least one band, then the exact Hamming distance is checked against `duplicatePhotoMaxDistance` (AppConfig, default 6).
- **Limit:** any photo within 3 bits is guaranteed to share a band (pigeonhole principle). A match at 4–6 bits can be missed if all four bands changed. That's an accepted trade-off for an indexed query at scale.

**Scope:** only **other** farmers' photos are compared. Re-using your own photo is normal.

**Use:** the match is stored as evidence and never blocks the upload. Prompt 13's rules decide what happens.

## 6. Native camera, not an in-app viewfinder

`<input type="file" accept="image/*" capture="environment">` opens the phone's own camera app. It's reliable on cheap Android phones, needs no camera-permission prompt, and has no battery cost while the page is open. The gallery button is the same input without `capture`.

## 7. Offline queue in IndexedDB, stored as ArrayBuffers

**What the queue does:**
- A photo taken without signal is saved in IndexedDB (`agriconnect/photoDrafts`) with the status "waiting".
- It uploads automatically on the `online` event, or when the Sell screen opens again.
- After upload, only the server's asset reference is kept, so drafts survive closing the app until the listing is published.

**Storage format:** images are stored as `ArrayBuffer` plus type rather than as `Blob`. Older iOS Safari versions fail to store Blobs in IndexedDB.

## 8. XHR for uploads

`fetch` can't report upload progress. `api.upload()` uses XMLHttpRequest, with the same token refresh, error shape and cancellation as the rest of the client.

## 9. Retry policy

**Automatic retries:** up to 2 (after 1 s and 3 s), only for retryable errors: network failures, 5xx and rate limiting.

**No retry for:** invalid images (retrying won't help), or when the phone is offline (the photo goes back to "waiting"). After the automatic retries, the person gets a "Try again" button.
