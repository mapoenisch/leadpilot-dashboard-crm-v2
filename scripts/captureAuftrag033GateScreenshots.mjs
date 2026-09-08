import { spawn, execSync } from 'child_process';
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

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-033');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

export const TARGET_PAGES = [
  // 1. Produkt (4)
  { id: 'product-features', path: '/product/features', name: 'Produktfunktionen' },
  { id: 'product-pricing', path: '/product/pricing', name: 'Preise & Pakete' },
  { id: 'product-performance', path: '/product/performance', name: 'System-Performance' },
  { id: 'product-roadmap', path: '/product/roadmap', name: 'Produkt-Roadmap', isUnchangedExpected: true },

  // 2. Markt & Wettbewerb (3)
  { id: 'market-overview', path: '/market/overview', name: 'Marktübersicht' },
  { id: 'market-competition', path: '/market/competition', name: 'Wettbewerbsanalyse' },
  { id: 'market-swot', path: '/market/swot', name: 'SWOT-Analyse' },

  // 3. Kunden & ICP (4)
  { id: 'customers-icp', path: '/customers/icp', name: 'Ideal Customer Profile (ICP)' },
  { id: 'customers-persona', path: '/customers/persona', name: 'Buyer Persona' },
  { id: 'customers-segments', path: '/customers/segments', name: 'Kundensegmente' },
  { id: 'customers-top-customers', path: '/customers/top-customers', name: 'Top-Kunden' },

  // 4. Vertrieb & Marketing (4)
  { id: 'sales-funnel', path: '/sales/funnel', name: 'Sales Funnel' },
  { id: 'sales-sla', path: '/sales/sla', name: 'SLA Marketing & Sales' },
  { id: 'sales-channels', path: '/sales/channels', name: 'Kanalperformance' },
  { id: 'sales-planning', path: '/sales/planning', name: 'Vertriebs- & Marketingplanung' },

  // 5. Finanzen (3)
  { id: 'finance-p-and-l', path: '/finance/p-and-l', name: 'Gewinn & Verlust (GuV)' },
  { id: 'finance-balance-sheet', path: '/finance/balance-sheet', name: 'Bilanz' },
  { id: 'finance-unit-economics', path: '/finance/unit-economics', name: 'Unit Economics' },

  // 6. Strategie (3)
  { id: 'strategy-okrs', path: '/strategy/okrs', name: 'OKRs 2026' },
  { id: 'strategy-balanced-scorecard', path: '/strategy/balanced-scorecard', name: 'Balanced Scorecard' },
  { id: 'strategy-growth-drivers', path: '/strategy/growth-drivers', name: 'Wachstumstreiber' },

  // 7. Recht & Gründung (3)
  { id: 'legal-articles', path: '/legal/articles', name: 'Satzung' },
  { id: 'legal-shareholders', path: '/legal/shareholders', name: 'Gesellschafter' },
  { id: 'legal-commercial-register', path: '/legal/commercial-register', name: 'Handelsregister' },
];

export const VIDEO_TARGET = {
  id: 'resources-werbespot',
  path: '/resources/materials',
  name: 'Werbespot Viewer (Modal)',
};

export const VIEWPORTS = [
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

function isPidListeningOnPort(pid, port) {
  try {
    const output = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN`, { encoding: 'utf8' });
    const lines = output.trim().split('\n').slice(1);
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts[1] && parseInt(parts[1], 10) === pid) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
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
  console.log(`🚀 STARTING AUFTRAG 033 SCREENSHOT HARNESS (STAGE: ${stage.toUpperCase()})`);
  console.log('=======================================================');

  const HOST = '127.0.0.1';
  let previewProc = null;
  let chromeProc = null;
  let userDataDir = null;
  let cdp = null;
  let previewExited = false;
  let previewExitReason = null;
  let chromeExited = false;
  let chromeExitReason = null;

  try {
    // 1. Build production app
    console.log('[Build] Building production app...');
    const buildProc = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
    await new Promise((resolve, reject) => {
      buildProc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Build failed with code ${code}`))));
    });

    // 2. Start Preview Server on free port
    const previewPort = await findAvailablePort(4192, HOST);
    console.log(`[Preview] Starting vite preview on verified free port ${previewPort} (${HOST})...`);

    let previewStdout = '';
    let previewStderr = '';

    const viteBin = path.resolve(process.cwd(), 'node_modules/vite/bin/vite.js');
    previewProc = spawn(process.execPath, [viteBin, 'preview', '--host', HOST, '--port', String(previewPort), '--strictPort'], {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    previewProc.on('exit', (code, signal) => {
      previewExited = true;
      previewExitReason = `Preview process exited unexpectedly (code: ${code}, signal: ${signal})`;
    });

    previewProc.stdout.on('data', (d) => {
      const text = d.toString();
      previewStdout += text;
    });

    previewProc.stderr.on('data', (d) => {
      const text = d.toString();
      previewStderr += text;
      console.error(`[Preview Err] ${text}`);
    });

    let serverReady = false;
    for (let i = 0; i < 50; i++) {
      if (previewExited) {
        throw new Error(`Preview server process failed to start or exited immediately. Stderr: ${previewStderr.trim() || 'none'}. ${previewExitReason}`);
      }

      const hasViteListeningOutput = previewStdout.includes(`:${previewPort}`) || previewStdout.includes('Local:');
      const hasProcessBound = isPidListeningOnPort(previewProc.pid, previewPort);

      if (hasViteListeningOutput || hasProcessBound) {
        try {
          await new Promise((resolve, reject) => {
            const req = http.get(`http://${HOST}:${previewPort}`, (res) => {
              if (res.statusCode === 200) resolve();
              else reject(new Error(`HTTP status ${res.statusCode}`));
            });
            req.on('error', reject);
            req.setTimeout(1000, () => req.destroy(new Error('Probe timeout')));
          });

          // Strict verification: preview process must still be running and bound to this port
          if (previewExited || previewProc.exitCode !== null || previewProc.killed) {
            throw new Error(`Preview process terminated during probe. Port ${previewPort} is not owned by our preview process!`);
          }

          if (!isPidListeningOnPort(previewProc.pid, previewPort)) {
            throw new Error(`Port ${previewPort} is answering, but is NOT bound to spawned Preview PID ${previewProc.pid}! Aborting to prevent testing against foreign server.`);
          }

          serverReady = true;
          break;
        } catch (probeErr) {
          if (probeErr.message.includes('foreign server') || probeErr.message.includes('not owned')) {
            throw probeErr;
          }
        }
      }

      await sleep(200);
    }

    if (!serverReady) {
      if (previewExited) {
        throw new Error(`Preview server process exited before becoming ready. Stderr: ${previewStderr.trim()}. ${previewExitReason}`);
      }
      throw new Error(`Preview server failed to reach confirmed ready state on http://${HOST}:${previewPort}. Output: ${previewStdout.trim()}`);
    }

    console.log(`✅ Preview server running and strictly verified for PID ${previewProc.pid} on http://${HOST}:${previewPort}`);

    // 3. Launch Chrome on verified free port
    const chromePort = await findAvailablePort(9252, HOST);
    const chromePath = findChromePath();
    userDataDir = path.resolve(process.cwd(), `.chrome-cdp-profile-g17-${stage}-${Date.now()}`);
    fs.mkdirSync(userDataDir, { recursive: true });

    console.log(`[Chrome] Launching Headless Chrome on verified free port ${chromePort}...`);
    chromeProc = spawn(chromePath, [
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

    chromeProc.on('exit', (code, signal) => {
      chromeExited = true;
      chromeExitReason = `Chrome process exited (code: ${code}, signal: ${signal})`;
    });

    const wsUrl = await getWsDebugUrl(chromePort, HOST);
    cdp = new CdpSession(wsUrl);
    await cdp.connect();
    console.log('✅ Chrome CDP connected.');

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    await cdp.send('Emulation.setEmulatedMedia', { media: 'screen' });

    // 4. Capture 24 Target Pages across 3 Viewports (72 paired screenshots)
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
        if (previewExited) {
          throw new Error(`Preview process died unexpectedly before ${page.id}: ${previewExitReason}`);
        }
        if (chromeExited) {
          throw new Error(`Chrome process died unexpectedly before ${page.id}: ${chromeExitReason}`);
        }

        console.log(`\n[Flow] ${page.name} (${page.path}) [${vp.name}px]`);
        await cdp.send('Page.navigate', { url: `http://${HOST}:${previewPort}${page.path}` });
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

        // 2. Check internal container horizontal scroll/clipping (hard assertion on nachher)
        if (stage === 'nachher') {
          const containerOverflowEval = await cdp.send('Runtime.evaluate', {
            expression: `
              (() => {
                // Begründete Ausnahmen für nicht relevante Inline-/Text-/Leaf-Elemente:
                // Reine Inline- und Text-Elemente (z. B. span, a, label, Überschriften h1-h6, p)
                // sowie Formularelemente und Grafiken/Medien sind keine strukturellen Layout-Container.
                // Subpixel-Antialiasing und Font-Metriken können bei reinen Textelementen
                // minimale Rundungsabweichungen erzeugen, ohne dass ein horizontaler Container-Überlauf vorliegt.
                const NON_CONTAINER_TAGS = new Set([
                  'SPAN', 'A', 'LABEL', 'B', 'STRONG', 'I', 'EM', 'SMALL', 'TIME', 'CODE', 'ABBR',
                  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P',
                  'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA',
                  'SVG', 'PATH', 'CIRCLE', 'RECT', 'G', 'IMG', 'CANVAS', 'VIDEO', 'PICTURE'
                ]);

                const elms = Array.from(document.querySelectorAll('*'));
                let bad = [];
                for (const el of elms) {
                  if (el === document.documentElement || el === document.body) continue;
                  if (NON_CONTAINER_TAGS.has(el.tagName)) continue;

                  const style = window.getComputedStyle(el);
                  if (style.display === 'none' || style.visibility === 'hidden') continue;

                  // Nur sichtbare Layout-Container mit echter Breite prüfen
                  if (el.clientWidth <= 0) continue;

                  const diff = el.scrollWidth - el.clientWidth;
                  if (diff > 1) {
                    bad.push({
                      tag: el.tagName,
                      className: typeof el.className === 'string' ? el.className : (el.getAttribute('class') || ''),
                      diff: diff,
                      scrollWidth: el.scrollWidth,
                      clientWidth: el.clientWidth,
                      overflowX: style.overflowX,
                      hasHorizontalScroll: style.overflowX === 'scroll' || style.overflowX === 'auto'
                    });
                  }
                }
                return bad;
              })()
            `,
            returnByValue: true,
          });

          const clippedContainers = containerOverflowEval.result?.value || [];
          if (clippedContainers.length > 0) {
            const details = clippedContainers
              .map(b => `  - <${b.tag.toLowerCase()} class="${b.className}"> diff: ${b.diff}px (scrollWidth: ${b.scrollWidth}px, clientWidth: ${b.clientWidth}px, overflowX: ${b.overflowX})`)
              .join('\n');
            throw new Error(`Horizontal container overflow/scroll detected on ${page.id} (${vp.name}px):\n${details}`);
          }
          console.log(`✅ 0px internal container scroll/clipping on ${page.id} (${vp.name}px)`);
        }

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

      // 5. NACHHER-ONLY: Capture Werbespot Modal on /resources/materials (3 screenshots)
      if (stage === 'nachher') {
        if (previewExited) {
          throw new Error(`Preview process died unexpectedly before video capture: ${previewExitReason}`);
        }
        if (chromeExited) {
          throw new Error(`Chrome process died unexpectedly before video capture: ${chromeExitReason}`);
        }

        console.log(`\n[Flow] ${VIDEO_TARGET.name} (${VIDEO_TARGET.path}) [${vp.name}px] (Nachher-only)`);
        await cdp.send('Page.navigate', { url: `http://${HOST}:${previewPort}${VIDEO_TARGET.path}` });
        await sleep(1500);

        const modalOpenEval = await cdp.send('Runtime.evaluate', {
          expression: `
            (() => {
              const cards = Array.from(document.querySelectorAll('div[style*="cursor: pointer"]'));
              if (cards.length === 0) return { error: 'No resource cards found' };
              const targetCard = cards.find(c => c.textContent.includes('Werbespot') || c.textContent.includes('werbespot'));
              if (!targetCard) return { error: 'Werbespot card not found in DOM' };
              targetCard.click();
              return { ok: true, text: targetCard.textContent.slice(0, 50) };
            })()
          `,
          returnByValue: true,
        });

        if (modalOpenEval.result?.value?.error) {
          throw new Error(`Failed to open Werbespot modal: ${modalOpenEval.result.value.error}`);
        }
        await sleep(1000);

        console.log('[Video QA] Verifying video player attributes...');
        const videoEval = await cdp.send('Runtime.evaluate', {
          expression: `
            (() => {
              const video = document.querySelector('video');
              if (!video) return { error: 'No <video> element found in modal' };
              const hasControls = video.hasAttribute('controls');
              const hasAutoplay = video.hasAttribute('autoplay') && video.autoplay;
              const hasLoop = video.hasAttribute('loop') && video.loop;
              const source = video.querySelector('source')?.getAttribute('src') || video.getAttribute('src') || '';
              const ariaLabel = video.getAttribute('aria-label') || '';
              const fallbackLink = document.querySelector('a[href*="leadpilot-werbespot.webm"]');

              return {
                hasControls,
                hasAutoplay,
                hasLoop,
                source,
                ariaLabel,
                hasFallbackLink: !!fallbackLink,
              };
            })()
          `,
          returnByValue: true,
        });

        const vQA = videoEval.result?.value;
        if (vQA?.error) {
          throw new Error(`Video QA error: ${vQA.error}`);
        }
        if (!vQA.hasControls) throw new Error('Video must have controls attribute');
        if (vQA.hasAutoplay) throw new Error('Video must NOT have autoplay');
        if (vQA.hasLoop) throw new Error('Video must NOT have loop');
        if (!vQA.source.includes('leadpilot-werbespot.webm')) {
          throw new Error(`Video source must point to leadpilot-werbespot.webm, got: ${vQA.source}`);
        }
        if (!vQA.ariaLabel.includes('Werbespot')) {
          throw new Error(`Video must have accessible label, got: "${vQA.ariaLabel}"`);
        }
        if (!vQA.hasFallbackLink) {
          throw new Error('Visible fallback link to video file is missing');
        }
        console.log('✅ Video Player QA passed (native controls, no autoplay, no loop, accessible, fallback link present)');

        const videoScreenshot = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false,
        });

        const videoFilename = `resources-werbespot-${vp.name}-${stage}.png`;
        const videoFilePath = path.join(SCREENSHOT_DIR, videoFilename);
        const videoBuf = Buffer.from(videoScreenshot.data, 'base64');
        fs.writeFileSync(videoFilePath, videoBuf);
        console.log(`💾 Saved [${stage}-only]: ${videoFilename} (${videoBuf.length} bytes)`);

        // Close modal
        await cdp.send('Runtime.evaluate', {
          expression: `
            (() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              const closeBtn = buttons.find(b => b.textContent.trim() === '✕' || b.textContent.trim() === '← Zurück');
              if (closeBtn) closeBtn.click();
            })()
          `,
        });
        await sleep(500);
      }
    }

    // 6. Deep-Link Matrix Test (all 41 routes)
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
      if (previewExited) {
        throw new Error(`Preview process died unexpectedly before route ${route.path}: ${previewExitReason}`);
      }
      if (chromeExited) {
        throw new Error(`Chrome process died unexpectedly before route ${route.path}: ${chromeExitReason}`);
      }

      await cdp.send('Page.navigate', { url: `http://${HOST}:${previewPort}${route.path}` });
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
    console.log('\n[Cleanup] Cleaning up processes and temporary resources...');
    if (cdp) {
      try {
        await cdp.send('Browser.close');
      } catch {}
      try {
        await cdp.close();
      } catch {}
    }

    if (chromeProc) {
      console.log('[Cleanup] Stopping Chrome process...');
      await stopProcess(chromeProc, 'Chrome').catch((e) => console.error(`[Cleanup Warn] ${e.message}`));
    }
    if (previewProc) {
      console.log('[Cleanup] Stopping Preview process...');
      await stopProcess(previewProc, 'Preview').catch((e) => console.error(`[Cleanup Warn] ${e.message}`));
    }
    if (userDataDir) {
      console.log('[Cleanup] Removing temporary profile directory...');
      await removeDirectorySafely(userDataDir).catch((e) => console.error(`[Cleanup Warn] ${e.message}`));
    }
    console.log('✅ Cleanup completed cleanly.');
  }

  console.log(`\n=======================================================`);
  console.log(`🎉 HARNESS RUN COMPLETED SUCCESSFULLY FOR STAGE: ${stage.toUpperCase()}`);
  console.log(`=======================================================`);
}

if (isMain) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}
