import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,mjs}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [{
          urlPattern: /^https:\/\/api\.dictionaryapi\.dev\/.*/,
          handler: 'NetworkFirst',
          options: { cacheName: 'dict', expiration: { maxEntries: 500 } }
        }]
      },
      manifest: {
        name: 'Kindle Book Reader',
        short_name: 'Reader',
        description: 'Read EPUB and PDF books. Double-click a word for its meaning.',
        theme_color: '#1f2937',
        background_color: '#fbf7ef',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
});
