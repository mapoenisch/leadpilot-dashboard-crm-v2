/**
 * scripts/captureAuftrag025GateScreenshots.mjs
 * 
 * Gate-grade screenshot capture & verification script for ANTIGRAVITY AUFTRAG 025 (Gate G9).
 * 
 * Verified Behaviors:
 * 1. Filter effect & aria-selected:
 *    - Opens Select combobox, captures open state with design tokens.
 *    - Selects a specific non-ALL filter option, asserts aria-selected="true".
 *    - Asserts that the table/list row count actively reduces, proving actual filter effect.
 * 2. Reproduce-Guard validation:
 *    - Tests empty selection in RunActionModal.
 *    - Clicks "Reproduzieren" and asserts that validation error alert "Bitte wählen Sie einen Run zum Reproduzieren aus." appears.
 * 3. Exact 0-Overflow assertions:
 *    - Checks scrollWidth <= clientWidth + 1 on document, body, modals, listboxes.
 * 4. Separate Worktree execution for Vorher (a331e39) and Nachher (4487543).
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

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-025');
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
  const PREVIEW_PORT = 4175;
  const CHROME_DEBUG_PORT = 9225;
  const USER_DATA_DIR = path.resolve(process.cwd(), '.cdp_auftrag025_temp');

  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  console.log(`\n=======================================================`);
  console.log(`🚀 STARTING AUFTRAG 025 SCREENSHOT HARNESS (Stage: ${stage.toUpperCase()})`);
  console.log(`📁 Preview Directory: ${previewDir}`);
  console.log(`=======================================================\n`);

  // 1. Start preview server
  console.log(`[Preview Server] Starting vite preview in ${previewDir} on port ${PREVIEW_PORT}...`);
  const previewProcess = spawn('npx', ['vite', 'preview', '--port', String(PREVIEW_PORT), '--strictPort'], {
    cwd: previewDir,
    stdio: 'pipe',
  });

  previewProcess.stderr.on('data', (d) => console.error(`[Preview Err] ${d}`));

  // Wait for preview server ready
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

  // Wait for Chrome CDP ready
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

      // Navigate to root, clear storage, reload
      await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}` });
      await new Promise((r) => setTimeout(r, 1000));

      await client.eval(`
        localStorage.clear();
        sessionStorage.clear();
      `);

      await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}` });
      await new Promise((r) => setTimeout(r, 1200));

      // Helper for navigation
      const navigateToView = async (navId, labelSubstring) => {
        if (vp.isMobile) {
          await client.eval(`
            const trigger = document.getElementById('mobile-menu-trigger') ||
              Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('Menü'));
            if (trigger) trigger.click();
          `);
          await new Promise((r) => setTimeout(r, 500));
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
        await new Promise((r) => setTimeout(r, 1200));
      };

      // -------------------------------------------------------------
      // Flow 1: Companies View Filter Open & Filter Verification
      // -------------------------------------------------------------
      console.log(`\n--- [${vp.name}px] Flow 1: Companies View Filter ---`);
      await navigateToView('s-companies', 'Unternehmen');

      const initialCompanyRows = await client.eval(`return document.querySelectorAll('tbody tr').length;`);
      console.log(`[${vp.name}px] Initial Companies rows: ${initialCompanyRows}`);
      if (initialCompanyRows !== 20) throw new Error(`Expected 20 initial company rows, got ${initialCompanyRows}`);

      if (stage === 'nachher') {
        const clickedTrigger = await client.eval(`
          const triggers = Array.from(document.querySelectorAll('button[role="combobox"]'));
          if (triggers.length > 0) {
            triggers[0].click();
            return true;
          }
          return false;
        `);
        if (!clickedTrigger) throw new Error('Could not find combobox trigger in CompaniesView');
        await new Promise((r) => setTimeout(r, 300));

        await client.assert(
          `document.querySelector('button[role="combobox"]').getAttribute('aria-expanded') === 'true'`,
          'Combobox aria-expanded must be true'
        );
        await client.assert(
          `!!document.querySelector('ul[role="listbox"]')`,
          'Listbox must be open and visible'
        );
        await client.assert(
          `document.querySelectorAll('li[role="option"]').length >= 2`,
          'Listbox must contain at least 2 options'
        );

        await client.checkOverflow(`Flow 1: companies-filter-open-${vp.name}`);
        await client.captureScreenshot(`companies-filter-open-${vp.name}-${stage}.png`);

        // Test option selection and verify filter effect
        const selectedLabel = await client.eval(`
          const options = Array.from(document.querySelectorAll('li[role="option"]'));
          if (options.length > 1) {
            const opt = options[1];
            const text = (opt.textContent || '').trim();
            opt.click();
            return text;
          }
          return null;
        `);
        console.log(`[${vp.name}px] Selected industry option: "${selectedLabel}"`);
        await new Promise((r) => setTimeout(r, 400));

        // Reopen to check aria-selected="true" on selected option
        await client.eval(`
          const trigger = document.querySelector('button[role="combobox"]');
          if (trigger) trigger.click();
        `);
        await new Promise((r) => setTimeout(r, 200));

        await client.assert(
          `Array.from(document.querySelectorAll('li[role="option"]')).some(opt => opt.getAttribute('aria-selected') === 'true')`,
          'Selected option must have aria-selected="true"'
        );

        // Close listbox
        await client.eval(`
          const trigger = document.querySelector('button[role="combobox"]');
          if (trigger) trigger.click();
        `);
        await new Promise((r) => setTimeout(r, 200));

        // Check active table filtering
        const filteredCompanyRows = await client.eval(`return document.querySelectorAll('tbody tr').length;`);
        console.log(`[${vp.name}px] Filtered Companies rows: ${filteredCompanyRows} (Initial was ${initialCompanyRows})`);
        if (filteredCompanyRows >= initialCompanyRows || filteredCompanyRows === 0) {
          throw new Error(`Filter effect failure in CompaniesView: expected rows < 20 and > 0, got ${filteredCompanyRows}`);
        }
        console.log(`✅ [${vp.name}px] CompaniesView filter effect & aria-selected verified successfully!`);
      } else {
        // Vorher: Focus native select and capture focused native select state
        await client.eval(`
          const sel = document.querySelector('select');
          if (sel) { sel.focus(); }
        `);
        await new Promise((r) => setTimeout(r, 300));

        await client.checkOverflow(`Flow 1: companies-filter-open-${vp.name}`);
        await client.captureScreenshot(`companies-filter-open-${vp.name}-${stage}.png`);

        // Test native select filter change
        await client.eval(`
          const sel = document.querySelector('select');
          if (sel && sel.options.length > 1) {
            sel.value = sel.options[1].value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        `);
        await new Promise((r) => setTimeout(r, 400));
        const filteredCompanyRows = await client.eval(`return document.querySelectorAll('tbody tr').length;`);
        console.log(`[${vp.name}px] (Vorher) Filtered Companies rows: ${filteredCompanyRows}`);
      }

      // -------------------------------------------------------------
      // Flow 2: Deals View Filter Open & Filter Verification
      // -------------------------------------------------------------
      console.log(`\n--- [${vp.name}px] Flow 2: Deals View Filter ---`);
      await navigateToView('s-deals', 'Deal Pipeline');

      const initialDealRows = await client.eval(`return document.querySelectorAll('tbody tr').length;`);
      console.log(`[${vp.name}px] Initial Deals rows: ${initialDealRows}`);
      if (initialDealRows !== 40) throw new Error(`Expected 40 initial deal rows, got ${initialDealRows}`);

      if (stage === 'nachher') {
        const clickedTrigger = await client.eval(`
          const triggers = Array.from(document.querySelectorAll('button[role="combobox"]'));
          if (triggers.length > 0) {
            triggers[0].click();
            return true;
          }
          return false;
        `);
        if (!clickedTrigger) throw new Error('Could not find combobox trigger in DealsView');
        await new Promise((r) => setTimeout(r, 300));

        await client.assert(
          `document.querySelector('button[role="combobox"]').getAttribute('aria-expanded') === 'true'`,
          'Combobox aria-expanded must be true'
        );
        await client.assert(
          `!!document.querySelector('ul[role="listbox"]')`,
          'Listbox must be open and visible'
        );
        await client.assert(
          `document.querySelectorAll('li[role="option"]').length >= 2`,
          'Listbox must contain at least 2 options'
        );

        await client.checkOverflow(`Flow 2: deals-filter-open-${vp.name}`);
        await client.captureScreenshot(`deals-filter-open-${vp.name}-${stage}.png`);

        // Test option selection and verify filter effect
        const selectedLabel = await client.eval(`
          const options = Array.from(document.querySelectorAll('li[role="option"]'));
          if (options.length > 1) {
            const opt = options[1];
            const text = (opt.textContent || '').trim();
            opt.click();
            return text;
          }
          return null;
        `);
        console.log(`[${vp.name}px] Selected deal stage option: "${selectedLabel}"`);
        await new Promise((r) => setTimeout(r, 400));

        // Reopen to check aria-selected="true" on selected option
        await client.eval(`
          const trigger = document.querySelector('button[role="combobox"]');
          if (trigger) trigger.click();
        `);
        await new Promise((r) => setTimeout(r, 200));

        await client.assert(
          `Array.from(document.querySelectorAll('li[role="option"]')).some(opt => opt.getAttribute('aria-selected') === 'true')`,
          'Selected option must have aria-selected="true"'
        );

        // Close listbox
        await client.eval(`
          const trigger = document.querySelector('button[role="combobox"]');
          if (trigger) trigger.click();
        `);
        await new Promise((r) => setTimeout(r, 200));

        // Check active table filtering
        const filteredDealRows = await client.eval(`return document.querySelectorAll('tbody tr').length;`);
        console.log(`[${vp.name}px] Filtered Deals rows: ${filteredDealRows} (Initial was ${initialDealRows})`);
        if (filteredDealRows >= initialDealRows || filteredDealRows === 0) {
          throw new Error(`Filter effect failure in DealsView: expected rows < 40 and > 0, got ${filteredDealRows}`);
        }
        console.log(`✅ [${vp.name}px] DealsView filter effect & aria-selected verified successfully!`);
      } else {
        await client.eval(`
          const sel = document.querySelector('select');
          if (sel) { sel.focus(); }
        `);
        await new Promise((r) => setTimeout(r, 300));

        await client.checkOverflow(`Flow 2: deals-filter-open-${vp.name}`);
        await client.captureScreenshot(`deals-filter-open-${vp.name}-${stage}.png`);

        await client.eval(`
          const sel = document.querySelector('select');
          if (sel && sel.options.length > 1) {
            sel.value = sel.options[1].value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        `);
        await new Promise((r) => setTimeout(r, 400));
        const filteredDealRows = await client.eval(`return document.querySelectorAll('tbody tr').length;`);
        console.log(`[${vp.name}px] (Vorher) Filtered Deals rows: ${filteredDealRows}`);
      }

      // -------------------------------------------------------------
      // Flow 3: Activities View Filter Open & Filter Verification
      // -------------------------------------------------------------
      console.log(`\n--- [${vp.name}px] Flow 3: Activities View Filter ---`);
      await navigateToView('s-activities', 'Aktivitäten');

      const initialActivityRows = await client.eval(`return document.querySelectorAll('tbody tr').length;`);
      console.log(`[${vp.name}px] Initial Activities rows: ${initialActivityRows}`);
      if (initialActivityRows !== 10) throw new Error(`Expected 10 initial activity rows, got ${initialActivityRows}`);

      if (stage === 'nachher') {
        const clickedTrigger = await client.eval(`
          const triggers = Array.from(document.querySelectorAll('button[role="combobox"]'));
          if (triggers.length > 0) {
            triggers[0].click();
            return true;
          }
          return false;
        `);
        if (!clickedTrigger) throw new Error('Could not find combobox trigger in ActivitiesView');
        await new Promise((r) => setTimeout(r, 300));

        await client.assert(
          `document.querySelector('button[role="combobox"]').getAttribute('aria-expanded') === 'true'`,
          'Combobox aria-expanded must be true'
        );
        await client.assert(
          `!!document.querySelector('ul[role="listbox"]')`,
          'Listbox must be open and visible'
        );
        await client.assert(
          `document.querySelectorAll('li[role="option"]').length >= 2`,
          'Listbox must contain at least 2 options'
        );

        await client.checkOverflow(`Flow 3: activities-filter-open-${vp.name}`);
        await client.captureScreenshot(`activities-filter-open-${vp.name}-${stage}.png`);

        // Test option selection and verify filter effect
        const selectedLabel = await client.eval(`
          const options = Array.from(document.querySelectorAll('li[role="option"]'));
          if (options.length > 1) {
            const opt = options[1];
            const text = (opt.textContent || '').trim();
            opt.click();
            return text;
          }
          return null;
        `);
        console.log(`[${vp.name}px] Selected activity type option: "${selectedLabel}"`);
        await new Promise((r) => setTimeout(r, 400));

        // Reopen to check aria-selected="true" on selected option
        await client.eval(`
          const trigger = document.querySelector('button[role="combobox"]');
          if (trigger) trigger.click();
        `);
        await new Promise((r) => setTimeout(r, 200));

        await client.assert(
          `Array.from(document.querySelectorAll('li[role="option"]')).some(opt => opt.getAttribute('aria-selected') === 'true')`,
          'Selected option must have aria-selected="true"'
        );

        // Close listbox
        await client.eval(`
          const trigger = document.querySelector('button[role="combobox"]');
          if (trigger) trigger.click();
        `);
        await new Promise((r) => setTimeout(r, 200));

        const filteredActivityRows = await client.eval(`return document.querySelectorAll('tbody tr').length;`);
        console.log(`[${vp.name}px] Filtered Activities rows: ${filteredActivityRows} (Initial was ${initialActivityRows})`);
        if (filteredActivityRows >= initialActivityRows || filteredActivityRows === 0) {
          throw new Error(`Filter effect failure in ActivitiesView: expected rows < ${initialActivityRows} and > 0, got ${filteredActivityRows}`);
        }
        console.log(`✅ [${vp.name}px] ActivitiesView filter effect & aria-selected verified successfully!`);
      } else {
        await client.eval(`
          const sel = document.querySelector('select');
          if (sel) { sel.focus(); }
        `);
        await new Promise((r) => setTimeout(r, 300));

        await client.checkOverflow(`Flow 3: activities-filter-open-${vp.name}`);
        await client.captureScreenshot(`activities-filter-open-${vp.name}-${stage}.png`);

        await client.eval(`
          const sel = document.querySelector('select');
          if (sel && sel.options.length > 1) {
            sel.value = sel.options[1].value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        `);
        await new Promise((r) => setTimeout(r, 400));
        const filteredActivityRows = await client.eval(`return document.querySelectorAll('tbody tr').length;`);
        console.log(`[${vp.name}px] (Vorher) Filtered Activities rows: ${filteredActivityRows}`);
        if (filteredActivityRows >= initialActivityRows || filteredActivityRows === 0) {
          throw new Error(`(Vorher) Filter effect failure in ActivitiesView: expected rows < ${initialActivityRows} and > 0, got ${filteredActivityRows}`);
        }
      }

      // -------------------------------------------------------------
      // Flow 4: Run Reproduce Select Open & Reproduce-Guard Test
      // -------------------------------------------------------------
      console.log(`\n--- [${vp.name}px] Flow 4: Run Reproduce Select & Guard ---`);
      await navigateToView('s-live-simulation', 'Live-Simulation');

      // Click "Run / Re-Run" button to open modal
      const clickedRunBtn = await client.eval(`
        const btns = Array.from(document.querySelectorAll('button'));
        const runBtn = btns.find(b => (b.textContent || '').includes('Run / Re-Run') || (b.textContent || '').includes('Run Steuerung'));
        if (runBtn) {
          runBtn.click();
          return true;
        }
        return false;
      `);
      if (!clickedRunBtn) throw new Error('Could not click Run / Re-Run button in LiveDashboardView');
      await new Promise((r) => setTimeout(r, 800));

      // Wait for modal
      await client.waitForSelector('[role="dialog"]');

      // -----------------------------------------------------------
      // TEST: Reproduce-Guard Verification on Empty Selection
      // -----------------------------------------------------------
      console.log(`[${vp.name}px] Testing Reproduce-Guard on empty selection...`);
      const clickedReproduceEmpty = await client.eval(`
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog) {
          const reproBtn = Array.from(dialog.querySelectorAll('button')).find(b => (b.textContent || '').trim() === 'Reproduzieren');
          if (reproBtn) {
            reproBtn.click();
            return true;
          }
        }
        return false;
      `);
      if (!clickedReproduceEmpty) throw new Error('Could not click Reproduzieren button in modal');
      await new Promise((r) => setTimeout(r, 400));

      // Assert that the validation error alert is shown in the modal
      await client.assert(
        `Array.from(document.querySelectorAll('[role="dialog"] *')).some(el => (el.textContent || '').includes('Bitte wählen Sie einen Run zum Reproduzieren aus.'))`,
        'Reproduce-Guard error alert "Bitte wählen Sie einen Run zum Reproduzieren aus." must appear on empty reproduce click'
      );
      console.log(`✅ [${vp.name}px] Reproduce-Guard successfully verified (validation alert shown, no run executed)!`);

      if (stage === 'nachher') {
        const clickedModalCombobox = await client.eval(`
          const dialog = document.querySelector('[role="dialog"]');
          if (dialog) {
            const combobox = dialog.querySelector('button[role="combobox"]');
            if (combobox) {
              combobox.click();
              return true;
            }
          }
          return false;
        `);
        if (!clickedModalCombobox) throw new Error('Could not find combobox in RunActionModal');
        await new Promise((r) => setTimeout(r, 300));

        await client.assert(
          `document.querySelector('[role="dialog"] button[role="combobox"]').getAttribute('aria-expanded') === 'true'`,
          'Modal combobox aria-expanded must be true'
        );
        await client.assert(
          `!!document.querySelector('[role="dialog"] ul[role="listbox"]')`,
          'Modal listbox must be open and visible'
        );

        await client.checkOverflow(`Flow 4: run-reproduce-select-${vp.name}`);
        await client.captureScreenshot(`run-reproduce-select-${vp.name}-${stage}.png`);
      } else {
        await client.eval(`
          const dialog = document.querySelector('[role="dialog"]');
          if (dialog) {
            const sel = dialog.querySelector('select');
            if (sel) sel.focus();
          }
        `);
        await new Promise((r) => setTimeout(r, 300));

        await client.checkOverflow(`Flow 4: run-reproduce-select-${vp.name}`);
        await client.captureScreenshot(`run-reproduce-select-${vp.name}-${stage}.png`);
      }

      // Close modal cleanly
      await client.eval(`
        const closeBtn = document.querySelector('button[aria-label="Dialog schließen"]') ||
                         document.querySelector('[role="dialog"] button:first-of-type') ||
                         document.querySelector('[role="dialog"] button');
        if (closeBtn) {
          closeBtn.click();
        }
      `);
      await new Promise((r) => setTimeout(r, 400));
    }

    console.log(`\n=======================================================`);
    console.log(`🎉 ALL 4 FLOWS FOR STAGE [${stage}] CAPTURED & VERIFIED SUCCESSFULLY!`);
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
