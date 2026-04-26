import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.svg', 'apple-touch-icon.png', 'icon-*.png'],
        manifest: {
          name: 'EMJSC Team Hub',
          short_name: 'EMJSC Hub',
          description: 'Official Team Hub for EMJSC U8 Saturday White – fixtures, duties, and player profiles.',
          theme_color: '#0f1743',
          background_color: '#0f1743',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            { src: '/icon-72.png',  sizes: '72x72',   type: 'image/png' },
            { src: '/icon-96.png',  sizes: '96x96',   type: 'image/png' },
            { src: '/icon-128.png', sizes: '128x128', type: 'image/png' },
            { src: '/icon-144.png', sizes: '144x144', type: 'image/png' },
            { src: '/icon-152.png', sizes: '152x152', type: 'image/png' },
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: '/icon-384.png', sizes: '384x384', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/australia-southeast1-/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GOOGLE_MAPS_API_KEY': JSON.stringify(env.GOOGLE_MAPS_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
