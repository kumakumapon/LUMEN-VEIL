import { defineConfig } from 'vite';

// This is a project Pages site, not an origin-root deployment.
export default defineConfig({
  root: 'web',
  base: '/LUMEN-VEIL/',
  publicDir: false,
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0,
    target: 'es2022',
  },
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
