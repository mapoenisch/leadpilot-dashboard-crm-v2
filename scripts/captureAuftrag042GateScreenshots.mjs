import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WebSocket = globalThis.WebSocket;

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const stageArg = args.find((a) => a.startsWith('--stage='));
const stageParam = stageArg ? stageArg.split('=')[1] : null;

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-042');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

export const BASELINE_COMMIT = 'e243dca';
export const BASELINE_WORKTREE_DIR = path.resolve(process.cwd(), '.baseline-build-e243dca');

function getGitCommit(targetDir) {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: targetDir, encoding: 'utf8' }).trim();
  } catch (err) {
    throw new Error(`Failed to get git commit in ${targetDir}: ${err.message}`);
  }
}

export function prepareBaselineWorktree() {
  if (!fs.existsSync(BASELINE_WORKTREE_DIR)) {
    console.log(`[Baseline] Erstelle temporären Git-Worktree für Commit ${BASELINE_COMMIT}...`);
    execSync(`git worktree add --detach "${BASELINE_WORKTREE_DIR}" ${BASELINE_COMMIT}`, { stdio: 'inherit' });
    const nmSource = path.resolve(process.cwd(), 'node_modules');
    const nmTarget = path.join(BASELINE_WORKTREE_DIR, 'node_modules');
    if (!fs.existsSync(nmTarget)) {
      try {
        fs.symlinkSync(nmSource, nmTarget, 'junction');
      } catch (e) {
        console.warn('[Baseline] Symlink node_modules Warnung:', e.message);
      }
    }
  }

  const actualCommit = getGitCommit(BASELINE_WORKTREE_DIR);
  if (!actualCommit.startsWith(BASELINE_COMMIT)) {
    throw new Error(`[Baseline] Worktree commit mismatch: expected ${BASELINE_COMMIT}, got ${actualCommit}`);
  }

  console.log(`[Baseline] Baue echte Baseline ${BASELINE_COMMIT} in ${BASELINE_WORKTREE_DIR}...`);
  const tscBin = path.resolve(process.cwd(), 'node_modules/typescript/bin/tsc');
  const viteBin = path.resolve(process.cwd(), 'node_modules/vite/bin/vite.js');
  execSync(`"${process.execPath}" "${tscBin}" && "${process.execPath}" "${viteBin}" build`, {
    cwd: BASELINE_WORKTREE_DIR,
    stdio: 'inherit',
  });
  return BASELINE_WORKTREE_DIR;
}

export function cleanupBaselineWorktree() {
  if (fs.existsSync(BASELINE_WORKTREE_DIR)) {
    console.log('[Baseline] Entferne temporären Worktree...');
    try {
      const nmTarget = path.join(BASELINE_WORKTREE_DIR, 'node_modules');
      if (fs.existsSync(nmTarget)) {
        try { fs.unlinkSync(nmTarget); } catch {}
      }
      execSync(`git worktree remove --force "${BASELINE_WORKTREE_DIR}"`, { stdio: 'inherit' });
    } catch (e) {
      console.warn('[Baseline] Fehler beim Entfernen des Worktrees:', e.message);
    }
  }
}

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

async function stopProcess(proc, timeoutMs = 8000) {
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
      try {
        proc.kill('SIGKILL');
      } catch {}
    }, timeoutMs / 2);

    timeoutTimer = setTimeout(() => {
      onExit();
    }, timeoutMs);
  });
}

async function removeDirWithRetry(dirPath, retries = 5, delayMs = 500) {
  if (!fs.existsSync(dirPath)) return;
  for (let i = 0; i < retries; i++) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
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
          if (res.error) reject(new Error(`CDP Error: ${res.error.message}`));
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

async function runStageCapture(stage) {
  console.log('=======================================================');
  console.log(`🚀 STARTING AUFTRAG 042 SCREENSHOT HARNESS (STAGE: ${stage.toUpperCase()})`);
  console.log('=======================================================');

  const HOST = '127.0.0.1';
  let previewProc = null;
  let chromeProc = null;
  let userDataDir = null;
  let cdp = null;

  let stageDir = null;
  let stageCommit = null;

  if (stage === 'vorher') {
    stageDir = prepareBaselineWorktree();
    if (!fs.existsSync(stageDir)) {
      throw new Error(`[Stage vorher] Worktree does not exist: ${stageDir}`);
    }
    if (stageDir === process.cwd()) {
      throw new Error('[Stage vorher] Stage directory cannot be process.cwd()');
    }
    stageCommit = getGitCommit(stageDir);
    console.log(`[Stage vorher] Gebauter Git-Commit: ${stageCommit} (Worktree: ${stageDir})`);
    if (!stageCommit.startsWith(BASELINE_COMMIT)) {
      throw new Error(`[Stage vorher] Commit mismatch: expected ${BASELINE_COMMIT}, got ${stageCommit}`);
    }
  } else if (stage === 'nachher') {
    stageDir = process.cwd();
    if (!fs.existsSync(stageDir)) {
      throw new Error(`[Stage nachher] Directory does not exist: ${stageDir}`);
    }
    stageCommit = getGitCommit(stageDir);
    const headCommit = execSync('git rev-parse --short HEAD', { cwd: stageDir, encoding: 'utf8' }).trim();
    console.log(`[Stage nachher] Gebauter Git-Commit: ${stageCommit} (Dir: ${stageDir})`);
    if (stageCommit !== headCommit) {
      throw new Error(`[Stage nachher] Commit mismatch: expected HEAD (${headCommit}), got ${stageCommit}`);
    }
    console.log(`[Build] Building production app for ${stage} in ${stageDir}...`);
    const tscBin = path.resolve(process.cwd(), 'node_modules/typescript/bin/tsc');
    const viteBin = path.resolve(process.cwd(), 'node_modules/vite/bin/vite.js');
    execSync(`"${process.execPath}" "${tscBin}" && "${process.execPath}" "${viteBin}" build`, {
      cwd: stageDir,
      stdio: 'inherit',
    });
  } else {
    throw new Error(`Unknown stage: ${stage}`);
  }

  try {
    const previewPort = await findAvailablePort(4195, HOST);
    console.log(`[Preview] Starting vite preview on port ${previewPort} (cwd: ${stageDir})...`);

    const viteBin = path.resolve(process.cwd(), 'node_modules/vite/bin/vite.js');
    previewProc = spawn(process.execPath, [viteBin, 'preview', '--host', HOST, '--port', String(previewPort), '--strictPort'], {
      cwd: stageDir,
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

    const cdpPort = await findAvailablePort(9245, HOST);
    userDataDir = path.resolve(process.cwd(), `.tmp-chrome-042-${stage}`);
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

    const baseUrl = `http://${HOST}:${previewPort}/dashboard`;

    for (const vp of VIEWPORTS) {
      console.log(`\n--- Viewport: ${vp.name}px (${vp.width}x${vp.height}) ---`);

      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.isMobile,
      });

      // 1. DEEP-LINK
      console.log(`[DeepLink] Page.navigate to ${baseUrl}...`);
      await cdp.send('Page.navigate', { url: baseUrl });
      await sleep(1500);

      await assertAndCapture(cdp, stage, vp, 'deeplink');

      // 2. RELOAD
      console.log(`[Reload] Page.reload...`);
      await cdp.send('Page.reload');
      await sleep(1500);

      await assertAndCapture(cdp, stage, vp, 'reload');
    }

    console.log(`\n🎉 STAGE ${stage.toUpperCase()} CAPTURED SUCCESSFULLY!`);
  } finally {
    if (cdp) await cdp.close();
    if (chromeProc) await stopProcess(chromeProc);
    if (previewProc) await stopProcess(previewProc);
    if (userDataDir) await removeDirWithRetry(userDataDir);
  }
}

async function assertAndCapture(cdp, stage, vp, mode) {
  // DOM assertions
  const evalRes = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const title = document.title;
      const main = document.querySelector('main');
      const isNotFound = document.body.innerText.includes('Seite nicht gefunden') || document.body.innerText.includes('404');
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      const overflow = Math.max(0, scrollWidth - clientWidth);

      const section = document.querySelector('[data-testid="live-performance-section"]');
      const arrChart = document.querySelector('[data-testid="live-performance-arr-chart"]');
      const arrMix = document.querySelector('[data-testid="live-performance-arr-mix"]');
      const funnel = document.querySelector('[data-testid="live-performance-funnel"]');
      const activity = document.querySelector('[data-testid="live-performance-activity"]');
      const cards = Array.from(document.querySelectorAll('[data-testid="live-kpi-card"]'));

      return {
        hasTitle: Boolean(title && title.length > 0),
        hasMain: Boolean(main),
        isNotFound,
        overflow,
        nachherChecks: {
          hasSection: Boolean(section),
          sectionDimensions: section ? { width: section.getBoundingClientRect().width, height: section.getBoundingClientRect().height } : null,
          hasArrChart: Boolean(arrChart),
          hasArrMix: Boolean(arrMix),
          hasFunnel: Boolean(funnel),
          hasActivity: Boolean(activity),
          cardCount: cards.length,
          cardKpiIds: cards.map(c => c.getAttribute('data-kpi-id')),
        }
      };
    })()`,
    returnByValue: true,
  });

  const check = evalRes.result.value;
  if (!check.hasTitle) throw new Error(`Missing page title at ${vp.name}px ${mode}`);
  if (!check.hasMain) throw new Error(`Missing <main> container at ${vp.name}px ${mode}`);
  if (check.isNotFound) throw new Error(`Not Found page triggered at ${vp.name}px ${mode}`);
  if (check.overflow > 0) throw new Error(`Horizontal overflow detected at ${vp.name}px ${mode}: ${check.overflow}px`);

  console.log(`✅ ${vp.name}px ${mode}: Title and <main> present, 0px overflow`);

  if (stage === 'nachher') {
    const nc = check.nachherChecks;
    if (!nc.hasSection) throw new Error(`Missing live-performance-section at ${vp.name}px ${mode}`);
    if (!nc.sectionDimensions || nc.sectionDimensions.width <= 0 || nc.sectionDimensions.height <= 0) {
      throw new Error(`Invalid section dimensions at ${vp.name}px ${mode}`);
    }
    if (!nc.hasArrChart) throw new Error(`Missing live-performance-arr-chart at ${vp.name}px ${mode}`);
    if (!nc.hasArrMix) throw new Error(`Missing live-performance-arr-mix at ${vp.name}px ${mode}`);
    if (!nc.hasFunnel) throw new Error(`Missing live-performance-funnel at ${vp.name}px ${mode}`);
    if (!nc.hasActivity) throw new Error(`Missing live-performance-activity at ${vp.name}px ${mode}`);
    if (nc.cardCount < 3) throw new Error(`Expected at least 3 LiveKpiCards, found ${nc.cardCount} at ${vp.name}px ${mode}`);

    console.log(`✅ ${vp.name}px ${mode}: All live-performance elements confirmed`);
  }

  // Unroll for full height capture
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

  const fileName = `dashboard-${vp.name}-${stage}-${mode}.png`;
  const filePath = path.join(SCREENSHOT_DIR, fileName);
  fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
  console.log(`📸 Saved screenshot: ${fileName} (${(shot.data.length * 0.75 / 1024).toFixed(1)} kB, h=${Math.max(vp.height, contentHeight)}px)`);
}

async function main() {
  try {
    if (stageParam === 'vorher' || stageParam === 'nachher') {
      await runStageCapture(stageParam);
    } else if (stageParam === 'all') {
      console.log('Running capture for all stages (vorher [e243dca], then nachher [HEAD])...');
      await runStageCapture('vorher');
      await runStageCapture('nachher');
    } else {
      console.error('❌ Error: --stage must be "vorher", "nachher", or "all"');
      process.exit(1);
    }
  } finally {
    if (stageParam === 'vorher' || stageParam === 'all') {
      cleanupBaselineWorktree();
    }
  }
}

process.on('SIGINT', () => {
  cleanupBaselineWorktree();
  process.exit(130);
});

process.on('SIGTERM', () => {
  cleanupBaselineWorktree();
  process.exit(143);
});

if (isMain) {
  main().catch((err) => {
    console.error('❌ Harness failed:', err);
    cleanupBaselineWorktree();
    process.exit(1);
  });
}
