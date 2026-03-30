import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Proxy API + WebSocket calls to the FastAPI backend during dev
  server: {
    proxy: {
      '/api': 'http://localhost:8765',
      '/ws': {
        target: 'ws://localhost:8765',
        ws: true,
      },
    },
  },
  // Build output goes into the location FastAPI serves as static files
  build: {
    outDir: '../src/ezelementals/ui/static',
    emptyOutDir: true,
  },
})
