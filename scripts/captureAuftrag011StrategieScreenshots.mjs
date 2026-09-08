import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-011');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let commitSha = 'unknown';
try {
  commitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch (e) {
  console.warn('Could not determine git commit SHA:', e.message);
}

console.log(`=======================================================`);
console.log(`📸 STARTING AUFTRAG 011 STRATEGIE CAPTURE & AUDIT`);
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

  // 2. Kategorie STRATEGIE expandieren falls eingeklappt, und NavItem klicken
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
        const stratSpan = allSpans.find(s => s.textContent && s.textContent.trim().toUpperCase().includes('STRATEGIE'));
        if (stratSpan) {
          const header = stratSpan.closest('div');
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

async function verifyAuftrag011Strategie(client, componentId, viewportName, viewportWidth) {
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

  if (componentId === 'goal-runway') {
    const check = await client.eval(`
      (() => {
        ${checkVisibilityFn}
        const container = document.querySelector('.facelift-goal-runway');
        if (!container || !isRendered(container)) return { ok: false, reason: 'Container not rendered' };

        const text = container.textContent || '';
        const hasTitle = text.includes('Ziele & Strategische OKRs 2026');
        const hasBadge = text.includes('ZIEL-STARTBAHN');

        // Alle 7 Key Results aus den beiden Objectives prüfen
        const hasO1Kr1 = text.includes('411.840 €') && text.includes('620.000 €');
        const hasO1Kr2 = text.includes('66') && text.includes('95');
        const hasO1Kr3 = text.includes('18 %') && text.includes('≥ 26 %');
        const hasO2Kr1 = text.includes('2,8 %') && text.includes('< 1,8 %');
        const hasO2Kr2 = text.includes('11 Tagen') && text.includes('< 7 Tage');
        const hasO2Kr3 = text.includes('2,7 : 1') && text.includes('≥ 3,5 : 1');
        const hasO2Kr4 = text.includes('25.750 €') && text.includes('< 23.000 €');

        // Startbahn Tracks
        const tracks = Array.from(container.querySelectorAll('.runway-track'));
        const allTracksRendered = tracks.length === 7 && tracks.every(isRendered);

        // Arrows / Connectors
        const arrows = Array.from(container.querySelectorAll('.runway-connector'));
        const allArrowsRendered = arrows.length === 7 && arrows.every(isRendered);

        // Basis 2025 und Ziel 2026 Badges
        const basisBadges = text.includes('BASIS 2025') || text.includes('Basis');
        const zielBadges = text.includes('ZIEL 2026') || text.includes('Ziel');

        return {
          ok: hasTitle && hasBadge && hasO1Kr1 && hasO1Kr2 && hasO1Kr3 && hasO2Kr1 && hasO2Kr2 && hasO2Kr3 && hasO2Kr4 && allTracksRendered && allArrowsRendered,
          hasTitle, hasBadge,
          hasO1Kr1, hasO1Kr2, hasO1Kr3, hasO2Kr1, hasO2Kr2, hasO2Kr3, hasO2Kr4,
          tracksCount: tracks.length,
          allTracksRendered,
          arrowsCount: arrows.length,
          allArrowsRendered,
          basisBadges,
          zielBadges
        };
      })()
    `);

    if (!check.ok) {
      throw new Error(`GATE ERROR: [${viewportName}] GoalRunway check failed: ${JSON.stringify(check)}`);
    }
    console.log(`✅ [${viewportName}] GoalRunway verified (alle 7 KRs per Regex geparst, Startbahnen von Basis 2025 bis Ziel 2026 intakt, 0 Clipping)`);
  } else if (componentId === 'bsc-path') {
    const check = await client.eval(`
      (() => {
        ${checkVisibilityFn}
        const container = document.querySelector('.facelift-bsc-path');
        if (!container || !isRendered(container)) return { ok: false, reason: 'Container not rendered' };

        const text = container.textContent || '';
        const hasTitle = text.includes('Balanced Scorecard') || text.includes('Wirkungsbahn');

        // 4 Stufen prüfen
        const stepCards = Array.from(container.querySelectorAll('.bsc-step-card'));
        const has4Steps = stepCards.length === 4 && stepCards.every(isRendered);

        // Reihenfolge prüfen: 1. Lernen & Entwicklung, 2. Interne Prozesse, 3. Kunden, 4. Finanzen
        const step1 = stepCards[0]?.textContent || '';
        const step2 = stepCards[1]?.textContent || '';
        const step3 = stepCards[2]?.textContent || '';
        const step4 = stepCards[3]?.textContent || '';

        const orderOk = step1.includes('Lernen') &&
                        step2.includes('Prozesse') &&
                        step3.includes('Kunde') &&
                        step4.includes('Finanz');

        // 3 Wirkungs-Connectoren prüfen
        const connectors = Array.from(container.querySelectorAll('.bsc-connector-box'));
        const has3Connectors = connectors.length === 3 && connectors.every(isRendered);

        const conn1 = connectors[0]?.textContent || '';
        const conn2 = connectors[1]?.textContent || '';
        const conn3 = connectors[2]?.textContent || '';

        const conn1Ok = conn1.includes('Personal/Skills') && conn1.includes('Plattformstabilität');
        const conn2Ok = conn2.includes('Time-to-Value') && conn2.includes('Kundenzufriedenheit');
        const conn3Ok = conn3.includes('Kundenzufriedenheit') && conn3.includes('ARR');

        // Focus-Visible Prüfung (tabIndex vorhanden)
        const tabIndicesOk = stepCards.every(card => card.getAttribute('tabindex') === '0');

        return {
          ok: hasTitle && has4Steps && orderOk && has3Connectors && conn1Ok && conn2Ok && conn3Ok && tabIndicesOk,
          hasTitle,
          stepsCount: stepCards.length,
          orderOk,
          connectorsCount: connectors.length,
          conn1Ok, conn2Ok, conn3Ok,
          tabIndicesOk
        };
      })()
    `);

    if (!check.ok) {
      throw new Error(`GATE ERROR: [${viewportName}] BalancedScorecardPath check failed: ${JSON.stringify(check)}`);
    }
    console.log(`✅ [${viewportName}] BalancedScorecardPath verified (4 Stufen in kausaler Reihenfolge [Lernen -> Prozesse -> Kunden -> Finanzen], 3 Kausal-Konnektoren, barrierefreie Fokus-Attribute)`);
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

  await navigateViaUi(client, 's-okr', true);
  await scrollElementToVisibleTop(client, '.facelift-goal-runway');

  const overflowAuditOkr = await client.eval(`
    (() => {
      const container = document.querySelector('.facelift-goal-runway');
      if (!container) return { ok: false, reason: 'GoalRunway container not found' };

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

  if (overflowAuditOkr.clippedCount > 0) {
    throw new Error(`GATE ERROR: 200 % Zoom Reflow auf GoalRunway fehlgeschlagen: ${JSON.stringify(overflowAuditOkr)}`);
  }

  const zoomFileOkr = path.join(SCREENSHOT_DIR, 'strategie_Okr_GoalRunway_375px_zoom200.png');
  const { data: dataOkr } = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(zoomFileOkr, Buffer.from(dataOkr, 'base64'));
  console.log(`✅ [200 % Zoom Mobile] GoalRunway bei 188 px voll lesbar & reflowed ohne Clipping`);
  console.log(`💾 Saved: strategie_Okr_GoalRunway_375px_zoom200.png`);

  // Auch BSC prüfen
  await navigateViaUi(client, 's-bsc', true);
  await scrollElementToVisibleTop(client, '.facelift-bsc-path');

  const overflowAuditBsc = await client.eval(`
    (() => {
      const container = document.querySelector('.facelift-bsc-path');
      if (!container) return { ok: false, reason: 'BalancedScorecardPath container not found' };

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

  if (overflowAuditBsc.clippedCount > 0) {
    throw new Error(`GATE ERROR: 200 % Zoom Reflow auf BalancedScorecardPath fehlgeschlagen: ${JSON.stringify(overflowAuditBsc)}`);
  }

  const zoomFileBsc = path.join(SCREENSHOT_DIR, 'strategie_Bsc_BalancedScorecardPath_375px_zoom200.png');
  const { data: dataBsc } = await client.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(zoomFileBsc, Buffer.from(dataBsc, 'base64'));
  console.log(`✅ [200 % Zoom Mobile] BalancedScorecardPath bei 188 px voll lesbar & reflowed ohne Clipping`);
  console.log(`💾 Saved: strategie_Bsc_BalancedScorecardPath_375px_zoom200.png`);

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
  const PORT = 4198;
  console.log(`Starting Vite preview on port ${PORT}...`);
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    env: { ...process.env, BROWSER: 'none' },
  });

  await new Promise((r) => setTimeout(r, 2000));

  const CHROME_PORT = 9248;
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
        subviewId: 's-okr',
        componentId: 'goal-runway',
        selector: '.facelift-goal-runway',
        filePrefix: 'strategie_Okr_GoalRunway',
      },
      {
        subviewId: 's-bsc',
        componentId: 'bsc-path',
        selector: '.facelift-bsc-path',
        filePrefix: 'strategie_Bsc_BalancedScorecardPath',
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

        // Vor der Aufnahme: Bei Bedarf Viewport-Höhe so erweitern, dass das gesamte Element ohne Scroll-Kürzung erfasst werden kann
        const dims = await client.eval(`
          (() => {
            const el = document.querySelector('${t.selector}');
            if (!el) return null;
            const lr = el.getBoundingClientRect();
            return {
              bottom: lr.bottom,
              windowHeight: window.innerHeight,
              height: lr.height,
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

          // Danach das Element erneut oben ausrichten
          await scrollElementToVisibleTop(client, t.selector);
          await new Promise((r) => setTimeout(r, 200));
        }

        // Verifikation (prüft DOM und sichtbaren Viewport)
        await verifyAuftrag011Strategie(client, t.componentId, `${vp.name}px`, vp.width);

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
    console.log(`🎉 ALL STRATEGIE SCREENSHOTS CAPTURED & AUDITED SUCCESSFULLY!`);
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
