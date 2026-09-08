import { spawn } from 'child_process';
import http from 'http';
import net from 'net';
import fs from 'fs';
import path from 'path';

const WebSocket = globalThis.WebSocket;

const args = process.argv.slice(2);
const stageArg = args.find((a) => a.startsWith('--stage='));
const stage = stageArg ? stageArg.split('=')[1] : null;

if (stage !== 'vorher' && stage !== 'nachher') {
  console.error('❌ Error: --stage must be either "vorher" or "nachher"');
  process.exit(1);
}

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-030');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const OVERVIEW_PAGES = [
  { id: 'dashboard', path: '/dashboard', name: 'Executive Dashboard' },
  { id: 'company-profile', path: '/company/profile', name: 'Unternehmenssteckbrief' },
  { id: 'year-highlights', path: '/company/highlights', name: 'Jahres-Highlights 2025' },
  { id: 'data-basis', path: '/company/data-basis', name: 'Datenbasis & Konsistenz' },
];

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900, isMobile: false },
  { name: '768', width: 768, height: 1024, isMobile: true },
  { name: '375', width: 375, height: 812, isMobile: true },
];

function loadAppRoutes() {
  const routesPath = path.resolve(process.cwd(), 'src/app/routes.tsx');
  const content = fs.readFileSync(routesPath, 'utf8');
  const match = content.match(/export const APP_ROUTES = \[\s*([\s\S]*?)\n\] as const;/);
  if (!match) throw new Error('Could not parse APP_ROUTES from routes.tsx');
  const items = [];
  const itemRegex = /{\s*id:\s*'([^']+)',\s*path:\s*'([^']+)',\s*title:\s*'([^']+)',\s*categoryLabel:\s*'([^']+)'\s*}/g;
  let m;
  while ((m = itemRegex.exec(match[1])) !== null) {
    items.push({ id: m[1], path: m[2], title: m[3], categoryLabel: m[4] });
  }
  return items;
}

const APP_ROUTES = loadAppRoutes();


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

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(startPort) {
  let port = startPort;
  while (!(await isPortFree(port))) {
    port++;
  }
  return port;
}

async function stopProcess(proc, name = 'Process') {
  if (!proc || proc.killed || proc.exitCode !== null) return;
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        resolve();
      }
    };

    proc.once('exit', finish);

    try {
      proc.kill('SIGTERM');
    } catch {
      finish();
      return;
    }

    const forceTimer = setTimeout(() => {
      try {
        if (!proc.killed && proc.exitCode === null) {
          proc.kill('SIGKILL');
        }
      } catch {}
    }, 1500);

    setTimeout(() => {
      clearTimeout(forceTimer);
      finish();
    }, 3000);
  });
}

async function removeDirectorySafely(dirPath, maxAttempts = 15, delayMs = 250) {
  if (!dirPath || !fs.existsSync(dirPath)) return;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      return;
    } catch (err) {
      if (attempt === maxAttempts) {
        console.warn(`[Cleanup Warning] Could not remove temp dir ${dirPath}: ${err.message}`);
      } else {
        await sleep(delayMs);
      }
    }
  }
}


async function waitForHttp(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode && res.statusCode < 500) resolve(true);
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
      });
      return;
    } catch {
      await sleep(250);
    }
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function getWsDebugUrl(port) {
  for (let i = 0; i < 40; i++) {
    try {
      const data = await new Promise((resolve, reject) => {
        http.get(`http://localhost:${port}/json/list`, (res) => {
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
  throw new Error(`Timeout waiting for page target on http://localhost:${port}/json/list`);
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

async function main() {
  console.log('=======================================================');
  console.log(`🚀 STARTING AUFTRAG 030 SCREENSHOT HARNESS (STAGE: ${stage.toUpperCase()})`);
  console.log('=======================================================');

  // 1. Build
  console.log('[Build] Building production app...');
  const buildProc = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
  await new Promise((resolve, reject) => {
    buildProc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Build failed with code ${code}`))));
  });

  // 2. Start Preview Server on verified free port
  const previewPort = await findAvailablePort(4182);
  console.log(`[Preview] Starting vite preview on verified free port ${previewPort}...`);
  const previewProc = spawn('npx', ['vite', 'preview', '--port', String(previewPort), '--strictPort'], {
    cwd: process.cwd(),
    stdio: 'pipe',
  });

  let previewEarlyExit = null;
  previewProc.on('exit', (code) => {
    if (code !== null && code !== 0) {
      previewEarlyExit = new Error(`Preview process exited unexpectedly with code ${code}`);
    }
  });

  previewProc.stderr.on('data', (d) => console.error(`[Preview Err] ${d}`));

  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    if (previewEarlyExit) {
      throw previewEarlyExit;
    }
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${previewPort}`, (res) => {
          if (res.statusCode === 200) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
      });
      serverReady = true;
      break;
    } catch {
      await sleep(250);
    }
  }

  if (!serverReady) {
    if (previewEarlyExit) throw previewEarlyExit;
    throw new Error(`Timeout waiting for http://localhost:${previewPort}`);
  }
  console.log(`✅ Preview server running on http://localhost:${previewPort}`);


  // 3. Launch Chrome on verified free port
  const chromePort = await findAvailablePort(9242);
  const chromePath = findChromePath();
  const userDataDir = path.resolve(process.cwd(), `.chrome-cdp-profile-g14-${stage}-${Date.now()}`);
  fs.mkdirSync(userDataDir, { recursive: true });

  console.log(`[Chrome] Launching Headless Chrome on verified free port ${chromePort}...`);
  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${chromePort}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--font-render-hinting=none',
    '--disable-font-subpixel-positioning',
    '--disable-lcd-text',
    '--force-color-profile=srgb',
    '--hide-scrollbars',
    `--user-data-dir=${userDataDir}`,
  ]);

  let cdp = null;
  try {
    const wsUrl = await getWsDebugUrl(chromePort);
    cdp = new CdpSession(wsUrl);
    await cdp.connect();
    console.log('✅ Chrome CDP connected.');

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    await cdp.send('Emulation.setEmulatedMedia', { media: 'screen' });

    // 4. Capture 4 Overview Pages across 3 Viewports
    for (const vp of VIEWPORTS) {
      console.log(`\n-------------------------------------------------------`);
      console.log(`📱 Running Viewport: ${vp.name}px (${vp.width}x${vp.height})`);
      console.log(`-------------------------------------------------------`);

      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.isMobile,
      });

      for (const page of OVERVIEW_PAGES) {
        console.log(`\n[Flow] ${page.name} (${page.path})`);
        await cdp.send('Page.navigate', { url: `http://localhost:${previewPort}${page.path}` });
        await sleep(1500);

        // 1. Check document horizontal overflow (hard assertion)
        const overflowEval = await cdp.send('Runtime.evaluate', {
          expression: 'document.documentElement.scrollWidth - document.documentElement.clientWidth',
        });
        const overflow = overflowEval.result?.value ?? 0;
        if (overflow > 0) {
          throw new Error(`Document horizontal overflow on ${page.id} (${vp.name}px): ${overflow}px`);
        }
        console.log(`✅ 0px document horizontal overflow on ${page.id} (${vp.name}px)`);

        // 2. Check internal table scroll / clipping (hard assertion against horizontal table scroll)
        const internalClippingEval = await cdp.send('Runtime.evaluate', {
          expression: `
            (() => {
              const all = Array.from(document.querySelectorAll('table, [style*="overflow-x"], [style*="overflow: auto"], [style*="overflow:auto"]'));
              const clipped = [];
              for (const el of all) {
                if (el.clientWidth === 0 || el.clientHeight === 0) continue;
                if (el.scrollWidth > el.clientWidth + 2) {
                  const style = window.getComputedStyle(el);
                  const ox = style.overflowX;
                  if (ox === 'auto' || ox === 'scroll' || el.tagName.toLowerCase() === 'table') {
                    clipped.push({
                      tag: el.tagName.toLowerCase(),
                      class: el.className,
                      scrollWidth: el.scrollWidth,
                      clientWidth: el.clientWidth,
                      delta: el.scrollWidth - el.clientWidth,
                      textSnippet: (el.textContent || '').slice(0, 50).trim()
                    });
                  }
                }
              }
              return clipped;
            })()
          `,
          returnByValue: true,
        });
        const clipped = internalClippingEval.result?.value ?? [];
        if (clipped.length > 0) {
          throw new Error(`Internal table horizontal scroll/clipping detected on ${page.id} (${vp.name}px): ` + JSON.stringify(clipped));
        }
        console.log(`✅ 0px internal table scroll/clipping on ${page.id} (${vp.name}px)`);


        const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        const filename = `${page.id}-${vp.name}-${stage}.png`;
        const filepath = path.join(SCREENSHOT_DIR, filename);
        fs.writeFileSync(filepath, Buffer.from(screenshot.data, 'base64'));
        console.log(`💾 Saved [${stage}]: ${filename} (${Buffer.byteLength(screenshot.data, 'base64')} bytes)`);
      }
    }

    // 5. Deep Link Verification across all 41 routes
    console.log(`\n-------------------------------------------------------`);
    console.log(`🔍 RUNNING 41-ROUTE DEEP-LINK VERIFICATION`);
    console.log(`-------------------------------------------------------`);

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    let passCount = 0;
    for (const route of APP_ROUTES) {
      await cdp.send('Page.navigate', { url: `http://localhost:${previewPort}${route.path}` });
      await sleep(350);

      const titleEval = await cdp.send('Runtime.evaluate', {
        expression: 'document.querySelector("header h1")?.textContent?.trim() || ""',
      });
      const overflowEval = await cdp.send('Runtime.evaluate', {
        expression: 'document.documentElement.scrollWidth - document.documentElement.clientWidth',
      });
      const title = titleEval.result?.value ?? '';
      const overflow = overflowEval.result?.value ?? 0;

      if (overflow > 0) {
        throw new Error(`Route ${route.path} failed with horizontal overflow: ${overflow}px`);
      }
      if (title !== route.title) {
        throw new Error(`Route ${route.path} title mismatch: expected "${route.title}", got "${title}"`);
      }
      process.stdout.write('.');
      passCount++;
    }
    console.log(`\n✅ Deep-link & title check: ${passCount}/${APP_ROUTES.length} routes successfully verified!`);

  } finally {
    if (cdp) {
      try {
        await cdp.send('Browser.close');
      } catch {}
      try {
        await cdp.close();
      } catch {}
    }

    console.log('[Cleanup] Stopping Chrome and Preview processes...');
    await stopProcess(chromeProc, 'Chrome');
    await stopProcess(previewProc, 'Preview');
    console.log('[Cleanup] Removing temporary profile directory...');
    await removeDirectorySafely(userDataDir);
    console.log('✅ Cleanup completed cleanly.');
  }



  console.log(`\n=======================================================`);
  console.log(`🎉 ALL 12 SCREENSHOTS & 41 DEEP LINKS SUCCESSFUL FOR STAGE: ${stage.toUpperCase()}`);
  console.log(`=======================================================`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
