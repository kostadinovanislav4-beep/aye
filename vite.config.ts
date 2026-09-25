import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { contentCatalog } from './scripts/content-catalog.ts'

// Приложението живее на https://<потребител>.github.io/aye/ — base е името на repo-то.
const BASE = '/aye/'

// Цветът на фона от светлата тема (виж src/styles/index.css).
const BACKGROUND = '#f4f8fd'

export default defineConfig({
  // Един и същ адрес навсякъде: dev, preview и GitHub Pages са под /aye/.
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    contentCatalog(),
    VitePWA({
      // Новата версия се включва чак след „Обнови“, за да не прекъсва учене.
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        id: BASE,
        name: 'AYE',
        short_name: 'AYE',
        description: 'Подготовка за ДЗИ по БЕЛ и Cambridge C1 Advanced',
        lang: 'bg',
        dir: 'ltr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: BACKGROUND,
        theme_color: BACKGROUND,
        icons: [
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
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
