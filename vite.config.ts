import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: { open: true, port: 3000 },
  build: { outDir: 'dist', target: 'es2022' },
});
