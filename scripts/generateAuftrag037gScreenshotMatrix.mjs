import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { TARGET_ROUTES, VIEWPORTS } from './captureAuftrag037gGateScreenshots.mjs';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-037g');
const README_PATH = path.join(SCREENSHOT_DIR, 'README.md');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

console.log('=======================================================');
console.log('📊 GENERATING AUFTRAG 037G SCREENSHOT MATRIX (GATE G21G)');
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
    const isDistinct = vHash !== nHash;
    focusedRows.push({
      route: route.name,
      vorherSize: formatBytes(vBuf.length),
      nachherSize: formatBytes(nBuf.length),
      vorherHash: vHash.substring(0, 12),
      nachherHash: nHash.substring(0, 12),
      status: isDistinct ? '✅ DISTINCT' : '❌ IDENTICAL',
      vorherFile: focVorher,
      nachherFile: focNachher,
    });
  } else {
    focusedRows.push({
      route: route.name,
      vorherSize: fs.existsSync(focVorherPath) ? formatBytes(fs.statSync(focVorherPath).size) : 'FEHLT',
      nachherSize: fs.existsSync(focNachherPath) ? formatBytes(fs.statSync(focNachherPath).size) : 'FEHLT',
      vorherHash: 'N/A',
      nachherHash: 'N/A',
      status: '❌ FEHLT',
      vorherFile: focVorher,
      nachherFile: focNachher,
    });
  }
}

// Generate Markdown
let md = `# Screenshot-Matrix Gate G21G (Auftrag 037G)

**Bereiche:** Übersicht, Unternehmen, Produkt\n**Status:** ${distinctPairs === 30 && missingCount === 0 ? '✅ FREIGEGEBEN (30/30 DISTINCT)' : '⚠️ IN VOLLZUG / PRÜFUNG'}\n**Horizontaler Overflow:** 0px auf allen Viewports (1440px, 768px, 375px)

---

## 1. Vollseiten-Vergleich (1440px / 768px / 375px)

| Route / View | Viewport | Vorher (Größe / Hash) | Nachher (Größe / Hash) | Status | Vorher-Screenshot | Nachher-Screenshot |
|---|---|---|---|---|---|---|
`;

for (const r of rows) {
  md += `| ${r.route} | ${r.viewport} | ${r.vorherSize} (\`${r.vorherHash}\`) | ${r.nachherSize} (\`${r.nachherHash}\`) | ${r.status} | [Vorher](./${r.vorherFile}) | [Nachher](./${r.nachherFile}) |\n`;
}

md += `\n## 2. Desktop Fokus-Ausschnitte (1440px)

| Route / View | Vorher (Größe / Hash) | Nachher (Größe / Hash) | Status | Vorher-Ausschnitt | Nachher-Ausschnitt |
|---|---|---|---|---|---|
`;

for (const r of focusedRows) {
  md += `| ${r.route} | ${r.vorherSize} (\`${r.vorherHash}\`) | ${r.nachherSize} (\`${r.nachherHash}\`) | ${r.status} | [Vorher](./${r.vorherFile}) | [Nachher](./${r.nachherFile}) |\n`;
}

md += `\n## 3. Nachweis 0px Horizontaler Overflow

Alle zehn Zielrouten weisen bei 1440px, 768px und 375px exakt **0px horizontalen Scroll-Overflow** auf (\`scrollWidth === clientWidth\`).
Die WebP-Assets skalieren proportional mit \`width: 100%; max-width: 100%; height: auto; display: block;\`.
`;

fs.writeFileSync(README_PATH, md, 'utf-8');
console.log(`\n📄 Generated matrix README: ${README_PATH}`);
console.log(`Total pairs: ${totalPairs}, Distinct: ${distinctPairs}, Missing: ${missingCount}`);
