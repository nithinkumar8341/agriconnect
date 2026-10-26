export const CROP_PLACEHOLDER = '/crops/placeholder.svg';

// Stock photo of a crop, shipped with the app (public/crops/<slug>.jpg, see CREDITS.md).
export function cropImageUrl(crop) {
  if (crop?.image) return crop.image;
  return crop?.slug ? `/crops/${crop.slug}.jpg` : CROP_PLACEHOLDER;
}
