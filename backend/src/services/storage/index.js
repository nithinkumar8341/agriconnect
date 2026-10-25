import { CloudinaryStorage } from './CloudinaryStorage.js';
import { LocalDiskStorage } from './LocalDiskStorage.js';

// Every storage implements: put({ key, buffer, contentType }) -> { url }, and remove(key).
export function createStorage(storageConfig) {
  if (storageConfig.provider === 'cloudinary')
    return new CloudinaryStorage(storageConfig.cloudinary);
  return new LocalDiskStorage({ uploadDir: storageConfig.uploadDir });
}
