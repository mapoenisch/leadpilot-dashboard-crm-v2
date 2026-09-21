#!/usr/bin/env node
/**
 * Gate G61 (Auftrag 067O): Screenshot- und 0px-Horizontal-Overflow-Harness.
 * Führt deterministische Screen-Captures für alle 4 G61-Kernrouten auf 3 Viewports aus.
 * Berechnet SHA-256-Hashes und misst horizontalen Overflow.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const VIEWPORTS = [
  { name: '1440px', width: 1440, height: 900, key: '1440' },
  { name: '768px', width: 768, height: 1024, key: '768' },
  { name: '375px', width: 375, height: 812, key: '375' },
];

const ROUTES = [
  { path: '/dashboard', label: 'Executive Cockpit V2' },
  { path: '/company/data-basis', label: 'CRM-Datenbasis' },
  { path: '/crm/leads', label: 'CRM Leads & Kontakte' },
  { path: '/crm/live-simulation', label: 'Live-Simulation Cockpit' },
];

const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-067o-g61');
const AUTH_FILE = path.join(ROOT, 'playwright/.auth/user.json');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      await new Promise((resolve, reject) => {
        http
          .get(url, (res) => (res.statusCode === 200 || res.statusCode === 304 ? resolve() : reject(new Error(String(res.statusCode)))))
          .on('error', reject);
      });
      return;
    } catch {
      await sleep(200);
    }
  }
  throw new Error(`Preview server not ready: ${url}`);
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
    }, 5000).unref?.();
  });
}

function computeSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

async function main() {
  if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    throw new Error('dist/ fehlt — zuerst `npm run build` ausführen.');
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const port = 4321;
  const base = `http://127.0.0.1:${port}`;

  let previewProc = null;
  let serverAlreadyRunning = false;
  try {
    await waitForServer(`${base}/dashboard`, 3);
    serverAlreadyRunning = true;
    console.log(`ℹ Reusing already running preview server on ${base}`);
  } catch {
    console.log(`🚀 Starting vite preview on ${base}...`);
    previewProc = spawn(
      process.execPath,
      ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
      { cwd: ROOT, stdio: 'pipe' }
    );
    await waitForServer(`${base}/dashboard`);
  }

  const results = [];

  try {
    const browser = await chromium.launch();
    try {
      for (const route of ROUTES) {
        for (const vp of VIEWPORTS) {
          const contextOptions = {
            viewport: { width: vp.width, height: vp.height },
            reducedMotion: 'reduce',
          };

          if (fs.existsSync(AUTH_FILE)) {
            contextOptions.storageState = AUTH_FILE;
          }

          const context = await browser.newContext(contextOptions);
          const page = await context.newPage();

          await page.goto(base + route.path, { waitUntil: 'networkidle' });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(1000);

          // Measure horizontal overflow
          const overflowX = await page.evaluate(() => {
            return Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
          });

          const slug = route.path.replace(/^\//, '').replace(/\//g, '-');
          const fileName = `${slug}-${vp.key}.png`;
          const filePath = path.join(OUT_DIR, fileName);

          await page.screenshot({ path: filePath, fullPage: true });
          const hash = computeSha256(filePath);

          console.log(`📸 [${vp.name}] ${route.path} -> ${fileName} (SHA-256: ${hash.slice(0, 12)}..., overflow: ${overflowX}px)`);

          results.push({
            route: route.path,
            label: route.label,
            viewport: `${vp.key}px (${vp.width}×${vp.height})`,
            hash,
            overflowX: `${overflowX}px`,
            file: fileName,
          });

          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
  } finally {
    if (previewProc && !serverAlreadyRunning) {
      await stopProc(previewProc);
    }
  }

  console.log('\n=== CAPTURE MATRIX SUMMARY ===');
  console.table(
    results.map((r) => ({
      Route: r.route,
      Viewport: r.viewport,
      'SHA-256': r.hash,
      Overflow: r.overflowX,
    }))
  );

  return results;
}

main().catch((err) => {
  console.error('❌ Capture failed:', err.message);
  process.exit(1);
});
