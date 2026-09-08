import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-009');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let commitSha = 'unknown';
try {
  commitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch (e) {
  console.warn('Could not determine git commit SHA:', e.message);
}

console.log(`=======================================================`);
console.log(`📸 STARTING AUFTRAG 009 FINANZEN CAPTURE & AUDIT`);
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
    const msg = { id, method, params };
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(msg));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result.value;
  }

  async screenshot(filePath, label) {
    const checkOverflow = await this.eval(`
      (() => {
        const docEl = document.documentElement;
        const body = document.body;
        const main = document.querySelector('main');
        const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth, main ? main.scrollWidth : 0);
        const clientW = window.innerWidth;
        const clipped = [];
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const r = el.getBoundingClientRect();
          if (r.right > clientW + 3) {
            clipped.push({ tag: el.tagName, class: el.className, right: r.right, clientW });
          }
        }
        return {
          hasOverflow: scrollW > clientW + 2,
          scrollW,
          clientW,
          clippedCount: clipped.length,
          samples: clipped.slice(0, 3)
        };
      })()
    `);

    if (checkOverflow.hasOverflow) {
      console.warn(
        `⚠️ [${label}] Overflow detected: scrollWidth=${checkOverflow.scrollW} > clientWidth=${checkOverflow.clientW}, samples:`,
        JSON.stringify(checkOverflow.samples)
      );
    } else {
      console.log(`✅ [${label}] Overflow check passed (0 clipping)`);
    }

    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, buffer);
    console.log(`💾 Saved: ${path.basename(filePath)} (${buffer.length} bytes)`);
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function navigateViaUi(client, viewId, isMobile) {
  // 1. Wenn Mobile und Drawer noch nicht offen ist, Drawer öffnen
  if (isMobile) {
    await client.eval(`
      (() => {
        const drawer = document.getElementById('mobile-sidebar-drawer');
        if (!drawer) {
          const trigger = document.getElementById('mobile-menu-trigger');
          if (trigger) trigger.click();
        }
      })()
    `);
    await new Promise((r) => setTimeout(r, 250));
  }

  // 2. Kategorie FINANZEN expandieren falls eingeklappt, und NavItem klicken
  let clicked = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    clicked = await client.eval(`
      (() => {
        const btn = document.querySelector('[data-testid="nav-item-${viewId}"]');
        if (btn) {
          btn.click();
          return true;
        }

        const allSpans = Array.from(document.querySelectorAll('nav span, aside nav span, #mobile-sidebar-drawer span'));
        const finanzenSpan = allSpans.find(s => s.textContent && s.textContent.trim().toUpperCase().includes('FINANZEN'));
        if (finanzenSpan) {
          const header = finanzenSpan.closest('div');
          if (header) header.click();
        }

        return false;
      })()
    `);

    await new Promise((r) => setTimeout(r, 200));
    if (clicked) break;
  }

  if (!clicked) {
    throw new Error(`Nav item not found for view: ${viewId}`);
  }

  // 3. Wenn Mobile, sicherstellen, dass der Drawer vollständig geschlossen ist!
  if (isMobile) {
    for (let wait = 0; wait < 15; wait++) {
      const isDrawerGone = await client.eval(`
        (() => {
          const drawer = document.getElementById('mobile-sidebar-drawer');
          const trigger = document.getElementById('mobile-menu-trigger');
          const triggerClosed = !trigger || trigger.getAttribute('aria-expanded') === 'false';
          const drawerGone = !drawer;
          return drawerGone && triggerClosed;
        })()
      `);

      if (isDrawerGone) break;

      await client.eval(`
        (() => {
          const closeBtn = document.querySelector('#mobile-sidebar-drawer button[aria-label="Menü schließen"]');
          if (closeBtn) {
            closeBtn.click();
          } else {
            const backdrop = document.querySelector('div[style*="rgba(6, 22, 19"]');
            if (backdrop) backdrop.click();
          }
        })()
      `);
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  await new Promise((r) => setTimeout(r, 300));
}

// Scroll-Justierung: Richtet das Zielelement exakt am oberen Rand des sichtbaren <main>-Bereichs aus
async function scrollElementToVisibleTop(client, selector) {
  await client.eval(`
    (() => {
      const el = document.querySelector('${selector}');
      const main = document.querySelector('main');
      if (el && main) {
        const mainRect = main.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const diff = elRect.top - mainRect.top;
        main.scrollTop += diff;
      }
    })()
  `);
  await new Promise((r) => setTimeout(r, 200));
}

async function verifyAuftrag009Finanzen(client, componentId, viewportName, viewportWidth) {
  // Mobile Drawer darf nicht geöffnet sein
  const drawerOpen = await client.eval(`
    (() => {
      const drawer = document.getElementById('mobile-sidebar-drawer');
      const trigger = document.getElementById('mobile-menu-trigger');
      const triggerExpanded = trigger && trigger.getAttribute('aria-expanded') === 'true';
      return !!drawer && !drawer.getAttribute('aria-hidden') && triggerExpanded;
    })()
  `);

  if (drawerOpen) {
    throw new Error(`GATE ERROR: [${viewportName}] Mobile Drawer ist noch geöffnet!`);
  }

  const checkVisibilityFn = `
    function isRendered(el) {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }
  `;

  if (componentId === 'revenue-cost-shoreline') {
    const check = await client.eval(`
      (() => {
        ${checkVisibilityFn}
        const container = document.querySelector('.facelift-revenue-cost-shoreline');
        if (!container || !isRendered(container)) return { ok: false, reason: 'Container not rendered' };

        const text = container.textContent || '';
        const has164k = text.includes('164.000') || text.includes('164');
        const has336k = text.includes('336.000') || text.includes('336');
        const has663k = text.includes('663.000') || text.includes('663');
        const hasCost452k = text.includes('452.000') || text.includes('452');
        const hasCost645k = text.includes('645.000') || text.includes('645');
        const hasCost812k = text.includes('812.000') || text.includes('812');
        const hasEbitda = text.includes('Ergebnislücke') || text.includes('EBITDA');
        const hasPeriodCards = container.querySelectorAll('article').length === 3;

        return {
          ok: has164k && has336k && has663k && hasCost452k && hasCost645k && hasCost812k && hasEbitda && hasPeriodCards,
          has164k, has336k, has663k, hasCost452k, hasCost645k, hasCost812k, hasEbitda, hasPeriodCards
        };
      })()
    `);

    if (!check.ok) {
      throw new Error(`GATE ERROR: [${viewportName}] RevenueCostShoreline check failed: ${JSON.stringify(check)}`);
    }
    console.log(`✅ [${viewportName}] RevenueCostShoreline verified (Umsatzerlöse, Gesamtkosten, Ergebnislücke 2024-2026 intakt)`);
  } else if (componentId === 'capital-cut') {
    const check = await client.eval(`
      (() => {
        ${checkVisibilityFn}
        const container = document.querySelector('.facelift-capital-cut');
        if (!container || !isRendered(container)) return { ok: false, reason: 'Container not rendered' };

        const text = container.textContent || '';
        const hasAktiva = text.includes('Mittelverwendung') && text.includes('479.000');
        const hasPassiva = text.includes('Finanzierung') && text.includes('479.000');
        const hasAnlage = text.includes('Anlagevermögen') && (text.includes('60.000') || text.includes('12,5'));
        const hasUmlauf = text.includes('Umlaufvermögen') && (text.includes('411.000') || text.includes('85,8'));
        const hasEk = text.includes('Eigenkapital') && (text.includes('344.000') || text.includes('71,8'));

        const articles = Array.from(container.querySelectorAll('article'));
        const allArticlesRendered = articles.length === 2 && articles.every(isRendered);

        return {
          ok: hasAktiva && hasPassiva && hasAnlage && hasUmlauf && hasEk && allArticlesRendered,
          hasAktiva, hasPassiva, hasAnlage, hasUmlauf, hasEk,
          articlesCount: articles.length,
          allArticlesRendered
        };
      })()
    `);

    if (!check.ok) {
      throw new Error(`GATE ERROR: [${viewportName}] CapitalCut check failed: ${JSON.stringify(check)}`);
    }
    console.log(`✅ [${viewportName}] CapitalCut verified (Mittelverwendung/Finanzierung 479.000 €, 50/50 Symmetrie, Detailpositionen intakt)`);
  } else if (componentId === 'saas-motor') {
    const check = await client.eval(`
      (() => {
        ${checkVisibilityFn}
        const container = document.querySelector('.facelift-saas-motor');
        if (!container || !isRendered(container)) return { ok: false, reason: 'Container not rendered' };

        const text = container.textContent || '';
        const hasNode1 = text.includes('333 €') && text.includes('64,0 %');
        const hasNode2 = text.includes('13 Monate') && text.includes('4.447 €');
        const hasNode3 = text.includes('101 %') && text.includes('88 %');
        const hasNode4 = text.includes('34.320 €') && text.includes('51.667 €');

        // Kante 1 Prüfung
        const hasKante1Math = text.includes('Fully-Loaded CAC (4.447 €) und Deckungsbeitrag je Kunde/Monat (333 €) werden im Payback von 13 Monaten zusammengeführt');

        // Kanten 2-4 neutrale Formulierung mit Kausalitätsausschluss
        const hasNonCausalNote = text.includes('KPI-Zusammenhang, keine nachgewiesene Kausalität');

        // Text- und Aria-Prüfung für KPI-Kreis und gerichtete Lesereihenfolge
        const hasKpiKreisAria = container.getAttribute('aria-label') === 'SaaS-Motor KPI-Kreis';
        const hasReadingOrderText = text.includes('gerichtete Lesereihenfolge');
        const noKausalitaetsKreis = !text.includes('Kausalitätskreis') && !text.includes('Gerichteter Kreis');

        // Kausale Verbotssätze prüfen
        const hasForbiddenCausality1 = text.includes('Kürzere Amortisationsdauer refinanziert');
        const hasForbiddenCausality2 = text.includes('NRR > 100 % stabilisiert und skaliert');
        const hasForbiddenCausality3 = text.includes('MRR ermöglicht Plattforminvestitionen');
        const noForbiddenCausality = !hasForbiddenCausality1 && !hasForbiddenCausality2 && !hasForbiddenCausality3;

        const nodes = Array.from(container.querySelectorAll('.facelift-saas-motor-node'));
        const allNodesRendered = nodes.length === 4 && nodes.every(isRendered);

        return {
          ok: hasNode1 && hasNode2 && hasNode3 && hasNode4 && hasKante1Math && hasNonCausalNote && hasKpiKreisAria && hasReadingOrderText && noKausalitaetsKreis && noForbiddenCausality && allNodesRendered,
          hasNode1, hasNode2, hasNode3, hasNode4, hasKante1Math, hasNonCausalNote, hasKpiKreisAria, hasReadingOrderText, noKausalitaetsKreis, noForbiddenCausality,
          nodesCount: nodes.length,
          allNodesRendered
        };
      })()
    `);

    if (!check.ok) {
      throw new Error(`GATE ERROR: [${viewportName}] SaasMotor check failed: ${JSON.stringify(check)}`);
    }
    console.log(`✅ [${viewportName}] SaasMotor verified (4 Knoten, Kante 1 rein rechnerisch, Kanten 2-4 neutral mit Kausalitätsausschluss, 0 Verbotssätze)`);
  }
}

async function verify200PercentZoomMobile(client) {
  console.log('\n🔍 AUDIT: Prüfe WCAG 1.4.10 Reflow bei 200 % Zoom auf 375 px (CSS-Breite: 188 px)...');

  // Für 200 % Zoom bei 375 px Viewport wird die CSS-Breite halbiert: 188 px bei DPR 2
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 188,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await new Promise((r) => setTimeout(r, 500));

  await navigateViaUi(client, 's-guv', true);
  await scrollElementToVisibleTop(client, '.facelift-revenue-cost-shoreline');

  const overflowAudit = await client.eval(`
    (() => {
      const container = document.querySelector('.facelift-revenue-cost-shoreline');
      if (!container) return { ok: false, reason: 'Container not found' };

      const clientW = window.innerWidth;
      const scrollW = document.documentElement.scrollWidth;
      const clipped = [];
      const all = container.querySelectorAll('*');

      for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.right > clientW + 2) {
          clipped.push({
            tag: el.tagName,
            text: (el.textContent || '').trim().slice(0, 30),
            right: r.right,
            clientW
          });
        }
      }

      return {
        ok: clipped.length === 0,
        scrollW,
        clientW,
        clippedCount: clipped.length,
        samples: clipped.slice(0, 3)
      };
    })()
  `);

  if (overflowAudit.clippedCount > 0) {
    throw new Error(`GATE ERROR: 200 % Zoom Reflow fehlgeschlagen: ${JSON.stringify(overflowAudit)}`);
  }

  const zoomFile = path.join(SCREENSHOT_DIR, 'finanzen_Guv_RevenueCostShoreline_375px_zoom200.png');
  const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(zoomFile, Buffer.from(data, 'base64'));
  console.log(`✅ [200 % Zoom Mobile] RevenueCostShoreline bei 188 px voll lesbar & reflowed ohne Clipping`);
  console.log(`💾 Saved: finanzen_Guv_RevenueCostShoreline_375px_zoom200.png`);

  // Zurücksetzen auf Normalmaß
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await new Promise((r) => setTimeout(r, 300));
}

async function run() {
  const PORT = 4199;
  console.log(`Starting Vite preview on port ${PORT}...`);
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    env: { ...process.env, BROWSER: 'none' },
  });

  await new Promise((r) => setTimeout(r, 2000));

  const CHROME_PORT = 9249;
  console.log(`Starting headless Chrome on CDP port ${CHROME_PORT}...`);
  const chrome = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      `--remote-debugging-port=${CHROME_PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let targets = null;
  for (let attempt = 1; attempt <= 15; attempt++) {
    try {
      targets = await getJson(`http://127.0.0.1:${CHROME_PORT}/json`);
      if (targets && targets.length > 0) {
        console.log(`Connected to Chrome CDP on attempt ${attempt}`);
        break;
      }
    } catch (e) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!targets || targets.length === 0) {
    preview.kill();
    chrome.kill();
    throw new Error('Failed to connect to headless Chrome on CDP port!');
  }

  try {
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
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

    // Zu auditierende Komponenten (exakt alle 3 neuen Finanzen-Komponenten)
    const tasks = [
      {
        subviewId: 's-guv',
        componentId: 'revenue-cost-shoreline',
        selector: '.facelift-revenue-cost-shoreline',
        filePrefix: 'finanzen_Guv_RevenueCostShoreline',
      },
      {
        subviewId: 's-bilanz',
        componentId: 'capital-cut',
        selector: '.facelift-capital-cut',
        filePrefix: 'finanzen_Bilanz_CapitalCut',
      },
      {
        subviewId: 's-unit',
        componentId: 'saas-motor',
        selector: '.facelift-saas-motor',
        filePrefix: 'finanzen_Unit_SaasMotor',
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

      let lastSubview = '';

      for (const t of tasks) {
        if (t.subviewId !== lastSubview) {
          await navigateViaUi(client, t.subviewId, vp.isMobile);
          lastSubview = t.subviewId;
        }

        // Exakt auf das Zielelement scrollen (unter den fixierten Header!)
        await scrollElementToVisibleTop(client, t.selector);

        // Verifikation
        await verifyAuftrag009Finanzen(client, t.componentId, `${vp.name}px`, vp.width);

        // Screenshot aufnehmen
        const fileName = `${t.filePrefix}_${vp.name}px.png`;
        const filePath = path.join(SCREENSHOT_DIR, fileName);
        await client.screenshot(filePath, `${t.filePrefix} @ ${vp.name}px`);
      }

      if (vp.name === '375') {
        // WCAG 200 % Reflow Prüfung
        await verify200PercentZoomMobile(client);
      }
    }

    client.close();
    console.log(`\n=======================================================`);
    console.log(`🎉 ALL FINANZEN SCREENSHOTS CAPTURED & AUDITED SUCCESSFULLY!`);
    console.log(`📁 Files in ${SCREENSHOT_DIR}:`);
    const files = fs.readdirSync(SCREENSHOT_DIR).filter((f) => f.endsWith('.png'));
    files.forEach((f) => console.log(`  - ${f}`));
    console.log(`=======================================================\n`);
  } finally {
    try { preview.kill(); } catch (e) {}
    try { chrome.kill(); } catch (e) {}
  }
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
