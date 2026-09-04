import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
