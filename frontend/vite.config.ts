import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon/favicon.ico', 'favicon/favicon-256.png', 'favicon/apple-touch-icon.png'],
      workbox: {
        // SPA con react-router: cualquier ruta desconocida sirve el shell; /api va siempre a la red.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
      },
      manifest: {
        name: 'Expo Flor Ecuador — Acreditaciones',
        short_name: 'Acreditaciones',
        description: 'Gestión de expositores y credenciales para ferias internacionales.',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        theme_color: '#a83a63',
        background_color: '#f6f9f7',
        icons: [
          { src: '/favicon/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/favicon/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/favicon/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    // En desarrollo el front habla con el backend por el mismo origen: sin CORS y sin
    // URLs absolutas repartidas por el codigo.
    proxy: { '/api': { target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000' } },
  },
  // Sin jsdom ni React Testing Library: lo que se prueba aqui es logica pura —lectura del
  // Excel, esquema del formulario, mapa de errores—, no el renderizado de React. Montar
  // componentes seria probar la libreria; los flujos de pantalla ya los cubren los tests de
  // integracion del backend.
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
