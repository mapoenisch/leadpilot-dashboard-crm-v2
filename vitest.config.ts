import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      // UI-Tests (Testing Library) bekommen jsdom; wird in G32 befüllt
      ['src/**/*.ui.vitest.ts', 'jsdom'],
      ['src/**/*.ui.vitest.tsx', 'jsdom'],
    ],
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['src/**/*.vitest.ts', 'src/**/*.vitest.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      reportOnFailure: false, // Schwellen in G32 scharf schalten
      thresholds: {
        // Zielwerte laut BUILD_PLAN_V2.2.0 — in G32 auf `perFile: true` und `100%` umschalten
        branches: 0,
        functions: 0,
        lines: 0,
        statements: 0,
      },
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.vitest.ts',
        'src/**/*.vitest.tsx',
        'src/**/__tests__/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
