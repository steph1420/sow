import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

// v0.30.1 (t4u): the shown version always comes from package.json. SOW_VERSION_OVERRIDE is for the update e2e probe only.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }
const APP_VERSION = process.env.SOW_VERSION_OVERRIDE || pkg.version
// v0.46.0 (t8u): the Beta site (steph1420/sow-beta) builds with SOW_BASE=/sow-beta/ VITE_SOW_FLAVOR=beta. Stable = defaults.
const BASE = process.env.SOW_BASE || '/sow/'
const BETA = process.env.VITE_SOW_FLAVOR === 'beta'

export default defineConfig({
  base: BASE,
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // v0.30.1: we register in src/main.tsx (update on foreground + safe reload), not registerSW.js.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: BETA ? 'Setting of Work Beta' : 'Setting of Work',
        short_name: BETA ? 'SoW Beta' : 'SoW',
        description: 'KGA/KGB Eng CW/HW marking — Lucid rewrite',
        theme_color: '#0a0b0e',
        background_color: '#0a0b0e',
        display: 'standalone',
        orientation: 'any',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: `${BASE}index.html`,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp}'],
        // v0.31.0 (t4u): take over open pages at once and drop old precaches
        clientsClaim: true,
        // v0.46.0 (t7u): the page sends SKIP_WAITING only after the "before update" snapshot is confirmed (src/pwa/updateFlow.ts)
        skipWaiting: false,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { host: true, port: 5174 },
})
