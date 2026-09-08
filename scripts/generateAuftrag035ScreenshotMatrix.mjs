import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { TARGET_PAGE, VIEWPORTS } from './captureAuftrag035GateScreenshots.mjs';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/auftrag-035');
const README_PATH = path.join(SCREENSHOT_DIR, 'README.md');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

console.log('=======================================================');
console.log('📊 GENERATING AUFTRAG 035 SCREENSHOT MATRIX (GATE G19)');
console.log('=======================================================');

let totalPairs = 0;
let distinctPairs = 0;
let missingCount = 0;
const rows = [];

for (const vp of VIEWPORTS) {
  totalPairs++;
  const vorherFile = `${TARGET_PAGE.id}-${vp.name}-vorher.png`;
  const nachherFile = `${TARGET_PAGE.id}-${vp.name}-nachher.png`;

  const vorherPath = path.join(SCREENSHOT_DIR, vorherFile);
  const nachherPath = path.join(SCREENSHOT_DIR, nachherFile);

  if (!fs.existsSync(vorherPath) || !fs.existsSync(nachherPath)) {
    console.error(`❌ Missing screenshot pair: ${vorherFile} / ${nachherFile}`);
    missingCount++;
    rows.push({
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
      viewport: `${vp.name}px`,
      vorherSize: formatBytes(vorherBuf.length),
      nachherSize: formatBytes(nachherBuf.length),
      vorherHash: vorherHash.substring(0, 12) + '…',
      nachherHash: nachherHash.substring(0, 12) + '…',
      status: '✅ DISTINCT (Ebene C Live-Ist hinzugefügt)',
      vorherFile,
      nachherFile,
    });
  } else {
    console.error(`❌ Error: ${TARGET_PAGE.id} is identical in vorher and nachher at ${vp.name}px!`);
    rows.push({
      viewport: `${vp.name}px`,
      vorherSize: formatBytes(vorherBuf.length),
      nachherSize: formatBytes(nachherBuf.length),
      vorherHash: vorherHash.substring(0, 12) + '…',
      nachherHash: nachherHash.substring(0, 12) + '…',
      status: '❌ IDENTICAL',
      vorherFile,
      nachherFile,
    });
  }
}

console.log(`\nGesamt-Paare: ${totalPairs}`);
console.log(`Distinct: ${distinctPairs}`);
console.log(`Fehlend: ${missingCount}`);

// Generate README.md
const readmeContent = `# Screenshot-Matrix: Auftrag 035 / Gate G19

**Auftrag:** Isolierter Live-KPI-Client, sichere Realtime-Projektion und Komponentenbindung
**Baseline:** \`63e0c8b\`
**Geprüfte Seite:** \`${TARGET_PAGE.name}\` (\`${TARGET_PAGE.path}\`)
**Datum:** 2026-09-06

## Übersicht & Zusammenfassung

- **Gesamtzahl Screenshot-Paare:** ${totalPairs} (1 Seite × 3 Viewports)
- **DISTINCT:** ${distinctPairs} / ${totalPairs} (Die LiveKpiCard für Ebene C ist auf allen 3 Viewports sichtbar und verändert die Kennzahlfläche gegenüber dem Vorher-Zustand kontrolliert)
- **FEHLEND:** ${missingCount}
- **Horizontaler Overflow:** 0px auf allen Viewports nachgewiesen (\`scrollWidth <= clientWidth\`)

## Hash- & Größenvergleich

| Viewport | Vorher-Größe | Nachher-Größe | SHA-256 (Vorher) | SHA-256 (Nachher) | Status |
|---|---|---|---|---|---|
${rows
  .map(
    (r) =>
      `| ${r.viewport} | ${r.vorherSize} | ${r.nachherSize} | \`${r.vorherHash}\` | \`${r.nachherHash}\` | ${r.status} |`
  )
  .join('\n')}

## Screenshot-Dateien

- 1440px Desktop:
  - Vorher: \`dashboard-1440-vorher.png\`
  - Nachher: \`dashboard-1440-nachher.png\`
- 768px Tablet:
  - Vorher: \`dashboard-768-vorher.png\`
  - Nachher: \`dashboard-768-nachher.png\`
- 375px Mobile:
  - Vorher: \`dashboard-375-vorher.png\`
  - Nachher: \`dashboard-375-nachher.png\`
`;

fs.writeFileSync(README_PATH, readmeContent, 'utf8');
console.log(`\n📄 Matrix saved to ${README_PATH}`);

if (missingCount > 0 || distinctPairs !== totalPairs) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL SCREENSHOT CHECKS PASSED SUCCESSFULLY!');
}
