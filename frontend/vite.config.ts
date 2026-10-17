import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Kept for the legacy JumpyBrain UI in src/App.jsx (not part of the
// where was i? build, but left compiling).
function readFundingUrl() {
  const fallback = 'https://buymeacoffee.com/tanaydwivedi'
  try {
    const yaml = fs.readFileSync(path.resolve(__dirname, '../.github/FUNDING.yml'), 'utf-8')
    const match = yaml.match(/^buy_me_a_coffee:\s*(\S+)\s*$/m)
    return match ? `https://buymeacoffee.com/${match[1]}` : fallback
  } catch {
    return fallback
  }
}

// DEMO=1 builds a single-folder copy with relative paths and no service
// worker, for previewing inside another page. Normal builds are the PWA.
const DEMO = process.env.DEMO === '1'

export default defineConfig({
  base: DEMO ? './' : '/',
  define: {
    __FUNDING_URL__: JSON.stringify(readFundingUrl()),
  },
  build: {
    outDir: DEMO ? 'dist-demo' : 'dist',
  },
  plugins: [
    react(),
    !DEMO && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['wwi-icon.svg', 'wwi-apple-touch-icon.png'],
      manifest: {
        name: 'where was i?',
        short_name: 'where was i?',
        description: 'رفيقة يومك: اكتبي أي حاجة في دماغك، وخدي خطوة صغيرة، وارجعي تلاقي نفسك كنتي فين.',
        lang: 'ar',
        dir: 'rtl',
        theme_color: '#FFF6E5',
        background_color: '#FFF6E5',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait',
        categories: ['productivity', 'lifestyle'],
        icons: [
          { src: '/wwi-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/wwi-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/wwi-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // As in JumpyBrain, index.html is not precached, so a stale shell
        // can never get stuck. Instead navigations are NetworkFirst: always
        // the fresh page when online, the last cached copy when offline.
        navigateFallback: undefined,
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 5 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
  server: {
    port: 5173,
  },
})
