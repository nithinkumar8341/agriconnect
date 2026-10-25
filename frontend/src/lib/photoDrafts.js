import { openDB } from 'idb';

// Photos for a listing that is still being made, kept on the phone in IndexedDB. A photo taken
// with no signal waits here (with its image) until the phone is back online; an uploaded one keeps
// only the server's asset, so the draft survives closing the app until the listing is published.
// Record: { id, status: 'waiting' | 'uploaded', blob?, asset?, capturedAt, createdAt }

const DB_NAME = 'agriconnect';
const STORE = 'photoDrafts';

let dbPromise;
function db() {
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(database) {
      database.createObjectStore(STORE, { keyPath: 'id' });
    },
  });
  return dbPromise;
}

// Images are stored as raw bytes rather than Blob objects: some browsers (older iOS Safari in
// particular) fail to store Blobs in IndexedDB, while ArrayBuffers work everywhere.
async function toStored({ blob, ...draft }) {
  if (!blob) return draft;
  return { ...draft, image: { bytes: await blob.arrayBuffer(), type: blob.type } };
}

function fromStored({ image, ...draft }) {
  return image ? { ...draft, blob: new Blob([image.bytes], { type: image.type }) } : draft;
}

export async function listDrafts() {
  const all = await (await db()).getAll(STORE);
  return all.map(fromStored).sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveDraft(draft) {
  await (await db()).put(STORE, await toStored(draft));
}

export async function deleteDraft(id) {
  await (await db()).delete(STORE, id);
}

// For tests: forget the cached connection so a fresh fake database is used.
export async function resetDraftsForTests() {
  if (dbPromise) (await dbPromise).close();
  dbPromise = undefined;
}
