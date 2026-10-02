import { defineConfig } from 'vite';

// Main process bundle. Native modules stay external (unpacked from asar).
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['audio-decode', 'better-sqlite3', 'electron', 'node-web-audio-api'],
    },
  },
});
