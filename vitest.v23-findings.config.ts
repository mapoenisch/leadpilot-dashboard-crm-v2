// G44 (Auftrag 067A, Block A): Isolierte Vitest-Suite für die roten
// v2.3.0-Sollverträge. Node-Environment, ausschließlich
// src/review/acceptance/**/*.acceptance.ts — normale *.vitest.ts(x) laufen
// hier nie. Die normale Suite (vitest.config.ts) bleibt unberührt.
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/review/acceptance/**/*.acceptance.ts'],
  },
});
