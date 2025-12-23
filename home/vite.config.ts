import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['zustand/middleware', 'zustand/vanilla'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'zustand/middleware': path.resolve(__dirname, 'node_modules/zustand/middleware.js'),
      'zustand/vanilla': path.resolve(__dirname, 'node_modules/zustand/vanilla.js'),
    },
  },
})
