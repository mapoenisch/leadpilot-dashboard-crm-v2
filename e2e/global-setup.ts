import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// G45 (Auftrag 067B, Step 6 — freigegebene E2E-Anpassung): Baut den
// Auth-State per Supabase-Login statt Demo-Fill auf. Credentials ausschließlich
// aus Umgebungsvariablen — ohne gesetzte Variablen bricht das Setup ehrlich
// ab (keine nutzbaren Fallback-Zugangsdaten im Repo, Review-Nacharbeit).
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`E2E-Abruch: Umgebungsvariable ${name} ist nicht gesetzt.`);
  }
  return value;
}

async function globalSetup(config: FullConfig) {
  const authFile = path.resolve('playwright/.auth/user.json');
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  const baseURL = config.projects[0]?.use?.baseURL || 'http://127.0.0.1:4321';
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  try {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.fill('#login-email', requireEnv('E2E_AUTH_EMAIL'));
    await page.fill('#login-password', requireEnv('E2E_AUTH_PASSWORD'));
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard');
    await page.waitForSelector('[data-testid="logout-button"]');

    await page.context().storageState({ path: authFile });
  } finally {
    await browser.close();
  }
}

export default globalSetup;
