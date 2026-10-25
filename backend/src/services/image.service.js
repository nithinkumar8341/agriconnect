import sharp from 'sharp';
import { AppError } from '../utils/AppError.js';

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);
// A 50-megapixel cap: real phone cameras go up to about 50 MP (the app compresses before upload
// anyway), and the cap stops "decompression bombs" (tiny files that expand to gigabytes in memory).
const MAX_INPUT_PIXELS = 50_000_000;
export const FULL_MAX_EDGE = 1280;
export const THUMB_MAX_EDGE = 320;

const invalidImage = () =>
  new AppError(400, 'INVALID_IMAGE', 'This file is not a photo we can use (JPEG, PNG or WebP).');

function open(buffer) {
  return sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' });
}

// Difference hash: shrink to 9x8 greys and record whether each pixel is darker than its right
// neighbour. Resizing, re-compressing or small colour changes barely change the 64 bits.
async function differenceHash(buffer) {
  const pixels = await open(buffer)
    .rotate()
    .greyscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer();
  let bits = 0n;
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const left = pixels[row * 9 + col];
      const right = pixels[row * 9 + col + 1];
      bits = (bits << 1n) | (left < right ? 1n : 0n);
    }
  }
  return bits.toString(16).padStart(16, '0');
}

export function hammingDistance(hashA, hashB) {
  let diff = BigInt(`0x${hashA}`) ^ BigInt(`0x${hashB}`);
  let count = 0;
  while (diff > 0n) {
    count += Number(diff & 1n);
    diff >>= 1n;
  }
  return count;
}

export const hashBands = (hash) => [0, 4, 8, 12].map((i) => `${i / 4}:${hash.slice(i, i + 4)}`);

// Verifies the bytes are really an allowed image (by decoding, never by trusting the file name or
// the browser's content type), then produces a full-size JPEG and a WebP thumbnail. sharp drops
// all metadata unless told to keep it, so EXIF (including GPS location) never reaches storage;
// rotate() first applies the EXIF orientation so the photo is still the right way up.
export async function processPhoto(buffer) {
  let metadata;
  try {
    metadata = await open(buffer).metadata();
  } catch {
    throw invalidImage();
  }
  if (!ALLOWED_FORMATS.has(metadata.format)) throw invalidImage();

  try {
    const { data: full, info } = await open(buffer)
      .rotate()
      .resize({
        width: FULL_MAX_EDGE,
        height: FULL_MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    const thumbnail = await open(buffer)
      .rotate()
      .resize({
        width: THUMB_MAX_EDGE,
        height: THUMB_MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 70 })
      .toBuffer();
    const perceptualHash = await differenceHash(buffer);
    return { full, thumbnail, width: info.width, height: info.height, perceptualHash };
  } catch {
    // Truncated or corrupt files that passed the header check fail here.
    throw invalidImage();
  }
}
