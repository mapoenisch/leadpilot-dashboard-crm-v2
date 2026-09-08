/**
 * scripts/captureAuftrag029GateScreenshots.mjs
 *
 * Gate-grade screenshot capture & deep-link verification script for ANTIGRAVITY AUFTRAG 029 (Gate G13).
 *
 * 6 Flows across 3 Viewports (1440px, 768px, 375px) in 2 Stages (vorher & nachher) = 36 Artifacts:
 * 1. dashboard-<vp>-<stage>.png (Executive Dashboard)
 * 2. company-profile-<vp>-<stage>.png (Unternehmenssteckbrief)
 * 3. crm-deals-<vp>-<stage>.png (CRM Deals)
 * 4. organisation-team-<vp>-<stage>.png (Organisation Teamstruktur)
 * 5. mobile-sidebar-<vp>-<stage>.png (Mobile Drawer Interaction / Sidebar)
 * 6. unknown-route-404-<vp>-<stage>.png (404 Not Found Page mit GlassCard)
 *
 * Plus automated deep-link testing for ALL 41 routes in APP_ROUTES:
 * - Direct navigation
 * - Header title match verification
 * - 0px horizontal overflow assertion
 */

import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const WebSocket = globalThis.WebSocket;

const args = process.argv.slice(2);
const stageArg = args.find((a) => a.startsWith('--stage='));
const stage = stageArg ? stageArg.split('=')[1] : null;

const previewDirArg = args.find((a) => a.startsWith('--preview-dir='));
const previewDir = previewDirArg ? path.resolve(process.cwd(), previewDirArg.split('=')[1]) : process.cwd();

if (stage !== 'vorher' && stage !== 'nachher') {
  console.error('❌ Error: --stage must be either "vorher" or "nachher"');
  process.exit(1);
}

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-029');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const APP_ROUTES = [
  { id: 's-exec', path: '/dashboard', title: 'Executive Dashboard' },
  { id: 's-profil', path: '/company/profile', title: 'Unternehmenssteckbrief' },
  { id: 's-highlights', path: '/company/highlights', title: 'Jahres-Highlights 2025' },
  { id: 's-daten', path: '/company/data-basis', title: 'Datenbasis & Konsistenz' },
  { id: 's-live-simulation', path: '/crm/live-simulation', title: 'Live-Simulation' },
  { id: 's-leads', path: '/crm/leads', title: 'Leads & Kontakte' },
  { id: 's-companies', path: '/crm/companies', title: 'Unternehmen' },
  { id: 's-deals', path: '/crm/deals', title: 'Deal Pipeline' },
  { id: 's-activities', path: '/crm/activities', title: 'Aktivitäten-Historie' },
  { id: 's-idee', path: '/company/idea', title: 'Geschäftsidee' },
  { id: 's-value', path: '/company/value-proposition', title: 'Value Proposition' },
  { id: 's-historie', path: '/company/history', title: 'Gründung & Entwicklung' },
  { id: 's-standort', path: '/company/location', title: 'Sitz & Räumlichkeiten' },
  { id: 's-funktion', path: '/product/features', title: 'Produkt & Funktionsweise' },
  { id: 's-pricing', path: '/product/pricing', title: 'Pakete & Preismodell' },
  { id: 's-perf', path: '/product/performance', title: 'Produkt-Performance 2025' },
  { id: 's-roadmap', path: '/product/roadmap', title: 'Releases & Roadmap' },
  { id: 's-markt', path: '/market/overview', title: 'Marktlage DACH' },
  { id: 's-wettbewerb', path: '/market/competition', title: 'Wettbewerbslandschaft' },
  { id: 's-swot', path: '/market/swot', title: 'SWOT-Analyse' },
  { id: 's-icp', path: '/customers/icp', title: 'Ideal Customer Profile' },
  { id: 's-persona', path: '/customers/persona', title: 'Buyer Persona' },
  { id: 's-segmente', path: '/customers/segments', title: 'Kundensegmente' },
  { id: 's-top10', path: '/customers/top-customers', title: 'Top-10-Kunden' },
  { id: 's-funnel', path: '/sales/funnel', title: 'Sales Funnel 2025' },
  { id: 's-sla', path: '/sales/sla', title: 'SLA Marketing & Sales' },
  { id: 's-kanaele', path: '/sales/channels', title: 'Kanalperformance & CAC' },
  { id: 's-planung', path: '/sales/planning', title: 'Marketingplanung H2 2026' },
  { id: 's-guv', path: '/finance/p-and-l', title: 'Gewinn- und Verlustrechnung' },
  { id: 's-bilanz', path: '/finance/balance-sheet', title: 'Bilanz & SaaS KPIs' },
  { id: 's-unit', path: '/finance/unit-economics', title: 'Unit Economics 2026' },
  { id: 's-headcount', path: '/organisation/headcount', title: 'Headcount-Entwicklung' },
  { id: 's-hr', path: '/organisation/hr', title: 'HR-Kennzahlen' },
  { id: 's-team', path: '/organisation/team', title: 'Teamstruktur & Engpässe' },
  { id: 's-okr', path: '/strategy/okrs', title: 'Ziele & OKRs' },
  { id: 's-bsc', path: '/strategy/balanced-scorecard', title: 'Balanced Scorecard' },
  { id: 's-treiber', path: '/strategy/growth-drivers', title: 'Wachstumstreiber' },
  { id: 's-kampagne-internal', path: '/resources/materials', title: 'Originalmaterialien & Decks' },
  { id: 's-satzung', path: '/legal/articles', title: 'Satzung LeadPilot GmbH' },
  { id: 's-gesellschafter', path: '/legal/shareholders', title: 'Gesellschafterliste' },
  { id: 's-handelsregister', path: '/legal/commercial-register', title: 'Handelsregister' },
];

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { res, rej } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) rej(msg.error);
          else res(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { res: resolve, rej: reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression: `(() => { ${expression} })()`,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      console.error('Eval Exception Details:', res.exceptionDetails);
      throw new Error(`Eval error: ${res.exceptionDetails.text}`);
    }
    return res.result?.value;
  }

  async assert(conditionExpr, errorMsg) {
    const res = await this.eval(`return Boolean(${conditionExpr});`);
    if (!res) {
      throw new Error(`❌ ASSERTION FAILED: ${errorMsg}`);
    }
  }

  async waitForSelector(selector, timeoutMs = 6000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const found = await this.eval(`return !!document.querySelector('${selector}');`);
      if (found) return true;
      await new Promise((r) => setTimeout(r, 150));
    }
    throw new Error(`Timeout waiting for selector: ${selector}`);
  }

  async checkOverflow(contextName) {
    const overflowReport = await this.eval(`
      const docEl = document.documentElement;
      const body = document.body;
      const docOverflowX = Math.max(0, docEl.scrollWidth - docEl.clientWidth);
      const bodyOverflowX = Math.max(0, body.scrollWidth - body.clientWidth);

      const hasAnyOverflow = docOverflowX > 1 || bodyOverflowX > 1;

      return {
        docOverflowX,
        bodyOverflowX,
        hasAnyOverflow
      };
    `);

    if (!overflowReport || overflowReport.hasAnyOverflow) {
      const err = `❌ HARD OVERFLOW DETECTED in [${contextName}]: Doc: ${overflowReport?.docOverflowX}px, Body: ${overflowReport?.bodyOverflowX}px`;
      console.error(err);
      throw new Error(err);
    }
    return overflowReport;
  }

  async captureScreenshot(filename) {
    await this.eval('return document.fonts.ready;');
    await new Promise((r) => setTimeout(r, 300));
    const res = await this.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    const filePath = path.join(SCREENSHOT_DIR, filename);
    const buf = Buffer.from(res.data, 'base64');
    fs.writeFileSync(filePath, buf);
    console.log(`💾 Saved [${stage}]: ${filename} (${buf.length} bytes)`);
  }

  async close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function run() {
  const PREVIEW_PORT = 4181;
  const CHROME_DEBUG_PORT = 9231;
  const USER_DATA_DIR = path.resolve(process.cwd(), '.cdp_auftrag029_temp');

  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  console.log(`\n=======================================================`);
  console.log(`🚀 STARTING AUFTRAG 029 SCREENSHOT & DEEP-LINK HARNESS (${stage.toUpperCase()})`);
  console.log(`📁 Preview Directory: ${previewDir}`);
  console.log(`=======================================================\n`);

  console.log(`[Preview Server] Starting vite preview in ${previewDir} on port ${PREVIEW_PORT}...`);
  const previewProcess = spawn('npx', ['vite', 'preview', '--port', String(PREVIEW_PORT), '--strictPort'], {
    cwd: previewDir,
    stdio: 'pipe',
  });

  previewProcess.stderr.on('data', (d) => console.error(`[Preview Err] ${d}`));

  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${PREVIEW_PORT}`, (res) => {
          if (res.statusCode === 200) resolve();
          else reject();
        });
        req.on('error', reject);
      });
      serverReady = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  if (!serverReady) {
    console.error('❌ Failed to start Vite preview server');
    previewProcess.kill();
    process.exit(1);
  }
  console.log(`✅ Vite preview server ready on http://localhost:${PREVIEW_PORT}`);

  console.log(`[Chrome] Launching Headless Chrome on debug port ${CHROME_DEBUG_PORT}...`);
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${CHROME_DEBUG_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    '--font-render-hinting=none',
    '--disable-font-subpixel-positioning',
    '--disable-lcd-text',
    '--force-color-profile=srgb',
    '--hide-scrollbars',
    `http://localhost:${PREVIEW_PORT}`,
  ]);

  let wsUrl = null;
  for (let i = 0; i < 40; i++) {
    try {
      const list = await getJson(`http://localhost:${CHROME_DEBUG_PORT}/json/list`);
      const target = list.find((t) => t.type === 'page');
      if (target && target.webSocketDebuggerUrl) {
        wsUrl = target.webSocketDebuggerUrl;
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  if (!wsUrl) {
    console.error('❌ Failed to connect to Chrome CDP');
    chromeProcess.kill();
    previewProcess.kill();
    process.exit(1);
  }
  console.log(`✅ Chrome CDP connected: ${wsUrl}`);

  const client = new CdpClient(wsUrl);
  await client.connect();

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('DOM.enable');

  const viewports = [
    { name: '1440', width: 1440, height: 900, isMobile: false },
    { name: '768', width: 768, height: 1024, isMobile: true },
    { name: '375', width: 375, height: 812, isMobile: true },
  ];

  try {
    for (const vp of viewports) {
      console.log(`\n-------------------------------------------------------`);
      console.log(`📱 Running Viewport: ${vp.name}px (${vp.width}x${vp.height})`);
      console.log(`-------------------------------------------------------`);

      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.isMobile,
      });

      // Clear storage and start fresh
      await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/dashboard` });
      await new Promise((r) => setTimeout(r, 600));
      await client.eval(`localStorage.clear(); sessionStorage.clear();`);

      // FLOW 1: Dashboard
      console.log(`\n[Flow 1] Executive Dashboard`);
      await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/dashboard` });
      await client.waitForSelector('main', 5000);
      await new Promise((r) => setTimeout(r, 500));

      await client.assert(
        `document.querySelector('header h1')?.textContent?.includes("Executive Dashboard") || document.body.innerText.includes("Executive Dashboard")`,
        'Dashboard view header present'
      );
      await client.checkOverflow(`Dashboard-${vp.name}`);
      await client.captureScreenshot(`dashboard-${vp.name}-${stage}.png`);

      // FLOW 2: Company Profile
      console.log(`\n[Flow 2] Company Profile Deep Link`);
      await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/company/profile` });
      await client.waitForSelector('main', 5000);
      await new Promise((r) => setTimeout(r, 500));

      await client.assert(
        `document.querySelector('header h1')?.textContent?.includes("Unternehmenssteckbrief") || document.body.innerText.includes("Unternehmenssteckbrief")`,
        'Company profile view header/content present'
      );
      await client.checkOverflow(`CompanyProfile-${vp.name}`);
      await client.captureScreenshot(`company-profile-${vp.name}-${stage}.png`);

      // FLOW 3: CRM Deals Route
      console.log(`\n[Flow 3] CRM Deals Route`);
      await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/crm/deals` });
      await client.waitForSelector('main', 5000);
      await client.waitForSelector('table', 5000);
      await new Promise((r) => setTimeout(r, 600));

      await client.assert(
        `document.querySelector('header h1')?.textContent?.includes("Deal Pipeline") || document.body.innerText.includes("Deal Pipeline")`,
        'CRM Deals view header/content present'
      );
      await client.checkOverflow(`CrmDeals-${vp.name}`);
      await client.captureScreenshot(`crm-deals-${vp.name}-${stage}.png`);

      // FLOW 4: Organisation Team Route
      console.log(`\n[Flow 4] Organisation Team Route`);
      await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/organisation/team` });
      await client.waitForSelector('main', 5000);
      await new Promise((r) => setTimeout(r, 500));

      await client.assert(
        `document.querySelector('header h1')?.textContent?.includes("Teamstruktur") || document.body.innerText.includes("Teamstruktur")`,
        'Organisation Team view header/content present'
      );
      await client.checkOverflow(`OrganisationTeam-${vp.name}`);
      await client.captureScreenshot(`organisation-team-${vp.name}-${stage}.png`);

      // FLOW 5: Mobile Sidebar Drawer / Desktop Sidebar
      console.log(`\n[Flow 5] Mobile Sidebar Drawer / Desktop Sidebar`);
      if (vp.isMobile) {
        await client.eval(`
          const btn = document.getElementById('mobile-menu-trigger');
          if (btn) btn.click();
        `);
        await new Promise((r) => setTimeout(r, 500));

        await client.assert(
          `!!document.getElementById('mobile-sidebar-drawer')`,
          'Mobile sidebar drawer rendered'
        );

        await client.checkOverflow(`MobileDrawer-${vp.name}`);
        await client.captureScreenshot(`mobile-sidebar-${vp.name}-${stage}.png`);

        await client.eval(`
          const closeBtn = document.querySelector('[aria-label="Menü schließen"]');
          if (closeBtn) closeBtn.click();
        `);
        await new Promise((r) => setTimeout(r, 400));
      } else {
        await client.checkOverflow(`SidebarDesktop-${vp.name}`);
        await client.captureScreenshot(`mobile-sidebar-${vp.name}-${stage}.png`);
      }

      // FLOW 6: Unknown Route (404)
      console.log(`\n[Flow 6] Unknown Route / 404`);
      await client.send('Page.navigate', {
        url: `http://localhost:${PREVIEW_PORT}/non-existent-sample-page-404`,
      });
      await client.waitForSelector('main', 5000);
      await new Promise((r) => setTimeout(r, 500));

      await client.assert(
        `document.body.innerText.includes("Seite nicht gefunden") && document.body.innerText.includes("404")`,
        '404 page rendered'
      );
      await client.checkOverflow(`UnknownRoute404-${vp.name}`);
      await client.captureScreenshot(`unknown-route-404-${vp.name}-${stage}.png`);
    }

    // =========================================================================
    // 41-ROUTE DEEP LINK & OVERFLOW TEST
    // =========================================================================
    console.log(`\n-------------------------------------------------------`);
    console.log(`🔍 RUNNING 41-ROUTE DEEP-LINK VERIFICATION`);
    console.log(`-------------------------------------------------------`);

    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    let testedCount = 0;
    for (const route of APP_ROUTES) {
      await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}${route.path}` });
      await client.waitForSelector('main', 5000);
      await new Promise((r) => setTimeout(r, 200));

      const titleFound = await client.eval(`
        const h1 = document.querySelector('header h1')?.textContent || '';
        const bodyText = document.body.innerText || '';
        const expected = ${JSON.stringify(route.title)};
        return h1.includes(expected) || bodyText.includes(expected);
      `);

      if (!titleFound) {
        throw new Error(`❌ Deep-link title verification failed for route: ${route.path} (Expected: "${route.title}")`);
      }

      await client.checkOverflow(`Route-${route.id}`);
      testedCount++;
      process.stdout.write(`.` );
    }

    console.log(`\n✅ Deep-link check: ${testedCount}/${APP_ROUTES.length} routes successfully verified!`);
    console.log(`\n=======================================================`);
    console.log(`🎉 ALL 18 SCREENSHOTS & 41 DEEP LINKS SUCCESSFUL FOR STAGE: ${stage.toUpperCase()}`);
    console.log(`=======================================================\n`);
  } finally {
    await client.close();
    chromeProcess.kill();
    previewProcess.kill();
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error('\n❌ HARNESS EXECUTION FAILED:', err);
  process.exit(1);
});
