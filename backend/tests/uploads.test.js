import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createLogger } from '../src/config/logger.js';
import { syncAllIndexes } from '../src/models/index.js';
import { MediaAsset } from '../src/models/MediaAsset.js';
import { User } from '../src/models/User.js';
import { hammingDistance, hashBands } from '../src/services/image.service.js';
import { createMediaService } from '../src/services/media.service.js';
import { createSessionService } from '../src/services/session.service.js';
import { LocalDiskStorage } from '../src/services/storage/LocalDiskStorage.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';
import { testConfig } from './helpers/testConfig.js';

const config = testConfig();
const logger = createLogger(config);
const sessionService = createSessionService({ config, logger });

// A blocky "photo": a small random grid scaled up, so it has real structure (unlike a flat colour)
// and keeps the same fingerprint when re-encoded. Different seeds give unrelated images.
function blockyImage(seed, { width = 1600, height = 1200 } = {}) {
  let state = seed;
  const random = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state % 256;
  };
  const grid = Buffer.alloc(16 * 12 * 3);
  for (let i = 0; i < grid.length; i += 1) grid[i] = random();
  return sharp(grid, { raw: { width: 16, height: 12, channels: 3 } }).resize(width, height, {
    kernel: 'nearest',
  });
}

const jpeg = (seed, options) => blockyImage(seed, options).jpeg({ quality: 90 }).toBuffer();

describe('photo uploads', () => {
  let app;
  let uploadDir;
  let storage;
  let users;
  const as = (user) => ({
    Authorization: `Bearer ${sessionService.issueAccessToken(user, 'family')}`,
  });
  const upload = (user, buffer, { filename = 'photo.jpg', capturedAt } = {}) => {
    const req = request(app).post('/api/v1/uploads/photos').set(as(user));
    if (capturedAt) req.field('capturedAt', capturedAt);
    return buffer ? req.attach('photo', buffer, filename) : req.field('nothing', 'here');
  };
  const storedFiles = async () =>
    (await readdir(uploadDir, { recursive: true })).filter((f) => /\.\w+$/.test(f));

  beforeAll(async () => {
    await connectTestDb('uploads-test');
    await syncAllIndexes();
    uploadDir = await mkdtemp(path.join(os.tmpdir(), 'agc-uploads-'));
    storage = new LocalDiskStorage({ uploadDir });
    app = createApp(config, { logger, storage });
  });
  afterAll(async () => {
    await dropTestDbAndDisconnect();
    await rm(uploadDir, { recursive: true, force: true });
  });
  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), MediaAsset.deleteMany({})]);
    const [farmer, otherFarmer, agent, buyer] = await User.create([
      { phone: '+919000000001', role: 'farmer' },
      { phone: '+919000000002', role: 'farmer' },
      { phone: '+919000000003', role: 'agent' },
      { phone: '+919000000004', role: 'buyer' },
    ]);
    users = { farmer, otherFarmer, agent, buyer };
  });

  it('stores a resized JPEG and a WebP thumbnail and returns their URLs', async () => {
    const res = await upload(users.farmer, await jpeg(1), {
      capturedAt: '2026-10-25T06:30:00.000Z',
    });

    expect(res.status).toBe(201);
    expect(res.body.asset).toMatchObject({
      url: expect.stringMatching(/^\/uploads\/photos\/\d{4}-\d{2}\/[0-9a-f-]{36}\.jpg$/),
      thumbnailUrl: expect.stringMatching(/-thumb\.webp$/),
      width: 1280,
      height: 960,
      capturedAt: '2026-10-25T06:30:00.000Z',
      status: 'pending',
    });

    const full = await request(app).get(res.body.asset.url);
    expect(full.status).toBe(200);
    expect(full.headers['content-type']).toBe('image/jpeg');
    expect(full.headers['x-content-type-options']).toBe('nosniff');
    const thumb = await sharp(
      (await request(app).get(res.body.asset.thumbnailUrl)).body,
    ).metadata();
    expect(thumb).toMatchObject({ format: 'webp', width: 320, height: 240 });
  });

  it('removes GPS location and all other metadata', async () => {
    const withGps = await blockyImage(2)
      .jpeg()
      .withExif({
        IFD0: { Make: 'TestPhone', Model: 'Farm Cam' },
        IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '16/1 26/1 18/1', GPSLongitudeRef: 'E' },
      })
      .toBuffer();
    expect((await sharp(withGps).metadata()).exif).toBeDefined();

    const res = await upload(users.farmer, withGps);
    const stored = (await request(app).get(res.body.asset.url)).body;

    const metadata = await sharp(stored).metadata();
    expect(metadata.exif).toBeUndefined();
    expect(stored.includes(Buffer.from('TestPhone'))).toBe(false);
  });

  it('turns sideways phone photos the right way up using the EXIF orientation', async () => {
    const sideways = await blockyImage(3, { width: 400, height: 200 })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const res = await upload(users.farmer, sideways);

    expect(res.body.asset).toMatchObject({ width: 200, height: 400 });
  });

  it.each([
    ['plain text renamed to .jpg', () => Buffer.from('definitely not an image'), 'photo.jpg'],
    [
      'an SVG (could carry scripts)',
      () => Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'),
      'photo.svg',
    ],
    ['a GIF', () => blockyImage(4, { width: 50, height: 50 }).gif().toBuffer(), 'photo.gif'],
    ['a truncated JPEG', async () => (await jpeg(5)).subarray(0, 2000), 'photo.jpg'],
  ])('rejects %s by decoding it, not trusting the name', async (_label, makeBuffer, filename) => {
    const res = await upload(users.farmer, await makeBuffer(), { filename });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_IMAGE');
    expect(await MediaAsset.countDocuments()).toBe(0);
  });

  it('rejects a "decompression bomb" (small file, huge pixel count)', async () => {
    const bomb = await sharp({
      create: { width: 10000, height: 6000, channels: 3, background: { r: 0, g: 90, b: 0 } },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();
    expect(bomb.length).toBeLessThan(1_000_000);

    const res = await upload(users.farmer, bomb, { filename: 'photo.png' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_IMAGE');
  });

  it('rejects files over 8 MB before processing them', async () => {
    const res = await upload(users.farmer, Buffer.alloc(9 * 1024 * 1024, 1));

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('requires a photo and a sensible capture time', async () => {
    expect((await upload(users.farmer, null)).body.error.code).toBe('PHOTO_REQUIRED');

    const future = await upload(users.farmer, await jpeg(6), { capturedAt: '2099-01-01' });
    expect(future.status).toBe(400);
    expect(future.body.error.details[0].field).toBe('body.capturedAt');
  });

  it('lets farmers and agents upload, nobody else', async () => {
    expect((await upload(users.agent, await jpeg(7))).status).toBe(201);
    expect((await upload(users.buyer, await jpeg(8))).status).toBe(403);
    const anonymous = await request(app)
      .post('/api/v1/uploads/photos')
      .attach('photo', await jpeg(9), 'photo.jpg');
    expect(anonymous.status).toBe(401);
  });

  describe('duplicate photos across farmers', () => {
    it('flags the same photo uploaded again by another farmer, even resized and recompressed', async () => {
      const original = await upload(users.farmer, await jpeg(10));
      const reused = await blockyImage(10, { width: 900, height: 675 })
        .jpeg({ quality: 55 })
        .toBuffer();

      const res = await upload(users.otherFarmer, reused);

      const asset = await MediaAsset.findById(res.body.asset.id);
      expect(asset.duplicateOf).toMatchObject({
        ownerId: users.farmer._id,
        distance: expect.any(Number),
      });
      expect(asset.duplicateOf.assetId.toString()).toBe(original.body.asset.id);
      expect(asset.duplicateOf.distance).toBeLessThanOrEqual(6);
    });

    it('does not flag a farmer re-using their own photo, or a genuinely different photo', async () => {
      await upload(users.farmer, await jpeg(11));

      const ownAgain = await upload(users.farmer, await jpeg(11));
      const different = await upload(users.otherFarmer, await jpeg(12));

      expect((await MediaAsset.findById(ownAgain.body.asset.id)).duplicateOf).toBeNull();
      expect((await MediaAsset.findById(different.body.asset.id)).duplicateOf).toBeNull();
    });

    it('never tells the uploader about the match (the evidence is for admins only)', async () => {
      await upload(users.farmer, await jpeg(13));
      const res = await upload(users.otherFarmer, await jpeg(13));

      expect(res.body.asset).not.toHaveProperty('duplicateOf');
      expect(JSON.stringify(res.body)).not.toContain(users.farmer._id.toString());
    });
  });

  describe('deleting and cleaning up', () => {
    it('lets the owner delete an unused photo, files included', async () => {
      const res = await upload(users.farmer, await jpeg(14));
      const before = (await storedFiles()).length;

      const removed = await request(app)
        .delete(`/api/v1/uploads/photos/${res.body.asset.id}`)
        .set(as(users.farmer));

      expect(removed.status).toBe(204);
      expect((await storedFiles()).length).toBe(before - 2);
      expect(await MediaAsset.countDocuments()).toBe(0);
    });

    it("answers 404 for someone else's photo and 409 for a photo on a listing", async () => {
      const res = await upload(users.farmer, await jpeg(15));
      const del = (user) =>
        request(app).delete(`/api/v1/uploads/photos/${res.body.asset.id}`).set(as(user));

      expect((await del(users.otherFarmer)).status).toBe(404);
      await MediaAsset.updateOne({ _id: res.body.asset.id }, { status: 'attached' });
      expect((await del(users.farmer)).body.error.code).toBe('PHOTO_IN_USE');
    });

    it('removes photos never attached to a listing after a day, keeping attached ones', async () => {
      const mediaService = createMediaService({ storage, logger });
      const stale = await upload(users.farmer, await jpeg(16));
      const attached = await upload(users.farmer, await jpeg(17));
      const fresh = await upload(users.farmer, await jpeg(18));
      const dayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
      await MediaAsset.collection.updateMany(
        {
          _id: {
            $in: [stale, attached].map((r) => MediaAsset.castObject({ _id: r.body.asset.id })._id),
          },
        },
        { $set: { createdAt: dayAgo } },
      );
      await MediaAsset.updateOne({ _id: attached.body.asset.id }, { status: 'attached' });

      expect(await mediaService.cleanupPendingPhotos()).toBe(1);
      const left = (await MediaAsset.find()).map((a) => a._id.toString()).sort();
      expect(left).toEqual([attached.body.asset.id, fresh.body.asset.id].sort());
      expect((await request(app).get(stale.body.asset.url)).status).toBe(404);
    });
  });
});

describe('perceptual hash helpers', () => {
  it('counts differing bits and splits the hash into four indexed bands', () => {
    expect(hammingDistance('0000000000000000', '0000000000000000')).toBe(0);
    expect(hammingDistance('0000000000000000', '000000000000000f')).toBe(4);
    expect(hammingDistance('ffffffffffffffff', '0000000000000000')).toBe(64);
    expect(hashBands('0123456789abcdef')).toEqual(['0:0123', '1:4567', '2:89ab', '3:cdef']);
  });
});
