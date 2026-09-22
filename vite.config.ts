import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import { branding } from './src/config/branding.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const supabaseHost = env.VITE_SUPABASE_URL ? new URL(env.VITE_SUPABASE_URL).hostname : undefined

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: branding.appName,
          short_name: branding.shortName,
          description: branding.description,
          theme_color: branding.themeColor,
          background_color: branding.backgroundColor,
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // V1 is read-caching only: no offline write queue, so mutating
          // requests are never intercepted here (Workbox runtimeCaching
          // only matches GET requests by default).
          runtimeCaching: supabaseHost
            ? [
                {
                  urlPattern: ({ url }: { url: URL }) =>
                    url.hostname === supabaseHost && url.pathname.startsWith('/rest/v1/'),
                  handler: 'NetworkFirst',
                  options: {
                    cacheName: 'supabase-read-cache',
                    expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
                    cacheableResponse: { statuses: [0, 200] },
                  },
                },
              ]
            : [],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  }
})
