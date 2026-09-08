import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/marcpoenisch/Projekte/LeadPilot Dashboard-CRM/docs/screenshots/auftrag-023';
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// Parse command line arguments
const args = process.argv.slice(2);
const stageArg = args.find((a) => a.startsWith('--stage='));
const stage = stageArg ? stageArg.split('=')[1] : 'nachher';

if (!['vorher', 'nachher'].includes(stage)) {
  console.error('Invalid stage! Use --stage=vorher or --stage=nachher');
  process.exit(1);
}

// Get current git commit SHA
let commitSha = 'unknown';
try {
  commitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch (e) {
  console.warn('Could not determine git commit SHA:', e.message);
}

console.log(`=======================================================`);
console.log(`📸 STARTING AUFTRAG 023 DATA-VIZ CAPTURE (Stage: ${stage})`);
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
      const docOverflow = doc.scrollWidth > doc.clientWidth + 1;
      return {
        docScrollW: doc.scrollWidth,
        docClientW: doc.clientWidth,
        docOverflow
      };
    `);

    if (overflowMetrics.docOverflow) {
      console.warn(`⚠️ OVERFLOW DETECTED in [${contextName}]:`, JSON.stringify(overflowMetrics, null, 2));
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
  const PORT = 4179;
  const CDP_PORT = 9229;

  console.log(`Starting Vite preview on port ${PORT}...`);
  const previewProc = spawn('npx', ['vite', 'preview', '--port', String(PORT)], {
    cwd: '/Users/marcpoenisch/Projekte/LeadPilot Dashboard-CRM',
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

  console.log(`Starting headless Chrome with CDP on port ${CDP_PORT}...`);
  const chromeProc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
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

    const viewports = [
      { name: '1440', width: 1440, height: 900, isMobile: false },
      { name: '768', width: 768, height: 1024, isMobile: true },
      { name: '375', width: 375, height: 812, isMobile: true },
    ];

    const views = [
      { id: 'overview', navName: 'Übersicht', slug: 'overview' },
      { id: 'vertrieb', navName: 'Vertrieb', slug: 'vertrieb-funnel' },
      { id: 'finanzen', navName: 'Finanzen', slug: 'finanzen' },
      { id: 'strategie', navName: 'Strategie', slug: 'strategie-treiber' },
      { id: 'kunden', navName: 'Kunden', slug: 'kunden' },
      { id: 'produkt', navName: 'Produkt', slug: 'produkt' },
      { id: 'markt', navName: 'Markt', slug: 'markt' },
      { id: 'organisation', navName: 'Organisation', slug: 'organisation' },
      { id: 'crm', navName: 'CRM', slug: 'crm-deals' },
      { id: 'simulation', navName: 'Live-Simulation', slug: 'simulation-detail' },
    ];

    for (const vp of viewports) {
      console.log(`\n=======================================================`);
      console.log(`📱 AUFTRAG 023 VIEWPORT ${vp.width}x${vp.height} (${vp.name}px)`);
      console.log(`=======================================================`);

      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.isMobile,
      });

      for (const v of views) {
        // Navigate
        await client.send('Page.navigate', { url: `http://localhost:${PORT}` });
        await new Promise((r) => setTimeout(r, 600));

        if (vp.isMobile) {
          await client.eval(`
            const trigger = document.getElementById('mobile-menu-trigger');
            if (trigger) trigger.click();
          `);
          await new Promise((r) => setTimeout(r, 300));
        }

        await client.eval(`
          const navItems = Array.from(document.querySelectorAll('div, button, a'));
          const target = navItems.find(el => el.textContent && el.textContent.trim().startsWith('${v.navName}'));
          if (target) target.click();
        `);
        await new Promise((r) => setTimeout(r, 500));

        await client.screenshot(
          path.join(SCREENSHOT_DIR, `${v.slug}-${vp.name}-${stage}.png`),
          `${v.navName} (${vp.name}px)`
        );
      }
    }

    client.close();
    console.log(`\n=======================================================`);
    console.log(`🎉 ALL AUFTRAG 023 VIEWS CAPTURED SUCCESSFULLY FOR [${stage}]!`);
    console.log(`=======================================================\n`);
  } finally {
    cleanup();
  }
}

run().catch((err) => {
  console.error('\n❌ ERROR RUNNING AUFTRAG 023 SCREENSHOT CAPTURE:', err.message);
  process.exit(1);
});
