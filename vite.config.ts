import { defineConfig } from 'vite';

export default defineConfig({
  base: '/wormhole-calculator/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
  },
});
