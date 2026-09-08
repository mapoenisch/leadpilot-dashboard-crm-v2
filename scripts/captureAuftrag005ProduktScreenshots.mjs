import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-005');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let commitSha = 'unknown';
try {
  commitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch (e) {
  console.warn('Could not determine git commit SHA:', e.message);
}

console.log(`=======================================================`);
console.log(`📸 STARTING AUFTRAG 005 PRODUKT CAPTURE & AUDIT`);
console.log(`📌 Git Commit SHA: ${commitSha}`);
console.log(`📁 Target Directory: ${SCREENSHOT_DIR}`);
console.log(`=======================================================\n`);

async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
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
    this.id = 0;
    this.callbacks = new Map();
  }

  async connect() {
    const WebSocket = globalThis.WebSocket;
    this.ws = new WebSocket(this.wsUrl);
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
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
      throw new Error(`Evaluation failed: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async checkOverflow(contextName) {
    const overflowMetrics = await this.eval(`
      const doc = document.documentElement;
      const body = document.body;
      const docOverflow = doc.scrollWidth > doc.clientWidth + 1;
      return {
        docScrollW: doc.scrollWidth,
        docClientW: doc.clientWidth,
        docOverflow
      };
    `);

    if (overflowMetrics.docOverflow) {
      throw new Error(
        `GATE ERROR: Horizontal overflow detected in [${contextName}]! (scrollWidth: ${overflowMetrics.docScrollW}, clientWidth: ${overflowMetrics.docClientW})`
      );
    }

    console.log(`✅ [${contextName}] Overflow check passed (0 clipping)`);
    return overflowMetrics;
  }

  async screenshot(filePath, contextName) {
    await this.checkOverflow(contextName);
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    fs.writeFileSync(filePath, buffer);
    console.log(`💾 Saved: ${path.basename(filePath)} (${buffer.length} bytes)`);
  }

  close() {
    try {
      this.ws.close();
    } catch (e) {}
  }
}

async function navigateViaUi(client, viewId, isMobile) {
  await client.eval(`
    (() => {
      if (${isMobile}) {
        const drawer = document.getElementById('mobile-sidebar-drawer');
        const isOpen = drawer && drawer.getAttribute('aria-hidden') === 'false';
        if (!isOpen) {
          const trigger = document.getElementById('mobile-menu-trigger');
          if (trigger) trigger.click();
        }
      }

      const checkAndClick = () => {
        const btn = document.querySelector('[data-testid="nav-item-${viewId}"]');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      };

      if (!checkAndClick()) {
        const allSpans = Array.from(document.querySelectorAll('nav span, aside nav span'));
        const produktSpan = allSpans.find(s => s.textContent && s.textContent.trim().toUpperCase() === 'PRODUKT');
        if (produktSpan) {
          const header = produktSpan.closest('div');
          if (header) header.click();
        }
        setTimeout(() => {
          checkAndClick();
        }, 80);
      }
    })()
  `);
  await new Promise((r) => setTimeout(r, 600));
}

async function verifyOperationsHubSemantics(client, viewportName) {
  const result = await client.eval(`
    const mod0 = document.querySelector('[data-testid="hub-module-0"]');
    const mod1 = document.querySelector('[data-testid="hub-module-1"]');
    const center = document.querySelector('[data-testid="hub-center"]');
    const mod2 = document.querySelector('[data-testid="hub-module-2"]');
    const mod3 = document.querySelector('[data-testid="hub-module-3"]');

    if (!mod0 || !mod1 || !center || !mod2 || !mod3) {
      return {
        ok: false,
        error: 'Mindestens ein Hub-Knoten (mod0, mod1, center, mod2, mod3) fehlt im DOM!'
      };
    }

    const allNodes = Array.from(document.querySelectorAll('[data-hub-order]'));
    const orders = allNodes.map(n => n.getAttribute('data-hub-order'));
    const expectedOrders = ['1', '2', '3', '4', '5'];
    const orderOk = orders.length === 5 && orders.every((val, idx) => val === expectedOrders[idx]);
    if (!orderOk) {
      return {
        ok: false,
        error: 'Semantische DOM-Reihenfolge fehlerhaft: ' + JSON.stringify(orders)
      };
    }

    const connectors = Array.from(document.querySelectorAll('.hub-connector'));
    if (connectors.length < 2) {
      return {
        ok: false,
        error: 'Nicht genügend SVG-Verbinder gefunden: ' + connectors.length
      };
    }

    for (let i = 0; i < connectors.length; i++) {
      const c = connectors[i];
      const rect = c.getBoundingClientRect();
      const svgs = c.querySelectorAll('svg');
      if (rect.width <= 0 || rect.height <= 0 || svgs.length === 0) {
        return {
          ok: false,
          error: 'Verbinder #' + i + ' ist nicht sichtbar oder enthält kein SVG: w=' + rect.width + ', h=' + rect.height
        };
      }
    }

    const connectorTexts = connectors.flatMap(c => Array.from(c.querySelectorAll('span')).map(s => s.textContent.trim()));
    const expectedTexts = [
      'Inbound-Leads erfassen',
      'Lead-Bewertung 0–100',
      'Outreach- & Follow-up-Reihen',
      'Echtzeit-Kanban & Tabellenansicht'
    ];
    for (const exp of expectedTexts) {
      if (!connectorTexts.includes(exp)) {
        return {
          ok: false,
          error: 'Erwarteter Verbindertext "' + exp + '" nicht gefunden! Vorhanden: ' + JSON.stringify(connectorTexts)
        };
      }
    }

    return {
      ok: true,
      nodeCount: allNodes.length,
      connectorCount: connectors.length,
      connectorTexts
    };
  `);

  if (!result || !result.ok) {
    throw new Error(`GATE ERROR: OperationsHub semantische Validierung bei ${viewportName} fehlgeschlagen: ${result ? result.error : 'kein Ergebnis'}`);
  }
  console.log(`✅ [${viewportName}] OperationsHub semantische Reihenfolge & sichtbare SVG-Verbindungen verifiziert (${result.nodeCount} Knoten, ${result.connectorCount} Verbinder)`);
}

async function run() {
  const PORT = 4197;
  const CDP_PORT = 9247;

  console.log(`Starting Vite preview on port ${PORT}...`);
  const previewProc = spawn('npx', ['vite', 'preview', '--port', String(PORT)], {
    cwd: process.cwd(),
  });

  let chromeProc = null;
  const cleanup = () => {
    try {
      previewProc.kill('SIGTERM');
    } catch (e) {}
    try {
      if (chromeProc) chromeProc.kill('SIGTERM');
    } catch (e) {}
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  await new Promise((r) => setTimeout(r, 2000));

  console.log(`Starting headless Chrome on CDP port ${CDP_PORT}...`);
  chromeProc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]);

  let targets = null;
  for (let i = 0; i < 20; i++) {
    try {
      targets = await getJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
      if (targets && targets.length > 0) {
        console.log(`Connected to Chrome CDP on attempt ${i + 1}`);
        break;
      }
    } catch (e) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!targets || targets.length === 0) {
    throw new Error('Failed to connect to headless Chrome on CDP port!');
  }

  try {
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    if (!pageTarget) throw new Error('No page target found on CDP!');

    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    const viewports = [
      { name: '1440', width: 1440, height: 900, isMobile: false },
      { name: '768', width: 768, height: 1024, isMobile: true },
      { name: '375', width: 375, height: 812, isMobile: true },
    ];

    const subviews = [
      {
        id: 's-funktion',
        expectedTitle: 'Produkt & Funktionsweise',
        filePrefix: 'produkt_Funktionen_OperationsHub',
      },
      {
        id: 's-perf',
        expectedTitle: 'Produkt-Performance & Qualitätsmetriken GJ 2025',
        filePrefix: 'produkt_Performance_ProductHealth',
      },
      {
        id: 's-roadmap',
        expectedTitle: 'Release-Historie & Roadmap 2026',
        filePrefix: 'produkt_Roadmap_RoadmapHorizons',
      },
    ];

    await client.send('Page.navigate', { url: `http://localhost:${PORT}` });
    await new Promise((r) => setTimeout(r, 1000));

    for (const vp of viewports) {
      console.log(`\n-------------------------------------------------------`);
      console.log(`📱 VIEWPORT ${vp.width}x${vp.height} (${vp.name}px)`);
      console.log(`-------------------------------------------------------`);

      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.isMobile,
      });

      for (const sv of subviews) {
        // Navigate via UI
        await navigateViaUi(client, sv.id, vp.isMobile);

        // Strict assertion on heading
        const currentHeading = await client.eval(`
          const h2 = document.querySelector('h2');
          return h2 ? h2.textContent.trim() : '';
        `);
        if (currentHeading !== sv.expectedTitle) {
          throw new Error(
            `GATE ERROR: Expected heading "${sv.expectedTitle}", but got "${currentHeading}"`
          );
        }
        console.log(`✅ [${sv.id}] Verified heading: "${currentHeading}"`);

        // Extra semantischer Check für OperationsHub (Reihenfolge & sichtbare Verbinder)
        if (sv.id === 's-funktion') {
          await verifyOperationsHubSemantics(client, `${vp.name}px`);
        }

        const fileName = `${sv.filePrefix}_${vp.name}px.png`;
        const filePath = path.join(SCREENSHOT_DIR, fileName);
        await client.screenshot(filePath, `${sv.filePrefix} @ ${vp.name}px`);
      }
    }

    client.close();
    console.log(`\n=======================================================`);
    console.log(`🎉 ALL PRODUKT SCREENSHOTS CAPTURED & AUDITED SUCCESSFULLY!`);
    console.log(`📁 Files in ${SCREENSHOT_DIR}:`);
    const files = fs.readdirSync(SCREENSHOT_DIR).filter((f) => f.endsWith('.png'));
    files.forEach((f) => console.log(`  - ${f}`));
    console.log(`=======================================================`);
  } finally {
    cleanup();
  }
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
