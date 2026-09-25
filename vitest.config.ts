import { defineConfig } from 'vitest/config';
import path from 'path';

// 067R / G64: Unit- und UI-Suiten laufen hermetisch ohne echtes Supabase.
// Ohne diese Abschirmung lasen die Integrity-Suiten bei gesetzten
// VITE_SUPABASE_*-Variablen (z. B. aus der lokalen E2E-Umgebung) die echte
// Datenbank; der frühere stille Demo-Fallback (PR-SOURCE-04) hatte das verdeckt.
const HERMETIC_ENV = { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' };

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
          env: HERMETIC_ENV,
          include: [
            'src/**/*.vitest.ts',
            'src/**/*.vitest.tsx',
            'scripts/__tests__/**/*.vitest.ts',
          ],
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
          env: HERMETIC_ENV,
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
        // 067K / G57: globale Schwellen 80/80/75/70 (PR-QUALITY-16) —
        // perFile bewusst aus: global misst den Stand, nicht jede Datei.
        // Scharf bleiben zusätzlich die zwei G32-Verzeichnisse via Glob-Keys
        // (Vitest-4-Laufzeit, siehe docs/CHARACTERIZATION_G32.md).
        lines: 80,
        branches: 80,
        functions: 75,
        statements: 70,
        perFile: false,
        'src/services/liveKpi/**': { lines: 90, branches: 80, functions: 80, statements: 80 },
        'src/hooks/**': { lines: 90, branches: 80, functions: 80, statements: 80 },
      },
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.vitest.ts',
        'src/**/*.vitest.tsx',
        'src/**/__tests__/**',
        // 067K / G57: Test-Verträge und -Helfer (eigene v23-Runner) zählen
        // nicht als Produktcode — Standard-Ausschluss wie für Testdateien.
        'src/review/**',
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
