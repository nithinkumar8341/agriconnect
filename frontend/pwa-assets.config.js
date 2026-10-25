import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

const LEAF_700 = '#1f6a2a';

// Regenerate the PWA icons from the SVG logo: npm run generate-pwa-assets
// Maskable and Apple icons get a full-bleed green background: Android crops maskable icons to a
// circle or squircle, and a white margin would show as a ring around the logo.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: LEAF_700 } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: LEAF_700 } },
  },
  images: ['public/favicon.svg'],
});
