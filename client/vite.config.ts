import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    react(),
    // Older embedded browsers (e.g. Kindle Scribe) can't run ES2020 — down-level and
    // polyfill the modern bundle, and serve a SystemJS fallback to anything older.
    // Fallback floor keeps native async generators: Babel's regenerator crashes on this codebase.
    legacy({
      targets: ['chrome >= 63', 'safari >= 12', 'firefox >= 57', 'edge >= 79'],
      modernTargets: ['chrome >= 64', 'safari >= 12', 'firefox >= 67', 'edge >= 79'],
      modernPolyfills: true,
    }),
  ],
  server: {
    proxy: {
      '/api':  'http://localhost:3001',
      '/auth': 'http://localhost:3001',
    },
  },
})
