import { spawn } from 'child_process';
import http from 'http';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const WebSocket = globalThis.WebSocket;

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const stageArg = args.find((a) => a.startsWith('--stage='));
const stage = stageArg ? stageArg.split('=')[1] : null;

if (isMain && stage !== 'vorher' && stage !== 'nachher') {
  console.error('❌ Error: --stage must be either "vorher" or "nachher"');
  process.exit(1);
}

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-037e');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

export const TARGET_ROUTES = [
  { id: 'sales-funnel', path: '/sales/funnel', name: 'Sales Funnel 2025', focusedSelector: '[data-testid="sales-funnel-webp"], .fachbereiche-v2-funnel-chart-responsive, main > div' },
  { id: 'sales-sla', path: '/sales/sla', name: 'SLA Marketing & Sales', focusedSelector: '[data-testid="sales-sla-webp"], .fachbereiche-v2-grid-2, main > div' },
  { id: 'sales-channels', path: '/sales/channels', name: 'Kanalperformance & CAC', focusedSelector: '[data-testid="sales-channels-webp"], .fachbereiche-v2-desktop-table, main > div' },
  { id: 'sales-planning', path: '/sales/planning', name: 'Marketingplanung H2 2026', focusedSelector: '[data-testid="sales-planning-webp"], .fachbereiche-v2-desktop-table, main > div' },
  { id: 'finance-pnl', path: '/finance/p-and-l', name: 'Gewinn- und Verlustrechnung', focusedSelector: '[data-testid="finance-pnl-webp"], .fachbereiche-v2-desktop-table, main > div' },
  { id: 'finance-balance-sheet', path: '/finance/balance-sheet', name: 'Bilanz & SaaS', focusedSelector: '[data-testid="finance-balance-sheet-webp"], .fachbereiche-v2-grid-2, main > div' },
  { id: 'finance-unit-economics', path: '/finance/unit-economics', name: 'KPIs Unit Economics 2026', focusedSelector: '[data-testid="finance-unit-economics-webp"], .fachbereiche-v2-grid-4, main > div' },
];

export const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900, isMobile: false },
  { name: '768', width: 768, height: 1024, isMobile: true },
  { name: '375', width: 375, height: 812, isMobile: true },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findChromePath() {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('No Google Chrome / Chromium found on system.');
}

function isPortFree(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function findAvailablePort(startPort, host = '127.0.0.1') {
  let port = startPort;
  while (true) {
    const freeHost = await isPortFree(port, host);
    let freeLocalhost = true;
    try {
      freeLocalhost = await isPortFree(port, 'localhost');
    } catch {}
    if (freeHost && freeLocalhost) {
      return port;
    }
    port++;
  }
}

async function stopProcess(proc, name = 'Process', timeoutMs = 8000) {
  if (!proc || proc.killed || proc.exitCode !== null) return;
  return new Promise((resolve) => {
    let finished = false;
    const timer = setTimeout(() => {
      if (!finished) {
        console.warn(`[Cleanup] Force killing ${name} (PID ${proc.pid})...`);
        try {
          process.kill(-proc.pid, 'SIGKILL');
        } catch {
          try { proc.kill('SIGKILL'); } catch {}
        }
        finished = true;
        resolve();
      }
    }, timeoutMs);

    proc.on('exit', () => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        resolve();
      }
    });

    try {
      proc.kill('SIGTERM');
    } catch {
      proc.kill();
    }
  });
}

async function removeDirWithRetry(dirPath, retries = 5, delayMs = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
      return;
    } catch (e) {
      if (i === retries - 1) console.warn(`[Cleanup] Could not delete ${dirPath}: ${e.message}`);
      await sleep(delayMs);
    }
  }
}

async function getWsDebugUrl(port, host = '127.0.0.1', timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const data = await new Promise((resolve, reject) => {
        http.get(`http://${host}:${port}/json/list`, (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve(body));
        }).on('error', reject);
      });
      const list = JSON.parse(data);
      const target = list.find((t) => t.type === 'page');
      if (target && target.webSocketDebuggerUrl) {
        return target.webSocketDebuggerUrl;
      }
    } catch {
      await sleep(200);
    }
  }
  throw new Error(`Timeout waiting for page target on http://${host}:${port}/json/list`);
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { res, rej } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) rej(new Error(`CDP error ${msg.error.code}: ${msg.error.message}`));
        else res(msg.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.callbacks.set(id, { res: resolve, rej: reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }
}

export async function main() {
  console.log('=======================================================');
  console.log(`🚀 STARTING AUFTRAG 037E SCREENSHOT HARNESS (STAGE: ${(stage || 'N/A').toUpperCase()})`);
  console.log('=======================================================');

  const HOST = '127.0.0.1';
  let previewProc = null;
  let chromeProc = null;
  let userDataDir = null;
  let cdp = null;

  try {
    console.log('[Build] Building production app...');
    const buildProc = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
    await new Promise((resolve, reject) => {
      buildProc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Build failed with code ${code}`))));
    });

    const previewPort = await findAvailablePort(4240, HOST);
    console.log(`[Preview] Starting vite preview on port ${previewPort}...`);

    const viteBin = path.resolve(process.cwd(), 'node_modules/vite/bin/vite.js');
    previewProc = spawn(process.execPath, [viteBin, 'preview', '--host', HOST, '--port', String(previewPort), '--strictPort'], {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    let previewReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        await new Promise((resolve, reject) => {
          const req = http.get(`http://${HOST}:${previewPort}`, (res) => {
            if (res.statusCode === 200) resolve();
            else reject();
          });
          req.on('error', reject);
        });
        previewReady = true;
        break;
      } catch {
        await sleep(200);
      }
    }
    if (!previewReady) throw new Error('Preview server did not become ready');
    console.log(`[Preview] Ready on http://${HOST}:${previewPort}`);

    const cdpPort = await findAvailablePort(9280, HOST);
    userDataDir = path.resolve(process.cwd(), `.tmp-chrome-037e-${stage}`);
    fs.mkdirSync(userDataDir, { recursive: true });

    const chromeBin = findChromePath();
    console.log(`[Chrome] Launching Chrome on debug port ${cdpPort}...`);
    chromeProc = spawn(chromeBin, [
      '--headless=new',
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      'about:blank',
    ], { stdio: 'pipe' });

    const wsUrl = await getWsDebugUrl(cdpPort, HOST);
    console.log('[CDP] Connecting to Chrome debugger...');
    cdp = new CdpClient(wsUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');

    for (const route of TARGET_ROUTES) {
      console.log(`\n=======================================================`);
      console.log(`📍 CAPTURING ROUTE: ${route.name} (${route.path})`);
      console.log(`=======================================================`);

      for (const vp of VIEWPORTS) {
        console.log(`\n--- Viewport: ${vp.name}px (${vp.width}x${vp.height}) ---`);

        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 1,
          mobile: vp.isMobile,
        });

        const url = `http://${HOST}:${previewPort}${route.path}`;
        console.log(`[Navigate] Loading ${url}...`);
        await cdp.send('Page.navigate', { url });
        await sleep(1500);

        // Check horizontal overflow
        const evalRes = await cdp.send('Runtime.evaluate', {
          expression: `({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            bodyScrollWidth: document.body.scrollWidth,
          })`,
          returnByValue: true,
        });

        const dim = evalRes.result.value;
        const overflow = Math.max(0, dim.scrollWidth - dim.clientWidth);
        if (overflow > 0) {
          console.warn(`⚠️ Warning: ${route.id} has ${overflow}px horizontal overflow at ${vp.name}px!`);
        } else {
          console.log(`✅ 0px horizontal overflow at ${vp.name}px`);
        }

        // Unroll scrollable containers for clean full-height capture
        await cdp.send('Runtime.evaluate', {
          expression: `(() => {
            const main = document.querySelector('main');
            if (main) {
              main.style.overflow = 'visible';
              main.style.height = 'auto';
            }
            let p = main ? main.parentElement : null;
            while (p && p !== document.body) {
              p.style.overflow = 'visible';
              p.style.height = 'auto';
              p = p.parentElement;
            }
            document.body.style.overflow = 'visible';
            document.body.style.height = 'auto';
            document.documentElement.style.overflow = 'visible';
            document.documentElement.style.height = 'auto';
          })()`,
        });
        await sleep(400);

        const metrics = await cdp.send('Page.getLayoutMetrics');
        const contentHeight = Math.ceil(
          metrics.contentSize ? metrics.contentSize.height : metrics.cssContentSize.height
        );

        const shot = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: true,
          clip: {
            x: 0,
            y: 0,
            width: vp.width,
            height: Math.max(vp.height, contentHeight),
            scale: 1,
          },
        });

        const fileName = `${route.id}-${vp.name}-${stage}.png`;
        const filePath = path.join(SCREENSHOT_DIR, fileName);
        fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
        console.log(`📸 Saved screenshot: ${fileName} (${((shot.data.length * 0.75) / 1024).toFixed(1)} kB)`);

        // Capture focused crop at 1440px
        if (vp.name === '1440') {
          console.log(`[Focus] Capturing focused desktop element for ${route.name}...`);
          const boxRes = await cdp.send('Runtime.evaluate', {
            expression: `(() => {
              const el = document.querySelector('${route.focusedSelector}');
              if (!el) return null;
              const rect = el.getBoundingClientRect();
              return {
                x: Math.max(0, Math.floor(rect.left + window.scrollX)),
                y: Math.max(0, Math.floor(rect.top + window.scrollY)),
                width: Math.min(1440, Math.ceil(rect.width)),
                height: Math.ceil(rect.height),
              };
            })()`,
            returnByValue: true,
          });

          const box = boxRes.result ? boxRes.result.value : null;
          if (box && box.width > 0 && box.height > 0) {
            const focusedShot = await cdp.send('Page.captureScreenshot', {
              format: 'png',
              captureBeyondViewport: true,
              clip: {
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
                scale: 1,
              },
            });
            const focusedFileName = `${route.id}-focused-${stage}.png`;
            const focusedFilePath = path.join(SCREENSHOT_DIR, focusedFileName);
            fs.writeFileSync(focusedFilePath, Buffer.from(focusedShot.data, 'base64'));
            console.log(`📸 Saved focused screenshot: ${focusedFileName} (${((focusedShot.data.length * 0.75) / 1024).toFixed(1)} kB)`);
          } else {
            console.warn(`⚠️ Warning: Focused selector ${route.focusedSelector} not found or empty for ${route.name}`);
          }
        }
      }
    }

    console.log('\n🎉 ALL AUFTRAG 037E SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } finally {
    if (cdp) await cdp.close();
    if (chromeProc) await stopProcess(chromeProc, 'Chrome');
    if (previewProc) await stopProcess(previewProc, 'Preview');
    if (userDataDir) await removeDirWithRetry(userDataDir);
  }
}

if (isMain) {
  main().catch((err) => {
    console.error('❌ Harness failed:', err);
    process.exit(1);
  });
}
