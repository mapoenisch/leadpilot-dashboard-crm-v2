import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Vitest 4 kennt kein environmentMatchGlobs mehr — zwei Projekte (G32):
    // node für alle Suiten, jsdom nur für *.ui.vitest.* (Hooks/G33-Umbau).
    projects: [
      {
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './src'),
          },
        },
        test: {
          name: 'unit',
          environment: 'node',
          setupFiles: ['./vitest.setup.ts'],
          include: ['src/**/*.vitest.ts', 'src/**/*.vitest.tsx'],
          exclude: ['src/**/*.ui.vitest.ts', 'src/**/*.ui.vitest.tsx'],
        },
      },
      {
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './src'),
          },
        },
        test: {
          name: 'ui',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: ['src/**/*.ui.vitest.ts', 'src/**/*.ui.vitest.tsx'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      reportOnFailure: false,
      thresholds: {
        // Global bleibt 0 (mit perFile trivial erfüllt) — scharf nur die zwei
        // G32-Verzeichnisse via Glob-Keys (Vitest-4-Laufzeit, siehe
        // docs/CHARACTERIZATION_G32.md). Rest (data, db, import) → G36/G43.
        lines: 0,
        branches: 0,
        functions: 0,
        statements: 0,
        perFile: true,
        'src/services/liveKpi/**': { lines: 90, branches: 80, functions: 80, statements: 80 },
        'src/hooks/**': { lines: 90, branches: 80, functions: 80, statements: 80 },
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
