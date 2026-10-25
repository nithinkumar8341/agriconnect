// Phone photos are 3-8 MB. Before upload they are resized and re-encoded on the phone, which
// (a) saves the farmer's mobile data and (b) drops EXIF metadata, including GPS location, because
// a canvas only carries pixels. The server strips metadata again; this is the first line.

export const MAX_EDGE = 1280;
export const TARGET_BYTES = 300 * 1024;
const QUALITIES = [0.82, 0.72, 0.62, 0.52, 0.42];
const SHRINK_STEP = 0.8;
const MIN_EDGE = 480;

export class CompressionError extends Error {
  constructor() {
    super('This photo could not be read');
    this.code = 'PHOTO_UNREADABLE';
  }
}

// Pure search for the best size/quality, separated from the browser APIs so it can be tested.
// encode(edge, quality) must resolve to a Blob of the image with its long side = edge.
export async function findSmallEnough(encode, { startEdge, target = TARGET_BYTES }) {
  let edge = startEdge;
  let last = null;
  while (edge >= MIN_EDGE) {
    for (const quality of QUALITIES) {
      last = { blob: await encode(edge, quality), edge, quality };
      if (last.blob.size <= target) return last;
    }
    edge = Math.round(edge * SHRINK_STEP);
  }
  // Very detailed photos may never reach the target; the smallest attempt is still far below
  // the server's 8 MB limit.
  return last;
}

function makeCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function canvasToJpeg(canvas, quality) {
  if (canvas.convertToBlob) return canvas.convertToBlob({ type: 'image/jpeg', quality });
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

export async function compressImage(file) {
  let bitmap;
  try {
    // from-image applies the EXIF orientation, so sideways phone photos come out upright.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new CompressionError();
  }
  const longEdge = Math.max(bitmap.width, bitmap.height);
  const encode = async (edge, quality) => {
    const scale = Math.min(1, edge / longEdge);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = makeCanvas(width, height);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    return canvasToJpeg(canvas, quality);
  };
  try {
    const { blob } = await findSmallEnough(encode, { startEdge: Math.min(MAX_EDGE, longEdge) });
    return blob;
  } finally {
    bitmap.close?.();
  }
}
