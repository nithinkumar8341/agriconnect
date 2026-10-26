import { useState } from 'react';
import { CROP_PLACEHOLDER, cropImageUrl } from '../lib/cropImage.js';

// A real photo for a crop or listing: the farmer's own photo when there is one, otherwise the
// crop's stock photo, and a neutral grey placeholder if that file is missing.
export function CropPhoto({ crop, photoUrl, alt = '', className = '' }) {
  const preferred = photoUrl || cropImageUrl(crop);
  const [failed, setFailed] = useState(null);
  const src = failed === preferred ? CROP_PLACEHOLDER : preferred;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => src !== CROP_PLACEHOLDER && setFailed(preferred)}
      className={`bg-soil-100 object-cover ${className}`}
    />
  );
}
