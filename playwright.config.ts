import { defineConfig } from '@playwright/test';

// Gate G31 (Auftrag 046): ersetzt die ~50 handgebauten captureAuftrag0XX-Skripte.
// Determinismus-Ansatz siehe docs/TEST_MIGRATION_V2_2_0.md („Capture-Skripte —
// Determinismus-Analyse"): reducedMotion + fonts.ready/networkidle,
// maxDiffPixelRatio 0.02 (nur Anti-Aliasing-Drift), kein mask initial.
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4321',
    storageState: 'playwright/.auth/user.json',
    reducedMotion: 'reduce',
    trace: 'on-first-retry',
  },
  expect: {
    // S6: 0 statt 0.02 — erst bei 0 sieht toHaveScreenshot komponentengroße
    // Regressionen (Sidebar weg = Ratio 0.01). Stabilität: 3× 12/12 grün.
    // Details: docs/TEST_MIGRATION_V2_2_0.md („Gleichwertigkeitsnachweis").
    toHaveScreenshot: {
      maxDiffPixelRatio: 0,
    },
  },
  projects: [
    {
      name: 'desktop-1440',
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'tablet-768',
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'mobile-375',
      use: { viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4321 --strictPort',
    url: 'http://127.0.0.1:4321/dashboard',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
