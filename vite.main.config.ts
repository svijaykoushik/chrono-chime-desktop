import { defineConfig } from 'vite';

// Main process bundle. Native modules stay external (unpacked from asar).
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['better-sqlite3', 'electron'],
    },
  },
});
