import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalSetup(config: FullConfig) {
  const authFile = path.resolve('playwright/.auth/user.json');
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  const baseURL = config.projects[0]?.use?.baseURL || 'http://127.0.0.1:4321';
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  try {
    await page.goto('/login', { waitUntil: 'networkidle' });
    const demoEmail = process.env.VITE_DEMO_AUTH_EMAIL || 'demo@leadpilot.io';
    const demoPassword = process.env.VITE_DEMO_AUTH_PASSWORD || 'demo';

    await page.fill('#login-email', demoEmail);
    await page.fill('#login-password', demoPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');
    await page.waitForSelector('[data-testid="logout-button"]');

    // Speichere Browser Storage State
    await page.context().storageState({ path: authFile });

    // Ergänze robust sowohl 127.0.0.1 als auch localhost Origins
    try {
      const stateContent = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
      const sessionItem = {
        name: 'leadpilot_auth_session',
        value: JSON.stringify({ id: 'demo-user-id', email: demoEmail }),
      };

      const origins = stateContent.origins || [];
      const has127 = origins.some((o: { origin: string }) => o.origin.includes('127.0.0.1'));
      const hasLocalhost = origins.some((o: { origin: string }) => o.origin.includes('localhost'));

      if (!has127) {
        origins.push({ origin: 'http://127.0.0.1:4321', localStorage: [sessionItem] });
      }
      if (!hasLocalhost) {
        origins.push({ origin: 'http://localhost:4321', localStorage: [sessionItem] });
      }

      stateContent.origins = origins;
      fs.writeFileSync(authFile, JSON.stringify(stateContent, null, 2), 'utf-8');
    } catch {
      // Best-effort Origin-Ergänzung
    }
  } finally {
    await browser.close();
  }
}

export default globalSetup;
