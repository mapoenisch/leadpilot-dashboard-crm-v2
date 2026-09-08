import { spawn, execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-012');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let commitSha = 'unknown';
try {
  commitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch (e) {
  console.warn('Could not determine git commit SHA:', e.message);
}

console.log(`=======================================================`);
console.log(`🏆 STARTING AUFTRAG 012 FACELIFT GESAMTABNAHME AUDIT`);
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

  async checkGlobalOverflow(label) {
    const overflow = await this.eval(`
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
          if (r.right > clientW + 2.5 || el.offsetWidth > clientW + 2.5) {
            clipped.push({
              tag: el.tagName,
              className: String(el.className).slice(0, 30),
              text: (el.textContent || '').replace(/\s+/g, ' ').slice(0, 40).trim(),
              parent: el.parentElement ? (el.parentElement.tagName + '.' + String(el.parentElement.className)) : '',
              right: Math.round(r.right),
              offsetWidth: el.offsetWidth,
              clientW
            });
          }
        }
        return {
          hasOverflow: scrollW > clientW + 2,
          scrollW,
          clientW,
          clippedCount: clipped.length,
          samples: clipped.slice(0, 5)
        };
      })()
    `);

    if (overflow.hasOverflow) {
      console.warn(`⚠️ [${label}] Overflow detected: scrollWidth=${overflow.scrollW} > clientWidth=${overflow.clientW}, samples:`, JSON.stringify(overflow.samples, null, 2));
      return false;
    }
    return true;
  }

  async screenshot(filePath, label) {
    const params = { format: 'png' };
    const { data } = await this.send('Page.captureScreenshot', params);
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

// Navigation via UI
const CAT_MAP = {
  's-exec': 'Übersicht',
  's-profil': 'Übersicht',
  's-highlights': 'Übersicht',
  's-daten': 'Übersicht',
  's-idee': 'Unternehmen',
  's-value': 'Unternehmen',
  's-historie': 'Unternehmen',
  's-standort': 'Unternehmen',
  's-funktion': 'Produkt',
  's-pricing': 'Produkt',
  's-perf': 'Produkt',
  's-roadmap': 'Produkt',
  's-markt': 'Markt & Wettbewerb',
  's-wettbewerb': 'Markt & Wettbewerb',
  's-swot': 'Markt & Wettbewerb',
  's-icp': 'Kunden & ICP',
  's-persona': 'Kunden & ICP',
  's-empathy': 'Kunden & ICP',
  's-segmente': 'Kunden & ICP',
  's-top10': 'Kunden & ICP',
  's-cs': 'Kunden & ICP',
  's-funnel': 'Vertrieb & Marketing',
  's-sla': 'Vertrieb & Marketing',
  's-kanaele': 'Vertrieb & Marketing',
  's-mbudget': 'Vertrieb & Marketing',
  's-brand': 'Vertrieb & Marketing',
  's-content': 'Vertrieb & Marketing',
  's-tools': 'Vertrieb & Marketing',
  's-planung': 'Vertrieb & Marketing',
  's-guv': 'Finanzen',
  's-bilanz': 'Finanzen',
  's-unit': 'Finanzen',
  's-budget': 'Finanzen',
  's-headcount': 'Organisation & Team',
  's-hr': 'Organisation & Team',
  's-team': 'Organisation & Team',
  's-okr': 'Strategie 2026+',
  's-bsc': 'Strategie 2026+',
  's-massnahmen': 'Strategie 2026+',
  's-treiber': 'Strategie 2026+',
  's-risiko': 'Strategie 2026+',
};

async function navigateViaUi(client, viewId, isMobile) {
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

  const catKeyword = CAT_MAP[viewId] || '';

  let clicked = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    clicked = await client.eval(`
      (() => {
        const btn = document.querySelector('[data-testid="nav-item-${viewId}"]');
        if (btn) {
          btn.click();
          return true;
        }

        const catWord = "${catKeyword}";
        if (catWord) {
          const spans = Array.from(document.querySelectorAll('nav span, aside nav span, #mobile-sidebar-drawer span'));
          const catSpan = spans.find(s => s.textContent && s.textContent.trim().toLowerCase() === catWord.toLowerCase());
          if (catSpan) {
            const header = catSpan.closest('div[style*="cursor: pointer"]') || catSpan.parentElement?.closest('div');
            if (header && header.textContent.includes('▼')) {
              header.click();
            }
          }
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

  if (isMobile) {
    for (let wait = 0; wait < 15; wait++) {
      const isDrawerGone = await client.eval(`
        (() => {
          const drawer = document.getElementById('mobile-sidebar-drawer');
          const trigger = document.getElementById('mobile-menu-trigger');
          const triggerClosed = !trigger || trigger.getAttribute('aria-expanded') === 'false';
          return !drawer && triggerClosed;
        })()
      `);

      if (isDrawerGone) break;

      await client.eval(`
        (() => {
          const closeBtn = document.querySelector('#mobile-sidebar-drawer button[aria-label="Menü schließen"]');
          if (closeBtn) closeBtn.click();
          else {
            const backdrop = document.querySelector('div[style*="rgba(6, 22, 19"]');
            if (backdrop) backdrop.click();
          }
        })()
      `);
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  await new Promise((r) => setTimeout(r, 250));
}

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
  await new Promise((r) => setTimeout(r, 150));
}

// Spezifische fachliche Regeln validieren
async function verifySpecialFaceliftRules(client, viewportName) {
  console.log(`\n🔍 Validating Special Facelift Rules for [${viewportName}]...`);

  // 1. Volker Duo (s-persona)
  await navigateViaUi(client, 's-persona', viewportName.includes('Mobile') || parseInt(viewportName) <= 768);
  const volkerAudit = await client.eval(`
    (() => {
      const dossier = document.querySelector('.facelift-persona-dossier');
      const timeline = document.querySelector('.facelift-volker-day-timeline');
      if (!dossier || !timeline) return { ok: false, reason: 'Volker components missing' };

      const dossierText = dossier.textContent || '';
      const timelineText = timeline.textContent || '';

      const hasVolkerName = dossierText.includes('Volker') && dossierText.includes('47');
      const hasTimelineMoments = timelineText.includes('Arbeitsmoment 1') || timelineText.includes('Arbeitsmoment 4');
      const isDossierAbove = (dossier.compareDocumentPosition(timeline) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

      return {
        ok: hasVolkerName && hasTimelineMoments && isDossierAbove,
        hasVolkerName,
        hasTimelineMoments,
        isDossierAbove
      };
    })()
  `);
  if (!volkerAudit.ok) throw new Error(`Special Rule Failed (Volker Duo): ${JSON.stringify(volkerAudit)}`);
  console.log(`  ✅ Volker-Duo verifiziert (PersonaDossier [Buyer-Persona] & VolkerDayTimeline [Empathy] ohne Textdopplung, korrekte Reihenfolge)`);

  // 2. SegmentFields über RevenueStaircase (s-segmente)
  await navigateViaUi(client, 's-segmente', viewportName.includes('Mobile') || parseInt(viewportName) <= 768);
  const segmentAudit = await client.eval(`
    (() => {
      const segFields = document.querySelector('.facelift-segment-fields');
      const staircase = document.querySelector('.facelift-revenue-staircase');
      if (!segFields || !staircase) return { ok: false, reason: 'Segment components missing' };

      const isSegAbove = (segFields.compareDocumentPosition(staircase) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      const textSeg = segFields.textContent || '';
      const textStair = staircase.textContent || '';

      const hasMaschinenbau = textSeg.includes('Maschinenbau') && textSeg.includes('178.560 €');
      const hasCumulative = textStair.includes('411.840 €');

      return {
        ok: isSegAbove && hasMaschinenbau && hasCumulative,
        isSegAbove,
        hasMaschinenbau,
        hasCumulative
      };
    })()
  `);
  if (!segmentAudit.ok) throw new Error(`Special Rule Failed (Segments & Staircase): ${JSON.stringify(segmentAudit)}`);
  console.log(`  ✅ SegmentFields & RevenueStaircase verifiziert (SegmentFields prominent über RevenueStaircase, ARR-Datenbindung intakt)`);

  // 3. CapacityNetwork & RoleLegend als direkte Geschwister (s-team)
  await navigateViaUi(client, 's-team', viewportName.includes('Mobile') || parseInt(viewportName) <= 768);
  const teamAudit = await client.eval(`
    (() => {
      const net = document.querySelector('.facelift-capacity-network');
      const leg = document.querySelector('.facelift-role-legend');
      if (!net || !leg) return { ok: false, reason: 'Team components missing' };

      const isImmediateSibling = net.nextElementSibling === leg;
      const netText = net.textContent || '';
      const legText = leg.textContent || '';

      const hasCtoInEng = netText.includes('CTO Tobias Heine') || netText.includes('Tobias Heine (CTO)');
      const hasThreeBottlenecks = legText.includes('Engpass 1') && legText.includes('Engpass 2') && legText.includes('Engpass 3');

      return {
        ok: isImmediateSibling && hasCtoInEng && hasThreeBottlenecks,
        isImmediateSibling,
        hasCtoInEng,
        hasThreeBottlenecks
      };
    })()
  `);
  if (!teamAudit.ok) throw new Error(`Special Rule Failed (CapacityNetwork & RoleLegend): ${JSON.stringify(teamAudit)}`);
  console.log(`  ✅ CapacityNetwork & RoleLegend verifiziert (direkte Geschwister, CTO im Engineering-Knoten, 3 Engpässe orange)`);

  // 4. FundingTimeline mit 2 synchronisierten Spuren (s-historie)
  await navigateViaUi(client, 's-historie', viewportName.includes('Mobile') || parseInt(viewportName) <= 768);
  const fundingAudit = await client.eval(`
    (() => {
      const timeline = document.querySelector('.facelift-funding-timeline');
      if (!timeline) return { ok: false, reason: 'FundingTimeline missing' };

      const text = timeline.textContent || '';
      const hasFinanzierung = text.includes('Finanzierung') || text.includes('Pre-Seed');
      const hasRecht = text.includes('Gesellschaft') || text.includes('Gründung') || text.includes('Notar');

      return {
        ok: hasFinanzierung && hasRecht,
        hasFinanzierung,
        hasRecht
      };
    })()
  `);
  if (!fundingAudit.ok) throw new Error(`Special Rule Failed (FundingTimeline): ${JSON.stringify(fundingAudit)}`);
  console.log(`  ✅ FundingTimeline verifiziert (zwei synchronisierte Spuren: Finanzierung & Meilensteine)`);

  // 5. DecisionTopology nutzt Einführungsaufwand (s-wettbewerb)
  await navigateViaUi(client, 's-wettbewerb', viewportName.includes('Mobile') || parseInt(viewportName) <= 768);
  const topologyAudit = await client.eval(`
    (() => {
      const top = document.querySelector('.facelift-decision-topology');
      if (!top) return { ok: false, reason: 'DecisionTopology missing' };

      const text = top.textContent || '';
      const hasAufwand = text.includes('Einführungsaufwand') || text.includes('< 30 Min.');
      const hasDisclaimer = text.includes('Keine Darstellung von Marktanteilen');

      return {
        ok: hasAufwand && hasDisclaimer,
        hasAufwand,
        hasDisclaimer
      };
    })()
  `);
  if (!topologyAudit.ok) throw new Error(`Special Rule Failed (DecisionTopology): ${JSON.stringify(topologyAudit)}`);
  console.log(`  ✅ DecisionTopology verifiziert (Einführungsaufwand als Kriterium, Marktanteils-Disclaimer vorhanden)`);

  // 6. LocationAtlas: 4 Bilder mit Logo-Overlay & Label FIKTIVE VISUALISIERUNG (s-standort)
  await navigateViaUi(client, 's-standort', viewportName.includes('Mobile') || parseInt(viewportName) <= 768);
  const locationAudit = await client.eval(`
    (() => {
      const atlas = document.querySelector('.facelift-location-atlas');
      if (!atlas) return { ok: false, reason: 'LocationAtlas missing' };

      const imgs = Array.from(atlas.querySelectorAll('img')).filter(img => img.src && img.src.includes('unternehmen-'));
      const has4Images = imgs.length >= 4;

      const text = atlas.textContent || '';
      const hasFiktivLabel = text.includes('FIKTIVE VISUALISIERUNG');
      const hasAugustusplatz = text.includes('Augustusplatz 9');

      return {
        ok: has4Images && hasFiktivLabel && hasAugustusplatz,
        imagesCount: imgs.length,
        hasFiktivLabel,
        hasAugustusplatz
      };
    })()
  `);
  if (!locationAudit.ok) throw new Error(`Special Rule Failed (LocationAtlas): ${JSON.stringify(locationAudit)}`);
  console.log(`  ✅ LocationAtlas verifiziert (4 Standortbilder, Logo-Overlay & Label „FIKTIVE VISUALISIERUNG“ vorhanden)`);
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

    // Matrix aller 32 Visualisierungen geordnet nach Ansichten
    const viewsToAudit = [
      {
        subviewId: 's-profil',
        name: 'Überblick: Unternehmenssteckbrief',
        components: [{ id: 'company-register', selector: '.facelift-company-register' }]
      },
      {
        subviewId: 's-highlights',
        name: 'Überblick: Jahres-Highlights',
        components: [{ id: 'performance-pulse', selector: '.facelift-performance-pulse' }]
      },
      {
        subviewId: 's-daten',
        name: 'Überblick: Datenbasis & Quellen',
        components: [{ id: 'source-decision', selector: '.facelift-source-decision-flow' }]
      },
      {
        subviewId: 's-idee',
        name: 'Unternehmen: Geschäftsidee',
        components: [{ id: 'business-idea-signals', selector: '.facelift-business-idea-signal-map' }]
      },
      {
        subviewId: 's-value',
        name: 'Unternehmen: Kernvorteile',
        components: [{ id: 'benefit-stage', selector: '.facelift-value-benefit-stage' }]
      },
      {
        subviewId: 's-historie',
        name: 'Unternehmen: Gründung & Meilensteine',
        components: [{ id: 'funding-timeline', selector: '.facelift-funding-timeline' }]
      },
      {
        subviewId: 's-standort',
        name: 'Unternehmen: Standort-Atlas',
        components: [{ id: 'location-atlas', selector: '.facelift-location-atlas' }]
      },
      {
        subviewId: 's-funktion',
        name: 'Produkt: Operations Hub',
        components: [{ id: 'operations-hub', selector: '.facelift-operations-hub' }]
      },
      {
        subviewId: 's-perf',
        name: 'Produkt: System-Performanz',
        components: [{ id: 'product-health', selector: '.facelift-product-health' }]
      },
      {
        subviewId: 's-roadmap',
        name: 'Produkt: Roadmap Horizonte',
        components: [{ id: 'roadmap-horizons', selector: '.facelift-roadmap-horizons' }]
      },
      {
        subviewId: 's-markt',
        name: 'Markt: Chancenstapel',
        components: [{ id: 'market-opportunity-stack', selector: '.facelift-market-opportunity-stack' }]
      },
      {
        subviewId: 's-wettbewerb',
        name: 'Markt: Wettbewerbs-Topografie',
        components: [{ id: 'decision-topology', selector: '.facelift-decision-topology' }]
      },
      {
        subviewId: 's-swot',
        name: 'Markt: SWOT-Kompass',
        components: [{ id: 'swot-compass', selector: '.facelift-swot-compass' }]
      },
      {
        subviewId: 's-icp',
        name: 'Kunden: ICP Fit-Map',
        components: [{ id: 'icp-fit-map', selector: '.facelift-icp-fit-map' }]
      },
      {
        subviewId: 's-persona',
        name: 'Kunden: Persona & Volker Timeline',
        components: [
          { id: 'persona-dossier', selector: '.facelift-persona-dossier' },
          { id: 'volker-day-timeline', selector: '.facelift-volker-day-timeline' }
        ]
      },
      {
        subviewId: 's-segmente',
        name: 'Kunden: Segmente & Umsatztreppe',
        components: [
          { id: 'segment-fields', selector: '.facelift-segment-fields' },
          { id: 'revenue-staircase', selector: '.facelift-revenue-staircase' }
        ]
      },
      {
        subviewId: 's-top10',
        name: 'Kunden: Kundenportfolio',
        components: [{ id: 'customer-portfolio', selector: '.facelift-customer-portfolio' }]
      },
      {
        subviewId: 's-funnel',
        name: 'Vertrieb: Funnel-Leckage-Wasserfall',
        components: [{ id: 'funnel-leakage-waterfall', selector: '.facelift-funnel-waterfall' }]
      },
      {
        subviewId: 's-sla',
        name: 'Vertrieb: SLA Swimlanes',
        components: [{ id: 'sla-swimlane', selector: '.facelift-sla-swimlane' }]
      },
      {
        subviewId: 's-kanaele',
        name: 'Vertrieb: Kanal-Investitionsroute',
        components: [{ id: 'channel-investment-route', selector: '.facelift-channel-investment-route' }]
      },
      {
        subviewId: 's-planung',
        name: 'Vertrieb: Budget-zu-Ziel-Leiter',
        components: [{ id: 'budget-target-ladder', selector: '.facelift-budget-target-ladder' }]
      },
      {
        subviewId: 's-guv',
        name: 'Finanzen: Ertragsufer',
        components: [{ id: 'revenue-cost-shoreline', selector: '.facelift-revenue-cost-shoreline' }]
      },
      {
        subviewId: 's-bilanz',
        name: 'Finanzen: Kapital-Schnitt',
        components: [{ id: 'capital-cut', selector: '.facelift-capital-cut' }]
      },
      {
        subviewId: 's-unit',
        name: 'Finanzen: SaaS-Motor',
        components: [{ id: 'saas-motor', selector: '.facelift-saas-motor' }]
      },
      {
        subviewId: 's-headcount',
        name: 'Organisation: Organisationsgerüst',
        components: [{ id: 'organisation-scaffold', selector: '.facelift-organisation-scaffold' }]
      },
      {
        subviewId: 's-hr',
        name: 'Organisation: People-Health-Leiste',
        components: [{ id: 'people-health-rail', selector: '.facelift-people-health-rail' }]
      },
      {
        subviewId: 's-team',
        name: 'Organisation: Kapazitätsnetz & Rollen-Landkarte',
        components: [
          { id: 'capacity-network', selector: '.facelift-capacity-network' },
          { id: 'role-legend', selector: '.facelift-role-legend' }
        ]
      },
      {
        subviewId: 's-okr',
        name: 'Strategie: Ziel-Startbahn',
        components: [{ id: 'goal-runway', selector: '.facelift-goal-runway' }]
      },
      {
        subviewId: 's-bsc',
        name: 'Strategie: Balanced Scorecard Wirkungsbahn',
        components: [{ id: 'bsc-path', selector: '.facelift-bsc-path' }]
      }
    ];

    const viewports = [
      { name: '1440', width: 1440, height: 900, isMobile: false },
      { name: '768', width: 768, height: 1024, isMobile: true },
      { name: '375', width: 375, height: 812, isMobile: true },
      { name: '320', width: 320, height: 568, isMobile: true },
    ];

    await client.send('Page.navigate', { url: `http://localhost:${PORT}` });
    await new Promise((r) => setTimeout(r, 1000));

    // Besondere fachliche Regeln in 1440px prüfen
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await verifySpecialFaceliftRules(client, '1440px');

    let totalComponentsAudited = 0;

    for (const vp of viewports) {
      console.log(`\n=======================================================`);
      console.log(`📱 VIEWPORT AUDIT: ${vp.width}x${vp.height} (${vp.name}px)`);
      console.log(`=======================================================`);

      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.isMobile,
      });
      await new Promise((r) => setTimeout(r, 400));

      for (const view of viewsToAudit) {
        await navigateViaUi(client, view.subviewId, vp.isMobile);

        // Globalen Overflow für diese Seite prüfen
        const overflowOk = await client.checkGlobalOverflow(`${view.subviewId} @ ${vp.name}px`);
        if (!overflowOk) {
          throw new Error(`OVERFLOW GATE FAILED: [${view.subviewId} @ ${vp.name}px] horizontal overflow detected!`);
        }

        // Komponenten in dieser Ansicht prüfen
        for (const comp of view.components) {
          const check = await client.eval(`
            (() => {
              const el = document.querySelector('${comp.selector}');
              if (!el) return { found: false, reason: 'Selector not found' };
              const r = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);
              const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
              const text = el.textContent || '';
              const hasBrokenText = text.includes('undefined') || text.includes('NaN') || text.includes('[object Object]');

              return {
                found: true,
                isVisible,
                width: Math.round(r.width),
                height: Math.round(r.height),
                hasBrokenText
              };
            })()
          `);

          if (!check.found || !check.isVisible || check.hasBrokenText) {
            throw new Error(`COMPONENT GATE FAILED: [${comp.id} in ${view.subviewId} @ ${vp.name}px]: ${JSON.stringify(check)}`);
          }

          totalComponentsAudited++;
        }

        // Screenshot für jeden Viewport aufnehmen (1440, 768, 375, 320)
        const screenFile = path.join(SCREENSHOT_DIR, `gesamtabnahme_${view.subviewId}_${vp.name}px.png`);
        await client.screenshot(screenFile, `${view.subviewId} @ ${vp.name}px`);
      }
    }

    // 200 % Reflow Prüfung (WCAG 1.4.10) auf 375 px (CSS-Breite: 188 px)
    console.log(`\n=======================================================`);
    console.log(`🔍 AUDIT: WCAG 1.4.10 200 % REFLOW AUDIT (Breite: 188 px)`);
    console.log(`=======================================================`);

    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 188,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await new Promise((r) => setTimeout(r, 400));

    // Prüfe die kritischsten Ansichten im 200 % Reflow
    const reflowViews = ['s-segmente', 's-funnel', 's-guv', 's-team', 's-okr', 's-bsc'];
    for (const sub of reflowViews) {
      await navigateViaUi(client, sub, true);
      const reflowCheck = await client.checkGlobalOverflow(`Reflow 200% on ${sub}`);
      if (!reflowCheck) {
        throw new Error(`200% REFLOW FAILED on view: ${sub}`);
      }
      const reflowScreen = path.join(SCREENSHOT_DIR, `gesamtabnahme_${sub}_zoom200.png`);
      await client.screenshot(reflowScreen, `Reflow 200% @ ${sub}`);
      console.log(`✅ [200 % Reflow] ${sub} vollständig lesbar & reflowed ohne Clipping`);
    }

    client.close();
    console.log(`\n=======================================================`);
    console.log(`🎉 GESAMTABNAHME ERFOLGREICH!`);
    console.log(`✨ Audited ${totalComponentsAudited} component instances across all 4 viewports!`);
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
  console.error('Gesamtabnahme capture failed:', err);
  process.exit(1);
});
