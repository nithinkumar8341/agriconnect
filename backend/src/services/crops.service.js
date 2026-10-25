import { Crop } from '../models/Crop.js';

// The catalog is small (about 60 rows) and changes only when seed:crops runs, so the active list
// is kept in memory and searched in JavaScript: no database round trip per keystroke, and no
// user text ever becomes a database regex.
const CACHE_TTL_MS = 10 * 60 * 1000;
let cache = { loadedAt: 0, crops: [] };

export function toPublicCrop(crop) {
  return {
    slug: crop.slug,
    names: { en: crop.names.en, te: crop.names.te, hi: crop.names.hi },
    category: crop.category,
    defaultUnit: crop.defaultUnit,
    allowedUnits: [...crop.allowedUnits],
    quantityPresets: [...crop.quantityPresets],
    quantityStep: crop.quantityStep,
    shelfLifeDays: crop.shelfLifeDays,
    icon: crop.icon,
  };
}

async function activeCrops() {
  if (Date.now() - cache.loadedAt > CACHE_TTL_MS) {
    const crops = await Crop.find({ isActive: true }).lean();
    crops.sort((a, b) => a.names.en.localeCompare(b.names.en));
    cache = { loadedAt: Date.now(), crops: crops.map(toPublicCrop) };
  }
  return cache.crops;
}

// For tests and for seed scripts running in the same process.
export function clearCropCache() {
  cache = { loadedAt: 0, crops: [] };
}

const searchableNames = (crop) =>
  [crop.names.en, crop.names.te, crop.names.hi, crop.slug].map((name) => name.toLowerCase());

export async function listCrops({ search, category, page, limit }) {
  let crops = await activeCrops();
  if (category) crops = crops.filter((crop) => crop.category === category);

  const needle = search?.trim().toLowerCase();
  if (needle) {
    const startsWith = [];
    const contains = [];
    for (const crop of crops) {
      const names = searchableNames(crop);
      if (names.some((name) => name.startsWith(needle))) startsWith.push(crop);
      else if (names.some((name) => name.includes(needle))) contains.push(crop);
    }
    // "tom" should show Tomato before anything that merely contains "tom".
    crops = [...startsWith, ...contains];
  }

  const start = (page - 1) * limit;
  return { items: crops.slice(start, start + limit), page, limit, total: crops.length };
}

export async function getCropBySlug(slug) {
  return (await activeCrops()).find((crop) => crop.slug === slug) ?? null;
}
