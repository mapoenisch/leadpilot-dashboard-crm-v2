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

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-031');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const TARGET_PAGES = [
  { id: 'headcount', path: '/organisation/headcount', name: 'Headcount-Entwicklung' },
  { id: 'hr', path: '/organisation/hr', name: 'HR-Kennzahlen' },
  { id: 'team-structure', path: '/organisation/team', name: 'Teamstruktur & Engpässe' },
  { id: 'roadmap', path: '/product/roadmap', name: 'Releases & Roadmap' },
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

async function stopProcess(proc, name = 'Process', timeoutMs = 8000) {
  if (!proc || proc.killed || proc.exitCode !== null) return;
  return new Promise((resolve, reject) => {
    let finished = false;
    let forceKillTimer = null;
    let timeoutTimer = null;

    const onExit = (code, signal) => {
      if (!finished) {
        finished = true;
        if (forceKillTimer) clearTimeout(forceKillTimer);
        if (timeoutTimer) clearTimeout(timeoutTimer);
        resolve({ code, signal });
      }
    };

    proc.once('exit', onExit);

    try {
      proc.kill('SIGTERM');
    } catch (err) {
      if (!finished) {
        finished = true;
        reject(new Error(`Failed to send SIGTERM to ${name}: ${err.message}`));
        return;
      }
    }

    forceKillTimer = setTimeout(() => {
      try {
        if (!proc.killed && proc.exitCode === null) {
          proc.kill('SIGKILL');
        }
      } catch {}
    }, 1500);

    timeoutTimer = setTimeout(() => {
      if (!finished) {
        finished = true;
        proc.removeListener('exit', onExit);
        reject(new Error(`Timeout (${timeoutMs}ms) waiting for ${name} process to exit completely.`));
      }
    }, timeoutMs);
  });
}

async function removeDirectorySafely(dirPath, maxAttempts = 15, delayMs = 250) {
  if (!dirPath || !fs.existsSync(dirPath)) return;
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      return;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await sleep(delayMs);
      }
    }
  }
  throw new Error(`Failed to remove temporary directory ${dirPath}: ${lastError?.message}`);
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
  console.log(`🚀 STARTING AUFTRAG 031 SCREENSHOT HARNESS (STAGE: ${stage.toUpperCase()})`);
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
  const userDataDir = path.resolve(process.cwd(), `.chrome-cdp-profile-g15-${stage}-${Date.now()}`);
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

    // 4. Capture 4 Target Pages across 3 Viewports
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

      for (const page of TARGET_PAGES) {
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

        // 2. Check internal table/container horizontal scroll/clipping (hard assertion on nachher)
        if (stage === 'nachher') {
          const tableScrollEval = await cdp.send('Runtime.evaluate', {
            expression: `
              (() => {
                const elements = Array.from(document.querySelectorAll('main div, main table, main section'));
                for (const el of elements) {
                  if (el.scrollWidth > el.clientWidth + 2) {
                    const style = window.getComputedStyle(el);
                    if (style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflowX === 'hidden') {
                      return { found: true, tag: el.tagName, className: el.className, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
                    }
                  }
                }
                return { found: false };
              })()
            `,
            returnByValue: true,
          });
          const tableScroll = tableScrollEval.result?.value;
          if (tableScroll && tableScroll.found) {
            throw new Error(
              `Internal horizontal scroll/clipping detected on ${page.id} (${vp.name}px) in <${tableScroll.tag} class="${tableScroll.className}">: scrollWidth ${tableScroll.scrollWidth}px > clientWidth ${tableScroll.clientWidth}px`
            );
          }
          console.log(`✅ 0px internal table scroll/clipping on ${page.id} (${vp.name}px)`);
        }

        // Wait for fonts & layout
        await cdp.send('Runtime.evaluate', { expression: 'document.fonts.ready' });
        await sleep(300);

        const screenshot = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false,
        });

        const filename = `${page.id}-${vp.name}-${stage}.png`;
        const filePath = path.join(SCREENSHOT_DIR, filename);
        const buf = Buffer.from(screenshot.data, 'base64');
        fs.writeFileSync(filePath, buf);
        console.log(`💾 Saved [${stage}]: ${filename} (${buf.length} bytes)`);
      }
    }

    // 5. Verify all 41 Deep Links & Titles
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

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
