import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-007');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let commitSha = 'unknown';
try {
  commitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch (e) {
  console.warn('Could not determine git commit SHA:', e.message);
}

console.log(`=======================================================`);
console.log(`📸 STARTING AUFTRAG 007 KUNDEN CAPTURE & AUDIT`);
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
        `⚠️ [${label}] Overflow detected: scrollWidth=${checkOverflow.scrollW} > clientWidth=${checkOverflow.clientW}`
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

  // 2. Kategorie KUNDEN expandieren falls eingeklappt, und NavItem klicken
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
        const kundenSpan = allSpans.find(s => s.textContent && s.textContent.trim().toUpperCase().includes('KUNDEN'));
        if (kundenSpan) {
          const header = kundenSpan.closest('div');
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

      // Falls Drawer nach Klick noch da ist: Schließen-Button oder Backdrop klicken
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

async function verifyAuftrag007Kunden(client, componentId, viewportName, viewportWidth) {
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

  if (componentId === 'icp-fit-map') {
    const res = await client.eval(`
      (() => {
        ${checkVisibilityFn}
        const el = document.querySelector('.facelift-icp-fit-map');
        if (!el) return { exists: false };
        const text = el.textContent;
        const hasFitZone = text.includes('IDEALPROFIL (FIT-ZONE)');
        const hasExclusionZone = text.includes('AUSSCHLUSSZONE: „NICHT VERFOLGEN“');
        const hasTriggers = text.includes('Auslöser 1') && text.includes('Auslöser 2') && text.includes('Auslöser 3');
        const hasPriority = text.includes('Priorität 1') || text.includes('Prio 1');
        const rendered = isRendered(el);

        return {
          exists: true,
          rendered,
          hasFitZone,
          hasExclusionZone,
          hasTriggers,
          hasPriority,
        };
      })()
    `);

    if (!res.exists || !res.rendered || !res.hasFitZone || !res.hasExclusionZone || !res.hasTriggers) {
      throw new Error(`GATE ERROR: IcpFitMap unvollständig oder nicht gerendert: ${JSON.stringify(res)}`);
    }
    if (res.hasPriority) {
      throw new Error(`GATE ERROR: Unerlaubte Prioritäts-Behauptung in IcpFitMap gefunden! (Nur Auslöser 1–3 erlaubt)`);
    }
    console.log(`✅ [${viewportName}] IcpFitMap verifiziert (Fit-Zone, Ausschlusszone, Auslöser 1–3, 0 fiktive Priorität)`);
  }

  if (componentId === 'persona-dossier') {
    const res = await client.eval(`
      (() => {
        ${checkVisibilityFn}
        const el = document.querySelector('.facelift-persona-dossier');
        if (!el) return { exists: false };
        const text = el.textContent;
        const hasVolker = text.includes('Vertriebsleiter Volker');
        const hasRole = text.includes('Head of Sales');
        const hasQuote = text.includes('Ich will kein überkomplexes IT-System');
        const hasGrowth = text.includes('Growth-Kunde mit 7 Nutzern');
        const hasGoals = text.includes('Strategische Vertriebsziele');
        const hasPains = text.includes('Schmerzpunkte im Alltag');
        const rendered = isRendered(el);

        return {
          exists: true,
          rendered,
          hasVolker,
          hasRole,
          hasQuote,
          hasGrowth,
          hasGoals,
          hasPains,
        };
      })()
    `);

    if (!res.exists || !res.rendered || !res.hasVolker || !res.hasRole || !res.hasQuote || !res.hasGoals || !res.hasPains) {
      throw new Error(`GATE ERROR: PersonaDossier unvollständig: ${JSON.stringify(res)}`);
    }
    console.log(`✅ [${viewportName}] PersonaDossier verifiziert (Volker, Rolle, Zitat, Paket-Fit, Ziele & Schmerzpunkte)`);
  }

  if (componentId === 'volker-day-timeline') {
    const res = await client.eval(`
      (() => {
        ${checkVisibilityFn}
        const el = document.querySelector('.facelift-volker-day-timeline');
        if (!el) return { exists: false };
        const text = el.textContent;
        const hasMoment1 = text.includes('Arbeitsmoment 1') && text.includes('Was er denkt & fühlt');
        const hasMoment2 = text.includes('Arbeitsmoment 2') && text.includes('Was er sieht');
        const hasMoment3 = text.includes('Arbeitsmoment 3') && text.includes('Was er hört');
        const hasMoment4 = text.includes('Arbeitsmoment 4') && text.includes('Was er tut & sagt');
        const hasHero = text.includes('Ich brauche kein überkomplexes IT-System');
        // Keine erfundenen Uhrzeiten wie "08:00" oder Szenen wie "Mail-Check"
        const hasInventedTimes = /\\b[0-2]?[0-9]:[0-5][0-9]\\b/.test(text);
        const hasInventedScenes = text.includes('Mail-Check') || text.includes('Team-Standup');
        const rendered = isRendered(el);

        return {
          exists: true,
          rendered,
          hasMoment1,
          hasMoment2,
          hasMoment3,
          hasMoment4,
          hasHero,
          hasInventedTimes,
          hasInventedScenes,
        };
      })()
    `);

    if (!res.exists || !res.rendered || !res.hasMoment1 || !res.hasMoment2 || !res.hasMoment3 || !res.hasMoment4 || !res.hasHero) {
      throw new Error(`GATE ERROR: VolkerDayTimeline unvollständig: ${JSON.stringify(res)}`);
    }
    if (res.hasInventedTimes || res.hasInventedScenes) {
      throw new Error(`GATE ERROR: VolkerDayTimeline enthält verbotene Uhrzeiten oder erfundene Szenen!`);
    }
    console.log(`✅ [${viewportName}] VolkerDayTimeline verifiziert (4 Arbeitsmomente aus EMPATHY, 0 Uhrzeiten, 0 erfundene Szenen)`);
  }

  if (componentId === 'segment-fields') {
    const res = await client.eval(`
      (() => {
        ${checkVisibilityFn}
        const el = document.querySelector('.facelift-segment-fields');
        if (!el) return { exists: false };
        const text = el.textContent;
        const hasArrMaschinenbau = text.includes('43,35 %');
        const hasArrIt = text.includes('27,27 %');
        const hasArrGrosshandel = text.includes('19,17 %');
        const hasArrAgenturen = text.includes('10,20 %');
        const hasKundenanteil = text.includes('Kundenanteil: 36 %') && text.includes('Kundenanteil: 27 %');
        // Prüfen, dass kein falscher 100-%-Wert für Kundenanteile angezeigt wird
        const hasFalse100Kunden = text.includes('100 % Kundenanteil') || text.includes('Kundenanteil: 100 %');
        const rendered = isRendered(el);

        return {
          exists: true,
          rendered,
          hasArrMaschinenbau,
          hasArrIt,
          hasArrGrosshandel,
          hasArrAgenturen,
          hasKundenanteil,
          hasFalse100Kunden,
        };
      })()
    `);

    if (!res.exists || !res.rendered || !res.hasArrMaschinenbau || !res.hasArrIt || !res.hasArrGrosshandel || !res.hasArrAgenturen || !res.hasKundenanteil) {
      throw new Error(`GATE ERROR: SegmentFields unvollständig: ${JSON.stringify(res)}`);
    }
    if (res.hasFalse100Kunden) {
      throw new Error(`GATE ERROR: Falscher 100-%-Kundenanteil in SegmentFields angezeigt (Summe ist gerundet 99 %)!`);
    }
    console.log(`✅ [${viewportName}] SegmentFields verifiziert (ARR-Flächengrößen 43,35%, 27,27%, 19,17%, 10,20%, korrekte Kundenanteile)`);
  }

  if (componentId === 'revenue-staircase') {
    const res = await client.eval(`
      (() => {
        ${checkVisibilityFn}
        const el = document.querySelector('.facelift-revenue-staircase');
        if (!el) return { exists: false };
        const text = el.textContent;
        const hasTotalArr = text.includes('411.840 €');
        const hasStufe1 = text.includes('Stufe 01') && text.includes('Agenturen');
        const hasStufe4 = text.includes('Stufe 04') && text.includes('Maschinenbau');
        const hasArpu = text.includes('ARPU');
        const rendered = isRendered(el);

        return {
          exists: true,
          rendered,
          hasTotalArr,
          hasStufe1,
          hasStufe4,
          hasArpu,
        };
      })()
    `);

    if (!res.exists || !res.rendered || !res.hasTotalArr || !res.hasStufe1 || !res.hasStufe4) {
      throw new Error(`GATE ERROR: RevenueStaircase unvollständig: ${JSON.stringify(res)}`);
    }
    if (res.hasArpu) {
      throw new Error(`GATE ERROR: Unzulässige ARPU-Angabe in RevenueStaircase gefunden!`);
    }
    console.log(`✅ [${viewportName}] RevenueStaircase verifiziert (Kumulativer Stufenaufbau bis 411.840 €, 0 ARPU)`);
  }

  if (componentId === 'customer-portfolio') {
    const res = await client.eval(`
      (() => {
        ${checkVisibilityFn}
        const el = document.querySelector('.facelift-customer-portfolio');
        if (!el) return { exists: false };
        const text = el.textContent;
        const hasNorthwind = text.includes('Northwind GmbH');
        const hasSiegfried = text.includes('Siegfried Precision');
        const hasActualRange = text.includes('5–16 aktive Nutzer') && text.includes('2.940–15.360 € ARR');
        const points = el.querySelectorAll('.portfolio-point');
        const table = el.querySelector('.portfolio-table-wrapper table');
        const rendered = isRendered(el);

        return {
          exists: true,
          rendered,
          hasNorthwind,
          hasSiegfried,
          hasActualRange,
          pointCount: points.length,
          hasTable: !!table,
        };
      })()
    `);

    if (!res.exists || !res.rendered || !res.hasNorthwind || !res.hasSiegfried || !res.hasActualRange || res.pointCount !== 10 || !res.hasTable) {
      throw new Error(`GATE ERROR: CustomerPortfolio unvollständig: ${JSON.stringify(res)}`);
    }
    console.log(`✅ [${viewportName}] CustomerPortfolio verifiziert (10 Datenpunkte, echter Wertebereich 5–16 Nutzer / 2.940–15.360 € ARR, Tabelle verfügbar)`);
  }
}

async function verify200PercentZoomMobile(client) {
  console.log(`\n--- PRÜFUNG: 200 %-Zoom auf SegmentFields (375 px) ---`);
  // Zuerst auf s-segmente navigieren
  await navigateViaUi(client, 's-segmente', true);

  // WCAG 1.4.10: 200% Zoom bei 375px Breite = 188px CSS Layoutbreite bei scaleFactor 2
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 188,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await new Promise((r) => setTimeout(r, 400));

  await scrollElementToVisibleTop(client, '.facelift-segment-fields');

  const overflowAudit = await client.eval(`
    (() => {
      const el = document.querySelector('.facelift-segment-fields');
      if (!el) return { exists: false };
      const clientW = window.innerWidth;
      const textElements = el.querySelectorAll('h3, h4, span, strong, p');
      const clipped = [];
      for (const t of textElements) {
        const r = t.getBoundingClientRect();
        if (r.right > clientW + 2) {
          clipped.push({ tag: t.tagName, text: t.textContent.trim().substring(0, 30), right: Math.round(r.right), clientW });
        }
      }
      return {
        exists: true,
        clientW,
        clippedCount: clipped.length,
        clippedSamples: clipped.slice(0, 3)
      };
    })()
  `);

  if (overflowAudit.clippedCount > 0) {
    throw new Error(`GATE ERROR: 200 % Zoom Reflow fehlgeschlagen: ${JSON.stringify(overflowAudit)}`);
  }

  const zoomFile = path.join(SCREENSHOT_DIR, 'kunden_Segmente_SegmentFields_375px_zoom200.png');
  const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(zoomFile, Buffer.from(data, 'base64'));
  console.log(`✅ [200 % Zoom Mobile] SegmentFields voll lesbar & reflowed ohne Clipping`);
  console.log(`💾 Saved: kunden_Segmente_SegmentFields_375px_zoom200.png`);

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

    // Zu auditierende Komponenten (exakt alle 6!)
    const tasks = [
      {
        subviewId: 's-icp',
        componentId: 'icp-fit-map',
        selector: '.facelift-icp-fit-map',
        filePrefix: 'kunden_Icp_IcpFitMap',
      },
      {
        subviewId: 's-persona',
        componentId: 'persona-dossier',
        selector: '.facelift-persona-dossier',
        filePrefix: 'kunden_Persona_PersonaDossier',
      },
      {
        subviewId: 's-persona',
        componentId: 'volker-day-timeline',
        selector: '.facelift-volker-day-timeline',
        filePrefix: 'kunden_Persona_VolkerDayTimeline',
      },
      {
        subviewId: 's-segmente',
        componentId: 'segment-fields',
        selector: '.facelift-segment-fields',
        filePrefix: 'kunden_Segmente_SegmentFields',
      },
      {
        subviewId: 's-segmente',
        componentId: 'revenue-staircase',
        selector: '.facelift-revenue-staircase',
        filePrefix: 'kunden_Segmente_RevenueStaircase',
      },
      {
        subviewId: 's-top10',
        componentId: 'customer-portfolio',
        selector: '.facelift-customer-portfolio',
        filePrefix: 'kunden_Top10_CustomerPortfolio',
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
        await verifyAuftrag007Kunden(client, t.componentId, `${vp.name}px`, vp.width);

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
    console.log(`🎉 ALL KUNDEN SCREENSHOTS CAPTURED & AUDITED SUCCESSFULLY!`);
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
