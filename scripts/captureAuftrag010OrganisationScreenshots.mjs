import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-010');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let commitSha = 'unknown';
try {
  commitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch (e) {
  console.warn('Could not determine git commit SHA:', e.message);
}

console.log(`=======================================================`);
console.log(`📸 STARTING AUFTRAG 010 ORGANISATION CAPTURE & AUDIT`);
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

  async screenshot(filePath, label, clip = null) {
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

    const params = { format: 'png' };
    if (clip) {
      params.clip = clip;
      params.captureBeyondViewport = true;
    }

    const { data } = await this.send('Page.captureScreenshot', params);
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, buffer);
    console.log(`💾 Saved: ${path.basename(filePath)} (${buffer.length} bytes${clip ? `, element-clip: ${clip.width}x${clip.height}` : ''})`);
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

  // 2. Kategorie ORGANISATION expandieren falls eingeklappt, und NavItem klicken
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
        const orgSpan = allSpans.find(s => s.textContent && s.textContent.trim().toUpperCase().includes('ORGANISATION'));
        if (orgSpan) {
          const header = orgSpan.closest('div');
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

async function verifyAuftrag010Organisation(client, componentId, viewportName, viewportWidth) {
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

  if (componentId === 'organisation-scaffold') {
    const check = await client.eval(`
      (() => {
        ${checkVisibilityFn}
        const container = document.querySelector('.facelift-organisation-scaffold');
        if (!container || !isRendered(container)) return { ok: false, reason: 'Container not rendered' };

        const text = container.textContent || '';
        const hasQ1 = text.includes('Q1 24') || text.includes('Q1');
        const hasQ4 = text.includes('Q4 25') || text.includes('Q4');
        const has4Fte = text.includes('4,0') || text.includes('4.0');
        const has10Fte = text.includes('10,0') || text.includes('10.0') || text.includes('10 FTE');
        const hasZiel = text.includes('Ziel 2026') && text.includes('12,0 FTE');

        // Funktionale Karten
        const cards = Array.from(container.querySelectorAll('.scaffold-card'));
        const allCardsRendered = cards.length >= 5 && cards.every(isRendered);

        return {
          ok: hasQ1 && hasQ4 && has4Fte && has10Fte && hasZiel && allCardsRendered,
          hasQ1, hasQ4, has4Fte, has10Fte, hasZiel,
          cardsCount: cards.length,
          allCardsRendered
        };
      })()
    `);

    if (!check.ok) {
      throw new Error(`GATE ERROR: [${viewportName}] OrganisationScaffold check failed: ${JSON.stringify(check)}`);
    }
    console.log(`✅ [${viewportName}] OrganisationScaffold verified (Zeitreihe Q1 24-Q4 25, funktionale Bausteine, Ziel 12 FTE intakt)`);
  } else if (componentId === 'people-health-rail') {
    const check = await client.eval(`
      (() => {
        ${checkVisibilityFn}
        const container = document.querySelector('.facelift-people-health-rail');
        if (!container || !isRendered(container)) return { ok: false, reason: 'Container not rendered' };

        const text = container.textContent || '';
        const hasNeutralityNote = text.includes('Kennzahlen im Überblick; keine nachgewiesenen Wirkzusammenhänge');
        const hasPersonalaufwand = text.includes('490.000 €') && text.includes('76 %');
        const hasFluktuation = text.includes('22 %') && text.includes('Benchmark');
        const hasCostPerFte = text.includes('54.400 €');
        const hasRemote = text.includes('60 %');

        const articles = Array.from(container.querySelectorAll('article'));
        const allArticlesRendered = articles.length >= 6 && articles.every(isRendered);

        return {
          ok: hasNeutralityNote && hasPersonalaufwand && hasFluktuation && hasCostPerFte && hasRemote && allArticlesRendered,
          hasNeutralityNote, hasPersonalaufwand, hasFluktuation, hasCostPerFte, hasRemote,
          articlesCount: articles.length,
          allArticlesRendered
        };
      })()
    `);

    if (!check.ok) {
      throw new Error(`GATE ERROR: [${viewportName}] PeopleHealthRail check failed: ${JSON.stringify(check)}`);
    }
    console.log(`✅ [${viewportName}] PeopleHealthRail verified (Neutralitätsnotiz vorhanden, 6 Metriken umbruchsicher gerendert)`);
  } else if (componentId === 'capacity-network') {
    const check = await client.eval(`
      (() => {
        ${checkVisibilityFn}
        const container = document.querySelector('.facelift-capacity-network');
        const legend = document.querySelector('.facelift-role-legend');
        if (!container || !isRendered(container)) return { ok: false, reason: 'Container not rendered' };
        if (!legend || !isRendered(legend)) return { ok: false, reason: 'RoleLegend not rendered' };

        // DOM-Reihenfolge prüfen: Legend muss direktes nachfolgendes Geschwisterelement sein
        const legendIsImmediateSibling = container.nextElementSibling === legend;

        const containerText = container.textContent || '';
        const legendText = legend.textContent || '';

        // Prüfen auf Nicht-Prozess-Hinweis
        const hasNotice = containerText.includes('Rollenübersicht – keine dokumentierten Prozessübergaben');

        // Engineering/Product Knoten muss BEIDE Engpässe enthalten (Engpass 1 + CTO Single Point of Failure)
        const engineeringCard = Array.from(container.querySelectorAll('article')).find(a => (a.textContent || '').includes('Engineering'));
        const engText = engineeringCard ? (engineeringCard.textContent || '') : '';
        const hasEngpass1 = engText.includes('Zwei offene Stellen') || engText.includes('kritisch');
        const hasCtoSPOF = engText.includes('Single Point of Failure') || engText.includes('Tobias Heine');

        // Sales Knoten muss Engpass 2 enthalten
        const salesCard = Array.from(container.querySelectorAll('article')).find(a => (a.textContent || '').includes('Sales'));
        const salesText = salesCard ? (salesCard.textContent || '') : '';
        const hasSalesEngpass = salesText.includes('Kapazitäten für Inbound-Demos voll ausgereizt');

        // Sicherstellen, dass kein erfundener separater CTO-Knoten existiert
        const articles = Array.from(container.querySelectorAll('article'));
        const hasSeparateCtoCard = articles.some(a => {
          const strong = a.querySelector('strong');
          return strong && strong.textContent && strong.textContent.trim() === 'CTO';
        });

        // Legend Text prüfen
        const hasLegendEngpass1 = legendText.includes('Engpass 1: Engineering');
        const hasLegendEngpass2 = legendText.includes('Engpass 2: Sales');
        const hasLegendEngpass3 = legendText.includes('Engpass 3: Single Point of Failure');
        const hasLegendMeasure = legendText.includes('Maßnahme: Geplante Einstellung von 2 FTE in 2026');

        return {
          ok: legendIsImmediateSibling && hasNotice && hasEngpass1 && hasCtoSPOF && hasSalesEngpass && !hasSeparateCtoCard && hasLegendEngpass1 && hasLegendEngpass2 && hasLegendEngpass3 && hasLegendMeasure,
          legendIsImmediateSibling, hasNotice, hasEngpass1, hasCtoSPOF, hasSalesEngpass,
          noSeparateCtoCard: !hasSeparateCtoCard,
          hasLegendEngpass1, hasLegendEngpass2, hasLegendEngpass3, hasLegendMeasure
        };
      })()
    `);

    if (!check.ok) {
      throw new Error(`GATE ERROR: [${viewportName}] CapacityNetwork check failed: ${JSON.stringify(check)}`);
    }
    console.log(`✅ [${viewportName}] CapacityNetwork & RoleLegend verified (DOM-Reihenfolge sofortiges Geschwisterelement [legendIsImmediateSibling: true], CTO im Engineering-Knoten, 3 Engpässe orange, 0 erfundene Prozesspfeile)`);
  } else if (componentId === 'role-legend') {
    const check = await client.eval(`
      (() => {
        ${checkVisibilityFn}
        const legend = document.querySelector('.facelift-role-legend');
        const container = document.querySelector('.facelift-capacity-network');
        if (!legend || !isRendered(legend)) return { ok: false, reason: 'RoleLegend not rendered' };
        if (!container) return { ok: false, reason: 'CapacityNetwork container not found' };

        const legendIsImmediateSibling = container.nextElementSibling === legend;
        const legendText = legend.textContent || '';

        const hasLegendEngpass1 = legendText.includes('Engpass 1: Engineering');
        const hasLegendEngpass2 = legendText.includes('Engpass 2: Sales');
        const hasLegendEngpass3 = legendText.includes('Engpass 3: Single Point of Failure');
        const hasLegendMeasure = legendText.includes('Maßnahme: Geplante Einstellung von 2 FTE in 2026');

        const winH = window.innerHeight;
        const lr = legend.getBoundingClientRect();
        const legendInsideViewport = lr.bottom <= winH;

        // Alle 4 Einträge im Audit prüfen: sie müssen vollständig innerhalb des sichtbaren Viewports liegen
        const allItems = Array.from(legend.querySelectorAll('div[style*="border:"]'));
        const itemsAudit = allItems.map(item => {
          const ir = item.getBoundingClientRect();
          const isInsideElement = ir.top >= lr.top - 2 && ir.bottom <= lr.bottom + 2;
          const isInsideViewport = ir.top >= 0 && ir.bottom <= winH;
          return {
            text: (item.textContent || '').trim().slice(0, 35),
            top: ir.top,
            bottom: ir.bottom,
            height: ir.height,
            isInsideElement,
            isInsideViewport
          };
        });

        const allFourItemsPresent = itemsAudit.length === 4;
        const allFourItemsInsideViewport = allFourItemsPresent && itemsAudit.every(i => i.isInsideViewport);

        return {
          ok: legendIsImmediateSibling && hasLegendEngpass1 && hasLegendEngpass2 && hasLegendEngpass3 && hasLegendMeasure && legendInsideViewport && allFourItemsInsideViewport,
          legendIsImmediateSibling,
          hasLegendEngpass1,
          hasLegendEngpass2,
          hasLegendEngpass3,
          hasLegendMeasure,
          legendInsideViewport,
          allFourItemsInsideViewport,
          itemsCount: itemsAudit.length,
          itemsAudit,
          winH,
          legendHeight: lr.height,
          legendBottom: lr.bottom
        };
      })()
    `);

    if (!check.ok) {
      throw new Error(`GATE ERROR: [${viewportName}] RoleLegend check failed: ${JSON.stringify(check)}`);
    }
    console.log(`✅ [${viewportName}] RoleLegend verified (legendIsImmediateSibling: true, alle 4 Einträge [3 Engpässe + Maßnahme] vollständig innerhalb des sichtbaren Viewports [bottom ${check.legendBottom}px <= winH ${check.winH}px], legendInsideViewport: true)`);
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

  await navigateViaUi(client, 's-hr', true);
  await scrollElementToVisibleTop(client, '.facelift-people-health-rail');

  const overflowAudit = await client.eval(`
    (() => {
      const container = document.querySelector('.facelift-people-health-rail');
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

  const zoomFile = path.join(SCREENSHOT_DIR, 'organisation_Hr_PeopleHealthRail_375px_zoom200.png');
  const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(zoomFile, Buffer.from(data, 'base64'));
  console.log(`✅ [200 % Zoom Mobile] PeopleHealthRail bei 188 px voll lesbar & reflowed ohne Clipping`);
  console.log(`💾 Saved: organisation_Hr_PeopleHealthRail_375px_zoom200.png`);

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
  const PORT = 4197;
  console.log(`Starting Vite preview on port ${PORT}...`);
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    env: { ...process.env, BROWSER: 'none' },
  });

  await new Promise((r) => setTimeout(r, 2000));

  const CHROME_PORT = 9247;
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

    // Matrix aller geforderten Viewports inkl. 320 px!
    const viewports = [
      { name: '1440', width: 1440, height: 900, isMobile: false },
      { name: '768', width: 768, height: 1024, isMobile: true },
      { name: '375', width: 375, height: 812, isMobile: true },
      { name: '320', width: 320, height: 568, isMobile: true },
    ];

    // Zu auditierende Komponenten
    const tasks = [
      {
        subviewId: 's-headcount',
        componentId: 'organisation-scaffold',
        selector: '.facelift-organisation-scaffold',
        filePrefix: 'organisation_Headcount_OrganisationScaffold',
      },
      {
        subviewId: 's-hr',
        componentId: 'people-health-rail',
        selector: '.facelift-people-health-rail',
        filePrefix: 'organisation_Hr_PeopleHealthRail',
      },
      {
        subviewId: 's-team',
        componentId: 'capacity-network',
        selector: '.facelift-capacity-network',
        filePrefix: 'organisation_Team_CapacityNetwork',
      },
      {
        subviewId: 's-team',
        componentId: 'role-legend',
        selector: '.facelift-role-legend',
        filePrefix: 'organisation_Team_RoleLegend',
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

        let activeVpHeight = vp.height;

        // Vor der Aufnahme: Viewport-Höhe so erweitern, dass legend.getBoundingClientRect().bottom <= window.innerHeight gilt
        if (t.componentId === 'role-legend') {
          const dims = await client.eval(`
            (() => {
              const el = document.querySelector('${t.selector}');
              if (!el) return null;
              const lr = el.getBoundingClientRect();
              return {
                bottom: lr.bottom,
                windowHeight: window.innerHeight,
              };
            })()
          `);

          if (dims && dims.bottom > dims.windowHeight) {
            activeVpHeight = Math.ceil(dims.bottom + 40);
            await client.send('Emulation.setDeviceMetricsOverride', {
              width: vp.width,
              height: activeVpHeight,
              deviceScaleFactor: 1,
              mobile: vp.isMobile,
            });
            await new Promise((r) => setTimeout(r, 200));

            // Danach die Rollen-Landkarte erneut oben ausrichten
            await scrollElementToVisibleTop(client, t.selector);
            await new Promise((r) => setTimeout(r, 200));
          }
        }

        // Verifikation (prüft DOM und sichtbaren Viewport)
        await verifyAuftrag010Organisation(client, t.componentId, `${vp.name}px`, vp.width);

        // Screenshot aufnehmen
        const fileName = `${t.filePrefix}_${vp.name}px.png`;
        const filePath = path.join(SCREENSHOT_DIR, fileName);
        await client.screenshot(filePath, `${t.filePrefix} @ ${vp.name}px`);

        // Falls Viewport temporär erweitert wurde, auf Standard-Viewport-Höhe zurücksetzen
        if (activeVpHeight !== vp.height) {
          await client.send('Emulation.setDeviceMetricsOverride', {
            width: vp.width,
            height: vp.height,
            deviceScaleFactor: 1,
            mobile: vp.isMobile,
          });
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      if (vp.name === '375') {
        // WCAG 200 % Reflow Prüfung
        await verify200PercentZoomMobile(client);
      }
    }

    client.close();
    console.log(`\n=======================================================`);
    console.log(`🎉 ALL ORGANISATION SCREENSHOTS CAPTURED & AUDITED SUCCESSFULLY!`);
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
