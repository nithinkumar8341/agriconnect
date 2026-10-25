import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Development storage: files under UPLOAD_DIR, served by the app at /uploads. Keys are generated
// by the server (never taken from the request), and the resolved path is checked to stay inside
// the upload directory anyway.
export class LocalDiskStorage {
  constructor({ uploadDir }) {
    this.root = path.resolve(uploadDir);
    this.provider = 'local';
  }

  resolve(key) {
    const target = path.resolve(this.root, key);
    if (!target.startsWith(this.root + path.sep)) throw new Error('Storage key escapes upload dir');
    return target;
  }

  async put({ key, buffer }) {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, buffer);
    return { url: `/uploads/${key}` };
  }

  async remove(key) {
    await rm(this.resolve(key), { force: true });
  }
}
