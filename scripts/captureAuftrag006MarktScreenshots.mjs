import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-006');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let commitSha = 'unknown';
try {
  commitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch (e) {
  console.warn('Could not determine git commit SHA:', e.message);
}

console.log(`=======================================================`);
console.log(`📸 STARTING AUFTRAG 006 MARKT CAPTURE & AUDIT`);
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
  // 1. Wenn Mobile und Drawer noch nicht offen ist, Drawer öffnen
  if (isMobile) {
    await client.eval(`
      const drawer = document.getElementById('mobile-sidebar-drawer');
      if (!drawer) {
        const trigger = document.getElementById('mobile-menu-trigger');
        if (trigger) trigger.click();
      }
    `);
    await new Promise((r) => setTimeout(r, 250));
  }

  // 2. Kategorie MARKT expandieren falls eingeklappt, und NavItem klicken
  for (let attempt = 0; attempt < 5; attempt++) {
    const clicked = await client.eval(`
      (() => {
        const btn = document.querySelector('[data-testid="nav-item-${viewId}"]');
        if (btn) {
          btn.click();
          return true;
        }

        const allSpans = Array.from(document.querySelectorAll('nav span, aside nav span, #mobile-sidebar-drawer span'));
        const marktSpan = allSpans.find(s => s.textContent && s.textContent.trim().toUpperCase().includes('MARKT'));
        if (marktSpan) {
          const header = marktSpan.closest('div');
          if (header) header.click();
        }

        return false;
      })()
    `);

    await new Promise((r) => setTimeout(r, 200));
    if (clicked) break;
  }

  // 3. Wenn Mobile, sicherstellen, dass der Drawer vollständig geschlossen ist!
  if (isMobile) {
    for (let wait = 0; wait < 15; wait++) {
      const isDrawerGone = await client.eval(`
        const drawer = document.getElementById('mobile-sidebar-drawer');
        const trigger = document.getElementById('mobile-menu-trigger');
        const triggerClosed = !trigger || trigger.getAttribute('aria-expanded') === 'false';
        const drawerGone = !drawer;
        return drawerGone && triggerClosed;
      `);

      if (isDrawerGone) break;

      // Falls Drawer nach Klick noch da ist: Schließen-Button oder Backdrop klicken
      await client.eval(`
        const closeBtn = document.querySelector('#mobile-sidebar-drawer button[aria-label="Menü schließen"]');
        if (closeBtn) {
          closeBtn.click();
        } else {
          const backdrop = document.querySelector('div[style*="rgba(6, 22, 19"]');
          if (backdrop) backdrop.click();
        }
      `);
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  await new Promise((r) => setTimeout(r, 300));
}

async function verifyAuftrag006Markt(client, viewId, viewportName, viewportWidth) {
  // Strikte Prüfung: Mobile Drawer darf bei keinem Viewport geöffnet sein!
  const drawerOpen = await client.eval(`
    const drawer = document.getElementById('mobile-sidebar-drawer');
    const trigger = document.getElementById('mobile-menu-trigger');
    const triggerExpanded = trigger && trigger.getAttribute('aria-expanded') === 'true';
    return !!drawer || triggerExpanded;
  `);

  if (drawerOpen) {
    throw new Error(`GATE ERROR: [${viewportName}] Mobile Drawer ist während der Prüfung noch geöffnet! Navigation verdeckt den Inhalt.`);
  }

  const checkVisibilityFn = `
    function checkStrictVisibility(el) {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      return rect.top < window.innerHeight && rect.bottom > 0;
    }
  `;

  if (viewId === 's-markt') {
    const res = await client.eval(`
      ${checkVisibilityFn}
      const stack = document.querySelector('.facelift-market-opportunity-stack');
      const h3 = stack ? stack.querySelector('h3') : null;
      const text = stack ? stack.textContent : '';
      const hasSom = text.includes('SOM') || text.includes('TAM') || text.includes('SAM');

      if (stack) {
        stack.scrollIntoView({ behavior: 'instant', block: 'center' });
      }

      const isVisibleInViewport = checkStrictVisibility(stack);

      return {
        exists: !!stack,
        heading: h3 ? h3.textContent.trim() : '',
        hasSom,
        isVisibleInViewport
      };
    `);
    if (!res.exists || res.heading !== 'Chancenstapel Marktpotenzial') {
      throw new Error(`GATE ERROR: MarketOpportunityStack nicht gefunden oder falscher Titel: ${JSON.stringify(res)}`);
    }
    if (res.hasSom) {
      throw new Error(`GATE ERROR: SOM/TAM/SAM unerlaubt im MarketOpportunityStack gefunden!`);
    }
    if (!res.isVisibleInViewport) {
      throw new Error(`GATE ERROR: MarketOpportunityStack liegt nicht sichtbar im Viewport (top < H && bottom > 0 && w>0 && h>0 && display/vis ok)!`);
    }
    console.log(`✅ [${viewportName}] MarketOpportunityStack verifiziert (${res.heading}, strikt sichtbar im Viewport, 0 SOM/TAM)`);
  }

  if (viewId === 's-wettbewerb') {
    const res = await client.eval(`
      ${checkVisibilityFn}
      const topo = document.querySelector('.facelift-decision-topology');
      if (!topo) return { exists: false };

      // 1. Exakte Scroll-Ausrichtung: topo bündig am oberen Rand des sichtbaren main-Bereichs (unterhalb SimulationBar)
      const main = document.querySelector('main');
      const visibleTop = main ? main.getBoundingClientRect().top : 0;
      if (main && topo) {
        const offsetFromMainTop = topo.getBoundingClientRect().top - visibleTop;
        main.scrollTop += offsetFromMainTop;
      }

      const text = topo.textContent;
      const hasLegend = text.includes('Einführungsaufwand');
      const hasDisclaimer = text.includes('Keine Darstellung von Marktanteilen.');
      const hasSvgButtons = !!topo.querySelector('svg [role="button"]');
      const htmlButtons = topo.querySelectorAll('button');

      const desktopView = topo.querySelector('.topology-desktop-view');
      const mobileView = topo.querySelector('.topology-mobile-view');

      const hasAllFourZones =
        text.includes('LeadPilot') &&
        text.includes('Pipeline Tools') &&
        text.includes('Marketing') &&
        text.includes('Enterprise');

      const hasRoute = text.includes('Kürzeste Route');
      const isVisibleInViewport = checkStrictVisibility(topo);
      const isMobileActiveVisible = mobileView ? checkStrictVisibility(mobileView) : false;

      // Strikte Einzelelement-Prüfungen auf Mobile (vollständig im sichtbaren Viewport zwischen SimulationBar und Viewport-Boden)
      const head = topo.querySelector('.topology-header');
      const legend = topo.querySelector('.topology-height-legend');
      const disclaimer = topo.querySelector('.topology-disclaimer');
      const leadpilotCard = topo.querySelector('.topology-card-leadpilot');
      const pipelineCard = topo.querySelector('.topology-card-pipeline');
      const marketingCard = topo.querySelector('.topology-card-marketing');
      const enterpriseCard = topo.querySelector('.topology-card-enterprise');

      function isRendered(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }

      function isInVisibleViewport(el, minTop, maxBottom) {
        if (!isRendered(el)) return false;
        const r = el.getBoundingClientRect();
        return r.top >= minTop - 2 && r.bottom <= maxBottom + 2;
      }

      const toPlain = (r) => r ? ({ top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), width: Math.round(r.width) }) : null;

      const renderedCheck = {
        head: isRendered(head),
        legend: isRendered(legend),
        disclaimer: isRendered(disclaimer),
        leadpilotCard: isRendered(leadpilotCard),
        pipelineCard: isRendered(pipelineCard),
        marketingCard: isRendered(marketingCard),
        enterpriseCard: isRendered(enterpriseCard),
      };

      const viewportScreenshotCheck = {
        head: isInVisibleViewport(head, visibleTop, window.innerHeight),
        legend: isInVisibleViewport(legend, visibleTop, window.innerHeight),
        disclaimer: isInVisibleViewport(disclaimer, visibleTop, window.innerHeight),
        leadpilotCard: isInVisibleViewport(leadpilotCard, visibleTop, window.innerHeight),
        pipelineCard: isInVisibleViewport(pipelineCard, visibleTop, window.innerHeight),
      };

      return {
        exists: true,
        hasLegend,
        hasDisclaimer,
        hasSvgButtons,
        buttonCount: htmlButtons.length,
        desktopVisible: desktopView ? window.getComputedStyle(desktopView).display !== 'none' : false,
        mobileVisible: isMobileActiveVisible,
        hasAllFourZones,
        hasRoute,
        isVisibleInViewport,
        renderedCheck,
        viewportScreenshotCheck,
        visibleTop,
        diag: {
          windowH: window.innerHeight,
          mainScrollTop: main ? main.scrollTop : -1,
          visibleTop,
          headRect: toPlain(head ? head.getBoundingClientRect() : null),
          pipeRect: toPlain(pipelineCard ? pipelineCard.getBoundingClientRect() : null),
          entRect: toPlain(enterpriseCard ? enterpriseCard.getBoundingClientRect() : null),
          topoRect: toPlain(topo ? topo.getBoundingClientRect() : null)
        }
      };
    `);

    if (!res.exists || !res.hasLegend || !res.hasDisclaimer || !res.hasAllFourZones || !res.hasRoute) {
      throw new Error(`GATE ERROR: DecisionTopology unvollständig: ${JSON.stringify(res)}`);
    }
    if (res.hasSvgButtons) {
      throw new Error(`GATE ERROR: SVG enthält unerlaubte role="button" Elemente!`);
    }

    if (viewportWidth <= 600) {
      if (!res.mobileVisible) {
        throw new Error(`GATE ERROR: Auf Mobile (<= 600px) ist die mobile Topografie nicht sichtbar im Viewport aktiv!`);
      }
      const rc = res.renderedCheck;
      if (!rc.head || !rc.legend || !rc.disclaimer || !rc.leadpilotCard || !rc.pipelineCard || !rc.marketingCard || !rc.enterpriseCard) {
        throw new Error(`GATE ERROR: Auf Mobile sind nicht alle Einzelelemente im DOM gerendert/sichtbar: ${JSON.stringify(rc)} Diag: ${JSON.stringify(res.diag)}`);
      }
      const vc = res.viewportScreenshotCheck;
      if (!vc.head || !vc.legend || !vc.disclaimer || !vc.leadpilotCard || !vc.pipelineCard) {
        throw new Error(`GATE ERROR: Im Mobile-Screenshot-Viewport fehlen Kopf, Legende, Disclaimer oder die ersten 2 Zonen: ${JSON.stringify(vc)} Diag: ${JSON.stringify(res.diag)}`);
      }
      console.log(`✅ [${viewportName}] Alle 7 Einzelelemente gerendert/lesbar und oberer Bereich mit Kopf, Legende, Disclaimer + 2 Zonen kollisionsfrei im Viewport`);
    }

    if (!res.isVisibleInViewport) {
      throw new Error(`GATE ERROR: DecisionTopology liegt nicht sichtbar im Viewport (top < H && bottom > 0 && w>0 && h>0 && display/vis ok)!`);
    }

    console.log(`✅ [${viewportName}] DecisionTopology verifiziert (Alle 4 Zonen sichtbar, Kürzeste Route, Disclaimer, strikt sichtbar im Viewport, ${res.buttonCount} Buttons)`);
  }

  if (viewId === 's-swot') {
    const res = await client.eval(`
      ${checkVisibilityFn}
      const swot = document.querySelector('.facelift-swot-compass');
      if (swot) {
        swot.scrollIntoView({ behavior: 'instant', block: 'start' });
      }

      const glyphs = swot ? swot.querySelectorAll('.facelift-glyph') : [];
      const text = swot ? swot.textContent : '';
      const hasAxes = text.includes('Intern ↔ Extern') && text.includes('Stärken ↕ Schützen');
      const hasDerivedTag = text.includes('Handlungsoptionen, aus der SWOT abgeleitet');
      const hasNrr = text.includes('NRR');
      const hasUsDirectAccess = text.includes('US-Direct-Access');

      const articles = swot ? swot.querySelectorAll('article') : [];
      const articleButtons = swot ? swot.querySelectorAll('article button[aria-pressed]') : [];

      const isVisibleInViewport = checkStrictVisibility(swot);

      return {
        exists: !!swot,
        glyphCount: glyphs.length,
        hasAxes,
        hasDerivedTag,
        hasNrr,
        hasUsDirectAccess,
        articleCount: articles.length,
        articleButtonCount: articleButtons.length,
        isVisibleInViewport
      };
    `);
    if (!res.exists || res.glyphCount < 4 || !res.hasAxes || !res.hasDerivedTag) {
      throw new Error(`GATE ERROR: SwotCompass unvollständig oder Kennzeichnung fehlt: ${JSON.stringify(res)}`);
    }
    if (res.hasNrr) {
      throw new Error(`GATE ERROR: Unerlaubter Begriff 'NRR' im SwotCompass gefunden!`);
    }
    if (!res.hasUsDirectAccess) {
      throw new Error(`GATE ERROR: Begriff 'US-Direct-Access' fehlt im SwotCompass!`);
    }
    if (res.articleCount !== 4 || res.articleButtonCount !== 4) {
      throw new Error(`GATE ERROR: SwotCompass muss 4 article-Karten mit je einem semantischen button[aria-pressed] enthalten! Gefunden: articles=${res.articleCount}, buttons=${res.articleButtonCount}`);
    }
    if (!res.isVisibleInViewport) {
      throw new Error(`GATE ERROR: SwotCompass liegt nicht sichtbar im Viewport (top < H && bottom > 0 && w>0 && h>0 && display/vis ok)!`);
    }
    console.log(`✅ [${viewportName}] SwotCompass verifiziert (4 article-Karten mit je eigenem Button, strikt sichtbar im Viewport, Kennzeichnung korrekt)`);
  }
}

async function verify200PercentZoomMobile(client) {
  console.log(`\n--- PRÜFUNG: 200 %-Zoom auf mobiler DecisionTopology (375 px) ---`);
  // WCAG 1.4.10 Reflow: 200 % Zoom bei 375 px Bildschirmbreite entspricht 188 px Viewport
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 188,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await new Promise((r) => setTimeout(r, 600));

  const zoomAudit = await client.eval(`
    function checkStrictVisibility(el) {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      return rect.top < window.innerHeight && rect.bottom > 0;
    }

    const topo = document.querySelector('.facelift-decision-topology');
    if (!topo) return { ok: false, reason: 'DecisionTopology fehlt' };

    const main = document.querySelector('main');
    if (main && topo) {
      const offsetFromMainTop = topo.getBoundingClientRect().top - main.getBoundingClientRect().top;
      main.scrollTop += offsetFromMainTop;
    }

    const text = topo.textContent;
    const hasLegend = text.includes('Einführungsaufwand');
    const hasDisclaimer = text.includes('Keine Darstellung von Marktanteilen.');
    const hasRoute = text.includes('Kürzeste Route');
    const hasLeadPilot = text.includes('LeadPilot Hochebene');
    const hasPipeline = text.includes('Pipeline Tools');
    const hasMarketing = text.includes('Marketing / Support');
    const hasEnterprise = text.includes('Enterprise Suites');

    // Prüfe auf horizontale Überläufe / abgeschnittene Texte in den mobilen Karten
    const mobileCards = Array.from(topo.querySelectorAll('.topology-card'));
    let clippedTextInfo = [];
    mobileCards.forEach((card) => {
      const textEls = Array.from(card.querySelectorAll('span, div'));
      textEls.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        if (el.scrollWidth > el.clientWidth + 2 && (style.overflow === 'hidden' || style.overflowX === 'hidden' || style.textOverflow === 'ellipsis')) {
          clippedTextInfo.push(el.textContent.trim().slice(0, 30));
        }
      });
    });

    const drawer = document.getElementById('mobile-sidebar-drawer');
    const trigger = document.getElementById('mobile-menu-trigger');
    const drawerOpen = !!drawer || (trigger && trigger.getAttribute('aria-expanded') === 'true');

    const mobileView = topo.querySelector('.topology-mobile-view');
    const mobileVisible = checkStrictVisibility(mobileView);
    const topoVisible = checkStrictVisibility(topo);

    return {
      ok: true,
      hasLegend,
      hasDisclaimer,
      hasRoute,
      hasLeadPilot,
      hasPipeline,
      hasMarketing,
      hasEnterprise,
      drawerOpen,
      mobileVisible,
      topoVisible,
      clippedTextCount: clippedTextInfo.length,
      clippedTextInfo
    };
  `);

  if (!zoomAudit.ok || !zoomAudit.hasLegend || !zoomAudit.hasDisclaimer || !zoomAudit.hasRoute || !zoomAudit.hasLeadPilot || !zoomAudit.hasPipeline || !zoomAudit.hasMarketing || !zoomAudit.hasEnterprise || !zoomAudit.mobileVisible || !zoomAudit.topoVisible || zoomAudit.drawerOpen) {
    throw new Error(`GATE ERROR: 200 %-Zoom Prüfung auf Mobile fehlgeschlagen: ${JSON.stringify(zoomAudit)}`);
  }
  if (zoomAudit.clippedTextCount > 0) {
    throw new Error(`GATE ERROR: Text bei 200 %-Zoom abgeschnitten: ${JSON.stringify(zoomAudit.clippedTextInfo)}`);
  }
  console.log(`✅ [200 % Zoom Mobile] DecisionTopology voll lesbar & reflowed ohne Textabschneiden: Legende, Disclaimer, alle 4 Zonen & Kürzeste Route sichtbar`);

  const zoomFilePath = path.join(SCREENSHOT_DIR, 'markt_Wettbewerb_DecisionTopology_375px_zoom200.png');
  const res = await client.send('Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(res.data, 'base64');
  fs.writeFileSync(zoomFilePath, buffer);
  console.log(`💾 Saved: ${path.basename(zoomFilePath)} (${buffer.length} bytes)`);

  // Zurücksetzen auf Standard-Mobile 375x812
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await new Promise((r) => setTimeout(r, 400));
}

async function run() {
  const PORT = 4198;
  const CDP_PORT = 9248;

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
        id: 's-markt',
        expectedTitle: 'Marktlage & Cloud-CRM DACH',
        filePrefix: 'markt_Marktlage_MarketOpportunityStack',
      },
      {
        id: 's-wettbewerb',
        expectedTitle: 'Wettbewerbslandschaft & Marktanteile Europa/DACH',
        filePrefix: 'markt_Wettbewerb_DecisionTopology',
      },
      {
        id: 's-swot',
        expectedTitle: 'SWOT-Analyse der LeadPilot GmbH (GJ 2025)',
        filePrefix: 'markt_Swot_SwotCompass',
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
        await navigateViaUi(client, sv.id, vp.isMobile);

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

        await verifyAuftrag006Markt(client, sv.id, `${vp.name}px`, vp.width);

        const fileName = `${sv.filePrefix}_${vp.name}px.png`;
        const filePath = path.join(SCREENSHOT_DIR, fileName);
        await client.screenshot(filePath, `${sv.filePrefix} @ ${vp.name}px`);

        if (sv.id === 's-wettbewerb' && vp.name === '375') {
          await verify200PercentZoomMobile(client);
        }
      }
    }

    client.close();
    console.log(`\n=======================================================`);
    console.log(`🎉 ALL MARKT SCREENSHOTS CAPTURED & AUDITED SUCCESSFULLY!`);
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
