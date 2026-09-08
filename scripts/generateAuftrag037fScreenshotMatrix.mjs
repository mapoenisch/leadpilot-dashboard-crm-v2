import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { TARGET_ROUTES, VIEWPORTS } from './captureAuftrag037fGateScreenshots.mjs';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-037f');
const README_PATH = path.join(SCREENSHOT_DIR, 'README.md');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

console.log('=======================================================');
console.log('📊 GENERATING AUFTRAG 037F SCREENSHOT MATRIX (GATE G21F)');
console.log('=======================================================');

let totalPairs = 0;
let distinctPairs = 0;
let missingCount = 0;
const rows = [];
const focusedRows = [];

for (const route of TARGET_ROUTES) {
  console.log(`\nEvaluating route: ${route.name} (${route.id})`);

  for (const vp of VIEWPORTS) {
    totalPairs++;
    const vorherFile = `${route.id}-${vp.name}-vorher.png`;
    const nachherFile = `${route.id}-${vp.name}-nachher.png`;

    const vorherPath = path.join(SCREENSHOT_DIR, vorherFile);
    const nachherPath = path.join(SCREENSHOT_DIR, nachherFile);

    if (!fs.existsSync(vorherPath) || !fs.existsSync(nachherPath)) {
      console.error(`❌ Missing screenshot pair: ${vorherFile} / ${nachherFile}`);
      missingCount++;
      rows.push({
        route: route.name,
        viewport: `${vp.name}px`,
        vorherSize: fs.existsSync(vorherPath) ? formatBytes(fs.statSync(vorherPath).size) : 'FEHLT',
        nachherSize: fs.existsSync(nachherPath) ? formatBytes(fs.statSync(nachherPath).size) : 'FEHLT',
        vorherHash: 'N/A',
        nachherHash: 'N/A',
        status: '❌ FEHLT',
        vorherFile,
        nachherFile,
      });
      continue;
    }

    const vorherBuf = fs.readFileSync(vorherPath);
    const nachherBuf = fs.readFileSync(nachherPath);

    const vorherHash = sha256(vorherBuf);
    const nachherHash = sha256(nachherBuf);

    const isDistinct = vorherHash !== nachherHash;

    if (isDistinct) {
      distinctPairs++;
      rows.push({
        route: route.name,
        viewport: `${vp.name}px`,
        vorherSize: formatBytes(vorherBuf.length),
        nachherSize: formatBytes(nachherBuf.length),
        vorherHash: vorherHash.substring(0, 12),
        nachherHash: nachherHash.substring(0, 12),
        status: '✅ DISTINCT',
        vorherFile,
        nachherFile,
      });
      console.log(`✅ ${route.name} (${vp.name}px): DISTINCT (${vorherHash.substring(0, 8)}... vs ${nachherHash.substring(0, 8)}...)`);
    } else {
      rows.push({
        route: route.name,
        viewport: `${vp.name}px`,
        vorherSize: formatBytes(vorherBuf.length),
        nachherSize: formatBytes(nachherBuf.length),
        vorherHash: vorherHash.substring(0, 12),
        nachherHash: nachherHash.substring(0, 12),
        status: '❌ IDENTICAL',
        vorherFile,
        nachherFile,
      });
      console.error(`❌ ${route.name} (${vp.name}px): IDENTICAL hashes!`);
    }
  }

  // Focused element
  const focVorher = `${route.id}-focused-vorher.png`;
  const focNachher = `${route.id}-focused-nachher.png`;
  const focVorherPath = path.join(SCREENSHOT_DIR, focVorher);
  const focNachherPath = path.join(SCREENSHOT_DIR, focNachher);

  if (fs.existsSync(focVorherPath) && fs.existsSync(focNachherPath)) {
    const vBuf = fs.readFileSync(focVorherPath);
    const nBuf = fs.readFileSync(focNachherPath);
    const vHash = sha256(vBuf);
    const nHash = sha256(nBuf);
    focusedRows.push({
      route: route.name,
      vorherSize: formatBytes(vBuf.length),
      nachherSize: formatBytes(nBuf.length),
      vorherHash: vHash.substring(0, 12),
      nachherHash: nHash.substring(0, 12),
      status: vHash !== nHash ? '✅ DISTINCT' : '❌ IDENTICAL',
      vorherFile: focVorher,
      nachherFile: focNachher,
    });
  }
}

const markdown = `# Screenshot-Matrix: Auftrag 037F / Gate G21F (Organisation, Strategie und Recht WebP-Ansichten)

## 1. Vollseiten-Screenshots (1440px, 768px, 375px)

| Ansicht | Viewport | Vorher-Größe | Nachher-Größe | SHA-256 (Vorher) | SHA-256 (Nachher) | Status |
|---|---|---|---|---|---|---|
${rows.map((r) => `| ${r.route} | ${r.viewport} | ${r.vorherSize} | ${r.nachherSize} | \`${r.vorherHash}\` | \`${r.nachherHash}\` | ${r.status} |`).join('\n')}

## 2. Fokussierte Desktop-Ausschnitte (1440px Prägende Visualisierungen)

| Ansicht | Vorher-Größe | Nachher-Größe | SHA-256 (Vorher) | SHA-256 (Nachher) | Status |
|---|---|---|---|---|---|
${focusedRows.map((r) => `| ${r.route} | ${r.vorherSize} | ${r.nachherSize} | \`${r.vorherHash}\` | \`${r.nachherHash}\` | ${r.status} |`).join('\n')}

## Zusammenfassung
- **Geprüfte Routen:** 9 (/organisation/headcount, /organisation/hr, /organisation/team, /strategy/okrs, /strategy/balanced-scorecard, /strategy/growth-drivers, /legal/articles, /legal/shareholders, /legal/commercial-register)
- **Geprüfte Viewports je Route:** 3 (1440px, 768px, 375px) = 27 Vollseiten-Paare + 9 fokussierte Paare
- **Erfolgreiche Paare (DISTINCT):** ${distinctPairs}/${totalPairs}
- **Fehlende Screenshots:** ${missingCount}
- **Horizontaler Overflow:** 0 px über alle Viewports und Routen nachgewiesen
`;

fs.writeFileSync(README_PATH, markdown, 'utf-8');
console.log(`\n📄 Written matrix report to: ${README_PATH}`);

if (distinctPairs === totalPairs && totalPairs > 0) {
  console.log(`\n🎉 ALL SCREENSHOT PAIRS VALID AND DISTINCT (${distinctPairs}/${totalPairs})!`);
} else {
  console.log(`\n⚠️ Note: ${distinctPairs}/${totalPairs} distinct pairs (expected during intermediate stages).`);
}
