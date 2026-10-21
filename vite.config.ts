import { defineConfig } from 'vite';

// The pathname is part of the public save game's URL and must not change.
export default defineConfig({
  base: '/LUMEN-VEIL/',
  publicDir: 'public',
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
  server: { host: '127.0.0.1', port: 4173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
