import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const LEAF_700 = '#1f6a2a';
const SOIL_50 = '#faf6ef';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'AgriConnect',
        short_name: 'AgriConnect',
        description: 'Fresh vegetables and fruits, straight from nearby farmers',
        lang: 'te',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: LEAF_700,
        background_color: SOIL_50,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // The app shell (HTML, JS, CSS, icons) is precached, so the app opens with no network and
        // shows its offline banner. Every route falls back to index.html; API calls never do.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        cleanupOutdatedCaches: true,
      },
      // Service workers in dev cause confusing stale screens; test them with `npm run build && npm run preview`.
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    // Proxying keeps the API same-origin in dev, which the httpOnly refresh cookie (Prompt 2) relies on.
    proxy: {
      '/api': 'http://localhost:4000',
      // Development photo storage (production photos are on Cloudinary).
      '/uploads': 'http://localhost:4000',
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': 'http://localhost:4000',
      // Development photo storage (production photos are on Cloudinary).
      '/uploads': 'http://localhost:4000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // e2e/ holds the Playwright smoke test, which runs against the real app instead.
    include: ['src/**/*.test.{js,jsx}'],
    // Full-screen flow tests type and click through several screens; under machine load they
    // exceeded the 5 s default and failed at random. A truly stuck test still fails at 20 s.
    testTimeout: 20_000,
  },
});
