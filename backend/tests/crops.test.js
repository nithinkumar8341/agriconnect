import request from 'supertest';
import { createApp } from '../src/app.js';
import { Crop } from '../src/models/Crop.js';
import { CROPS } from '../src/seeds/crops.data.js';
import { seedCrops } from '../src/seeds/seedCrops.js';
import { clearCropCache } from '../src/services/crops.service.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';
import { testConfig } from './helpers/testConfig.js';

describe('crop catalog API', () => {
  const app = createApp(testConfig());
  const list = (query = '') => request(app).get(`/api/v1/crops${query}`);

  beforeAll(async () => {
    await connectTestDb('crops-test');
    await seedCrops();
    await Crop.updateOne({ slug: 'jamun' }, { isActive: false });
  });
  afterAll(() => dropTestDbAndDisconnect());
  beforeEach(() => clearCropCache());

  it('lists active crops alphabetically with everything the listing flow needs', async () => {
    const res = await list();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, limit: 100, total: CROPS.length - 1 });
    const names = res.body.items.map((c) => c.names.en);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(res.body.items.find((c) => c.slug === 'tomato')).toEqual({
      slug: 'tomato',
      names: { en: 'Tomato', te: 'టమాటా', hi: 'टमाटर' },
      category: 'vegetable',
      defaultUnit: 'kg',
      allowedUnits: ['kg'],
      quantityPresets: [10, 25, 50, 100],
      quantityStep: 0.5,
      shelfLifeDays: 5,
      image: '/crops/tomato.jpg',
    });
  });

  it('hides inactive crops', async () => {
    const res = await list('?search=jamun');

    expect(res.body.total).toBe(0);
  });

  it.each([
    ['English, any case', 'TOMATO', 'tomato'],
    ['Telugu', 'టమా', 'tomato'],
    ['Hindi', 'टमा', 'tomato'],
    ['the slug', 'green-chilli', 'green-chilli'],
  ])('searches by %s', async (_label, search, slug) => {
    const res = await list(`?search=${encodeURIComponent(search)}`);

    expect(res.body.items.map((c) => c.slug)).toContain(slug);
  });

  it('puts names that start with the search before names that merely contain it', async () => {
    const res = await list('?search=gourd');
    const startsWithGourd = res.body.items.findIndex((c) => c.names.en.startsWith('Gourd'));
    expect(startsWithGourd).toBe(-1);

    const beans = await list('?search=bean');
    expect(beans.body.items[0].names.en).toMatch(/^Bean|^Broad|^Cluster|^French/);

    const chilli = await list('?search=ch');
    const firstNonPrefix = chilli.body.items.findIndex(
      (c) =>
        ![c.names.en, c.names.te, c.names.hi, c.slug].some((n) => n.toLowerCase().startsWith('ch')),
    );
    const lastPrefix = chilli.body.items.findLastIndex((c) =>
      [c.names.en, c.names.te, c.names.hi, c.slug].some((n) => n.toLowerCase().startsWith('ch')),
    );
    expect(firstNonPrefix === -1 || lastPrefix < firstNonPrefix).toBe(true);
  });

  it('treats regex special characters as plain text', async () => {
    // Expected = crops whose names literally contain the text ("(" appears in "Okra (Ladies finger)").
    const literalMatches = (text) =>
      CROPS.filter(
        (c) =>
          c.slug !== 'jamun' &&
          [c.names.en, c.names.te, c.names.hi, c.slug].some((n) => n.toLowerCase().includes(text)),
      ).length;

    for (const search of ['.*', '(', '[a-z]+', '\\']) {
      const res = await list(`?search=${encodeURIComponent(search)}`);
      expect({ search, status: res.status, total: res.body.total }).toEqual({
        search,
        status: 200,
        total: literalMatches(search),
      });
    }
    expect(literalMatches('(')).toBeGreaterThan(0);
    expect(literalMatches('.*')).toBe(0);
  });

  it('filters by category', async () => {
    const res = await list('?category=leafy');

    expect(res.body.items.length).toBeGreaterThan(5);
    expect(new Set(res.body.items.map((c) => c.category))).toEqual(new Set(['leafy']));
  });

  it('paginates', async () => {
    const first = await list('?limit=10&page=1');
    const second = await list('?limit=10&page=2');

    expect(first.body.items).toHaveLength(10);
    expect(second.body.items[0].slug).not.toBe(first.body.items[0].slug);
    expect(second.body).toMatchObject({ page: 2, limit: 10, total: CROPS.length - 1 });
  });

  it('rejects bad queries', async () => {
    for (const query of ['?category=meat', '?limit=500', '?page=0', `?search=${'x'.repeat(51)}`]) {
      const res = await list(query);
      expect({ query, status: res.status }).toEqual({ query, status: 400 });
    }
  });

  it('is cacheable and answers 304 when the client copy is current', async () => {
    const first = await list();
    expect(first.headers['cache-control']).toBe('public, max-age=3600');
    expect(first.headers.etag).toBeDefined();

    const revalidated = await list().set('If-None-Match', first.headers.etag);

    expect(revalidated.status).toBe(304);
    expect(revalidated.text).toBe('');
  });

  it('serves the in-memory catalog without querying MongoDB again', async () => {
    await list();
    await Crop.updateOne({ slug: 'tomato' }, { 'names.en': 'Changed' });

    const cached = await list('?search=tomato');
    clearCropCache();
    const fresh = await list('?search=changed');

    expect(cached.body.items[0].names.en).toBe('Tomato');
    expect(fresh.body.items[0].slug).toBe('tomato');
    await Crop.updateOne({ slug: 'tomato' }, { 'names.en': 'Tomato' });
  });

  it('returns one crop by slug, or 404', async () => {
    const found = await request(app).get('/api/v1/crops/gongura');
    const missing = await request(app).get('/api/v1/crops/dragon-fruit');
    const invalid = await request(app).get('/api/v1/crops/Not_A_Slug');

    expect(found.body.crop.names.te).toBe('గోంగూర');
    expect(missing.status).toBe(404);
    expect(invalid.status).toBe(400);
  });
});
