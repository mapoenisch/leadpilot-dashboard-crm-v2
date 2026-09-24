// G44 (Auftrag 067A, Block A): Isolierter Playwright-Lauf für den mobilen
// Finding-Vertrag (PR-CLIP-13, 375 px). Eigenständig — Base-URL, Auth-State
// und Webserver wie in playwright.config.ts, aber nur Projekt mobile-375 und
// ausschließlich e2e/*.acceptance.ts. Die normale Suite bleibt unberührt.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.acceptance\.ts/,
  outputDir: 'test-results/v23-findings/artifacts',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['json', { outputFile: 'test-results/v23-findings/playwright.json' }], ['list']],
  use: {
    baseURL: 'http://127.0.0.1:4321',
    storageState: 'playwright/.auth/user.json',
    reducedMotion: 'reduce',
    trace: 'on-first-retry',
  },
  projects: [
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
