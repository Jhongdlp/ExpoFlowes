import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    // En desarrollo el front habla con el backend por el mismo origen: sin CORS y sin
    // URLs absolutas repartidas por el codigo.
    proxy: { '/api': { target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000' } },
  },
})
