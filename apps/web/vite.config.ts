import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Precache all built assets so the app loads offline.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Serve cached index.html for navigation requests when the server is unreachable.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/ws/, /^\/health/, /^\/api/],
      },
      manifest: {
        name: 'Aspect',
        short_name: 'Aspect',
        description: 'A gorgeous Home Assistant dashboard for the whole family.',
        theme_color: '#0e0f13',
        background_color: '#0e0f13',
        display: 'standalone',
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
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/ws': { target: 'ws://127.0.0.1:8099', ws: true },
      '/health': { target: 'http://127.0.0.1:8099' },
    },
  },
});
