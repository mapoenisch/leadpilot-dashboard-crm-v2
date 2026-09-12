#!/usr/bin/env node
/**
 * Gate G40 (Auftrag 058): Screenshot-Harness fuer Vorher/Nachher-Nachweis
 * der 5 gesplitteten Komponenten (KpiTimeSeriesDetailView, ScenarioManagerModal,
 * MeasureManagerModal, MultiScenarioComparisonModal, DecisionTopology).
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const VIEWPORTS = {
  1440: { width: 1440, height: 900 },
  768: { width: 768, height: 1024 },
  375: { width: 375, height: 812 },
};

function waitForServer(url, tries = 40) {
  return new Promise((resolve, reject) => {
    let count = 0;
    const interval = setInterval(() => {
      http
        .get(url, (res) => {
          if (res.statusCode === 200) {
            clearInterval(interval);
            resolve();
          }
        })
        .on('error', () => {
          count++;
          if (count >= tries) {
            clearInterval(interval);
            reject(new Error(`Server timeout at ${url}`));
          }
        });
    }, 200);
  });
}

function stopProc(proc) {
  return new Promise((resolve) => {
    if (!proc || proc.exitCode !== null) return resolve();
    proc.once('exit', () => resolve());
    try {
      proc.kill('SIGTERM');
    } catch {
      resolve();
    }
    setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch {}
      resolve();
    }, 4000).unref?.();
  });
}

async function startDecisionTopologyServer(port) {
  const entrySource = `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { DecisionTopology } from './src/features/markt/components/DecisionTopology';

    function App() {
      return (
        <div style={{ padding: '24px', backgroundColor: '#061613', minHeight: '100vh', color: '#fff' }}>
          <DecisionTopology />
        </div>
      );
    }

    const root = createRoot(document.getElementById('root'));
    root.render(<App />);
  `;

  const buildResult = await esbuild.build({
    stdin: { contents: entrySource, resolveDir: ROOT, loader: 'tsx' },
    bundle: true,
    format: 'esm',
    write: false,
  });

  const bundleCode = buildResult.outputFiles[0].text;

  const server = http.createServer((req, res) => {
    if (req.url === '/bundle.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(bundleCode);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html><html><head><meta charset="utf-8">
        <link rel="stylesheet" href="/assets/index.css">
        <style>body { margin: 0; font-family: sans-serif; background: #061613; }</style>
      </head><body><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>`);
    }
  });

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  return server;
}

async function main() {
  const stage = process.argv.find((a) => a.startsWith('--stage='))?.split('=')[1] || 'baseline';
  const outDir = path.resolve(ROOT, `docs/screenshots/auftrag-058/${stage}`);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`\n📸 Starte Screenshot-Capture (Stage: ${stage}) -> ${path.relative(ROOT, outDir)}\n`);

  const previewPort = 4330;
  const topoPort = 4331;

  const preview = spawn(
    'node',
    ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(previewPort), '--strictPort'],
    { cwd: ROOT, stdio: 'pipe' }
  );

  const topoServer = await startDecisionTopologyServer(topoPort);

  try {
    await waitForServer(`http://127.0.0.1:${previewPort}/dashboard`);
    await waitForServer(`http://127.0.0.1:${topoPort}/`);

    const browser = await chromium.launch();

    for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
      console.log(`\n--- Viewport ${vpName}px (${vpSize.width}x${vpSize.height}) ---`);

      // 1. KpiTimeSeriesDetailView
      {
        const context = await browser.newContext({ viewport: vpSize, reducedMotion: 'reduce' });
        const page = await context.newPage();
        await page.goto(`http://127.0.0.1:${previewPort}/crm/live-simulation`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.click('button:has-text("Detail-Ebene")');
        await page.waitForSelector('text=Zeitreihen-Verlauf', { timeout: 5000 });
        await page.waitForTimeout(500);

        const file = path.join(outDir, `kpi-detail-view-${vpName}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(`📸 ${path.basename(file)}`);
        await context.close();
      }

      // 2. ScenarioManagerModal
      {
        const context = await browser.newContext({ viewport: vpSize, reducedMotion: 'reduce' });
        const page = await context.newPage();
        await page.goto(`http://127.0.0.1:${previewPort}/crm/live-simulation`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.click('button:has-text("Szenarien & Parameter")');
        await page.waitForSelector('text=Szenario- & Versions', { timeout: 5000 });
        await page.waitForTimeout(500);

        const file = path.join(outDir, `modal-scenario-${vpName}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(`📸 ${path.basename(file)}`);
        await context.close();
      }

      // 3. MeasureManagerModal
      {
        const context = await browser.newContext({ viewport: vpSize, reducedMotion: 'reduce' });
        const page = await context.newPage();
        await page.goto(`http://127.0.0.1:${previewPort}/crm/live-simulation`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.click('button:has-text("Maßnahmen")');
        await page.waitForSelector('text=Maßnahmenmanager', { timeout: 5000 });
        await page.waitForTimeout(500);

        const file = path.join(outDir, `modal-measure-${vpName}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(`📸 ${path.basename(file)}`);
        await context.close();
      }

      // 4. MultiScenarioComparisonModal
      {
        const context = await browser.newContext({ viewport: vpSize, reducedMotion: 'reduce' });
        const page = await context.newPage();
        await page.goto(`http://127.0.0.1:${previewPort}/crm/live-simulation`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.click('button:has-text("Szenariovergleich")');
        await page.waitForSelector('text=Multi-Szenario-Vergleich', { timeout: 5000 });
        await page.waitForTimeout(500);

        const file = path.join(outDir, `modal-multicompare-${vpName}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(`📸 ${path.basename(file)}`);
        await context.close();
      }

      // 5. DecisionTopology
      {
        const context = await browser.newContext({ viewport: vpSize, reducedMotion: 'reduce' });
        const page = await context.newPage();
        await page.goto(`http://127.0.0.1:${topoPort}/`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        const file = path.join(outDir, `decision-topology-${vpName}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(`📸 ${path.basename(file)}`);
        await context.close();
      }
    }

    await browser.close();
    console.log(`\n✔ Alle Screenshots für ${stage} erfolgreich erstellt!`);
  } finally {
    await stopProc(preview);
    await new Promise((resolve) => topoServer.close(resolve));
  }
}

main().catch((err) => {
  console.error('❌ Fehler beim Screenshot-Capture:', err);
  process.exit(1);
});
