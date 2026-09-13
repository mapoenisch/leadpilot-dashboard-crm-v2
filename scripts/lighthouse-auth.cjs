/**
 * Lighthouse CI Authentifizierungs-Skript.
 * Meldet die Demo-Session vor dem Lighthouse-Crawl an,
 * sodass /dashboard gemessen wird und kein Redirect auf /login erfolgt.
 */

/**
 * @param {import('puppeteer-core').Browser} browser
 * @param {{ url: string; options: any }} context
 */
module.exports = async function lighthouseAuth(browser, context) {
  const page = await browser.newPage();
  const targetUrl = new URL(context.url);
  const loginUrl = `${targetUrl.origin}/login`;

  // 1. Login-Seite aufrufen
  await page.goto(loginUrl, { waitUntil: 'networkidle0' });

  // 2. Authentifizierungs-Session in localStorage setzen
  await page.evaluate(() => {
    const session = {
      id: 'demo-user-id',
      email: 'demo@leadpilot.io',
    };
    localStorage.setItem('leadpilot_auth_session', JSON.stringify(session));
  });

  // 3. Nach /dashboard navigieren und sicherstellen, dass ProtectedRoute freigibt
  await page.goto(context.url, { waitUntil: 'networkidle0' });

  // 4. Prüfen, ob wir wirklich auf /dashboard sind
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    throw new Error(`Lighthouse-Auth fehlgeschlagen: Weiterleitung auf ${currentUrl}`);
  }

  await page.close();
};
