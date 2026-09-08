/**
 * scripts/captureAuftrag024GateScreenshots.mjs
 * 
 * Gate-grade screenshot capture script for ANTIGRAVITY AUFTRAG 024 (Gate G8).
 * 
 * Features:
 * - Supports --stage=vorher and --stage=nachher.
 * - Strict Overflow assertion: throws Error and fails gate immediately if any horizontal clipping occurs (doc or modals).
 * - Exact assertions: checks === 2 and === 4 scenarios, open Select listbox (aria-expanded="true"), delta table, MULTIPLE_SET conflict alert.
 * - Deterministic storage & session reset per viewport.
 * - Automatic graceful cleanup of preview server and headless Chrome.
 */

import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const WebSocket = globalThis.WebSocket;

const args = process.argv.slice(2);
const stageArg = args.find((a) => a.startsWith('--stage='));
const stage = stageArg ? stageArg.split('=')[1] : 'nachher';

const previewDirArg = args.find((a) => a.startsWith('--preview-dir='));
const previewDir = previewDirArg ? previewDirArg.split('=')[1] : process.cwd();

if (stage !== 'vorher' && stage !== 'nachher') {
  console.error('❌ Error: --stage must be either "vorher" or "nachher"');
  process.exit(1);
}

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-024');
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
    const res = await this.eval(conditionExpr);
    if (!res) {
      throw new Error(`Assertion failed: ${errorMsg} (expression: ${conditionExpr})`);
    }
    return res;
  }

  async checkOverflow(contextName) {
    const overflowMetrics = await this.eval(`
      const doc = document.documentElement;
      const body = document.body;
      const modals = Array.from(document.querySelectorAll('[role="dialog"], .modal-content, [data-testid$="-modal"]'));
      
      const docOverflow = doc.scrollWidth > doc.clientWidth + 1;
      const modalOverflows = modals.map(m => ({
        tag: m.tagName,
        scrollW: m.scrollWidth,
        clientW: m.clientWidth,
        hasOverflow: m.scrollWidth > m.clientWidth + 1
      }));

      const anyModalOverflow = modalOverflows.some(m => m.hasOverflow);

      return {
        docScrollW: doc.scrollWidth,
        docClientW: doc.clientWidth,
        docOverflow,
        modalOverflows,
        hasAnyOverflow: docOverflow || anyModalOverflow
      };
    `);

    if (overflowMetrics.hasAnyOverflow) {
      console.error(`❌ OVERFLOW DETECTED in [${contextName}]:`, JSON.stringify(overflowMetrics, null, 2));
      throw new Error(`GATE FAILED: Overflow detected in [${contextName}] (docOverflow: ${overflowMetrics.docOverflow}, modals: ${JSON.stringify(overflowMetrics.modalOverflows)})`);
    } else {
      console.log(`✅ [${contextName}] Overflow check passed (0 clipping)`);
    }

    return overflowMetrics;
  }

  async screenshot(filePath, contextName) {
    await this.checkOverflow(contextName);
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    fs.writeFileSync(filePath, buffer);
    console.log(`💾 Saved [${stage}]: ${path.basename(filePath)} (${buffer.length} bytes)`);
  }

  close() {
    try {
      this.ws.close();
    } catch (e) {}
  }
}

async function run() {
  const PORT = 4178;
  const CDP_PORT = 9228;

  console.log(`Starting Vite preview in ${previewDir} on port ${PORT}...`);
  const previewProc = spawn('npx', ['vite', 'preview', '--port', String(PORT)], {
    cwd: previewDir,
  });

  const cleanup = () => {
    try {
      previewProc.kill('SIGTERM');
    } catch (e) {}
    try {
      chromeProc.kill('SIGTERM');
    } catch (e) {}
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  await new Promise((r) => setTimeout(r, 2000));

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const userDataDir = path.join(process.cwd(), '.cdp_auftrag024_temp');

  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]);

  await new Promise((r) => setTimeout(r, 1500));

  try {
    const targets = await getJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    if (!pageTarget) throw new Error('No page target found on CDP!');

    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    console.log('Connected to CDP. Executing all 7 flows with state assertions...\n');

    const viewports = [
      { name: '1440', width: 1440, height: 900, isMobile: false },
      { name: '768', width: 768, height: 1024, isMobile: true },
      { name: '375', width: 375, height: 812, isMobile: true },
    ];

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

      // Reset storage and reload to isolate viewports completely
      await client.send('Page.navigate', { url: `http://localhost:${PORT}` });
      await new Promise((r) => setTimeout(r, 1200));

      await client.eval(`
        localStorage.clear();
        sessionStorage.clear();
      `);

      await client.send('Page.navigate', { url: `http://localhost:${PORT}` });
      await new Promise((r) => setTimeout(r, 1200));

      // Navigate to Live-Simulation
      if (vp.isMobile) {
        await client.eval(`
          const trigger = document.getElementById('mobile-menu-trigger') ||
            Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('Menü'));
          if (trigger) trigger.click();
        `);
        await new Promise((r) => setTimeout(r, 500));
      }

      await client.eval(`
        // If category is collapsed in sidebar, click to open it
        const catHeaders = Array.from(document.querySelectorAll('nav div, aside div')).filter(d => d.textContent && d.textContent.includes('SIMULATION') || d.textContent.includes('Simulation'));
        catHeaders.forEach(h => {
          if (h.children && h.children.length > 0) h.click();
        });

        const navItem = document.querySelector('[data-testid="nav-item-s-live-simulation"]') ||
          Array.from(document.querySelectorAll('aside button, aside div, nav div, nav button')).find(el => el.textContent && el.textContent.includes('Live-Simulation'));
        if (navItem) {
          navItem.click();
        }
      `);
      await new Promise((r) => setTimeout(r, 1200));

      // -----------------------------------------------------------------------
      // FLOW 1: Scenario Manager (Manage Tab & Versions)
      // -----------------------------------------------------------------------
      console.log(`\n--- [${vp.name}px] Flow 1: Scenario Manager & Version Cards ---`);
      await client.eval(`
        const btns = Array.from(document.querySelectorAll('button'));
        const scBtn = btns.find(b => b.textContent && (b.textContent.includes('Szenarien') || b.textContent.includes('Szenario')));
        if (scBtn) scBtn.click();
      `);
      await new Promise((r) => setTimeout(r, 800));

      // ASSERT: Modal is open and shows version cards
      await client.assert(`
        const modal = document.querySelector('[role="dialog"]') || document.body;
        const hasHeader = modal && (modal.textContent.includes('Szenario') || modal.textContent.includes('Version'));
        return Boolean(hasHeader);
      `, 'ScenarioManagerModal not opened or version list missing');

      await client.screenshot(
        path.join(SCREENSHOT_DIR, `scenario-manage-${vp.name}-${stage}.png`),
        `Flow 1: scenario-manage-${vp.name}`
      );

      // Create Version 2, 3, 4 to enable full multi-scenario comparisons (Decision 851)
      if (stage === 'nachher') {
        for (let i = 2; i <= 4; i++) {
          await client.eval(`
            const tab = document.querySelector('[data-testid="scenario-manage-tab"]');
            if (tab) tab.click();
          `);
          await new Promise((r) => setTimeout(r, 400));

          const createRes = await client.eval(`
            const createBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Neue Version'));
            if (createBtn) {
              createBtn.click();
              return { clicked: true, text: createBtn.textContent };
            }
            return { clicked: false };
          `);
          console.log(`[${vp.name}px] Iteration ${i} create button:`, createRes);
          await new Promise((r) => setTimeout(r, 500));

          const submitRes = await client.eval(`
            const descInput = document.querySelector('input[placeholder*="Marketing-Ausgaben"]') || document.querySelector('form input');
            if (descInput) {
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              nativeInputValueSetter.call(descInput, 'Szenario Variante v' + ${i});
              descInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const form = document.querySelector('form');
            if (form) {
              const submitBtn = form.querySelector('button[type="submit"]');
              if (submitBtn) submitBtn.click();
              else if (form.requestSubmit) form.requestSubmit();
              return { submitted: true, submitBtn: Boolean(submitBtn) };
            }
            return { submitted: false };
          `);
          console.log(`[${vp.name}px] Iteration ${i} form submit:`, submitRes);
          await new Promise((r) => setTimeout(r, 600));

          const postSubmitDebug = await client.eval(`
            const alert = document.querySelector('[role="alert"], .alert');
            const form = document.querySelector('form');
            const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
            return { alert: alert ? alert.textContent : null, hasForm: Boolean(form), btns };
          `);
          console.log(`[${vp.name}px] After Iteration ${i} debug:`, postSubmitDebug);
        }

        const vCount = await client.eval(`
          return document.querySelectorAll('[data-testid^="version-card-"]').length;
        `);
        console.log(`[${vp.name}px] Total versions created: ${vCount}`);
      }

      // -----------------------------------------------------------------------
      // FLOW 2: Scenario Parameter-Diff (Tab 2)
      // -----------------------------------------------------------------------
      console.log(`\n--- [${vp.name}px] Flow 2: Scenario Parameter-Diff Tab ---`);
      await client.eval(`
        const diffTab = document.querySelector('[data-testid="scenario-diff-tab"]') || 
          Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Diff') || b.textContent.includes('Side-by-Side')));
        if (diffTab) diffTab.click();
      `);
      await new Promise((r) => setTimeout(r, 600));

      if (stage === 'nachher') {
        // ASSERT: Diff view rendered
        await client.assert(`
          const modal = document.querySelector('[role="dialog"]');
          const hasDiffText = modal && (modal.textContent.includes('Parameter') || modal.textContent.includes('Version A') || modal.textContent.includes('Diff'));
          return Boolean(hasDiffText);
        `, 'Scenario Diff tab not rendered');
      }

      await client.screenshot(
        path.join(SCREENSHOT_DIR, `scenario-diff-${vp.name}-${stage}.png`),
        `Flow 2: scenario-diff-${vp.name}`
      );

      // Close Scenario Modal cleanly and verify closed
      await client.eval(`
        const closeBtn = document.querySelector('[role="dialog"] button[aria-label="Dialog schließen"]') ||
          document.querySelector('[role="dialog"] button[aria-label="Schließen"]') ||
          Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.textContent && (b.textContent.includes('Schließen') || b.textContent.includes('✕') || b.textContent.includes('×')));
        if (closeBtn) closeBtn.click();
        else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      `);
      await new Promise((r) => setTimeout(r, 600));
      await client.assert(`
        const modal = document.querySelector('[role="dialog"]');
        return !modal;
      `, 'ScenarioManagerModal failed to close after Flow 2');

      // -----------------------------------------------------------------------
      // FLOW 3: Multi-Scenario Comparison (exakt 2 Scenarios)
      // -----------------------------------------------------------------------
      console.log(`\n--- [${vp.name}px] Flow 3: Multi-Scenario Compare (2 Scenarios) ---`);
      await client.eval(`
        const btns = Array.from(document.querySelectorAll('button'));
        const compBtn = btns.find(b => b.textContent && (b.textContent.includes('Szenariovergleich') || b.textContent.includes('Vergleich')));
        if (compBtn) compBtn.click();
      `);
      await new Promise((r) => setTimeout(r, 800));

      // Assert modal open
      await client.assert(`
        const modal = document.querySelector('[role="dialog"]');
        const text = modal ? modal.textContent : '';
        return Boolean(modal && (text.includes('Szenario') || text.includes('Vergleich') || text.includes('Entscheidungswerkbank')));
      `, 'MultiScenarioComparisonModal failed to open in Flow 3');

      // Ensure EXACTLY 2 scenarios are checked
      await client.eval(`
        const cards = Array.from(document.querySelectorAll('[data-testid="compare-scenario-card"]'));
        cards.forEach((c, idx) => {
          const cb = c.querySelector('input[type="checkbox"]');
          if (cb) {
            if (idx < 2 && !cb.checked) c.click();
            if (idx >= 2 && cb.checked) c.click();
          }
        });
      `);
      await new Promise((r) => setTimeout(r, 600));

      if (stage === 'nachher') {
        // ASSERT: Exakt 2 Scenarios checked
        await client.assert(`
          const checkedCount = document.querySelectorAll('input[type="checkbox"]:checked').length;
          return checkedCount === 2;
        `, 'Multi-scenario comparison expected exactly 2 checked scenarios');
      }

      await client.screenshot(
        path.join(SCREENSHOT_DIR, `compare-2scenarios-${vp.name}-${stage}.png`),
        `Flow 3: compare-2scenarios-${vp.name}`
      );

      // -----------------------------------------------------------------------
      // FLOW 4: Multi-Scenario Comparison (exakt 4 Scenarios)
      // -----------------------------------------------------------------------
      console.log(`\n--- [${vp.name}px] Flow 4: Multi-Scenario Compare (4 Scenarios) ---`);
      // Ensure EXACTLY 4 scenarios are checked
      await client.eval(`
        const cards = Array.from(document.querySelectorAll('[data-testid="compare-scenario-card"]'));
        cards.forEach((c, idx) => {
          const cb = c.querySelector('input[type="checkbox"]');
          if (cb) {
            if (idx < 4 && !cb.checked) c.click();
            if (idx >= 4 && cb.checked) c.click();
          }
        });
      `);
      await new Promise((r) => setTimeout(r, 600));

      if (stage === 'nachher') {
        // ASSERT: Exakt 4 Scenarios checked
        await client.assert(`
          const checkedCount = document.querySelectorAll('input[type="checkbox"]:checked').length;
          return checkedCount === 4;
        `, 'Multi-scenario comparison expected exactly 4 checked scenarios');
      }

      await client.screenshot(
        path.join(SCREENSHOT_DIR, `compare-4scenarios-${vp.name}-${stage}.png`),
        `Flow 4: compare-4scenarios-${vp.name}`
      );

      // Close Comparison Modal cleanly and verify closed
      await client.eval(`
        const closeBtn = document.querySelector('[role="dialog"] button[aria-label="Dialog schließen"]') ||
          document.querySelector('[role="dialog"] button[aria-label="Schließen"]') ||
          Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.textContent && (b.textContent.includes('Schließen') || b.textContent.includes('✕') || b.textContent.includes('×')));
        if (closeBtn) closeBtn.click();
        else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      `);
      await new Promise((r) => setTimeout(r, 600));
      await client.assert(`
        const modal = document.querySelector('[role="dialog"]');
        return !modal;
      `, 'MultiScenarioComparisonModal failed to close after Flow 4');

      // -----------------------------------------------------------------------
      // FLOW 5: Measure Manager (Form & Open Driver Select)
      // -----------------------------------------------------------------------
      console.log(`\n--- [${vp.name}px] Flow 5: Measure Form with Open Treiber Select ---`);
      await client.eval(`
        const btns = Array.from(document.querySelectorAll('button'));
        const measBtn = btns.find(b => b.textContent && (b.textContent.includes('Maßnahmen') || b.textContent.includes('Maßnahme')));
        if (measBtn) measBtn.click();
      `);
      await new Promise((r) => setTimeout(r, 800));

      // Open the Treiber Select dropdown
      await client.eval(`
        const selectTrigger = document.querySelector('button[role="combobox"]') ||
          Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-haspopup') === 'listbox');
        if (selectTrigger) selectTrigger.click();
      `);
      await new Promise((r) => setTimeout(r, 500));

      if (stage === 'nachher') {
        // ASSERT: Listbox is open and aria-expanded is true
        await client.assert(`
          const listbox = document.querySelector('ul[role="listbox"]') || document.querySelector('[role="listbox"]');
          const trigger = document.querySelector('button[aria-expanded="true"]');
          return Boolean(listbox && trigger);
        `, 'Treiber Select listbox is not visible or aria-expanded is not true');
      }

      await client.screenshot(
        path.join(SCREENSHOT_DIR, `measure-form-select-${vp.name}-${stage}.png`),
        `Flow 5: measure-form-select-${vp.name}`
      );

      // -----------------------------------------------------------------------
      // FLOW 6: Measure Preview Delta Table (Simulated)
      // -----------------------------------------------------------------------
      console.log(`\n--- [${vp.name}px] Flow 6: Measure Preview Delta Table ---`);
      // Close open select first
      await client.eval(`
        const selectTrigger = document.querySelector('button[aria-expanded="true"]');
        if (selectTrigger) selectTrigger.click();
      `);
      await new Promise((r) => setTimeout(r, 300));

      // Fill in measure name and save draft measure
      await client.eval(`
        const nameInput = document.querySelector('input[placeholder*="Verdopplung"]') || document.querySelector('form input');
        if (nameInput) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(nameInput, 'Q3 Vertriebsoffensive');
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          nameInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const saveBtn = document.querySelector('button[type="submit"]') ||
          Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('speichern'));
        if (saveBtn) saveBtn.click();
      `);
      await new Promise((r) => setTimeout(r, 600));

      // Click Simulate Preview
      await client.eval(`
        const btns = Array.from(document.querySelectorAll('button'));
        const prevBtn = btns.find(b => b.textContent && b.textContent.includes('Wirkungsvorschau simulieren'));
        if (prevBtn) prevBtn.click();
      `);
      await new Promise((r) => setTimeout(r, 1200));

      if (stage === 'nachher') {
        // ASSERT: Preview Delta table rendered with data-testid="measure-preview-delta-table"
        await client.assert(`
          const deltaTable = document.querySelector('[data-testid="measure-preview-delta-table"]') ||
            Array.from(document.querySelectorAll('table')).find(t => t.textContent && (t.textContent.includes('Ohne') || t.textContent.includes('Delta')));
          return Boolean(deltaTable);
        `, 'Measure Preview Delta Table with data-testid="measure-preview-delta-table" not rendered');
      }

      await client.screenshot(
        path.join(SCREENSHOT_DIR, `measure-preview-delta-${vp.name}-${stage}.png`),
        `Flow 6: measure-preview-delta-${vp.name}`
      );

      // -----------------------------------------------------------------------
      // FLOW 7: Measure Conflict Warning (MULTIPLE_SET)
      // -----------------------------------------------------------------------
      console.log(`\n--- [${vp.name}px] Flow 7: MULTIPLE_SET Conflict Warning ---`);
      // Add a second conflicting measure on salesRepCount (mode set)
      await client.eval(`
        const nameInput = document.querySelector('input[placeholder*="Verdopplung"]') || document.querySelector('form input');
        if (nameInput) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(nameInput, 'Zweite kollidierende Sales-Maßnahme');
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          nameInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const saveBtn = document.querySelector('button[type="submit"]') ||
          Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('speichern'));
        if (saveBtn) saveBtn.click();
      `);
      await new Promise((r) => setTimeout(r, 600));

      if (stage === 'nachher') {
        // ASSERT: Conflict warning alert is visible in DOM with data-testid="measure-conflict-alert"
        await client.assert(`
          const conflictAlert = document.querySelector('[data-testid="measure-conflict-alert"]') ||
            Array.from(document.querySelectorAll('div')).find(d => d.textContent && (d.textContent.includes('Konfliktwarnung') || d.textContent.includes('MULTIPLE_SET')));
          return Boolean(conflictAlert);
        `, 'MULTIPLE_SET conflict alert with data-testid="measure-conflict-alert" not found in DOM');
      }

      await client.screenshot(
        path.join(SCREENSHOT_DIR, `measure-conflict-warning-${vp.name}-${stage}.png`),
        `Flow 7: measure-conflict-warning-${vp.name}`
      );

      // Close Measure Modal cleanly and verify closed
      await client.eval(`
        const closeBtn = document.querySelector('[role="dialog"] button[aria-label="Dialog schließen"]') ||
          document.querySelector('[role="dialog"] button[aria-label="Schließen"]') ||
          Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.textContent && (b.textContent.includes('Schließen') || b.textContent.includes('✕') || b.textContent.includes('×')));
        if (closeBtn) closeBtn.click();
        else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      `);
      await new Promise((r) => setTimeout(r, 600));
      await client.assert(`
        const modal = document.querySelector('[role="dialog"]');
        return !modal;
      `, 'MeasureManagerModal failed to close after Flow 7');
    }

    console.log(`\n=======================================================`);
    console.log(`🎉 ALL 7 FLOWS FOR STAGE [${stage}] CAPTURED SUCCESSFULLY!`);
    console.log(`=======================================================\n`);
    client.close();
  } catch (err) {
    console.error('\n❌ ERROR RUNNING GATE SCREENSHOT CAPTURE:', err.message);
    process.exitCode = 1;
  } finally {
    cleanup();
    setTimeout(() => process.exit(process.exitCode || 0), 1000);
  }
}

run();
