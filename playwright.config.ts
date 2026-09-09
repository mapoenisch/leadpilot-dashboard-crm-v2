import { defineConfig } from '@playwright/test';

// Gate G31 (Auftrag 046): ersetzt die ~50 handgebauten captureAuftrag0XX-Skripte.
// Determinismus-Ansatz siehe docs/TEST_MIGRATION_V2_2_0.md („Capture-Skripte —
// Determinismus-Analyse"): reducedMotion + fonts.ready/networkidle,
// maxDiffPixelRatio 0.02 (nur Anti-Aliasing-Drift), kein mask initial.
export default defineConfig({
  testDir: './e2e',
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
    reducedMotion: 'reduce',
    trace: 'on-first-retry',
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
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
