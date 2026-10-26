import { useCallback, useEffect, useRef, useState } from 'react';
import { compressImage } from '../lib/imageCompression.js';
import { deleteDraft, listDrafts, saveDraft } from '../lib/photoDrafts.js';
import { useOnlineStatus } from './useOnlineStatus.js';

export const MAX_PHOTOS = 5;
// Waits between automatic attempts; after these the person gets a "Try again" button.
const RETRY_DELAYS_MS = [1000, 3000];
const RETRYABLE = new Set(['NETWORK_ERROR', 'RATE_LIMITED', 'INTERNAL_ERROR', 'HTTP_ERROR']);
const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// photo.status: preparing -> uploading -> uploaded, or waiting (no internet, kept on the phone and
// sent automatically when back online), or failed (with a code and a manual retry).
export function usePhotoUploads({ client, compress = compressImage, sleep = defaultSleep }) {
  const online = useOnlineStatus();
  const [photos, setPhotos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const drafts = useRef(new Map());
  const inFlight = useRef(new Set());

  const update = useCallback((id, changes) => {
    setPhotos((current) => current.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  }, []);

  const uploadDraft = useCallback(
    async (draft) => {
      if (inFlight.current.has(draft.id)) return;
      inFlight.current.add(draft.id);
      update(draft.id, { status: 'uploading', progress: 0, errorCode: null });
      try {
        for (let attempt = 0; ; attempt += 1) {
          try {
            const form = new FormData();
            form.append('photo', draft.blob, 'photo.jpg');
            if (draft.capturedAt)
              form.append('capturedAt', new Date(draft.capturedAt).toISOString());
            const { asset } = await client.upload('/uploads/photos', form, {
              onProgress: (progress) => update(draft.id, { progress }),
            });
            const uploaded = { ...draft, status: 'uploaded', asset, blob: undefined };
            drafts.current.set(draft.id, uploaded);
            // The image itself is no longer needed on the phone, only the server's reference.
            await saveDraft(uploaded);
            update(draft.id, { status: 'uploaded', progress: 1, asset });
            return;
          } catch (err) {
            if (err.code === 'NETWORK_ERROR' && !navigator.onLine) {
              update(draft.id, { status: 'waiting' });
              return;
            }
            if (RETRYABLE.has(err.code) && attempt < RETRY_DELAYS_MS.length) {
              await sleep(RETRY_DELAYS_MS[attempt]);
              continue;
            }
            update(draft.id, { status: 'failed', errorCode: err.code ?? 'HTTP_ERROR' });
            return;
          }
        }
      } finally {
        inFlight.current.delete(draft.id);
      }
    },
    [client, sleep, update],
  );

  // Restore photos from an earlier visit (including ones taken offline).
  useEffect(() => {
    let active = true;
    listDrafts().then((stored) => {
      if (!active) return;
      for (const draft of stored) drafts.current.set(draft.id, draft);
      const restored = stored.map((draft) => ({
        id: draft.id,
        status: draft.status === 'uploaded' ? 'uploaded' : 'waiting',
        progress: draft.status === 'uploaded' ? 1 : 0,
        asset: draft.asset ?? null,
        previewUrl: draft.asset?.thumbnailUrl ?? URL.createObjectURL(draft.blob),
        errorCode: null,
      }));
      // Merge rather than replace: a photo taken before this read finished must not vanish.
      const restoredIds = new Set(restored.map((photo) => photo.id));
      setPhotos((current) => [
        ...restored,
        ...current.filter((photo) => !restoredIds.has(photo.id)),
      ]);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Whenever the phone is online, send everything that was waiting.
  useEffect(() => {
    if (!online || !loaded) return;
    for (const draft of drafts.current.values()) {
      if (draft.status === 'waiting') uploadDraft(draft);
    }
  }, [online, loaded, uploadDraft]);

  async function add(files) {
    const room = MAX_PHOTOS - photos.length;
    for (const file of [...files].slice(0, Math.max(0, room))) {
      const id = crypto.randomUUID();
      setPhotos((current) => [
        ...current,
        { id, status: 'preparing', progress: 0, asset: null, previewUrl: null, errorCode: null },
      ]);
      let blob;
      try {
        blob = await compress(file);
      } catch (err) {
        update(id, {
          status: 'failed',
          errorCode: err.code ?? 'PHOTO_UNREADABLE',
          unreadable: true,
        });
        continue;
      }
      const draft = {
        id,
        status: 'waiting',
        blob,
        capturedAt: file.lastModified ? new Date(file.lastModified).toISOString() : null,
        createdAt: Date.now(),
      };
      drafts.current.set(id, draft);
      await saveDraft(draft);
      update(id, { status: 'waiting', previewUrl: URL.createObjectURL(blob) });
      if (navigator.onLine) uploadDraft(draft);
    }
  }

  function retry(id) {
    const draft = drafts.current.get(id);
    if (draft?.blob) uploadDraft(draft);
  }

  async function remove(id) {
    const draft = drafts.current.get(id);
    const photo = photos.find((p) => p.id === id);
    if (draft?.asset) {
      // Already gone on the server (404) is fine; anything else is tried again by cleanup later.
      await client.delete(`/uploads/photos/${draft.asset.id}`).catch(() => {});
    }
    if (photo?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(photo.previewUrl);
    drafts.current.delete(id);
    await deleteDraft(id);
    setPhotos((current) => current.filter((p) => p.id !== id));
  }

  // After publishing: the photos now belong to the listing, so only the phone's drafts are
  // forgotten (the server copies must stay).
  async function clearAll() {
    for (const photo of photos) {
      if (photo.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(photo.previewUrl);
      await deleteDraft(photo.id);
    }
    drafts.current.clear();
    setPhotos([]);
  }

  return {
    photos,
    clearAll,
    // True with no photos too: a listing's own photo is optional (the stock photo is used).
    allUploaded: loaded && photos.every((p) => p.status === 'uploaded'),
    loaded,
    canAddMore: photos.length < MAX_PHOTOS,
    uploadedAssets: photos.filter((p) => p.status === 'uploaded').map((p) => p.asset),
    add,
    retry,
    remove,
  };
}
