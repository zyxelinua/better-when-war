import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    include: ['maplibre-gl', '@maplibre/maplibre-gl-leaflet'],
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/panorams': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
