import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:3000';

// FixNGo PWA: installable on Android/iOS, offline-capable via Workbox.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'FixNGo — Homi Services',
        short_name: 'FixNGo',
        description: 'Book services, manage jobs, and sell products.',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/pwa-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache' },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    // Allow tunneled hosts (localtunnel, ngrok, etc.) to reach the dev server.
    allowedHosts: ['.loca.lt', '.ngrok-free.app', '.ngrok.io', '.trycloudflare.com'],
    proxy: {
      '/api': { target: apiProxyTarget, changeOrigin: true },
    },
  },
});
