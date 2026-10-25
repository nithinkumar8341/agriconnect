import { getCropBySlug, listCrops } from '../services/crops.service.js';
import { AppError } from '../utils/AppError.js';

// Reference data: browsers may reuse it for an hour. Express adds an ETag to every JSON body and
// answers 304 Not Modified when the client's copy is still current, so revalidation costs no body.
const CATALOG_CACHE_CONTROL = 'public, max-age=3600';

export async function getCrops(req, res) {
  res.set('Cache-Control', CATALOG_CACHE_CONTROL);
  res.json(await listCrops(req.query));
}

export async function getCrop(req, res) {
  const crop = await getCropBySlug(req.params.slug);
  if (!crop) throw new AppError(404, 'NOT_FOUND', 'Crop not found');
  res.set('Cache-Control', CATALOG_CACHE_CONTROL);
  res.json({ crop });
}
