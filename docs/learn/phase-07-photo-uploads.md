# Phase 07: Photo upload pipeline

## What exists now

On **Sell** (step 1), a farmer taps **Take photo** (the phone camera opens) or **Choose from gallery**, up to 5 photos. Each photo:

1. is shrunk on the phone (7.6 MB → about 195 KB, and GPS removed);
2. uploads with a progress bar, retrying automatically if the network hiccups;
3. if there is no internet, waits on the phone ("Waiting for internet") and uploads by itself once the connection is back, even after closing and reopening the app.

On the server, every photo is checked to be a real image, has its metadata removed again, is resized, gets a thumbnail, and is fingerprinted to spot the same photo being reused by another farmer.

## Data flow

```
Phone: file -> createImageBitmap (upright) -> canvas 1280px -> JPEG <=300KB -> IndexedDB draft
   online? -> XHR POST /api/v1/uploads/photos (progress) ---------------------------------+
   offline? -> stays "waiting" -> 'online' event -> upload                                  |
Server: multer (<=8MB) -> sharp decode (JPEG/PNG/WebP only, <=50MP) -> rotate -> strip     <-+
        metadata -> 1280px JPEG + 320px WebP -> storage (local disk / Cloudinary)
        -> 64-bit dHash -> compare with other farmers' photos -> MediaAsset { pending }
Later: Prompt 8 attaches assets to a listing; unattached ones are deleted after 24 h.
```

## Key design decisions

| Decision | Why |
| --- | --- |
| Compress on the phone **and** re-encode on the server | Saves the farmer's data; the server copy is guaranteed metadata-free even if a client is broken. |
| Validate by decoding, not by file name | A `.jpg` name or `Content-Type` can be faked; sharp decodes the real bytes. SVG (scripts) and decompression bombs are rejected. |
| Server-side processing, Cloudinary for storage | One trusted place for checks; the API secret never reaches the browser. |
| Storage interface (local / Cloudinary) | Local disk in development; production refuses it because Render wipes the disk on deploy. |
| Perceptual hash with indexed bands | Finds the same photo even after resizing, without comparing against every photo ever uploaded. |
| Native camera input | Works on cheap phones with no extra permission prompt. |
| IndexedDB queue storing ArrayBuffers | Survives offline and app restarts; ArrayBuffers work on older iOS Safari where Blobs fail. |
| XHR for uploads | `fetch` can't report upload progress. |

## Verified in a real browser (real backend and MongoDB, 360px)

- A 7.6 MB photo carrying camera metadata became 195 KB at 1280×960 in the browser, and the metadata was gone. The server stored 159 KB.
- An offline photo showed "Waiting for internet" plus the explanation, then uploaded automatically after reconnecting.
- There was no sideways overflow in English, Telugu or Hindi. The Telugu header title, previously squeezed to a few letters, now has its own line.

## Try it yourself

```bash
cd backend && npm run dev          # STORAGE_PROVIDER=local, photos land in backend/uploads/
cd frontend && npm run dev
```

1. Log in as `9999900011` / `123456`, then tap Sell and add a photo.
2. In DevTools → Network, set **Offline** and add another photo: it shows "Waiting for internet". Switch back online and it uploads.
3. `db.mediaassets.find()` shows the stored record (no GPS, a fingerprint, `status: 'pending'`).

## 5 likely interview questions

1. **How do you stop location leaking from farm photos?**
   Twice. The phone redraws the photo on a canvas, which keeps only pixels, so EXIF including GPS is dropped. Then the server re-encodes with sharp, which writes no metadata unless asked. A test uploads a JPEG with GPS EXIF and checks that the stored file has none.

2. **How do you validate uploads safely?**
   I never trust the file name or the browser's content type. Multer caps the body at 8 MB, and sharp then decodes the bytes. Only JPEG, PNG and WebP pass; SVG is rejected because it can contain scripts. A 50-megapixel limit blocks decompression bombs, and file names are random UUIDs generated on the server.

3. **What is a perceptual hash and how do you search it efficiently?**
   A difference hash shrinks the image to 9×8 greys and stores 64 bits saying whether each pixel is darker than its neighbour. Visually identical images, even resized or recompressed, differ in only a few bits. To avoid comparing with every photo, I split the hash into four 16-bit bands with an index. Candidates must share a band, and then I compute the exact Hamming distance. By the pigeonhole principle, anything within 3 bits always shares a band.

4. **How does the offline upload work?**
   The compressed photo is saved in IndexedDB as an ArrayBuffer with status "waiting". A hook listens for the browser's `online` event and also checks on page load, then uploads waiting photos with retries. On success only the server's asset id is kept. I store ArrayBuffers rather than Blobs because older iOS Safari couldn't store Blobs in IndexedDB.

5. **Why upload through your server instead of directly to Cloudinary?**
   One trusted place does validation, metadata stripping, thumbnails and fingerprinting, and the Cloudinary secret stays on the server. The cost is server bandwidth, but photos are already about 200 KB after phone compression. Direct signed upload would save bandwidth but move those guarantees out of our code.
