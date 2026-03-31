import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: { open: true, port: 3000 },
  build: {
    outDir: 'dist',
    target: 'es2022',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Single chunk for simplicity (small app, no code splitting needed)
        manualChunks: undefined,
      },
    },
  },
});
