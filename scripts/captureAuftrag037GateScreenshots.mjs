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

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-037');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

export const TARGET_PAGE = {
  id: 'dashboard',
  path: '/dashboard',
  name: 'Executive Dashboard V2',
};

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
    let forceKillTimer = null;
    let timeoutTimer = null;

    const onExit = () => {
      if (!finished) {
        finished = true;
        if (forceKillTimer) clearTimeout(forceKillTimer);
        if (timeoutTimer) clearTimeout(timeoutTimer);
        resolve();
      }
    };

    proc.once('exit', onExit);

    try {
      proc.kill('SIGTERM');
    } catch {
      onExit();
      return;
    }

    forceKillTimer = setTimeout(() => {
      if (!finished) {
        try {
          proc.kill('SIGKILL');
        } catch {}
      }
    }, 4000);

    timeoutTimer = setTimeout(() => {
      if (!finished) {
        finished = true;
        resolve();
      }
    }, timeoutMs);
  });
}

async function removeDirWithRetry(dirPath, maxAttempts = 5, delayMs = 250) {
  if (!fs.existsSync(dirPath)) return;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      return;
    } catch {
      await sleep(delayMs);
    }
  }
}

class CdpSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const res = JSON.parse(event.data);
        if (res.id && this.pending.has(res.id)) {
          const { resolve, reject } = this.pending.get(res.id);
          this.pending.delete(res.id);
          if (res.error) reject(new Error(JSON.stringify(res.error)));
          else resolve(res.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.msgId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function getWsDebugUrl(port, host = '127.0.0.1') {
  for (let i = 0; i < 40; i++) {
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

async function main() {
  console.log('=======================================================');
  console.log(`🚀 STARTING AUFTRAG 037 SCREENSHOT HARNESS (STAGE: ${stage.toUpperCase()})`);
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

    const previewPort = await findAvailablePort(4195, HOST);
    console.log(`[Preview] Starting vite preview on port ${previewPort}...`);

    const viteBin = path.resolve(process.cwd(), 'node_modules/vite/bin/vite.js');
    previewProc = spawn(process.execPath, [viteBin, 'preview', '--host', HOST, '--port', String(previewPort), '--strictPort'], {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    // Wait for preview server
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

    // Launch Chrome
    const cdpPort = await findAvailablePort(9233, HOST);
    userDataDir = path.resolve(process.cwd(), `.tmp-chrome-037-${stage}`);
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
      'about:blank',
    ]);

    const wsUrl = await getWsDebugUrl(cdpPort, HOST);
    cdp = new CdpSession(wsUrl);
    await cdp.connect();
    console.log('[CDP] Connected to Chrome DevTools Protocol');

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');

    for (const vp of VIEWPORTS) {
      console.log(`\n--- Capturing viewport: ${vp.name}px (${vp.width}x${vp.height}) ---`);

      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.isMobile,
      });

      const queryParam = stage === 'vorher' ? '?stage=vorher' : '';
      const url = `http://${HOST}:${previewPort}${TARGET_PAGE.path}${queryParam}`;
      console.log(`[Navigate] Loading ${url}...`);
      await cdp.send('Page.navigate', { url });
      await sleep(1500);

      // Verify horizontal overflow
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
        console.warn(`⚠️ Warning: ${TARGET_PAGE.id} has ${overflow}px horizontal overflow at ${vp.name}px!`);
      } else {
        console.log(`✅ 0px horizontal overflow at ${vp.name}px`);
      }

      // Unroll main scrollable container so documentElement reflects full content height
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
      await sleep(500);

      // Determine full scrollable content height
      const metrics = await cdp.send('Page.getLayoutMetrics');
      const contentHeight = Math.ceil(
        metrics.contentSize ? metrics.contentSize.height : metrics.cssContentSize.height
      );

      // Capture complete full-page screenshot
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

      const fileName = `${TARGET_PAGE.id}-${vp.name}-${stage}.png`;
      const filePath = path.join(SCREENSHOT_DIR, fileName);
      fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
      console.log(`📸 Saved screenshot: ${fileName} (${(shot.data.length * 0.75 / 1024).toFixed(1)} kB, fullHeight=${Math.max(vp.height, contentHeight)}px)`);
    }

    console.log('\n🎉 ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
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
