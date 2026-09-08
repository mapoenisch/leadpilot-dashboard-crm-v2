/**
 * scripts/captureAuftrag027GateScreenshots.mjs
 *
 * Gate-grade screenshot capture & verification script for ANTIGRAVITY AUFTRAG 027 (Gate G11).
 *
 * 6 Flows across 3 Viewports (1440px, 768px, 375px) in 2 Stages (vorher & nachher) = 36 Artifacts:
 * 1. dashboard-<vp>-<stage>.png (Executive Dashboard)
 * 2. company-profile-<vp>-<stage>.png (Company Profile / Deep Link)
 * 3. crm-deals-<vp>-<stage>.png (CRM Deals Route)
 * 4. organisation-team-<vp>-<stage>.png (Organisation Team Route)
 * 5. mobile-sidebar-<vp>-<stage>.png (Mobile Drawer Interaction)
 * 6. unknown-route-404-<vp>-<stage>.png (404 Not Found Page & Home Link)
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

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-027');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

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
    console.log(`✅ [${contextName}] Overflow check passed (0 clipping)`);
    return overflowReport;
  }

  async captureScreenshot(filename) {
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

// -------------------------------------------------------------
// MAIN EXECUTION FLOW
// -------------------------------------------------------------
async function run() {
  const PREVIEW_PORT = 4178;
  const CHROME_DEBUG_PORT = 9228;
  const USER_DATA_DIR = path.resolve(process.cwd(), '.cdp_auftrag027_temp');

  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  console.log(`\n=======================================================`);
  console.log(`🚀 STARTING AUFTRAG 027 SCREENSHOT HARNESS (Stage: ${stage.toUpperCase()})`);
  console.log(`📁 Preview Directory: ${previewDir}`);
  console.log(`=======================================================\n`);

  // 1. Start preview server
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

  // 2. Start Headless Chrome
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

      // Clear storage
      await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}` });
      await new Promise((r) => setTimeout(r, 600));
      await client.eval(`localStorage.clear(); sessionStorage.clear();`);

      // Category mapping for navigation items in baseline
      const ITEM_CATEGORY_MAP = {
        's-exec': 'uebersicht',
        's-profil': 'uebersicht',
        's-highlights': 'uebersicht',
        's-daten': 'uebersicht',
        's-deals': 'crm',
        's-team': 'organisation',
      };

      // Helper to navigate via click in baseline with category expansion
      const clickBaselineNavItem = async (itemId) => {
        const catId = ITEM_CATEGORY_MAP[itemId];

        if (vp.isMobile) {
          // Open mobile drawer if not already open
          await client.eval(`
            const drawer = document.getElementById('mobile-sidebar-drawer');
            if (!drawer) {
              const trigger = document.getElementById('mobile-menu-trigger');
              if (trigger) trigger.click();
            }
          `);
          await new Promise((r) => setTimeout(r, 500));
        }

        // Expand category if the item is not yet visible
        await client.eval(`
          let item = document.querySelector('[data-testid="nav-item-${itemId}"]');
          if (!item && "${catId}") {
            const navHeaders = Array.from(document.querySelectorAll('nav > div > div:first-child'));
            for (const hdr of navHeaders) {
              const text = (hdr.textContent || '').toLowerCase();
              if ("${catId}" === 'organisation' && text.includes('organisation')) {
                hdr.click();
                break;
              } else if ("${catId}" === 'uebersicht' && (text.includes('übersicht') || text.includes('uebersicht'))) {
                hdr.click();
                break;
              } else if ("${catId}" === 'crm' && text.includes('crm')) {
                hdr.click();
                break;
              }
            }
          }
        `);

        await new Promise((r) => setTimeout(r, 400));

        const itemFoundAndClicked = await client.eval(`
          const target = document.querySelector('[data-testid="nav-item-${itemId}"]');
          if (target) {
            target.click();
            return true;
          }
          return false;
        `);

        if (!itemFoundAndClicked) {
          throw new Error(`❌ Baseline Navigation Error: Could not find or click [data-testid="nav-item-${itemId}"] in viewport ${vp.name}`);
        }

        await new Promise((r) => setTimeout(r, 600));
      };

      // =========================================================================
      // FLOW 1: Dashboard (Executive Dashboard)
      // =========================================================================
      console.log(`\n[Flow 1] Executive Dashboard`);
      if (stage === 'nachher') {
        await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/dashboard` });
      } else {
        await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/` });
      }
      await client.waitForSelector('main', 5000);
      await new Promise((r) => setTimeout(r, 500));

      await client.assert(
        `document.querySelector('header h1')?.textContent?.includes("Executive Dashboard") || document.body.innerText.includes("Executive Dashboard")`,
        'Dashboard view header present'
      );
      await client.checkOverflow(`Dashboard-${vp.name}`);
      await client.captureScreenshot(`dashboard-${vp.name}-${stage}.png`);

      // =========================================================================
      // FLOW 2: Company Profile (Unternehmenssteckbrief Deep Link)
      // =========================================================================
      console.log(`\n[Flow 2] Company Profile Deep Link`);
      if (stage === 'nachher') {
        // Deep Link direct navigation
        await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/company/profile` });
        await new Promise((r) => setTimeout(r, 600));
        await client.assert(
          `window.location.pathname === "/company/profile"`,
          'Pathname is /company/profile'
        );

        // Reload test: reload and verify path and content remain intact
        await client.send('Page.reload');
        await new Promise((r) => setTimeout(r, 600));
        await client.assert(
          `window.location.pathname === "/company/profile"`,
          'Pathname remains /company/profile after reload'
        );
      } else {
        await clickBaselineNavItem('s-profil');
      }
      await client.assert(
        `document.querySelector('header h1')?.textContent?.includes("Unternehmenssteckbrief") || document.body.innerText.includes("Unternehmenssteckbrief")`,
        'Company profile view header/content present'
      );
      await client.checkOverflow(`CompanyProfile-${vp.name}`);
      await client.captureScreenshot(`company-profile-${vp.name}-${stage}.png`);

      // =========================================================================
      // FLOW 3: CRM Deals Route
      // =========================================================================
      console.log(`\n[Flow 3] CRM Deals Route`);
      if (stage === 'nachher') {
        await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/crm/deals` });
        await new Promise((r) => setTimeout(r, 600));
        await client.assert(
          `window.location.pathname === "/crm/deals"`,
          'Pathname is /crm/deals'
        );

        // History Back/Forward test: navigate to /company/profile, go back
        await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/company/profile` });
        await new Promise((r) => setTimeout(r, 500));
        await client.eval(`window.history.back();`);
        await new Promise((r) => setTimeout(r, 500));
        await client.assert(
          `window.location.pathname === "/crm/deals"`,
          'History back restored /crm/deals'
        );
      } else {
        await clickBaselineNavItem('s-deals');
      }
      await client.assert(
        `document.querySelector('header h1')?.textContent?.includes("Deal Pipeline") || document.body.innerText.includes("Deal Pipeline")`,
        'CRM Deals view header/content present'
      );
      await client.checkOverflow(`CrmDeals-${vp.name}`);
      await client.captureScreenshot(`crm-deals-${vp.name}-${stage}.png`);

      // =========================================================================
      // FLOW 4: Organisation Team Route
      // =========================================================================
      console.log(`\n[Flow 4] Organisation Team Route`);
      if (stage === 'nachher') {
        await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/organisation/team` });
        await new Promise((r) => setTimeout(r, 600));
        await client.assert(
          `window.location.pathname === "/organisation/team"`,
          'Pathname is /organisation/team'
        );
      } else {
        await clickBaselineNavItem('s-team');
      }
      await client.assert(
        `document.querySelector('header h1')?.textContent?.includes("Teamstruktur & Engpässe") || document.body.innerText.includes("Teamstruktur & Engpässe") || document.body.innerText.includes("Teamstruktur")`,
        'Organisation Team view header/content present'
      );
      await client.checkOverflow(`OrganisationTeam-${vp.name}`);
      await client.captureScreenshot(`organisation-team-${vp.name}-${stage}.png`);

      // =========================================================================
      // FLOW 5: Mobile Sidebar Drawer
      // =========================================================================
      console.log(`\n[Flow 5] Mobile Sidebar Drawer`);
      if (vp.isMobile) {
        // Open drawer
        await client.eval(`
          const btn = document.getElementById('mobile-menu-trigger');
          if (btn) btn.click();
        `);
        await new Promise((r) => setTimeout(r, 400));
        await client.checkOverflow(`MobileDrawer-${vp.name}`);
        await client.captureScreenshot(`mobile-sidebar-${vp.name}-${stage}.png`);

        // Close drawer
        await client.eval(`
          const closeBtn = document.querySelector('[aria-label="Menü schließen"]');
          if (closeBtn) closeBtn.click();
        `);
        await new Promise((r) => setTimeout(r, 300));
      } else {
        // On desktop, capture sidebar in default layout
        await client.checkOverflow(`SidebarDesktop-${vp.name}`);
        await client.captureScreenshot(`mobile-sidebar-${vp.name}-${stage}.png`);
      }

      // =========================================================================
      // FLOW 6: Unknown Route (404 Not Found Page)
      // =========================================================================
      console.log(`\n[Flow 6] Unknown Route / 404`);
      await client.send('Page.navigate', {
        url: `http://localhost:${PREVIEW_PORT}/non-existent-sample-page-404`,
      });
      await new Promise((r) => setTimeout(r, 600));

      if (stage === 'nachher') {
        await client.assert(
          `document.body.innerText.includes("Seite nicht gefunden") && document.body.innerText.includes("404")`,
          '404 page rendered'
        );
        await client.assert(
          `!!document.querySelector('[data-testid="not-found-home-link"]')`,
          'Back to dashboard link present'
        );

        // Test link navigation back to dashboard
        await client.eval(`
          const link = document.querySelector('[data-testid="not-found-home-link"]');
          if (link) link.click();
        `);
        await new Promise((r) => setTimeout(r, 400));
        await client.assert(
          `window.location.pathname === "/dashboard"`,
          'Returned to /dashboard via home link'
        );
        // Re-navigate to 404 for accurate screenshot
        await client.send('Page.navigate', {
          url: `http://localhost:${PREVIEW_PORT}/non-existent-sample-page-404`,
        });
        await new Promise((r) => setTimeout(r, 400));
      }
      await client.checkOverflow(`UnknownRoute404-${vp.name}`);
      await client.captureScreenshot(`unknown-route-404-${vp.name}-${stage}.png`);
    }

    console.log(`\n=======================================================`);
    console.log(`🎉 ALL 18 SCREENSHOTS CAPTURED SUCCESSFULLY FOR STAGE: ${stage.toUpperCase()}`);
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
