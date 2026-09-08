import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-004');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let commitSha = 'unknown';
try {
  commitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch (e) {
  console.warn('Could not determine git commit SHA:', e.message);
}

console.log(`=======================================================`);
console.log(`📸 STARTING AUFTRAG 004 STANDORT (COMPANY ATLAS) CAPTURE`);
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
        const unternehmenSpan = allSpans.find(s => s.textContent && s.textContent.trim().toUpperCase() === 'UNTERNEHMEN');
        if (unternehmenSpan) {
          const header = unternehmenSpan.closest('div');
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

async function run() {
  const PORT = 4193;
  const CDP_PORT = 9243;

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

      // Navigate via UI to s-standort
      await navigateViaUi(client, 's-standort', vp.isMobile);

      // 1. Strikte Prüfung der Überschrift
      const currentHeading = await client.eval(`
        const h2 = document.querySelector('h2');
        return h2 ? h2.textContent.trim() : '';
      `);
      if (currentHeading !== 'Sitz & Räumlichkeiten') {
        throw new Error(`GATE ERROR: Expected heading "Sitz & Räumlichkeiten", but got "${currentHeading}"`);
      }
      console.log(`✅ Verified heading: "${currentHeading}"`);

      // 2. Strikte Prüfung: Exakt 8 Bilder (4 Fotos + 4 Logos)
      const imagesStatus = await client.eval(`
        const imgs = Array.from(document.querySelectorAll('.facelift-location-atlas img'));
        return imgs.map(img => ({
          alt: img.alt,
          src: img.src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          complete: img.complete
        }));
      `);

      if (imagesStatus.length !== 8) {
        throw new Error(
          `GATE ERROR: Expected exactly 8 images in LocationAtlas, found ${imagesStatus.length}`
        );
      }
      console.log(`✅ Verified image count: ${imagesStatus.length} images`);

      // 3. Strikte Prüfung: Jedes Bild muss vollständig geladen sein und naturalWidth > 0 besitzen
      for (let i = 0; i < imagesStatus.length; i++) {
        const img = imagesStatus[i];
        if (!img.complete || img.naturalWidth === 0) {
          throw new Error(
            `GATE ERROR: Image #${i} failed to load properly: src=${img.src}, complete=${img.complete}, naturalWidth=${img.naturalWidth}`
          );
        }
      }
      console.log(`✅ All ${imagesStatus.length} images confirmed complete with naturalWidth > 0`);

      const fileName = `unternehmen_Standort_LocationAtlas_${vp.name}px.png`;
      const filePath = path.join(SCREENSHOT_DIR, fileName);
      await client.screenshot(filePath, `Standort_LocationAtlas @ ${vp.name}px`);
    }

    client.close();
    console.log(`\n=======================================================`);
    console.log(`🎉 ALL STANDORT SCREENSHOTS CAPTURED & ASSERTED SUCCESSFULLY!`);
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
