/**
 * scripts/captureAuftrag026GateScreenshots.mjs
 * 
 * Gate-grade screenshot capture & verification script for ANTIGRAVITY AUFTRAG 026 (Gate G10).
 * 
 * 5 Flows across 3 Viewports (1440px, 768px, 375px) in 2 Stages (vorher & nachher) = 30 Artifacts:
 * 1. companies-search-<vp>-<stage>.png (search focused, typed term, row reduction, reset)
 * 2. deals-search-<vp>-<stage>.png (search focused, typed term, row reduction, reset)
 * 3. activities-search-<vp>-<stage>.png (search focused, typed term, row reduction, reset)
 * 4. scenario-diff-checkbox-<vp>-<stage>.png (keyboard Space toggle, hard row reduction assertion, keyboard untoggle)
 * 5. comparison-checkbox-<vp>-<stage>.png (keyboard Space toggle, strict single-toggle delta=1 assertion, 2-4 boundary assertion)
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
const previewDir = previewDirArg ? previewDirArg.split('=')[1] : process.cwd();

if (stage !== 'vorher' && stage !== 'nachher') {
  console.error('❌ Error: --stage must be either "vorher" or "nachher"');
  process.exit(1);
}

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-026');
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

  async pressSpace() {
    await this.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      windowsVirtualKeyCode: 32,
      code: 'Space',
      key: ' ',
      unmodifiedText: ' ',
      text: ' ',
    });
    await this.send('Input.dispatchKeyEvent', {
      type: 'char',
      text: ' ',
      unmodifiedText: ' ',
    });
    await new Promise((r) => setTimeout(r, 50));
    await this.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      windowsVirtualKeyCode: 32,
      code: 'Space',
      key: ' ',
      unmodifiedText: ' ',
      text: ' ',
    });
  }

  async checkOverflow(contextName) {
    const overflowReport = await this.eval(`
      const docEl = document.documentElement;
      const body = document.body;
      const docOverflowX = Math.max(0, docEl.scrollWidth - docEl.clientWidth);
      const bodyOverflowX = Math.max(0, body.scrollWidth - body.clientWidth);

      const dialogs = Array.from(document.querySelectorAll('[role="dialog"], .modal-content, [data-modal]'));
      const modalOverflows = dialogs.map((d, i) => {
        const overX = Math.max(0, d.scrollWidth - d.clientWidth);
        return { index: i, overX };
      });

      const listboxes = Array.from(document.querySelectorAll('[role="listbox"]'));
      const listboxOverflows = listboxes.map((l, i) => {
        const overX = Math.max(0, l.scrollWidth - l.clientWidth);
        return { index: i, overX };
      });

      const hasAnyOverflow = docOverflowX > 1 || bodyOverflowX > 1 || 
        modalOverflows.some(m => m.overX > 1) || 
        listboxOverflows.some(l => l.overX > 1);

      return {
        docOverflowX,
        bodyOverflowX,
        modalOverflows,
        listboxOverflows,
        hasAnyOverflow
      };
    `);

    if (!overflowReport || overflowReport.hasAnyOverflow) {
      const err = `❌ HARD OVERFLOW DETECTED in [${contextName}]: ` +
        `Doc: ${overflowReport?.docOverflowX}px, Body: ${overflowReport?.bodyOverflowX}px, ` +
        `Modals: ${JSON.stringify(overflowReport?.modalOverflows)}, ` +
        `Listboxes: ${JSON.stringify(overflowReport?.listboxOverflows)}`;
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
  const PREVIEW_PORT = 4176;
  const CHROME_DEBUG_PORT = 9226;
  const USER_DATA_DIR = path.resolve(process.cwd(), '.cdp_auftrag026_temp');

  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  console.log(`\n=======================================================`);
  console.log(`🚀 STARTING AUFTRAG 026 SCREENSHOT HARNESS (Stage: ${stage.toUpperCase()})`);
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
      console.log(`\n=======================================================`);
      console.log(`📱 TESTING VIEWPORT ${vp.width}x${vp.height} (${vp.name}px)`);
      console.log(`=======================================================`);

      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.isMobile,
      });

      // Navigation helper
      const navigateToView = async (navId, labelSubstring) => {
        await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}` });
        await new Promise((r) => setTimeout(r, 600));

        await client.eval(`
          localStorage.clear();
          sessionStorage.clear();
        `);

        await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}` });
        await new Promise((r) => setTimeout(r, 800));

        if (vp.isMobile) {
          await client.eval(`
            const trigger = document.getElementById('mobile-menu-trigger') ||
              Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('Menü'));
            if (trigger) trigger.click();
          `);
          await new Promise((r) => setTimeout(r, 400));
        }

        const navSuccess = await client.eval(`
          const catHeaders = Array.from(document.querySelectorAll('nav div, aside div')).filter(d => d.textContent && (d.textContent.includes('CRM') || d.textContent.includes('Pipeline') || d.textContent.includes('Simulation')));
          catHeaders.forEach(h => {
            if (h.children && h.children.length > 0) h.click();
          });

          const navItem = document.querySelector('[data-testid="nav-item-${navId}"]') ||
            Array.from(document.querySelectorAll('aside button, aside div, nav div, nav button')).find(el => el.textContent && (el.textContent.includes('${labelSubstring}') || el.textContent.includes('${navId}')));
          if (navItem) {
            navItem.click();
            return true;
          }
          return false;
        `);
        console.log(`[${vp.name}px] Navigated to ${navId} (${labelSubstring}): ${navSuccess}`);
        await new Promise((r) => setTimeout(r, 800));
      };

      // -------------------------------------------------------------
      // Flow 1: Companies Search Input
      // -------------------------------------------------------------
      console.log(`\n--- [${vp.name}px] Flow 1: Companies Search Input ---`);
      await navigateToView('s-companies', 'Unternehmen');

      const initialCompanyRows = await client.eval(`return document.querySelectorAll('tbody tr').length;`);
      console.log(`[${vp.name}px] Initial Companies rows: ${initialCompanyRows}`);
      if (initialCompanyRows !== 20) throw new Error(`Expected 20 initial company rows, got ${initialCompanyRows}`);

      await client.eval(`
        const input = document.querySelector('input[type="search"], input[placeholder*="Unternehmen"]');
        if (input) {
          input.focus();
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(input, 'Cloud');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      `);
      await new Promise((r) => setTimeout(r, 400));

      const filteredCompanyRows = await client.eval(`return document.querySelectorAll('tbody tr').length;`);
      console.log(`[${vp.name}px] Filtered Companies rows for 'Cloud': ${filteredCompanyRows}`);
      if (filteredCompanyRows >= initialCompanyRows || filteredCompanyRows === 0) {
        throw new Error(`Expected search to reduce company rows (< 20 and > 0), got ${filteredCompanyRows}`);
      }

      await client.checkOverflow(`Flow 1: companies-search-${vp.name}`);
      await client.captureScreenshot(`companies-search-${vp.name}-${stage}.png`);

      await client.eval(`
        const input = document.querySelector('input[type="search"], input[placeholder*="Unternehmen"]');
        if (input) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(input, '');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      `);
      await new Promise((r) => setTimeout(r, 300));
      const resetCompanyRows = await client.eval(`return document.querySelectorAll('tbody tr').length;`);
      if (resetCompanyRows !== 20) throw new Error(`Expected 20 rows after reset, got ${resetCompanyRows}`);
      console.log(`✅ [${vp.name}px] Companies search input & row reduction verified successfully!`);

      // -------------------------------------------------------------
      // Flow 2: Deals Search Input
      // -------------------------------------------------------------
      console.log(`\n--- [${vp.name}px] Flow 2: Deals Search Input ---`);
      await navigateToView('s-deals', 'Deal Pipeline');

      const initialDealRows = await client.eval(`return document.querySelectorAll('tbody tr').length;`);
      console.log(`[${vp.name}px] Initial Deals rows: ${initialDealRows}`);
      if (initialDealRows !== 40) throw new Error(`Expected 40 initial deal rows, got ${initialDealRows}`);

      await client.eval(`
        const input = document.querySelector('input[type="search"], input[placeholder*="Deal"]');
        if (input) {
          input.focus();
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(input, 'FinTech');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      `);
      await new Promise((r) => setTimeout(r, 400));

      const filteredDealRows = await client.eval(`return document.querySelectorAll('tbody tr').length;`);
      console.log(`[${vp.name}px] Filtered Deals rows for 'FinTech': ${filteredDealRows}`);
      if (filteredDealRows >= initialDealRows || filteredDealRows === 0) {
        throw new Error(`Expected search to reduce deal rows (< 40 and > 0), got ${filteredDealRows}`);
      }

      await client.checkOverflow(`Flow 2: deals-search-${vp.name}`);
      await client.captureScreenshot(`deals-search-${vp.name}-${stage}.png`);

      await client.eval(`
        const input = document.querySelector('input[type="search"], input[placeholder*="Deal"]');
        if (input) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(input, '');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      `);
      await new Promise((r) => setTimeout(r, 300));
      const resetDealRows = await client.eval(`return document.querySelectorAll('tbody tr').length;`);
      if (resetDealRows !== 40) throw new Error(`Expected 40 rows after reset, got ${resetDealRows}`);
      console.log(`✅ [${vp.name}px] Deals search input & row reduction verified successfully!`);

      // -------------------------------------------------------------
      // Flow 3: Activities Search Input
      // -------------------------------------------------------------
      console.log(`\n--- [${vp.name}px] Flow 3: Activities Search Input ---`);
      await navigateToView('s-activities', 'Aktivitäten');

      const initialActivityRows = await client.eval(`return document.querySelectorAll('tbody tr').length;`);
      console.log(`[${vp.name}px] Initial Activities rows: ${initialActivityRows}`);
      if (initialActivityRows !== 10) throw new Error(`Expected 10 initial activity rows, got ${initialActivityRows}`);

      await client.eval(`
        const input = document.querySelector('input[type="search"], input[placeholder*="Projekt"]');
        if (input) {
          input.focus();
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(input, 'Meeting');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      `);
      await new Promise((r) => setTimeout(r, 400));

      const filteredActivityRows = await client.eval(`return document.querySelectorAll('tbody tr').length;`);
      console.log(`[${vp.name}px] Filtered Activities rows for 'Meeting': ${filteredActivityRows}`);
      if (filteredActivityRows >= initialActivityRows || filteredActivityRows === 0) {
        throw new Error(`Expected search to reduce activity rows (< 10 and > 0), got ${filteredActivityRows}`);
      }

      await client.checkOverflow(`Flow 3: activities-search-${vp.name}`);
      await client.captureScreenshot(`activities-search-${vp.name}-${stage}.png`);

      await client.eval(`
        const input = document.querySelector('input[type="search"], input[placeholder*="Projekt"]');
        if (input) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(input, '');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      `);
      await new Promise((r) => setTimeout(r, 300));
      const resetActivityRows = await client.eval(`return document.querySelectorAll('tbody tr').length;`);
      if (resetActivityRows !== 10) throw new Error(`Expected 10 rows after reset, got ${resetActivityRows}`);
      console.log(`✅ [${vp.name}px] Activities search input & row reduction verified successfully!`);

      // -------------------------------------------------------------
      // Flow 4: Scenario Diff Checkbox in ScenarioManagerModal
      // -------------------------------------------------------------
      console.log(`\n--- [${vp.name}px] Flow 4: Scenario Diff Checkbox ---`);
      await navigateToView('s-live-simulation', 'Live-Simulation');

      const openedScenarioModal = await client.eval(`
        const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Szenarien & Parameter'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      `);
      if (!openedScenarioModal) throw new Error('Could not open ScenarioManagerModal');
      await new Promise((r) => setTimeout(r, 600));

      await client.waitForSelector('[role="dialog"]');

      // Create 3 additional versions (v2, v3, v4) for rich multi-scenario comparison
      for (let i = 2; i <= 4; i++) {
        await client.eval(`
          const tab = document.querySelector('[data-testid="scenario-manage-tab"]');
          if (tab) tab.click();
        `);
        await new Promise((r) => setTimeout(r, 300));

        await client.eval(`
          const createBtn = Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.textContent && b.textContent.includes('Neue Version'));
          if (createBtn) createBtn.click();
        `);
        await new Promise((r) => setTimeout(r, 400));

        await client.eval(`
          const descInput = document.querySelector('[role="dialog"] input[placeholder*="Marketing-Ausgaben"]') || document.querySelector('[role="dialog"] form input');
          if (descInput) {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(descInput, 'Szenario Variante v' + ${i});
            descInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          const form = document.querySelector('[role="dialog"] form');
          if (form) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.click();
            else if (form.requestSubmit) form.requestSubmit();
          }
        `);
        await new Promise((r) => setTimeout(r, 500));
      }

      // Switch to diff tab
      await client.eval(`
        const diffTab = document.querySelector('[data-testid="scenario-diff-tab"]');
        if (diffTab) diffTab.click();
      `);
      await new Promise((r) => setTimeout(r, 500));

      const initialDiffRows = await client.eval(`
        return document.querySelectorAll('[role="dialog"] tbody tr').length;
      `);
      console.log(`[${vp.name}px] Initial parameter diff rows: ${initialDiffRows}`);

      // Focus checkbox & assert activeElement and initial checked state
      const focusDiffResult = await client.eval(`
        const cb = document.querySelector('[role="dialog"] input[type="checkbox"]');
        if (!cb) return { found: false };
        cb.focus();
        return {
          found: true,
          isActive: document.activeElement === cb,
          beforeChecked: cb.checked
        };
      `);
      if (!focusDiffResult.found) throw new Error('Scenario diff checkbox not found');
      if (!focusDiffResult.isActive) throw new Error('Scenario diff checkbox must be activeElement after focus()');
      if (focusDiffResult.beforeChecked !== false) throw new Error('Scenario diff checkbox should initially be unchecked');

      // Toggle checkbox strictly via Space key
      await client.pressSpace();
      await new Promise((r) => setTimeout(r, 400));

      // Hard assertion: cb.checked must have changed to true strictly by Space key (NO mouse fallback)
      const isDiffCbChecked = await client.eval(`
        const cb = document.querySelector('[role="dialog"] input[type="checkbox"]');
        return cb ? cb.checked : false;
      `);
      console.log(`[${vp.name}px] Parameter diff checkbox checked via Space: ${isDiffCbChecked}`);
      if (!isDiffCbChecked) {
        throw new Error('❌ KEYBOARD ASSERTION FAILED: Scenario diff checkbox was not toggled by Space key!');
      }

      // Hard assertion: filtered diff rows must be strictly < initialDiffRows and > 0
      const filteredDiffRows = await client.eval(`
        return document.querySelectorAll('[role="dialog"] tbody tr').length;
      `);
      console.log(`[${vp.name}px] Filtered parameter diff rows: ${filteredDiffRows} (initial: ${initialDiffRows})`);
      if (filteredDiffRows >= initialDiffRows || filteredDiffRows === 0) {
        throw new Error(`Expected filtered parameter diff rows (< ${initialDiffRows} and > 0), got ${filteredDiffRows}`);
      }

      await client.checkOverflow(`Flow 4: scenario-diff-checkbox-${vp.name}`);
      await client.captureScreenshot(`scenario-diff-checkbox-${vp.name}-${stage}.png`);

      // Reset checkbox strictly via Space key / untoggle
      const focusUntoggleResult = await client.eval(`
        const cb = document.querySelector('[role="dialog"] input[type="checkbox"]');
        if (!cb) return { found: false };
        cb.focus();
        return {
          found: true,
          isActive: document.activeElement === cb,
          beforeChecked: cb.checked
        };
      `);
      if (!focusUntoggleResult.isActive) throw new Error('Scenario diff checkbox must be activeElement before untoggle');
      if (focusUntoggleResult.beforeChecked !== true) throw new Error('Scenario diff checkbox must be checked before untoggle');

      await client.pressSpace();
      await new Promise((r) => setTimeout(r, 400));

      const isUntoggledChecked = await client.eval(`
        const cb = document.querySelector('[role="dialog"] input[type="checkbox"]');
        return cb ? cb.checked : true;
      `);
      console.log(`[${vp.name}px] Parameter diff checkbox untoggled via Space: ${!isUntoggledChecked}`);
      if (isUntoggledChecked !== false) {
        throw new Error('❌ KEYBOARD ASSERTION FAILED: Scenario diff checkbox was not untoggled by Space key!');
      }

      const restoredDiffRows = await client.eval(`
        return document.querySelectorAll('[role="dialog"] tbody tr').length;
      `);
      console.log(`[${vp.name}px] Restored parameter diff rows: ${restoredDiffRows}`);
      if (restoredDiffRows !== initialDiffRows) {
        throw new Error(`Expected restored parameter diff rows to equal ${initialDiffRows}, got ${restoredDiffRows}`);
      }

      await client.eval(`
        const closeBtn = document.querySelector('button[aria-label="Dialog schließen"]') ||
                         document.querySelector('[role="dialog"] button');
        if (closeBtn) closeBtn.click();
      `);
      await new Promise((r) => setTimeout(r, 500));
      console.log(`✅ [${vp.name}px] Scenario diff checkbox keyboard Space toggle, untoggle & row reduction verified successfully!`);

      // -------------------------------------------------------------
      // Flow 5: Multi-Scenario Comparison Checkbox & Single-Toggle Assertion
      // -------------------------------------------------------------
      console.log(`\n--- [${vp.name}px] Flow 5: Multi-Scenario Comparison Checkbox ---`);

      const openedCompareModal = await client.eval(`
        const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Szenariovergleich (3–4)'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      `);
      if (!openedCompareModal) throw new Error('Could not open MultiScenarioComparisonModal');
      await new Promise((r) => setTimeout(r, 800));

      await client.waitForSelector('[role="dialog"]');
      await new Promise((r) => setTimeout(r, 500));

      const initialSelectedCount = await client.eval(`
        return Array.from(document.querySelectorAll('[role="dialog"] [data-testid="compare-scenario-card"] input[type="checkbox"]')).filter(cb => cb.checked).length;
      `);
      console.log(`[${vp.name}px] Initial selected scenario versions: ${initialSelectedCount}`);
      if (initialSelectedCount < 2) {
        throw new Error(`Expected at least 2 selected versions for comparison, got ${initialSelectedCount}`);
      }

      // Focus first scenario checkbox & assert activeElement and initial checked state
      const focusCompareResult = await client.eval(`
        const cards = document.querySelectorAll('[data-testid="compare-scenario-card"]');
        if (cards.length === 0) return { found: false };
        const cb = cards[0].querySelector('input[type="checkbox"]');
        if (!cb) return { found: false };
        cb.focus();
        return {
          found: true,
          isActive: document.activeElement === cb,
          beforeChecked: cb.checked
        };
      `);
      if (!focusCompareResult.found) throw new Error('First scenario compare card checkbox not found');
      if (!focusCompareResult.isActive) throw new Error('First scenario checkbox must be activeElement after focus()');

      // Toggle first scenario checkbox strictly via Space key (NO mouse fallback)
      await client.pressSpace();
      await new Promise((r) => setTimeout(r, 500));

      const afterToggleChecked = await client.eval(`
        const cards = document.querySelectorAll('[data-testid="compare-scenario-card"]');
        const cb = cards[0]?.querySelector('input[type="checkbox"]');
        return cb ? cb.checked : null;
      `);
      console.log(`[${vp.name}px] First scenario checkbox checked state changed: from ${focusCompareResult.beforeChecked} to ${afterToggleChecked}`);
      if (afterToggleChecked === focusCompareResult.beforeChecked) {
        throw new Error('❌ KEYBOARD ASSERTION FAILED: Scenario checkbox state did not change upon Space key press!');
      }

      const afterToggleCount = await client.eval(`
        return Array.from(document.querySelectorAll('[role="dialog"] [data-testid="compare-scenario-card"] input[type="checkbox"]')).filter(cb => cb.checked).length;
      `);
      console.log(`[${vp.name}px] Selected scenario versions after 1 toggle: ${afterToggleCount}`);

      // Strict single-toggle assertion: difference must be EXACTLY 1 (never 0 or 2!)
      const deltaCount = Math.abs(afterToggleCount - initialSelectedCount);
      if (deltaCount !== 1) {
        throw new Error(`Double-toggle or no-toggle detected in scenario selection! Expected delta of 1, got ${deltaCount} (from ${initialSelectedCount} to ${afterToggleCount})`);
      }

      // Strict boundary check: after toggle must remain between 2 and 4
      if (afterToggleCount < 2 || afterToggleCount > 4) {
        throw new Error(`Expected scenario selection count to remain between 2 and 4, got ${afterToggleCount}`);
      }

      await client.checkOverflow(`Flow 5: comparison-checkbox-${vp.name}`);
      await client.captureScreenshot(`comparison-checkbox-${vp.name}-${stage}.png`);

      // Close modal
      await client.eval(`
        const closeBtn = document.querySelector('button[aria-label="Dialog schließen"]') ||
                         document.querySelector('[role="dialog"] button');
        if (closeBtn) closeBtn.click();
      `);
      await new Promise((r) => setTimeout(r, 400));
      console.log(`✅ [${vp.name}px] Multi-scenario comparison checkbox & single-toggle verified strictly via Space key!`);
    }

    console.log(`\n=======================================================`);
    console.log(`🎉 ALL 5 FLOWS FOR STAGE [${stage}] CAPTURED & VERIFIED SUCCESSFULLY!`);
    console.log(`=======================================================\n`);
  } finally {
    await client.close();
    chromeProcess.kill();
    previewProcess.kill();
    await new Promise((r) => setTimeout(r, 500));
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error('\n❌ SCRIPT TERMINATED WITH FATAL ERROR:', err);
  process.exit(1);
});
