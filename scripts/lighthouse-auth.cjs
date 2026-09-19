/**
 * Lighthouse CI Authentifizierungs-Skript.
 * Führt einen echten Supabase-Login durch (fail-closed),
 * sodass /dashboard im Lighthouse-Crawl authentifiziert gemessen wird.
 */

/**
 * @param {import('puppeteer-core').Browser} browser
 * @param {{ url: string; options: any }} context
 */
module.exports = async function lighthouseAuth(browser, context) {
  const email = process.env.E2E_AUTH_EMAIL;
  const password = process.env.E2E_AUTH_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Lighthouse-Auth Abbruch (fail-closed): E2E_AUTH_EMAIL und/oder E2E_AUTH_PASSWORD sind nicht gesetzt.',
    );
  }

  const page = await browser.newPage();
  try {
    const targetUrl = new URL(context.url);
    const loginUrl = `${targetUrl.origin}/login`;

    // 1. Login-Seite aufrufen
    await page.goto(loginUrl, { waitUntil: 'networkidle0' });

    // 2. Eingabefelder füllen und absenden
    await page.waitForSelector('#login-email', { timeout: 10000 });
    await page.type('#login-email', email);

    await page.waitForSelector('#login-password', { timeout: 10000 });
    await page.type('#login-password', password);

    // Klick auf Submit und auf Navigation/Dashboard warten
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {}),
    ]);

    // 3. Warten auf /dashboard und Logout-Button als Bestätigung für erfolgreichen Login
    await page.waitForSelector('[data-testid="logout-button"]', { timeout: 15000 });

    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      throw new Error(`Lighthouse-Auth fehlgeschlagen: Weiterleitung auf ${currentUrl}`);
    }
  } finally {
    await page.close();
  }
};
