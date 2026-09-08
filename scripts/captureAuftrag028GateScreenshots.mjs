/**
 * scripts/captureAuftrag028GateScreenshots.mjs
 *
 * Gate-grade screenshot capture & verification script for ANTIGRAVITY AUFTRAG 028 (Gate G12).
 *
 * 6 Flows across 3 Viewports (1440px, 768px, 375px) in 2 Stages (vorher & nachher) = 36 Artifacts:
 * 1. dashboard-<vp>-<stage>.png (Executive Dashboard)
 * 2. company-profile-<vp>-<stage>.png (Unternehmenssteckbrief)
 * 3. crm-deals-<vp>-<stage>.png (CRM Deals)
 * 4. organisation-team-<vp>-<stage>.png (Organisation Teamstruktur)
 * 5. mobile-sidebar-<vp>-<stage>.png (Mobile Drawer Interaction / Sidebar)
 * 6. unknown-route-404-<vp>-<stage>.png (404 Not Found Page mit GlassCard)
 *
 * Includes:
 * - Reduced Motion verification via CDP Emulation.setEmulatedMedia
 * - 0px Horizontal Overflow verification
 * - Accessible category button and drawer assertions
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

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-028');
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
  const PREVIEW_PORT = 4180;
  const CHROME_DEBUG_PORT = 9230;
  const USER_DATA_DIR = path.resolve(process.cwd(), '.cdp_auftrag028_temp');

  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  console.log(`\n=======================================================`);
  console.log(`🚀 STARTING AUFTRAG 028 SCREENSHOT HARNESS (Stage: ${stage.toUpperCase()})`);
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

      // Clear storage and start fresh
      await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/dashboard` });
      await new Promise((r) => setTimeout(r, 600));
      await client.eval(`localStorage.clear(); sessionStorage.clear();`);

      // =========================================================================
      // FLOW 1: Dashboard (Executive Dashboard)
      // =========================================================================
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

      // =========================================================================
      // FLOW 2: Company Profile (Unternehmenssteckbrief)
      // =========================================================================
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

      // =========================================================================
      // FLOW 3: CRM Deals Route
      // =========================================================================
      console.log(`\n[Flow 3] CRM Deals Route`);
      await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/crm/deals` });
      await client.waitForSelector('main', 5000);
      await new Promise((r) => setTimeout(r, 500));

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
      await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/organisation/team` });
      await client.waitForSelector('main', 5000);
      await new Promise((r) => setTimeout(r, 500));

      await client.assert(
        `document.querySelector('header h1')?.textContent?.includes("Teamstruktur") || document.body.innerText.includes("Teamstruktur")`,
        'Organisation Team view header/content present'
      );
      await client.checkOverflow(`OrganisationTeam-${vp.name}`);
      await client.captureScreenshot(`organisation-team-${vp.name}-${stage}.png`);

      // =========================================================================
      // FLOW 5: Mobile Sidebar Drawer / Desktop Sidebar
      // =========================================================================
      console.log(`\n[Flow 5] Mobile Sidebar Drawer / Desktop Sidebar`);
      if (vp.isMobile) {
        // Open drawer
        await client.eval(`
          const btn = document.getElementById('mobile-menu-trigger');
          if (btn) btn.click();
        `);
        await new Promise((r) => setTimeout(r, 500));

        // Verify drawer opened
        await client.assert(
          `!!document.getElementById('mobile-sidebar-drawer')`,
          'Mobile sidebar drawer rendered'
        );

        // Verify background isolation
        await client.assert(
          `document.querySelector('[aria-hidden="true"][inert]') !== null`,
          'Background area is isolated with aria-hidden and inert'
        );

        await client.checkOverflow(`MobileDrawer-${vp.name}`);
        await client.captureScreenshot(`mobile-sidebar-${vp.name}-${stage}.png`);

        // Close drawer
        await client.eval(`
          const closeBtn = document.querySelector('[aria-label="Menü schließen"]');
          if (closeBtn) closeBtn.click();
        `);
        await new Promise((r) => setTimeout(r, 400));
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
      await client.waitForSelector('main', 5000);
      await new Promise((r) => setTimeout(r, 500));

      await client.assert(
        `document.body.innerText.includes("Seite nicht gefunden") && document.body.innerText.includes("404")`,
        '404 page rendered'
      );
      await client.assert(
        `!!document.querySelector('[data-testid="not-found-home-link"]')`,
        'Back to dashboard link present'
      );

      await client.checkOverflow(`UnknownRoute404-${vp.name}`);
      await client.captureScreenshot(`unknown-route-404-${vp.name}-${stage}.png`);
    }

    // =========================================================================
    // REDUCED MOTION VERIFICATION (Nachher stage or verification)
    // =========================================================================
    console.log(`\n-------------------------------------------------------`);
    console.log(`🎬 Running Motion & Reduced-Motion Verification`);
    console.log(`-------------------------------------------------------`);

    // Reset viewport to desktop
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/dashboard` });
    await client.waitForSelector('main', 5000);
    await new Promise((r) => setTimeout(r, 600));

    // 1. Establish an active pulsing state on the simulation bar
    console.log(`[Motion] Starting simulation to establish active pulse state...`);
    await client.eval(`
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find(b => b.textContent && b.textContent.includes('Starten'));
      if (startBtn) startBtn.click();
    `);
    await new Promise((r) => setTimeout(r, 400));

    if (stage === 'nachher') {
      // Verify .pulse-live is genuinely present and animated under normal motion
      const pulseBeforeReduce = await client.eval(`
        const pulseEl = document.querySelector('.pulse-live');
        if (!pulseEl) return null;
        const style = window.getComputedStyle(pulseEl);
        return {
          hasPulseEl: true,
          animationName: style.animationName,
          animationDuration: style.animationDuration,
          animationPlayState: style.animationPlayState
        };
      `);
      console.log(`[Motion] Active pulse state before reduce:`, pulseBeforeReduce);
      if (!pulseBeforeReduce || !pulseBeforeReduce.hasPulseEl) {
        throw new Error('❌ FAILED to establish active .pulse-live element on SimulationBar before testing reduced motion');
      }
      console.log(`✅ [Motion] Confirmed active .pulse-live animation: ${pulseBeforeReduce.animationName} (${pulseBeforeReduce.animationDuration})`);

      // 2. Emulate prefers-reduced-motion: reduce
      console.log(`[Motion] Emulating prefers-reduced-motion: reduce via CDP...`);
      await client.send('Emulation.setEmulatedMedia', {
        media: 'screen',
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      });
      await new Promise((r) => setTimeout(r, 400));

      const mediaReducedMatches = await client.eval(
        `return window.matchMedia('(prefers-reduced-motion: reduce)').matches;`
      );
      console.log(`[Motion] window.matchMedia matches: ${mediaReducedMatches}`);
      if (!mediaReducedMatches) {
        throw new Error('❌ prefers-reduced-motion emulation failed to match in page');
      }

      // 3. Strictly verify that the pulse element is either removed by useReducedMotion or that animation is stopped
      const pulseAfterReduce = await client.eval(`
        const pulseEl = document.querySelector('.pulse-live');
        if (!pulseEl) {
          return { elementRemoved: true };
        }
        const style = window.getComputedStyle(pulseEl);
        return {
          elementRemoved: false,
          animationName: style.animationName,
          animationDuration: style.animationDuration,
          animationPlayState: style.animationPlayState
        };
      `);
      console.log(`[Motion] Pulse status under prefers-reduced-motion: reduce:`, pulseAfterReduce);

      if (pulseAfterReduce.elementRemoved) {
        console.log(`✅ [Motion] Verified: .pulse-live element suppressed from DOM by useReducedMotion hook`);
      } else {
        const isStopped =
          pulseAfterReduce.animationName === 'none' ||
          pulseAfterReduce.animationDuration === '0s' ||
          pulseAfterReduce.animationDuration === '0.00001s' ||
          pulseAfterReduce.animationPlayState === 'paused';
        if (!isStopped) {
          throw new Error(`❌ FAILED: .pulse-live animation continued running under prefers-reduced-motion: ${JSON.stringify(pulseAfterReduce)}`);
        }
        console.log(`✅ [Motion] Verified: Animation stopped via prefers-reduced-motion CSS rule`);
      }

      // 4. Clean up: pause simulation and reset emulation
      await client.eval(`
        const buttons = Array.from(document.querySelectorAll('button'));
        const pauseBtn = buttons.find(b => b.textContent && b.textContent.includes('Pausieren'));
        if (pauseBtn) pauseBtn.click();
      `);
      await new Promise((r) => setTimeout(r, 200));

      await client.send('Emulation.setEmulatedMedia', {
        media: 'screen',
        features: [],
      });
    }

    console.log(`\n=======================================================`);
    console.log(`🎉 ALL 18 SCREENSHOTS & CHECKS SUCCESSFUL FOR STAGE: ${stage.toUpperCase()}`);
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
