#!/usr/bin/env node
/**
 * Auftrag 081 (Frontend-Qualität, Arbeitspaket 0): reproduzierbare Ausgangslage vor jeder Änderung.
 *
 * Gegen einen Build mit lokalem Supabase und Testbenutzer:
 * 1. Jede Route der Inventarliste (Dashboard, Bearbeiten, Details, CRM, Datenbasis, Standort und
 *    alle 32 Bildseiten) bei 1440/768/375 px, dunkel und hell; Dashboard und Funnel zusätzlich 320 px.
 *    Lazy-Inhalte werden vorher durch Scrollen von <main> aktiviert. Je Aufnahme: Bild des ersten
 *    Bildschirms und des ganzen Inhalts, SHA-256, Inhaltshöhe, Überlauf (Dokument, <main>), axe
 *    serious/critical getrennt für <main> und die ganze Seite (Kopfzeile, Sidebar, Kontoaktionen),
 *    erster Tab-Fokus ab Dokumentanfang, Dashboard: Kachelhöhen und Kennzahlwerte im ersten
 *    Bildschirm, Bildseiten: Darstellungsmaßstab des Bildes.
 * 2. Fehlerfall Pipeline: crm-query-export antwortet kontrolliert mit 500, danach Navigation zu
 *    Unternehmenssteckbrief und Funnel. Erfasst Adresse, Überschrift, Anzeige und Konsolenfehler.
 * Bilder bleiben lokal (.gitignore). Messwerte: docs/reviews/2026-10-06-frontend-inventar.json.
 * Fehlt eine erwartete Aufnahme oder schlägt eine fehl, endet der Lauf mit Exit-Code 1.
 *
 * Nur Matrix aus vorhandenem JSON neu schreiben: README_ONLY=1 node scripts/captureAuftrag081Inventory.mjs
 * Aufruf: BASE_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureAuftrag081Inventory.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { execFileSync } from 'node:child_process';
import { loadEnv } from 'vite';
import { axeSevere, scrollThrough, sessionUserId } from './lib/detailShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_COMMIT = '7fd6e33';
const MODE = (
  process.env.MODE ??
  process.env.INVENTORY_MODE ??
  (process.env.NACHHER === '1' ? 'nachher' : 'baseline')
).toLowerCase();
const IS_NACHHER = MODE === 'nachher';
if (MODE !== 'baseline' && MODE !== 'nachher') {
  throw new Error(`Ungültiger Modus '${MODE}'. Erlaubt sind 'baseline' und 'nachher'.`);
}
const TARGET_COMMIT =
  process.env.TARGET_COMMIT ??
  (IS_NACHHER
    ? execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim()
    : BASELINE_COMMIT);

const RECORDING_LOCALE = 'de-DE';
const RECORDING_TIMEZONE = 'Europe/Berlin';

/**
 * Versionierte Vite-Eingaben, die gegen die Baseline (oder im Nachher-Modus gegen den Zielcommit)
 * geprüft werden. assets/ gehört dazu, weil Produktdateien Root-Assets importieren (Codex PR #67 Runde 16/20).
 */
const PRODUCT_PATHS = [
  'src/',
  'public/',
  'assets/',
  'supabase/',
  'index.html',
  'vite.config.ts',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'tailwind.config.js',
  'postcss.config.js',
];

/** GET gegen die Supabase-REST-API mit dem Token der Sitzung; wirft bei jedem Status >= 300 (Befund PR #67). */
async function restGet(page, supabase, pathAndQuery, what) {
  const result = await page.evaluate(
    async ({ url, anonKey, pathAndQuery: pq }) => {
      let token = null;
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
          token = JSON.parse(localStorage.getItem(key) ?? '{}').access_token ?? null;
        }
      }
      const response = await fetch(`${url}/rest/v1/${pq}`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return { status: response.status, body: await response.json().catch(() => null) };
    },
    { url: supabase.url, anonKey: supabase.anonKey, pathAndQuery },
  );
  if (result.status >= 300) {
    throw new Error(
      `${what} fehlgeschlagen (HTTP ${result.status}): ${JSON.stringify(result.body)}`,
    );
  }
  return result.body;
}

/** Liest die Dashboard-Präferenzen; ein Fehlerstatus gilt nie als „keine Zeile“. */
async function readPreferences(page, supabase) {
  const body = await restGet(
    page,
    supabase,
    'executive_dashboard_preferences?select=organization_id,user_id,revision,config,schema_version,created_at,updated_at',
    'Präferenzen lesen',
  );
  const row = Array.isArray(body) ? body[0] : null;
  return row ? { ...row } : { revision: 0, config: null };
}

/**
 * Kanonisiert beliebige JSON-Datenstrukturen für strukturellen Vergleich:
 * Sortiert Objektschlüssel rekursiv, erhält Array-Reihenfolge.
 * Verhindert Fehlalarme durch PostgreSQL jsonb Key-Reordering (Codex PR #67 Runde 20).
 */
function canonicalJsonString(data) {
  if (data === null || typeof data !== 'object') {
    return JSON.stringify(data);
  }
  if (Array.isArray(data)) {
    return '[' + data.map(canonicalJsonString).join(',') + ']';
  }
  const keys = Object.keys(data).sort();
  return (
    '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJsonString(data[k])).join(',') + '}'
  );
}

function isJsonStructurallyEqual(a, b) {
  return canonicalJsonString(a) === canonicalJsonString(b);
}

/**
 * Speichert Dashboard-Präferenzen über den RPC-Endpunkt mit der aktiven Benutzersitzung.
 * Führt den RPC-Aufruf save_dashboard_preferences aus und gibt unmittelbar die zurückgegebene Revision zurück.
 * Liest NICHT nach, um den Restore-Token vor jeglichem nachgelagerten Lesezugriff zu sichern (Codex PR #67 Runde 18/20).
 */
async function savePreferencesRpc(page, supabase, config, expectedRevision) {
  const result = await page.evaluate(
    async ({ url, anonKey, config: pConfig, expectedRevision: pExpRev }) => {
      let token = null;
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
          token = JSON.parse(localStorage.getItem(key) ?? '{}').access_token ?? null;
        }
      }
      const response = await fetch(`${url}/rest/v1/rpc/save_dashboard_preferences`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_config: pConfig, p_expected_revision: pExpRev }),
      });
      return { status: response.status, body: await response.json().catch(() => null) };
    },
    { url: supabase.url, anonKey: supabase.anonKey, config, expectedRevision },
  );
  if (result.status >= 300) {
    throw new Error(
      `Speichern fehlgeschlagen (HTTP ${result.status}): ${JSON.stringify(result.body)}`,
    );
  }
  const rpcRow = Array.isArray(result.body) ? result.body[0] : result.body;
  const rpcRevision = rpcRow?.revision ?? null;
  if (!Number.isInteger(rpcRevision)) {
    throw new Error(`Speicher-RPC lieferte keine Revision: ${JSON.stringify(rpcRevision)}`);
  }
  return { rpcRevision };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

function assertScopedCleanup(url, userId) {
  if (!LOCAL_HOSTS.has(new URL(url).hostname)) {
    throw new Error(`Aufräumschlüssel nur für lokales Supabase, nicht für ${new URL(url).host}.`);
  }
  if (typeof userId !== 'string' || !UUID.test(userId)) {
    throw new Error('Ungültige Benutzer-ID für das Aufräumen.');
  }
}

/** Stellt die exakte Präferenzzeile (inkl. ursprünglicher Revision und Zeitstempel) wieder her (Befund PR #67 Runde 9/19/20). */
/**
 * Befund PR #67 Runde 24: Entfernt die vom Harness angelegte Präferenzzeile, aber nur, wenn
 * Revision und Konfiguration noch exakt dem Harness-Stand entsprechen (konfliktfest).
 */
async function deleteHarnessPreferencesRow(supabase, cleanupKey, restore) {
  assertScopedCleanup(supabase.url, restore.userId);
  const scope = `user_id=eq.${encodeURIComponent(restore.userId)}&organization_id=eq.${encodeURIComponent(restore.organizationId)}`;
  const headers = { apikey: cleanupKey, Authorization: `Bearer ${cleanupKey}` };
  const getRes = await fetch(
    `${supabase.url}/rest/v1/executive_dashboard_preferences?${scope}&select=revision,config`,
    { headers },
  );
  if (!getRes.ok) {
    throw new Error(`Lesen vor dem Entfernen fehlgeschlagen (HTTP ${getRes.status}).`);
  }
  const rows = await getRes.json();
  const row = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
  if (!row) throw new Error('Harness-Präferenzzeile nicht mehr vorhanden; nichts entfernt.');
  if (!restore.harnessRevisions.includes(row.revision)) {
    throw new Error(
      `Präferenzzeile parallel geändert (Revision ${row.revision}); fremde Änderung bleibt erhalten.`,
    );
  }
  if (!isJsonStructurallyEqual(row.config, restore.installedConfig)) {
    throw new Error('Konfiguration weicht vom Harness-Stand ab; fremde Änderung bleibt erhalten.');
  }
  const revisionFilter = `revision=in.(${restore.harnessRevisions.map(Number).join(',')})`;
  const delRes = await fetch(
    `${supabase.url}/rest/v1/executive_dashboard_preferences?${scope}&${revisionFilter}`,
    { method: 'DELETE', headers: { ...headers, Prefer: 'return=representation' } },
  );
  if (!delRes.ok) {
    throw new Error(`Entfernen der Harness-Zeile fehlgeschlagen (HTTP ${delRes.status}).`);
  }
  const deleted = await delRes.json();
  if (!Array.isArray(deleted) || deleted.length !== 1) {
    throw new Error(`Entfernen der Harness-Zeile betraf ${deleted?.length ?? 0} statt 1 Zeile.`);
  }
}

async function restorePreferencesRow(
  supabase,
  cleanupKey,
  originalRow,
  harnessRevisions,
  expectedInstalledConfig,
) {
  assertScopedCleanup(supabase.url, originalRow.user_id);
  // Befund PR #67 Runde 19/20: Vor dem PATCH verifizieren, dass die Zeile tatsächlich existiert,
  // ihre Revision in harnessRevisions liegt und ihr Inhalt strukturell exakt der installierten Konfiguration entspricht.
  const getRes = await fetch(
    `${supabase.url}/rest/v1/executive_dashboard_preferences?user_id=eq.${encodeURIComponent(originalRow.user_id)}&organization_id=eq.${encodeURIComponent(originalRow.organization_id)}&select=revision,config`,
    {
      headers: {
        apikey: cleanupKey,
        Authorization: `Bearer ${cleanupKey}`,
      },
    },
  );
  if (!getRes.ok) {
    throw new Error(
      `Lesen der aktuellen Präferenzzeile vor Restore fehlgeschlagen (HTTP ${getRes.status}): ${await getRes.text()}`,
    );
  }
  const currentRows = await getRes.json();
  const currentRow = Array.isArray(currentRows) && currentRows.length === 1 ? currentRows[0] : null;
  if (!currentRow) {
    throw new Error('Präferenzzeile existiert nicht mehr; Wiederherstellung abgebrochen.');
  }
  if (!harnessRevisions.includes(currentRow.revision)) {
    throw new Error(
      `Präferenzzeile wurde während des Laufs parallel geändert (Revision ${currentRow.revision} nicht in ${harnessRevisions.join('/')}); Wiederherstellung abgebrochen, fremde Änderung bleibt erhalten.`,
    );
  }
  if (
    expectedInstalledConfig &&
    !isJsonStructurallyEqual(currentRow.config, expectedInstalledConfig)
  ) {
    throw new Error(
      'Aktuelle Konfiguration in der Datenbank weicht von der vom Harness installierten Konfiguration ab; fremde Änderung bleibt erhalten.',
    );
  }

  // Nur zurückschreiben, solange die Zeile noch auf einer vom Harness erzeugten bzw. der Ausgangsrevision
  // steht; eine parallel gespeicherte neuere Revision wird nie verworfen (Codex PR #67 Runde 17/19).
  const revisionFilter = `revision=in.(${harnessRevisions.map(Number).join(',')})`;
  const response = await fetch(
    `${supabase.url}/rest/v1/executive_dashboard_preferences?user_id=eq.${encodeURIComponent(originalRow.user_id)}&organization_id=eq.${encodeURIComponent(originalRow.organization_id)}&${revisionFilter}`,
    {
      method: 'PATCH',
      headers: {
        apikey: cleanupKey,
        Authorization: `Bearer ${cleanupKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        config: originalRow.config,
        schema_version: originalRow.schema_version,
        revision: originalRow.revision,
        created_at: originalRow.created_at,
        updated_at: originalRow.updated_at,
      }),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Wiederherstellen der ursprünglichen Präferenzzeile fehlgeschlagen (HTTP ${response.status}): ${await response.text()}`,
    );
  }
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(
      `Präferenzzeile wurde während des Laufs parallel geändert (Revision nicht mehr in ${harnessRevisions.join('/')}); Wiederherstellung abgebrochen, fremde Änderung bleibt erhalten.`,
    );
  }
}

/** Inventarisierter Testbenutzer: admin-a aus supabase/seed.sql (Organisation A). */
const EXPECTED_IDENTITY = {
  email: 'admin-a@e2e.local',
  userId: '11111111-1111-1111-1111-111111111111',
  organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  role: 'admin',
};

/** Bricht ab, wenn die Sitzung nicht der inventarisierten Identität entspricht (Befund PR #67). */
async function verifyIdentity(page, supabase, email, userId) {
  const members = await restGet(
    page,
    supabase,
    `organization_members?select=organization_id,role&user_id=eq.${encodeURIComponent(userId ?? '')}`,
    'Mitgliedschaft lesen',
  );
  const membership = Array.isArray(members) && members.length === 1 ? members[0] : null;
  const actual = {
    email,
    userId,
    organizationId: membership?.organization_id ?? null,
    role: membership?.role ?? null,
  };
  for (const key of Object.keys(EXPECTED_IDENTITY)) {
    if (actual[key] !== EXPECTED_IDENTITY[key]) {
      throw new Error(
        `Testbenutzer weicht von der inventarisierten Identität ab (${key}: erwartet ${EXPECTED_IDENTITY[key]}, gefunden ${actual[key]}). Lauf abgebrochen.`,
      );
    }
  }
  return actual;
}

/** Sammelt alle sichtbaren statischen Assets und Fonts unter public/ (Befund PR #67 Runde 11/12). */
function collectPublicFiles(dir = path.join(ROOT, 'public'), baseDir = path.join(ROOT, 'public')) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let results = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectPublicFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      if (entry.name.startsWith('.') || entry.name.endsWith('.md') || entry.name.startsWith('_'))
        continue;
      const relPath = '/' + path.relative(baseDir, fullPath).split(path.sep).join('/');
      results.push(relPath);
    }
  }
  return results.sort();
}

/** Sammelt alle ausgelieferten Build-Dateien unter dist/ inkl. Lazy-Chunks (Befund PR #67 Runde 19). */
function collectDistFiles(dir = path.join(ROOT, 'dist'), baseDir = path.join(ROOT, 'dist')) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let results = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectDistFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      const relPath = '/' + path.relative(baseDir, fullPath).split(path.sep).join('/');
      results.push(relPath);
    }
  }
  return results.sort();
}

/**
 * Verifiziert, dass der lokale Produkt- und Build-Code der Baseline (oder im Nachher-Modus dem Zielcommit)
 * entspricht UND dass der unter baseUrl bediente Produktionsbuild exakt aus diesem Stand stammt (Befund PR #67 Runde 8–11/20).
 */
async function verifyBuildArtifact(baseUrl, targetCommit = TARGET_COMMIT, isNachher = IS_NACHHER) {
  if (!isNachher) {
    const productDiff = execFileSync('git', ['diff', BASELINE_COMMIT, '--', ...PRODUCT_PATHS], {
      cwd: ROOT,
    })
      .toString()
      .trim();
    if (productDiff.length > 0) {
      throw new Error(
        `Produktcode oder Build-Konfiguration weicht von Baseline ${BASELINE_COMMIT} ab (${productDiff.split('\n').length} Diff-Zeilen). Baseline-Schreiben abgebrochen.`,
      );
    }
  } else if (process.env.TARGET_COMMIT) {
    const productDiff = execFileSync('git', ['diff', targetCommit, '--', ...PRODUCT_PATHS], {
      cwd: ROOT,
    })
      .toString()
      .trim();
    if (productDiff.length > 0) {
      throw new Error(
        `Produktcode oder Build-Konfiguration weicht vom Zielcommit ${targetCommit} ab (${productDiff.split('\n').length} Diff-Zeilen). Nachher-Schreiben abgebrochen.`,
      );
    }
  }

  // Befund 2 PR #67 Runde 11: Auch unversionierte/ungestagte Dateien unter Produktpfaden verbieten
  const uncommittedOrUntracked = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT })
    .toString()
    .trim();
  if (uncommittedOrUntracked.length > 0) {
    throw new Error(
      `Arbeitsbaum enthält unversionierte oder ungesicherte Änderungen im ganzen Arbeitsbaum (${uncommittedOrUntracked.split('\n').length} Einträge). ${isNachher ? 'Nachher' : 'Baseline'}-Schreiben abgebrochen.`,
    );
  }

  // Befund 1 PR #67 Runde 9: Quellstand frisch bauen, bevor dist/ und BASE_URL verglichen werden
  execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'pipe' });

  const distHtmlPath = path.join(ROOT, 'dist/index.html');
  if (!fs.existsSync(distHtmlPath)) {
    throw new Error('Lokaler Produktionsbuild (dist/index.html) fehlt auch nach frischem Build.');
  }
  const localDistHtml = fs.readFileSync(distHtmlPath, 'utf8');
  const localEntryMatch = localDistHtml.match(
    /<script type="module" crossorigin src="(\/assets\/[^"]+)"><\/script>/,
  );
  if (!localEntryMatch) {
    throw new Error('Einstiegsskript in dist/index.html konnte nicht ermittelt werden.');
  }
  const entryScriptPath = localEntryMatch[1];
  const localScriptFile = path.join(ROOT, 'dist', entryScriptPath);
  if (!fs.existsSync(localScriptFile)) {
    throw new Error(`Lokale Einstiegsdatei dist${entryScriptPath} existiert nicht.`);
  }
  const localScriptContent = fs.readFileSync(localScriptFile);
  const localScriptSha256 = sha256(localScriptContent);
  const localHtmlSha256 = sha256(Buffer.from(localDistHtml));

  const serverResponse = await fetch(`${baseUrl}/`).catch((err) => {
    throw new Error(`BASE_URL ${baseUrl} nicht erreichbar: ${err.message}`);
  });
  if (!serverResponse.ok) {
    throw new Error(`BASE_URL ${baseUrl} antwortet mit HTTP ${serverResponse.status}.`);
  }
  const servedHtml = await serverResponse.text();
  const servedHtmlSha256 = sha256(Buffer.from(servedHtml));
  if (servedHtmlSha256 !== localHtmlSha256) {
    throw new Error(
      `Das unter ${baseUrl} ausgelieferte HTML (SHA-256 ${servedHtmlSha256.slice(0, 16)}...) weicht vom lokalen Build (${localHtmlSha256.slice(0, 16)}...) ab.`,
    );
  }

  const servedEntryMatch = servedHtml.match(
    /<script type="module" crossorigin src="(\/assets\/[^"]+)"><\/script>/,
  );
  if (!servedEntryMatch) {
    throw new Error(`Unter ${baseUrl} wurde kein Vite-Einstiegsskript im HTML gefunden.`);
  }
  if (servedEntryMatch[1] !== entryScriptPath) {
    throw new Error(
      `Unter ${baseUrl} wird Einstiegsskript ${servedEntryMatch[1]} bedient, erwartet wird ${entryScriptPath} aus dem lokalen Build ${isNachher ? `des Zielcommits ${targetCommit}` : `der Baseline ${BASELINE_COMMIT}`}.`,
    );
  }

  const servedScriptRes = await fetch(`${baseUrl}${entryScriptPath}`);
  if (!servedScriptRes.ok) {
    throw new Error(
      `Einstiegsskript ${entryScriptPath} konnte von ${baseUrl} nicht geladen werden (HTTP ${servedScriptRes.status}).`,
    );
  }
  const servedScriptBuffer = Buffer.from(await servedScriptRes.arrayBuffer());
  const servedScriptSha256 = sha256(servedScriptBuffer);
  if (servedScriptSha256 !== localScriptSha256) {
    throw new Error(
      `Das unter ${baseUrl} ausgelieferte Bundle ${entryScriptPath} hat SHA-256 ${servedScriptSha256.slice(0, 16)}..., weicht aber vom verifizierten Build (${localScriptSha256.slice(0, 16)}...) ab.`,
    );
  }

  // Befund 2 PR #67 Runde 10: Alle referenzierten Stylesheets verifizieren
  const stylesheetMatches = [
    ...localDistHtml.matchAll(
      /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']|<link[^>]+href=["']([^"']+)["'][^>]*rel=["']stylesheet["']/g,
    ),
  ];
  const stylesheetPaths = stylesheetMatches.map((m) => m[1] || m[2]);
  if (stylesheetPaths.length === 0) {
    throw new Error('Keine Stylesheets in dist/index.html gefunden.');
  }
  for (const cssPath of stylesheetPaths) {
    const localCssFile = path.join(ROOT, 'dist', cssPath);
    if (!fs.existsSync(localCssFile)) {
      throw new Error(`Lokale Stylesheet-Datei dist${cssPath} existiert nicht.`);
    }
    const localCssSha256 = sha256(fs.readFileSync(localCssFile));
    const servedCssRes = await fetch(`${baseUrl}${cssPath}`);
    if (!servedCssRes.ok) {
      throw new Error(
        `Stylesheet ${cssPath} konnte von ${baseUrl} nicht geladen werden (HTTP ${servedCssRes.status}).`,
      );
    }
    const servedCssSha256 = sha256(Buffer.from(await servedCssRes.arrayBuffer()));
    if (servedCssSha256 !== localCssSha256) {
      throw new Error(
        `Das unter ${baseUrl} ausgelieferte Stylesheet ${cssPath} (SHA-256 ${servedCssSha256.slice(0, 16)}...) weicht vom lokalen Build (${localCssSha256.slice(0, 16)}...) ab.`,
      );
    }
  }

  // Befund 2 PR #67 Runde 10: Alle 32 öffentlichen WebP-Bilder aus imagePages.ts verifizieren
  const imagePagesContent = fs.readFileSync(
    path.join(ROOT, 'src/components/imagePage/imagePages.ts'),
    'utf8',
  );
  const imagePaths = [
    ...new Set([...imagePagesContent.matchAll(/src:\s*['"]([^'"]+)['"]/g)].map((m) => m[1])),
  ];
  if (imagePaths.length !== 32) {
    throw new Error(
      `Erwartet wurden 32 öffentliche WebP-Bilder in imagePages.ts, gefunden: ${imagePaths.length}.`,
    );
  }
  for (const imgPath of imagePaths) {
    const localImgFile = path.join(ROOT, 'dist', imgPath);
    if (!fs.existsSync(localImgFile)) {
      throw new Error(`Lokale Bilddatei dist${imgPath} existiert nicht.`);
    }
    const localImgSha256 = sha256(fs.readFileSync(localImgFile));
    const servedImgRes = await fetch(`${baseUrl}${imgPath}`);
    if (!servedImgRes.ok) {
      throw new Error(
        `Bild ${imgPath} konnte von ${baseUrl} nicht geladen werden (HTTP ${servedImgRes.status}).`,
      );
    }
    const servedImgSha256 = sha256(Buffer.from(await servedImgRes.arrayBuffer()));
    if (servedImgSha256 !== localImgSha256) {
      throw new Error(
        `Das unter ${baseUrl} ausgelieferte Bild ${imgPath} (SHA-256 ${servedImgSha256.slice(0, 16)}...) weicht vom lokalen Build (${localImgSha256.slice(0, 16)}...) ab.`,
      );
    }
  }

  // Befund 3 PR #67 Runde 11 / Befund 2 PR #67 Runde 12: Alle sichtbaren statischen Assets und Fonts verifizieren
  const expectedFonts = [
    '/fonts/inter-latin.woff2',
    '/fonts/jetbrains-mono-latin.woff2',
    '/fonts/space-grotesk-latin.woff2',
  ];
  const publicFiles = collectPublicFiles();
  for (const fontPath of expectedFonts) {
    if (!publicFiles.includes(fontPath)) {
      throw new Error(`Erwartete Schriftdatei ${fontPath} fehlt in public/.`);
    }
  }
  for (const filePath of publicFiles) {
    const localFile = path.join(ROOT, 'dist', filePath);
    if (!fs.existsSync(localFile)) {
      throw new Error(`Lokale Datei dist${filePath} existiert nicht.`);
    }
    const localSha = sha256(fs.readFileSync(localFile));
    const servedRes = await fetch(`${baseUrl}${filePath}`);
    if (!servedRes.ok) {
      throw new Error(
        `Datei ${filePath} konnte von ${baseUrl} nicht geladen werden (HTTP ${servedRes.status}).`,
      );
    }
    const servedSha = sha256(Buffer.from(await servedRes.arrayBuffer()));
    if (servedSha !== localSha) {
      throw new Error(
        `Die unter ${baseUrl} ausgelieferte Datei ${filePath} (SHA-256 ${servedSha.slice(0, 16)}...) weicht vom lokalen Build (${localSha.slice(0, 16)}...) ab.`,
      );
    }
  }

  // Befund PR #67 Runde 19: Alle Dateien des frisch erzeugten dist/ (inkl. aller Lazy-Chunks,
  // CSS, Web-Worker und Assets) mit den unter denselben Pfaden ausgelieferten Dateien abgleichen.
  const distFiles = collectDistFiles();
  if (distFiles.length === 0) {
    throw new Error('Keine Dateien in dist/ zum Verifizieren gefunden.');
  }
  for (const filePath of distFiles) {
    const localFile = path.join(ROOT, 'dist', filePath);
    const localSha = sha256(fs.readFileSync(localFile));
    const servedRes = await fetch(`${baseUrl}${filePath}`);
    if (!servedRes.ok) {
      throw new Error(
        `Datei ${filePath} konnte von ${baseUrl} nicht geladen werden (HTTP ${servedRes.status}).`,
      );
    }
    const servedSha = sha256(Buffer.from(await servedRes.arrayBuffer()));
    if (servedSha !== localSha) {
      throw new Error(
        `Die unter ${baseUrl} ausgelieferte Datei ${filePath} (SHA-256 ${servedSha.slice(0, 16)}...) weicht vom lokalen Build (${localSha.slice(0, 16)}...) ab.`,
      );
    }
  }

  return {
    entryScript: entryScriptPath,
    entrySha256: localScriptSha256,
    indexHtmlSha256: localHtmlSha256,
    stylesheets: stylesheetPaths,
    verifiedImagesCount: imagePaths.length,
    verifiedAssetsCount: publicFiles.length,
    verifiedFontsCount: expectedFonts.length,
    verifiedDistFilesCount: distFiles.length,
    verifiedServedUrl: baseUrl,
  };
}

/** Anmelden mit expliziter deutscher Browser-Locale und Zeitzone für konsistente Datumsformatierung (Codex PR #67 Runde 20). */
async function loginWithLocale(
  browser,
  baseUrl,
  credentials,
  locale = RECORDING_LOCALE,
  timezoneId = RECORDING_TIMEZONE,
) {
  const context = await browser.newContext({ baseURL: baseUrl, locale, timezoneId });
  const page = await context.newPage();
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('#login-email', credentials.email);
  await page.fill('#login-password', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  const state = await context.storageState();
  await context.close();
  return state;
}

/**
 * Standard-Dashboard-Konfiguration (17 Kacheln) aus der App-Logik der Baseline geladen.
 * Befund PR #67 Runde 22: Auch im Nachher-Modus immer den Stand aus BASELINE_COMMIT verwenden,
 * damit Änderungen an defaultDashboard.ts (Paket E) die Vergleichskonfiguration nicht verschieben.
 */
function defaultDashboardConfig(root) {
  const tmpDir = path.join(root, 'test-results/auftrag-081', `baseline-src-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    const archive = execFileSync('git', ['archive', BASELINE_COMMIT, 'src'], {
      cwd: root,
      maxBuffer: 256 * 1024 * 1024,
    });
    execFileSync('tar', ['-x', '-C', tmpDir], { input: archive });
    const out = execFileSync(
      'npx',
      [
        'tsx',
        '-e',
        "import { DEFAULT_DASHBOARD_CONFIG } from './src/features/dashboard/model/defaultDashboard.ts'; console.log(JSON.stringify(DEFAULT_DASHBOARD_CONFIG));",
      ],
      { cwd: tmpDir },
    );
    return JSON.parse(out.toString());
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/** Liest Projekt-ID und Ports aus supabase/config.toml (Codex PR #67 Runde 18/20). */
function getSupabaseConfig() {
  const configContent = fs.readFileSync(path.join(ROOT, 'supabase/config.toml'), 'utf8');
  const projectId = configContent.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
  if (!projectId) throw new Error('project_id in supabase/config.toml nicht gefunden.');
  const apiPortMatch = configContent.match(/^\[api\][^\[]*?port\s*=\s*(\d+)/ms);
  const apiPort = apiPortMatch ? Number(apiPortMatch[1]) : 54321;
  const dbPortMatch = configContent.match(/^\[db\][^\[]*?port\s*=\s*(\d+)/ms);
  const dbPort = dbPortMatch ? Number(dbPortMatch[1]) : 54322;
  return { projectId, apiPort, dbPort };
}

/** Validiert, dass SUPABASE.url exakt an den Docker-Container der konfigurierten Instanz gebunden ist (Codex PR #67 Runde 20). */
function validateSupabaseInstance(supabaseUrlStr) {
  const { projectId, apiPort, dbPort } = getSupabaseConfig();
  const parsed = new URL(supabaseUrlStr);
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(`Inventur nur gegen lokales Supabase, nicht gegen ${parsed.host}.`);
  }
  const urlPort = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;
  if (urlPort !== apiPort) {
    throw new Error(
      `SUPABASE.url Port (${urlPort}) weicht vom in supabase/config.toml konfigurierten API-Port (${apiPort}) ab. ` +
        `Katalogprüfung würde eine andere Instanz prüfen (Codex PR #67 Runde 20).`,
    );
  }

  const kongContainer = `supabase_kong_${projectId}`;
  const dbContainer = `supabase_db_${projectId}`;

  let kongPorts = '';
  try {
    kongPorts = execFileSync('docker', ['port', kongContainer], { cwd: ROOT }).toString().trim();
  } catch (err) {
    throw new Error(
      `Docker-Container ${kongContainer} für Projekt ${projectId} ist nicht erreichbar (${err.message}). ` +
        `Supabase-Instanz läuft möglicherweise nicht (npx supabase start).`,
    );
  }
  if (!kongPorts.includes(`:${apiPort}`)) {
    throw new Error(
      `Container ${kongContainer} ist nicht an Port ${apiPort} gebunden (${kongPorts}). ` +
        `SUPABASE.url zeigt nicht auf den konfigurierten Projekt-Container.`,
    );
  }

  let dbPorts = '';
  try {
    dbPorts = execFileSync('docker', ['port', dbContainer], { cwd: ROOT }).toString().trim();
  } catch (err) {
    throw new Error(
      `Docker-Container ${dbContainer} für Projekt ${projectId} ist nicht erreichbar (${err.message}).`,
    );
  }
  if (!dbPorts.includes(`:${dbPort}`)) {
    throw new Error(
      `Container ${dbContainer} ist nicht an DB-Port ${dbPort} gebunden (${dbPorts}).`,
    );
  }

  return { projectId, apiPort, dbPort, kongContainer, dbContainer };
}

const env = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} fehlt.`);
  return value;
};
const README_ONLY = process.env.README_ONLY === '1';
const BASE_URL = README_ONLY ? null : env('BASE_URL');
const CREDENTIALS = README_ONLY
  ? null
  : { email: env('E2E_AUTH_EMAIL'), password: env('E2E_AUTH_PASSWORD') };
const SUPABASE = {
  url: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
  anonKey:
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    // Codex PR #67 Runde 21: kein Schlüssel im Repo (CLAUDE.md §9), nur aus der Umgebung.
    (README_ONLY ? null : env('SUPABASE_ANON_KEY')),
};
// Befund PR #67 Runde 13 / Codex PR #67 Runde 20: Lokale Instanz und Containerzuordnung validieren
if (!README_ONLY) {
  validateSupabaseInstance(SUPABASE.url);
}
// Codex PR #67 Runde 17: Der frische Build (Vite-Variablen inkl. .env-Dateien) muss dieselbe
// Supabase-Instanz verwenden wie Seed-, Identitäts- und Präferenzprüfung des Harness.
if (!README_ONLY) {
  const viteEnv = loadEnv('production', ROOT, 'VITE_');
  if (
    viteEnv.VITE_SUPABASE_URL !== SUPABASE.url ||
    viteEnv.VITE_SUPABASE_ANON_KEY !== SUPABASE.anonKey
  ) {
    throw new Error(
      `Build und Harness zeigen auf unterschiedliche Supabase-Instanzen (VITE_SUPABASE_URL ${viteEnv.VITE_SUPABASE_URL ?? '–'} vs. ${SUPABASE.url}, Anon-Key ${viteEnv.VITE_SUPABASE_ANON_KEY === SUPABASE.anonKey ? 'gleich' : 'abweichend'}).`,
    );
  }
}
// Befund 4 PR #67 Runde 11: Kein fest codierter JWT-Schlüssel; CLEANUP_KEY strikt aus Umgebungsvariablen beziehen
const CLEANUP_KEY = process.env.E2E_CLEANUP_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
if (!README_ONLY && !CLEANUP_KEY) {
  throw new Error(
    'E2E_CLEANUP_KEY oder SUPABASE_SERVICE_ROLE_KEY muss gesetzt sein, um Testdaten und Präferenzen revisionsgetreu verifizieren und aufräumen zu können.',
  );
}

/** Erwartete normalisierte CRM-Seed-Daten für Organisation A aus supabase/seed.sql (Befund PR #67 Runde 11/12). */
const EXPECTED_CRM_SEED = {
  organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  companies: [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      name: 'Firma A1',
      domain: 'a1.test',
      industry: 'IT',
      city: 'Berlin',
      postal_code: '10115',
      employee_count: 50,
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      name: ' =1+1 Formel-Firma',
      domain: 'calc.test',
      industry: 'IT',
      city: 'Berlin',
      postal_code: '10115',
      employee_count: 10,
    },
    {
      id: 'c0000000-0000-0000-0000-000000000004',
      name: 'Firma A2',
      domain: 'a2.test',
      industry: 'Finanzen',
      city: 'München',
      postal_code: '80331',
      employee_count: 80,
    },
  ],
  contacts: [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      company_id: 'c0000000-0000-0000-0000-000000000001',
      email: 'anna.schmidt@a1.test',
      first_name: 'Anna',
      last_name: 'Schmidt',
      job_title: 'CEO',
    },
  ],
  deals: [
    {
      id: 'e0000000-0000-0000-0000-000000000001',
      deal_name: 'Enterprise Paket A1',
      stage: 'PROPOSAL',
      amount: 45000,
      close_date: '2026-11-30',
      pipeline: 'default',
    },
    {
      id: 'e0000000-0000-0000-0000-000000000003',
      deal_name: ' =2+2 Formel Deal',
      stage: 'LEAD',
      amount: 5000,
      close_date: '2026-12-31',
      pipeline: 'default',
    },
  ],
};

/**
 * Verifiziert die CRM-Seed-Daten für Organisation A vor den Aufnahmen feldweise und normalisiert (Befund PR #67 Runde 11/12).
 * Bricht fail-closed ab, wenn CRM-Daten in Werten, Typen, Beziehungen oder Anzahl abweichen.
 */
async function verifyCrmSeedData(supabase, cleanupKey, organizationId) {
  const headers = {
    apikey: cleanupKey,
    Authorization: `Bearer ${cleanupKey}`,
  };
  const compRes = await fetch(
    `${supabase.url}/rest/v1/companies?organization_id=eq.${organizationId}&select=id,name,domain,industry,city,postal_code,employee_count&order=id.asc`,
    { headers },
  );
  if (!compRes.ok) {
    throw new Error(`CRM-Seed-Prüfung companies fehlgeschlagen (HTTP ${compRes.status}).`);
  }
  const actualCompanies = await compRes.json();

  const contRes = await fetch(
    `${supabase.url}/rest/v1/contacts?organization_id=eq.${organizationId}&select=id,company_id,email,first_name,last_name,job_title&order=id.asc`,
    { headers },
  );
  if (!contRes.ok) {
    throw new Error(`CRM-Seed-Prüfung contacts fehlgeschlagen (HTTP ${contRes.status}).`);
  }
  const actualContacts = await contRes.json();

  const dealRes = await fetch(
    `${supabase.url}/rest/v1/imported_funnel_deals?organization_id=eq.${organizationId}&select=id,deal_name,stage,amount,close_date,pipeline&order=id.asc`,
    { headers },
  );
  if (!dealRes.ok) {
    throw new Error(`CRM-Seed-Prüfung deals fehlgeschlagen (HTTP ${dealRes.status}).`);
  }
  const actualDeals = await dealRes.json();

  const compareRows = (entityName, actual, expected) => {
    if (actual.length !== expected.length) {
      throw new Error(
        `CRM-Seed-Prüfung: Erwartet ${expected.length} ${entityName} für Organisation ${organizationId}, gefunden: ${actual.length}.`,
      );
    }
    for (let i = 0; i < expected.length; i++) {
      const exp = expected[i];
      const act = actual[i];
      for (const [key, val] of Object.entries(exp)) {
        if (act[key] !== val) {
          throw new Error(
            `CRM-Seed-Abweichung bei ${entityName}[${i}] (ID ${exp.id}): Feld "${key}" ist ${JSON.stringify(act[key])}, erwartet: ${JSON.stringify(val)}.`,
          );
        }
      }
    }
  };

  compareRows('companies', actualCompanies, EXPECTED_CRM_SEED.companies);
  compareRows('contacts', actualContacts, EXPECTED_CRM_SEED.contacts);
  compareRows('deals', actualDeals, EXPECTED_CRM_SEED.deals);

  return {
    organizationId,
    companiesCount: actualCompanies.length,
    contactsCount: actualContacts.length,
    dealsCount: actualDeals.length,
    companyIds: actualCompanies.map((c) => c.id),
    contactIds: actualContacts.map((c) => c.id),
    dealIds: actualDeals.map((d) => d.id),
    verifiedAt: new Date().toISOString(),
  };
}

/**
 * Befund PR #67 Runde 15: WorkspaceHydrator und die Live-Simulation lesen diese Tabellen. supabase/seed.sql
 * legt für Organisation A keine Simulationsdaten an; jede vorhandene Zeile würde Inhalt und Höhe von
 * s-live-simulation vom lokalen Vorzustand abhängig machen. Erwartet: alle Tabellen leer.
 */
const SIMULATION_TABLES = [
  'simulation_scenarios',
  'simulation_scenario_versions',
  'simulation_runs',
  'simulation_timeseries',
  'simulation_events',
  'simulation_snapshots',
  'simulation_run_pauses',
];

const EXPECTED_SCHEMA_STATE = {
  policiesSha256: '4293dbf2a9eb6063c2e2e5bbb94a2a023bd637a157d695703abed2e6daf46250',
  saveDashboardPreferencesSha256:
    'e0cf51ebfedfef564a353638b7f8567f5c536803da9236a6d74399a3570a77f7',
  rlsStatusSha256: '6c7cc3fee4aa1d6c575e0b3cde58dba4f32702e7c2c74ccb7f25cbe03e8cc0f6',
};

/**
 * Prüft den Schemastand der lokalen Supabase-Instanz gegen die Baseline (Codex PR #67 Runde 18/19/20):
 * Bindet die Katalogabfrage an die Instanz hinter SUPABASE.url und validiert Port und Containerzuordnung.
 * Jede angewandte Migration muss inhaltlich der versionierten Datei entsprechen (Basisschema =
 * `supabase/schema.sql`, wie in CI kopiert), und jede Datei muss angewandt sein. Zusätzlich wird der
 * aktive Katalog (RLS-Policies, save_dashboard_preferences und RLS-Aktivierungsstatus aller public-Tabellen)
 * gegen die kanonische Baseline-Erwartung geprüft (Befund PR #67 Runde 19/20).
 * `supabase/` selbst ist Teil von `PRODUCT_PATHS` und damit gegen die Baseline bzw. den Zielcommit geprüft.
 */
async function verifySchemaState(supabase = SUPABASE, cleanupKey = CLEANUP_KEY) {
  const { projectId, apiPort, dbPort, dbContainer } = validateSupabaseInstance(supabase.url);
  const psql = (sql) =>
    execFileSync('docker', ['exec', dbContainer, 'psql', '-U', 'postgres', '-At', '-c', sql])
      .toString()
      .trim();

  // Binde die Katalogabfrage an die Instanz hinter SUPABASE.url (Codex PR #67 Runde 20):
  // Verifiziere per REST-Endpunkt, dass die über SUPABASE.url erreichbare Datenbank exakt dem
  // befragten Docker-Container dbContainer entspricht.
  if (cleanupKey) {
    const restRes = await fetch(
      `${supabase.url}/rest/v1/organization_members?select=organization_id&limit=1`,
      {
        headers: {
          apikey: cleanupKey,
          Authorization: `Bearer ${cleanupKey}`,
          Prefer: 'count=exact',
        },
      },
    );
    if (!restRes.ok) {
      throw new Error(
        `Katalogabfrage über REST-Instanz ${supabase.url} fehlgeschlagen (HTTP ${restRes.status}).`,
      );
    }
    const restCount = Number(restRes.headers.get('content-range')?.split('/')[1]);
    const psqlCount = Number(psql('select count(*) from organization_members'));
    if (restCount !== psqlCount) {
      throw new Error(
        `Datenbank hinter ${supabase.url} (REST-Zeilen: ${restCount}) weicht von Container ${dbContainer} (psql-Zeilen: ${psqlCount}) ab.`,
      );
    }
  }

  const applied = JSON.parse(
    psql(
      "select coalesce(json_agg(json_build_object('version', version, 'name', name, 'sql', array_to_string(statements, '')) order by version), '[]') from supabase_migrations.schema_migrations",
    ),
  );
  const normalize = (sql) => sql.replace(/--[^\n]*/g, '').replace(/[\s;]/g, '');
  const migrationDir = path.join(ROOT, 'supabase/migrations');
  const expected = new Map(
    fs
      .readdirSync(migrationDir)
      .filter((f) => f.endsWith('.sql') && !f.startsWith('20260101000000_'))
      .map((f) => [f.split('_')[0], path.join(migrationDir, f)]),
  );
  expected.set('20260101000000', path.join(ROOT, 'supabase/schema.sql'));
  const mismatches = [];
  for (const row of applied) {
    const file = expected.get(row.version);
    if (!file) mismatches.push(`${row.version} angewandt, aber ohne Datei`);
    else if (normalize(fs.readFileSync(file, 'utf8')) !== normalize(row.sql))
      mismatches.push(`${row.version} weicht inhaltlich von ${path.relative(ROOT, file)} ab`);
  }
  for (const version of expected.keys()) {
    if (!applied.some((row) => row.version === version))
      mismatches.push(`${version} nicht angewandt`);
  }
  if (mismatches.length > 0) {
    throw new Error(`Supabase-Schemastand weicht von der Baseline ab: ${mismatches.join('; ')}.`);
  }
  const policies = psql(
    "select coalesce(string_agg(concat_ws('|', schemaname, tablename, policyname, permissive, roles::text, cmd, qual, with_check), E'\\n' order by schemaname, tablename, policyname), '') from pg_policies where schemaname = 'public'",
  );
  const rpc = psql(
    "select pg_get_functiondef('public.save_dashboard_preferences(jsonb, integer)'::regprocedure)",
  );
  const rls = psql(
    "select coalesce(string_agg(concat_ws('|', schemaname, tablename, rowsecurity), E'\\n' order by schemaname, tablename), '') from pg_tables where schemaname = 'public'",
  );

  const policiesSha = sha256(Buffer.from(policies));
  const rpcSha = sha256(Buffer.from(rpc));
  const rlsSha = sha256(Buffer.from(rls));

  if (policiesSha !== EXPECTED_SCHEMA_STATE.policiesSha256) {
    throw new Error(
      `RLS-Policies weichen von der Baseline ab (erwartet: ${EXPECTED_SCHEMA_STATE.policiesSha256}, aktuell: ${policiesSha}).`,
    );
  }
  if (rpcSha !== EXPECTED_SCHEMA_STATE.saveDashboardPreferencesSha256) {
    throw new Error(
      `Funktion save_dashboard_preferences weicht von der Baseline ab (erwartet: ${EXPECTED_SCHEMA_STATE.saveDashboardPreferencesSha256}, aktuell: ${rpcSha}).`,
    );
  }
  if (rlsSha !== EXPECTED_SCHEMA_STATE.rlsStatusSha256) {
    throw new Error(
      `RLS-Aktivierungsstatus weicht von der Baseline ab (erwartet: ${EXPECTED_SCHEMA_STATE.rlsStatusSha256}, aktuell: ${rlsSha}).`,
    );
  }
  const disabledRls = rls
    .split('\n')
    .filter((line) => line.endsWith('|f'))
    .map((line) => line.split('|')[1]);
  if (disabledRls.length > 0) {
    throw new Error(
      `RLS ist auf folgenden Tabellen deaktiviert: ${disabledRls.join(', ')}. Baseline-Lauf abgebrochen.`,
    );
  }

  return {
    projectId,
    apiPort,
    dbPort,
    container: dbContainer,
    migrationsApplied: applied.length,
    lastMigration: applied.at(-1)?.version ?? null,
    policiesSha256: policiesSha,
    saveDashboardPreferencesSha256: rpcSha,
    rlsStatusSha256: rlsSha,
  };
}

async function verifySimulationWorkspace(supabase, cleanupKey, organizationId) {
  const counts = {};
  for (const table of SIMULATION_TABLES) {
    const response = await fetch(
      `${supabase.url}/rest/v1/${table}?organization_id=eq.${encodeURIComponent(organizationId)}&select=organization_id&limit=1`,
      {
        headers: {
          apikey: cleanupKey,
          Authorization: `Bearer ${cleanupKey}`,
          Prefer: 'count=exact',
        },
      },
    );
    if (!response.ok) {
      throw new Error(
        `Simulations-Workspace-Prüfung ${table} fehlgeschlagen (HTTP ${response.status}).`,
      );
    }
    const total = Number(response.headers.get('content-range')?.split('/')[1]);
    if (!Number.isInteger(total)) {
      throw new Error(`Simulations-Workspace-Prüfung ${table}: keine Zeilenzahl erhalten.`);
    }
    counts[table] = total;
  }
  const nonEmpty = Object.entries(counts).filter(([, n]) => n > 0);
  if (nonEmpty.length > 0) {
    throw new Error(
      `Simulations-Workspace von Organisation ${organizationId} ist nicht leer (${nonEmpty.map(([t, n]) => `${t}: ${n}`).join(', ')}). Lokales Supabase zurücksetzen (npx supabase db reset).`,
    );
  }
  return { organizationId, counts, verifiedAt: new Date().toISOString() };
}

/**
 * Kontrollierte CRM-Daten für Organisation A (admin-a) gemäß supabase/seed.sql (Befund PR #67 Runde 9).
 * Dient der Edge-Function-Interception in openRoute, damit reguläre CRM-Aufnahmen (s-leads, s-companies,
 * s-deals) im Erfolgszustand (Tabelle/Karten, Kennzahlen, Paginierung) statt im SERVER_ERROR-Zustand
 * aufgenommen werden.
 */
const CONTROLLED_CRM_DATA = {
  companies: [
    {
      id: 'c0000000-0000-0000-0000-000000000001',
      name: 'Firma A1',
      domain: 'a1.test',
      industry: 'IT',
      city: 'Berlin',
      postalCode: '10115',
      employeeCount: 50,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'c0000000-0000-0000-0000-000000000003',
      name: ' =1+1 Formel-Firma',
      domain: 'calc.test',
      industry: 'IT',
      city: 'Berlin',
      postalCode: '10115',
      employeeCount: 10,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'c0000000-0000-0000-0000-000000000004',
      name: 'Firma A2',
      domain: 'a2.test',
      industry: 'Finanzen',
      city: 'München',
      postalCode: '80331',
      employeeCount: 80,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  contacts: [
    {
      id: 'd0000000-0000-0000-0000-000000000001',
      companyId: 'c0000000-0000-0000-0000-000000000001',
      email: 'anna.schmidt@a1.test',
      firstName: 'Anna',
      lastName: 'Schmidt',
      jobTitle: 'CEO',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  deals: [
    {
      id: 'e0000000-0000-0000-0000-000000000001',
      dealName: 'Enterprise Paket A1',
      stage: 'PROPOSAL',
      amount: 45000,
      closeDate: '2026-11-30',
      pipeline: 'default',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'e0000000-0000-0000-0000-000000000003',
      dealName: ' =2+2 Formel Deal',
      stage: 'LEAD',
      amount: 5000,
      closeDate: '2026-12-31',
      pipeline: 'default',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};
const DEFAULT_JSON_OUT = path.join(ROOT, 'docs/reviews/2026-10-06-frontend-inventar.json');
const DEFAULT_NACHHER_JSON_OUT = path.join(
  ROOT,
  'docs/reviews/2026-10-06-frontend-inventar-nachher.json',
);
const JSON_OUT = process.env.JSON_OUT
  ? path.resolve(ROOT, process.env.JSON_OUT)
  : IS_NACHHER
    ? DEFAULT_NACHHER_JSON_OUT
    : DEFAULT_JSON_OUT;

const DEFAULT_OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-081');
const DEFAULT_NACHHER_OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-081-nachher');
const OUT_DIR = process.env.OUT_DIR
  ? path.resolve(ROOT, process.env.OUT_DIR)
  : IS_NACHHER
    ? DEFAULT_NACHHER_OUT_DIR
    : DEFAULT_OUT_DIR;

const ONLY =
  process.env.ONLY !== undefined
    ? new Set(
        process.env.ONLY.split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      )
    : null;
const WIDTHS = [
  { width: 1440, height: 1000 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
];
const NARROW = { width: 320, height: 640 };
/**
 * Feste Browserzeit für alle Aufnahmen: TanStack Query setzt `dataUpdatedAt` aus `Date.now()`, und
 * `DataSourceStatus` rendert diesen Wert sekundengenau als „Stand“. Ohne feste Uhr ändern sich die
 * Bild-Hashes bei jedem identischen Wiederholungslauf (Codex PR #67 Runde 16). Timer laufen normal weiter.
 */
const FIXED_BROWSER_TIME = '2026-10-07T12:00:00.000Z';
const THEMES = ['dark', 'light'];
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

/** Interaktive Ansichten; Bildseiten werden aus src/app/routes.tsx ergänzt. */
const INTERACTIVE = [
  { id: 'dashboard', route: '/dashboard', narrow: true },
  { id: 'dashboard-edit', route: '/dashboard', edit: true },
  { id: 'dashboard-detail', route: '/dashboard', detail: true },
  // Befund PR #67 Runde 14: Datenbasis und Aktivitäten stehen auf dem Baseline-Stand im Fehlerzustand,
  // weil crmReadModelService.ts die aktive synthetische Quelle für Organisation A ablehnt. Der Zustand
  // wird ausdrücklich geprüft; ändert er sich, schlägt die Aufnahme fehl statt still zu bestehen.
  {
    id: 's-daten',
    route: '/company/data-basis',
    expectedState: { name: 'fehler', marker: 'DATA_SOURCE_UNAVAILABLE' },
  },
  { id: 's-standort', route: '/company/location' },
  { id: 's-live-simulation', route: '/crm/live-simulation' },
  { id: 's-leads', route: '/crm/leads' },
  { id: 's-companies', route: '/crm/companies' },
  { id: 's-deals', route: '/crm/deals' },
  {
    id: 's-activities',
    route: '/crm/activities',
    expectedState: { name: 'fehler', marker: 'SYNTHETIC_NOT_ALLOWED' },
  },
];

/**
 * Codex PR #67 Runde 21: Die 32 Vergleichsrouten stammen stabil aus dem Baseline-Commit, damit der
 * Nachher-Lauf nach Paket G (Bildseiten durch echte Inhalte ersetzt) dieselben Ansichten aufnimmt.
 * `imageKey` (und damit die Bildmaßprüfung) bleibt nur gesetzt, solange die Seite noch ein ImagePage ist.
 */
const readAtBaseline = (file) =>
  execFileSync('git', ['show', `${BASELINE_COMMIT}:${file}`], { cwd: ROOT }).toString();
const readCurrent = (file) =>
  fs.existsSync(path.join(ROOT, file)) ? fs.readFileSync(path.join(ROOT, file), 'utf8') : '';
const IMAGE_PAGE_PATTERN = /<ImagePage page="([^"]+)"/;

function imagePageRoutes() {
  const routes = readAtBaseline('src/app/routes.tsx').replace(/\s+/g, ' ');
  const pages = readAtBaseline('src/app/routePages.tsx').replace(/\s+/g, ' ');
  const currentRoutes = readCurrent('src/app/routes.tsx').replace(/\s+/g, ' ');
  const files = Object.fromEntries(
    [...pages.matchAll(/const (\w+) = React\.lazy\(\(\) => import\('@\/([^']+)'\)/g)].map((m) => [
      m[1],
      `src/${m[2]}.tsx`,
    ]),
  );
  const paths = Object.fromEntries(
    [...routes.matchAll(/id: '([^']+)', path: '([^']+)'/g)].map((m) => [m[1], m[2]]),
  );
  const currentPaths = Object.fromEntries(
    [...currentRoutes.matchAll(/id: '([^']+)', path: '([^']+)'/g)].map((m) => [m[1], m[2]]),
  );
  const result = [];
  for (const [, id, component] of pages.matchAll(/\{ id: '([^']+)', component: (\w+) \}/g)) {
    const file = files[component];
    if (!file) continue;
    let baselineSource;
    try {
      baselineSource = readAtBaseline(file);
    } catch {
      continue;
    }
    const baselineMatch = baselineSource.match(IMAGE_PAGE_PATTERN);
    if (!baselineMatch) continue;
    const currentKey = readCurrent(file).match(IMAGE_PAGE_PATTERN);
    result.push({
      id,
      route: currentPaths[id] ?? paths[id],
      imageKey: currentKey ? currentKey[1] : null,
      // Befund PR #67 Runde 23: stabiler Seitenschlüssel aus der Baseline, auch nach HTML-Migration.
      pageKey: baselineMatch[1],
      narrow: id === 's-funnel',
    });
  }
  return result;
}

const CRM_RESOURCE_CONFIG = {
  companies: {
    defaultSort: 'name',
    defaultOrder: 'asc',
    searchFields: ['name', 'domain', 'city'],
    fieldMap: {
      name: 'name',
      domain: 'domain',
      industry: 'industry',
      city: 'city',
      postal_code: 'postalCode',
      postalCode: 'postalCode',
      employee_count: 'employeeCount',
      employeeCount: 'employeeCount',
      created_at: 'createdAt',
      createdAt: 'createdAt',
      id: 'id',
    },
  },
  contacts: {
    defaultSort: 'lastName',
    defaultOrder: 'asc',
    searchFields: ['firstName', 'lastName', 'email', 'jobTitle'],
    fieldMap: {
      first_name: 'firstName',
      firstName: 'firstName',
      last_name: 'lastName',
      lastName: 'lastName',
      email: 'email',
      job_title: 'jobTitle',
      jobTitle: 'jobTitle',
      company_id: 'companyId',
      companyId: 'companyId',
      created_at: 'createdAt',
      createdAt: 'createdAt',
      id: 'id',
    },
  },
  deals: {
    defaultSort: 'closeDate',
    defaultOrder: 'desc',
    searchFields: ['dealName', 'stage', 'pipeline'],
    fieldMap: {
      deal_name: 'dealName',
      dealName: 'dealName',
      stage: 'stage',
      amount: 'amount',
      close_date: 'closeDate',
      closeDate: 'closeDate',
      pipeline: 'pipeline',
      created_at: 'createdAt',
      createdAt: 'createdAt',
      id: 'id',
    },
  },
};

/**
 * Filtert, durchsucht, sortiert und paginiert kontrollierte CRM-Daten wie die kanonische Edge Function
 * supabase/functions/crm-query-export/index.ts (Befund PR #67 Runde 10).
 */
function processControlledCrmQuery(resource, params = {}) {
  const cfg = CRM_RESOURCE_CONFIG[resource] || {
    defaultSort: 'id',
    defaultOrder: 'asc',
    searchFields: [],
    fieldMap: {},
  };
  let items = [...(CONTROLLED_CRM_DATA[resource] || [])];

  // 1. Suche q
  const q = typeof params.q === 'string' ? params.q.trim().toLowerCase() : '';
  if (q) {
    items = items.filter((item) =>
      cfg.searchFields.some((field) => {
        const val = item[field];
        return val != null && String(val).toLowerCase().includes(q);
      }),
    );
  }

  // 2. Filter
  if (params.filters && typeof params.filters === 'object') {
    for (const [k, v] of Object.entries(params.filters)) {
      if (typeof v !== 'string' || !v || v === 'ALL') continue;
      const mappedKey = cfg.fieldMap[k] || k;
      items = items.filter((item) => String(item[mappedKey] ?? '') === v);
    }
  }

  // 3. Sortierung (sortBy, sortOrder, Tie-Breaker id asc)
  const rawSortBy = params.sortBy;
  const mappedSortBy = (rawSortBy && cfg.fieldMap[rawSortBy]) || cfg.defaultSort;
  const rawSortOrder = String(params.sortOrder || cfg.defaultOrder).toLowerCase();
  const sortOrder = rawSortOrder === 'desc' ? 'desc' : 'asc';

  items.sort((a, b) => {
    const valA = a[mappedSortBy];
    const valB = b[mappedSortBy];
    let cmp = 0;
    if (typeof valA === 'number' && typeof valB === 'number') {
      cmp = valA - valB;
    } else {
      cmp = String(valA ?? '').localeCompare(String(valB ?? ''));
    }
    if (cmp !== 0) {
      return sortOrder === 'desc' ? -cmp : cmp;
    }
    return String(a.id ?? '').localeCompare(String(b.id ?? ''));
  });

  // 4. Paginierung
  const total = items.length;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 20;
  const from = (page - 1) * pageSize;
  const paginatedItems = items.slice(from, from + pageSize);

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    resource,
  };
}

async function openRoute(browser, state, viewport, theme, target) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: state,
    viewport,
    reducedMotion: 'reduce',
    locale: RECORDING_LOCALE,
    timezoneId: RECORDING_TIMEZONE,
  });
  try {
    await context.clock.setFixedTime(FIXED_BROWSER_TIME);
    // Interception für crm-query-export: Bedient reguläre CRM-Aufnahmen kontrolliert im Erfolgszustand (Befund PR #67 Runde 9/10)
    await context.route('**/functions/v1/crm-query-export**', async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
            'Access-Control-Max-Age': '86400',
          },
        });
        return;
      }
      let params = {};
      if (request.method() === 'POST') {
        try {
          params = JSON.parse(request.postData() ?? '{}');
        } catch {
          params = {};
        }
      } else if (request.method() === 'GET') {
        const url = new URL(request.url());
        params.resource = url.searchParams.get('resource') || undefined;
        params.q = url.searchParams.get('q') || undefined;
        params.sortBy = url.searchParams.get('sortBy') || undefined;
        params.sortOrder = url.searchParams.get('sortOrder') || undefined;
        params.page = url.searchParams.get('page')
          ? Number(url.searchParams.get('page'))
          : undefined;
        params.pageSize = url.searchParams.get('pageSize')
          ? Number(url.searchParams.get('pageSize'))
          : undefined;
        const filters = {};
        for (const [k, v] of url.searchParams.entries()) {
          if (k.startsWith('filter_')) filters[k.replace('filter_', '')] = v;
        }
        if (Object.keys(filters).length > 0) params.filters = filters;
      } else {
        await route.continue();
        return;
      }

      const resource = params.resource ?? 'companies';
      const result = processControlledCrmQuery(resource, params);

      await route.fulfill({
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result),
      });
    });

    await context.addInitScript((mode) => {
      try {
        window.localStorage.setItem('leadpilot-theme', mode);
      } catch {
        /* Storage nicht verfügbar */
      }
    }, theme);
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on(
      'console',
      (msg) => msg.type() === 'error' && consoleErrors.push(msg.text().slice(0, 160)),
    );
    page.on('pageerror', (err) => pageErrors.push(String(err?.message ?? err).slice(0, 160)));
    await page.goto(target.route, { waitUntil: 'networkidle' });
    await page.locator('main').first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(600);
    await scrollThrough(page, viewport);
    if (target.edit) {
      await page
        .getByRole('button', { name: /bearbeiten/i })
        .first()
        .click();
      await page.getByTestId('editor-toolbar').waitFor({ timeout: 10000 });
    }
    if (target.detail) {
      await page
        .getByRole('button', { name: /^details zu/i })
        .first()
        .click();
      await page.getByTestId('tile-detail-page').waitFor({ timeout: 10000 });
      await page.waitForLoadState('networkidle');
    }

    // 1. URL-Validierung (Befund PR #67 Runde 8): Pfad muss exakt übereinstimmen
    const expectedPath = target.detail ? '/dashboard/tiles/std_baseline_arr' : target.route;
    const currentPath = new URL(page.url()).pathname;
    if (currentPath === '/login') {
      throw new Error(
        `Sitzung abgelaufen: Weiterleitung nach /login auf Ziel ${target.id} (${target.route}).`,
      );
    }
    if (currentPath === '/not-found') {
      throw new Error(
        `Route nicht gefunden: Weiterleitung nach /not-found auf Ziel ${target.id} (${target.route}).`,
      );
    }
    if (currentPath !== expectedPath) {
      throw new Error(
        `Unerwarteter Pfad auf Ziel ${target.id}: erwartet ${expectedPath}, erhalten ${currentPath}.`,
      );
    }

    // 2. Abwesenheit von Fehlern (RouteErrorBoundary)
    const hasRouteError = await page.evaluate(() => {
      const errorHeading = document.querySelector('main h2');
      return (
        document.querySelector('[data-testid="not-found-home-link"]') !== null ||
        (errorHeading?.textContent?.includes('Fehler beim Laden der Seite') ?? false)
      );
    });
    if (hasRouteError) {
      throw new Error(
        `RouteErrorBoundary oder 404 gerendert auf Ziel ${target.id} (${expectedPath}).`,
      );
    }

    // 3. Zielspezifischer Seiteninhalt & Bildnachweis
    if (target.imageKey) {
      await page.locator('[data-testid="image-page"]').waitFor({ timeout: 10000 });
      const imageLoaded = await page
        .waitForFunction(
          () => {
            const img = document.querySelector('img.image-page__img');
            return img && img.complete && img.naturalWidth > 0;
          },
          { timeout: 15000 },
        )
        .catch(() => false);
      if (!imageLoaded) {
        throw new Error(
          `Bild nicht vollständig geladen auf Bildseite ${target.id} (${target.imageKey}).`,
        );
      }
    } else if (target.pageKey) {
      // Befund PR #67 Runde 23: Auf HTML migrierte Bildseite (Paket G) muss den stabilen
      // Seitenmarker `data-page-key="<Baseline-Schlüssel>"` mit Inhalt rendern, sonst Abbruch.
      const marker = page.locator(`main [data-page-key="${target.pageKey}"]`).first();
      const found = await marker.waitFor({ timeout: 10000 }).then(
        () => true,
        () => false,
      );
      const text = found ? ((await marker.innerText().catch(() => '')) ?? '').trim() : '';
      if (!found || text.length === 0) {
        throw new Error(
          `Unbekannter Seitentyp auf ${target.id}: weder ImagePage noch Seitenmarker data-page-key="${target.pageKey}" mit Inhalt.`,
        );
      }
    } else if (target.id === 'dashboard' || target.id === 'dashboard-edit') {
      await page
        .locator('[data-testid="dashboard-heading"], [data-testid="dashboard-workspace"]')
        .first()
        .waitFor({ timeout: 10000 });
    } else if (target.id === 's-daten') {
      await page.locator('[data-testid="data-basis-page"]').waitFor({ timeout: 10000 });
    } else if (target.id === 's-standort') {
      await page.locator('[data-testid="location-headquarters"]').waitFor({ timeout: 10000 });
    } else if (target.id === 's-live-simulation') {
      await page
        .locator('main button[role="tab"]:has-text("Management-Ebene")')
        .waitFor({ timeout: 10000 });
    } else if (target.id === 's-leads') {
      await page.locator('main h2:has-text("Leads")').waitFor({ timeout: 10000 });
      await page
        .locator('main table, main .crm-v2-mobile-card')
        .first()
        .waitFor({ timeout: 10000 });
    } else if (target.id === 's-companies') {
      await page.locator('main h2:has-text("Unternehmen")').waitFor({ timeout: 10000 });
      await page
        .locator('main table, main .crm-v2-mobile-card')
        .first()
        .waitFor({ timeout: 10000 });
    } else if (target.id === 's-deals') {
      await page.locator('main h2:has-text("Deal Pipeline")').waitFor({ timeout: 10000 });
      await page
        .locator('main table, main .crm-v2-mobile-card')
        .first()
        .waitFor({ timeout: 10000 });
    } else if (target.id === 's-activities') {
      await page.locator('main h2:has-text("Aktivitäten")').waitFor({ timeout: 10000 });
    }

    // Codex PR #67 Runde 21: Die Baseline-Fehlercodes gelten nur im Baseline-Modus. Im Nachher-Modus
    // (Pakete A/H) darf kein Entwicklercode mehr sichtbar sein; Nutzdaten- oder Fehlerzustand wird erfasst.
    if (target.expectedState && IS_NACHHER) {
      const mainText = await page.locator('main').first().innerText();
      if (mainText.includes(target.expectedState.marker)) {
        throw new Error(
          `Entwicklercode ${target.expectedState.marker} im Nachher-Stand auf ${target.id} weiterhin sichtbar.`,
        );
      }
      const hasAlert = (await page.locator('main [role="alert"]').count()) > 0;
      target.observedState = hasAlert ? 'fehler (ohne Entwicklercode)' : 'nutzdaten';
    } else if (target.expectedState) {
      const mainText = await page.locator('main').first().innerText();
      if (!mainText.includes(target.expectedState.marker)) {
        throw new Error(
          `Erwarteter Datenzustand „${target.expectedState.name}“ (${target.expectedState.marker}) auf ${target.id} nicht gefunden; Baseline neu bewerten.`,
        );
      }
    }

    if (['s-leads', 's-companies', 's-deals'].includes(target.id)) {
      const errorState = await page
        .locator('[data-testid="management-chart-error"]')
        .first()
        .isVisible()
        .catch(() => false);
      if (errorState) {
        throw new Error(
          `Fehlerzustand (management-chart-error) auf CRM-Seite ${target.id} gerendert.`,
        );
      }
    }

    await page.waitForTimeout(400);
    return { context, page, consoleErrors, pageErrors };
  } catch (err) {
    await context.close().catch(() => null);
    throw err;
  }
}

/** Messwerte, die nicht vom Bild abhängen. */
async function measure(page, viewport) {
  return page.evaluate((vp) => {
    const main = document.querySelector('main');
    const doc = document.documentElement;
    const inFirstScreen = (el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= vp.height && r.width > 0;
    };
    const tiles = Array.from(document.querySelectorAll('[data-testid="dashboard-tile"]'));
    const numbers = Array.from(document.querySelectorAll('[data-testid="tile-number"]'));
    const img = document.querySelector('.image-page__img');
    const hint = document.querySelector('[data-testid="image-page-hint"]');
    return {
      url: location.pathname,
      // Tatsächliche Browserumgebung je Aufnahme statt nur der angeforderten Optionen (Codex PR #67 Runde 16)
      viewport: {
        requestedWidth: vp.width,
        requestedHeight: vp.height,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        visualViewportScale: window.visualViewport?.scale ?? null,
      },
      timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
      h1: document.querySelector('main h1')?.textContent?.trim() ?? null,
      mainScrollHeight: main?.scrollHeight ?? null,
      overflowDocument: Math.max(0, doc.scrollWidth - doc.clientWidth),
      overflowMain: main ? Math.max(0, main.scrollWidth - main.clientWidth) : null,
      tiles: tiles.length,
      tileHeights: tiles.map((t) => Math.round(t.getBoundingClientRect().height)),
      numbersInFirstScreen: numbers.filter(inFirstScreen).length,
      firstNumberTop: numbers.length ? Math.round(numbers[0].getBoundingClientRect().top) : null,
      image: img
        ? {
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            renderedWidth: Math.round(img.getBoundingClientRect().width),
            scale: img.naturalWidth
              ? Math.round((img.getBoundingClientRect().width / img.naturalWidth) * 1000) / 1000
              : null,
            hintVisible: hint ? getComputedStyle(hint).display !== 'none' : false,
          }
        : null,
    };
  }, viewport);
}

/**
 * Erster Tab-Druck ab Dokumentanfang: wohin geht der Fokus, ist er sichtbar, hat er einen Rahmen?
 * `blur()` allein setzt den Startpunkt der Tab-Reihenfolge nicht zurück (Editor und Details wurden
 * per Klick geöffnet, Codex PR #67). Deshalb wird ein Hilfselement an den Anfang von <body> gesetzt,
 * fokussiert und nach dem Tab wieder entfernt.
 */
async function firstFocus(page) {
  await page.evaluate(() => {
    const anchor = document.createElement('span');
    anchor.tabIndex = -1;
    anchor.id = 'auftrag-081-focus-start';
    document.body.prepend(anchor);
    anchor.focus();
  });
  await page.keyboard.press('Tab');
  await page.evaluate(() => document.getElementById('auftrag-081-focus-start')?.remove());
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { target: null };
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      target: `${el.tagName.toLowerCase()} ${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40)}`,
      visible: r.width > 0 && r.height > 0 && r.top >= 0 && r.top < window.innerHeight,
      outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0,
      ring: s.boxShadow !== 'none',
    };
  });
}

/** axe serious/critical auf der ganzen Seite, einschließlich Kopfzeile, Sidebar und Kontoaktionen. */
async function axeSeverePage(page) {
  const axe = await new AxeBuilder({ page }).analyze();
  return axe.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => v.id);
}

async function capture(page, viewport, name, targetDir = OUT_DIR) {
  const first = await page.screenshot();
  fs.writeFileSync(path.join(targetDir, `${name}-first.png`), first);
  // Auftrag 079-Muster: Höhen- und Overflow-Begrenzung für fullPage temporär aufheben,
  // damit der gesamte scrollende Hauptinhalt ohne Viewport-Verzerrung aufgenommen wird (Codex PR #67).
  const style = await page.addStyleTag({
    content:
      'html,body,#root,#root>*{height:auto!important;overflow:visible!important}' +
      'main{height:auto!important;overflow:visible!important}',
  });
  const full = await page.screenshot({ fullPage: true });
  await style.evaluate((node) => node.remove());
  fs.writeFileSync(path.join(targetDir, `${name}-full.png`), full);
  return { first: sha256(first).slice(0, 16), full: sha256(full).slice(0, 16) };
}

async function pipelineErrorCase(browser, state, targetDir = OUT_DIR) {
  const viewport = WIDTHS[0];
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: state,
    viewport,
    reducedMotion: 'reduce',
    locale: RECORDING_LOCALE,
    timezoneId: RECORDING_TIMEZONE,
  });
  await context.clock.setFixedTime(FIXED_BROWSER_TIME);
  let interceptedPostCount = 0;
  // OPTIONS-Preflight mit gültigen CORS-Headern passieren lassen, nur den POST kontrolliert
  // mit 500 beantworten, damit der echte Serverfehler-Pfad statt CORS-Fehler getestet wird (Codex PR #67).
  await context.route('**/functions/v1/crm-query-export**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
          'Access-Control-Max-Age': '86400',
        },
      });
      return;
    }
    if (request.method() === 'POST') {
      interceptedPostCount++;
      await route.fulfill({
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: 'SERVER_ERROR',
          error: 'Ein interner Serverfehler ist aufgetreten.',
        }),
      });
      return;
    }
    await route.continue();
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on(
    'console',
    (msg) => msg.type() === 'error' && consoleErrors.push(msg.text().slice(0, 200)),
  );
  page.on('pageerror', (err) => pageErrors.push(String(err?.message ?? err).slice(0, 200)));
  const steps = [];
  const snap = async (label) => {
    await page.waitForTimeout(1500);
    const headerTitle = await page
      .locator('header h1, .app-header h1')
      .first()
      .textContent({ timeout: 2000 })
      .catch(() => null);
    const mainTitle = await page
      .locator('main h1')
      .first()
      .textContent({ timeout: 2000 })
      .catch(() => null);
    steps.push({
      label,
      url: new URL(page.url()).pathname,
      headerH1: headerTitle?.trim() ?? null,
      mainH1: mainTitle?.trim() ?? null,
      h1: headerTitle?.trim() ?? mainTitle?.trim() ?? null,
      mainText: (
        await page
          .locator('main')
          .first()
          .innerText()
          .catch(() => '')
      ).slice(0, 300),
    });
  };
  await page.goto('/crm/deals', { waitUntil: 'networkidle' });
  await snap('Pipeline mit 500');
  fs.writeFileSync(path.join(targetDir, 'fehler-pipeline-500.png'), await page.screenshot());

  // Validierung: mindestens ein POST zu crm-query-export muss abgefangen worden sein
  if (interceptedPostCount < 1) {
    await context.close();
    throw new Error(
      `Fehlerfall-Prüfung fehlgeschlagen: Kein POST zu crm-query-export abgefangen (interceptedPostCount=${interceptedPostCount}).`,
    );
  }

  for (const { label, name, expectedPath } of [
    {
      label: 'danach Unternehmenssteckbrief',
      name: /unternehmenssteckbrief/i,
      expectedPath: '/company/profile',
    },
    {
      label: 'danach Sales Funnel',
      name: /sales funnel/i,
      expectedPath: '/sales/funnel',
    },
  ]) {
    const link = page.getByRole('link', { name }).first();
    await link.waitFor({ state: 'visible', timeout: 5000 });
    await link.click({ timeout: 5000 });
    await page.waitForURL(`**${expectedPath}`, { timeout: 5000 });
    const currentPath = new URL(page.url()).pathname;
    if (currentPath !== expectedPath) {
      await context.close();
      throw new Error(
        `Fehlerfall-Navigation fehlgeschlagen: Erwartete URL ${expectedPath}, erhalten ${currentPath}.`,
      );
    }
    await snap(label);
    // Befund PR #67 Runde 22: Im Nachher-Modus muss auch der Zielinhalt stimmen, nicht nur die URL.
    if (IS_NACHHER) {
      const last = steps[steps.length - 1];
      const headings = [last.headerH1, last.mainH1].filter(Boolean);
      if (!headings.some((h) => name.test(h))) {
        await context.close();
        throw new Error(
          `Fehlerfall-Navigation zu ${expectedPath}: Zielinhalt nicht geladen (Überschriften: ${JSON.stringify(headings)}).`,
        );
      }
    }
  }
  fs.writeFileSync(
    path.join(targetDir, 'fehler-pipeline-nach-navigation.png'),
    await page.screenshot(),
  );
  const maxDepth = consoleErrors.filter((e) => /Maximum update depth/i.test(e)).length;
  await context.close();
  return {
    steps,
    interceptedPostCount,
    consoleErrors: consoleErrors.slice(0, 10),
    pageErrors,
    maxUpdateDepthErrors: maxDepth,
  };
}

/** Ergebnismatrix aus den Messwerten; Bilder bleiben lokal. */
function writeReadme(data) {
  const isNachher = data.mode === 'nachher';
  const list = (ids) => (ids.length ? ids.join(', ') : '0');
  const focusCell = (f) =>
    f.target
      ? `${f.target}${f.visible && (f.outline || f.ring) ? '' : ' (ohne sichtbaren Rahmen)'}`
      : '–';
  const rows = data.shots.map((s) =>
    s.failed
      ? `| ${s.id} | ${s.width} | ${s.theme} | – | – | – | – | – | – | Fehler: ${s.failed} |`
      : `| ${s.id} | ${s.width} | ${s.theme} | ${s.mainScrollHeight} | \`${s.hashes.first}\` / \`${s.hashes.full}\` | ${s.overflowDocument} / ${s.overflowMain} | ${list(s.axe)} | ${list(s.axePage)} | ${focusCell(s.focus)} | ${s.image ? `Bild ${s.image.scale}` : `Werte im 1. Bildschirm: ${s.numbersInFirstScreen}`} |`,
  );
  const title = isNachher
    ? '# Auftrag 081 – Ausgangslage Frontend (Nachher-Stand)'
    : '# Auftrag 081 – Ausgangslage Frontend (Arbeitspaket 0)';
  const commitLine = isNachher
    ? `Produkt-Stand: \`${data.targetCommit ?? data.commit}\` (Modus: Nachher-Vergleich gegen Baseline \`${data.baselineCommit ?? BASELINE_COMMIT}\`), aufgenommen ${data.capturedAt.slice(0, 10)} mit`
    : `Produkt-Baseline: \`${data.baselineCommit ?? data.commit}\` (Release v2.4.0), aufgenommen ${data.capturedAt.slice(0, 10)} mit`;

  const comparisonNote = isNachher
    ? 'Nachher-Aufnahmen für den Vorher/Nachher-Vergleich (Plan Punkt 273). Bilder nur lokal; Bewertung im\n[Befundregister](../../reviews/2026-10-06-frontend-befundregister.md).'
    : 'Keine Vorher/Nachher-Paare: Paket 0 ändert keinen Produktcode, diese Aufnahmen sind die\nVorher-Seite für die folgenden Pakete. Bilder nur lokal; Bewertung im\n[Befundregister](../../reviews/2026-10-06-frontend-befundregister.md).';

  const readme = [
    title,
    '',
    commitLine,
    `\`${data.harness?.script ?? 'scripts/captureAuftrag081Inventory.mjs'}\` (Harness SHA-256: \`${data.harness?.sha256 ? data.harness.sha256.slice(0, 16) : '–'}\`).`,
    `Ausgelieferter Build: \`${data.buildArtifact?.entryScript ?? '–'}\` (SHA-256: \`${data.buildArtifact?.entrySha256 ? data.buildArtifact.entrySha256.slice(0, 16) : '–'}\`, ${data.buildArtifact?.verifiedDistFilesCount ?? data.buildArtifact?.verifiedAssetsCount ?? 38} ausgelieferte Build-Dateien verifiziert), verifiziert gegen lokale ${isNachher ? 'Ziel-Revision' : 'Baseline'} \`${isNachher ? (data.targetCommit ?? data.commit) : (data.baselineCommit ?? data.commit)}\`.`,
    `Testbenutzer: \`${data.testUser?.email}\` (Rolle ${data.testUser?.role}, Organisation \`${data.testUser?.organizationId}\`), Identität vor dem Lauf gegen die Seed-Daten geprüft.`,
    `CRM-Seed-Daten: Organisation \`${data.crmSeed?.organizationId ?? data.testUser?.organizationId}\` verifiziert (${data.crmSeed?.companiesCount ?? 3} Unternehmen, ${data.crmSeed?.contactsCount ?? 1} Kontakt, ${data.crmSeed?.dealsCount ?? 2} Deals).`,
    `Supabase-Schema: ${data.schemaState ? `${data.schemaState.migrationsApplied} Migrationen bis \`${data.schemaState.lastMigration}\` inhaltsgleich mit \`supabase/\` der Baseline; RLS-Policies SHA-256 \`${data.schemaState.policiesSha256.slice(0, 16)}\`, RLS-Aktivierungsstatus \`${data.schemaState.rlsStatusSha256 ? data.schemaState.rlsStatusSha256.slice(0, 16) : '–'}\`, \`save_dashboard_preferences\` \`${data.schemaState.saveDashboardPreferencesSha256.slice(0, 16)}\`` : '–'}.`,
    `Simulations-Workspace: Organisation \`${data.simulationWorkspace?.organizationId ?? data.testUser?.organizationId}\` vor dem Lauf leer (${data.simulationWorkspace ? Object.keys(data.simulationWorkspace.counts).length : 7} Tabellen geprüft).`,
    `Dashboard-Konfiguration: Standardansicht (${data.dashboardConfig?.tileCount ?? 17} Kacheln, Quelle: \`${data.dashboardConfig?.source ?? 'standard'}\`).`,
    comparisonNote,
    '',
    `Aufnahmen: ${data.summary.ok} von ${data.summary.expected} erwartet, fehlgeschlagen: ${data.summary.failed}.`,
    'axe (serious/critical) läuft zweimal: nur `<main>` und die ganze Seite mit Kopfzeile, Sidebar',
    `und Kontoaktionen. Der erste Tab-Fokus wird ab Dokumentanfang gemessen (Browser-Locale: \`${data.browser?.locale ?? RECORDING_LOCALE}\`, Zeitzone: \`${data.browser?.timezoneId ?? RECORDING_TIMEZONE}\`).`,
    `Browserumgebung je Aufnahme gemessen und geprüft: \`innerWidth\`/\`innerHeight\` = angeforderter CSS-Viewport, \`devicePixelRatio\` 1, \`visualViewport.scale\` 1; feste Browserzeit \`${data.browser?.fixedTime ?? FIXED_BROWSER_TIME}\` (\`Date.now\`, Timer laufen normal), Zeitzone: \`${data.browser?.timezoneId ?? RECORDING_TIMEZONE}\`, Locale: \`${data.browser?.locale ?? RECORDING_LOCALE}\`.`,
    '',
    '| Ansicht | Breite | Theme | Höhe `<main>` | SHA-256 erster Bildschirm / ganz (16) | Überlauf Dokument / `<main>` px | axe `<main>` | axe ganze Seite | erster Tab-Fokus | Messung |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), readme);
}

async function main() {
  if (README_ONLY) {
    // Befund PR #67 Runde 14: auch hier keine ungesicherten Änderungen überschreiben.
    const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT }).toString().trim();
    if (dirty.length > 0) {
      throw new Error(
        `Arbeitsbaum enthält ungesicherte Änderungen (${dirty.split('\n').length} Einträge). README_ONLY abgebrochen.`,
      );
    }
    writeReadme(JSON.parse(fs.readFileSync(JSON_OUT, 'utf8')));
    return;
  }
  // Befund 1 PR #67 Runde 11: Staging-Verzeichnis laufbezogen mit Zeitstempel anlegen, bestehende Artefakte erhalten
  const diagDir = path.join(ROOT, 'test-results/auftrag-081');
  const runTimestamp = Date.now();
  const shotsStageDir = path.join(
    diagDir,
    ONLY ? `screenshots-teillauf-${runTimestamp}` : `screenshots-stage-${runTimestamp}`,
  );
  fs.mkdirSync(shotsStageDir, { recursive: true });

  const defaultConfig = defaultDashboardConfig(ROOT);
  let browser = null;
  let restore = null;
  let setupContext = null;
  let dashboardConfigInfo = null;
  let testIdentity = null;
  let crmSeedInfo = null;
  let simulationWorkspaceInfo = null;
  let schemaStateInfo = null;
  let buildArtifact = null;
  let runPayload = null;
  let isCompleteRun = false;
  let runSuccess = false;
  let runHadError = false;

  try {
    // 1. Verifiziere Baseline-Code (oder Zielcommit im Nachher-Modus) und den ausgelieferten Build (Befund PR #67 Runde 8/20)
    buildArtifact = await verifyBuildArtifact(BASE_URL, TARGET_COMMIT, IS_NACHHER);

    browser = await chromium.launch();
    const state = await loginWithLocale(browser, BASE_URL, CREDENTIALS);

    // Dashboard-Konfiguration fixieren (Befund PR #67 Runde 4/20)
    setupContext = await browser.newContext({
      baseURL: BASE_URL,
      storageState: state,
      locale: RECORDING_LOCALE,
      timezoneId: RECORDING_TIMEZONE,
    });
    const setupPage = await setupContext.newPage();
    await setupPage.goto('/dashboard', { waitUntil: 'networkidle' });
    const userId = await sessionUserId(setupPage);
    // Identität vor jeder Änderung prüfen (Befund PR #67 Runde 7)
    testIdentity = await verifyIdentity(setupPage, SUPABASE, CREDENTIALS.email, userId);
    // Befund 5 PR #67 Runde 11: CRM-Seed-Daten vor den Aufnahmen reproduzierbar verifizieren
    crmSeedInfo = await verifyCrmSeedData(SUPABASE, CLEANUP_KEY, testIdentity.organizationId);
    schemaStateInfo = await verifySchemaState(SUPABASE, CLEANUP_KEY);
    simulationWorkspaceInfo = await verifySimulationWorkspace(
      SUPABASE,
      CLEANUP_KEY,
      testIdentity.organizationId,
    );
    const originalPrefs = await readPreferences(setupPage, SUPABASE);

    if (originalPrefs.config) {
      // Befund PR #67 Runde 19: Vor dem RPC kein spekulatives restore vormerken.
      // Wenn der RPC mit einem Konflikt scheitert, darf kein Restore eine fremde Revision überschreiben.
      restore = null;
      let rpcRevision;
      try {
        ({ rpcRevision } = await savePreferencesRpc(
          setupPage,
          SUPABASE,
          defaultConfig,
          originalPrefs.revision,
        ));
      } catch (rpcErr) {
        // Befund PR #67 Runde 22: Antwort verloren/unlesbar, Mutation evtl. trotzdem committet.
        // Zeile nachlesen und Restore nur aktivieren, wenn Revision und Konfiguration die
        // Harness-Mutation eindeutig belegen.
        const after = await readPreferences(setupPage, SUPABASE).catch(() => null);
        if (
          after &&
          after.revision === originalPrefs.revision + 1 &&
          isJsonStructurallyEqual(after.config, defaultConfig)
        ) {
          restore = {
            type: 'restore_exact_row',
            originalRow: originalPrefs,
            page: setupPage,
            userId,
            harnessRevisions: [after.revision],
            installedConfig: defaultConfig,
          };
        }
        throw rpcErr;
      }
      // Befund PR #67 Runde 20: Restore-Token UNMITTELBAR nach erfolgreichem RPC registrieren,
      // BEVOR ein nachgelagertes Lesen ausgeführt wird. Schlägt das anschließende GET fehl,
      // ist der Cleanup-Restore bereits aktiv und hinterlässt keine Standardkonfiguration.
      restore = {
        type: 'restore_exact_row',
        originalRow: originalPrefs,
        page: setupPage,
        userId,
        harnessRevisions: [rpcRevision],
        installedConfig: defaultConfig,
      };

      let read = null;
      try {
        read = await readPreferences(setupPage, SUPABASE);
      } catch (err) {
        console.warn(
          'Nachgelagertes Lesen der Präferenzen fehlgeschlagen, verwende RPC-Revision:',
          err.message,
        );
      }
      dashboardConfigInfo = {
        source: 'installed_standard',
        version: defaultConfig.version,
        tileCount: defaultConfig.tiles.length,
        tileIds: defaultConfig.tiles.map((t) => t.tileId),
        revision: read?.revision ?? rpcRevision,
        restoredAfterRun: false, // Erst nach erfolgreichem Cleanup auf true setzen (Befund PR #67 Runde 8/19)
      };
    } else {
      // Befund PR #67 Runde 24: Auch ohne Ausgangszeile die Baseline-Konfiguration isoliert installieren,
      // damit der Nachher-Build nicht seine (ggf. geänderte) DEFAULT_DASHBOARD_CONFIG verwendet.
      // Cleanup löscht nur die vom Harness erzeugte Zeile (Revision + Inhalt geprüft).
      const organizationId = testIdentity.organizationId;
      let rpcRevision;
      try {
        ({ rpcRevision } = await savePreferencesRpc(setupPage, SUPABASE, defaultConfig, 0));
      } catch (rpcErr) {
        const after = await readPreferences(setupPage, SUPABASE).catch(() => null);
        if (after && after.revision === 1 && isJsonStructurallyEqual(after.config, defaultConfig)) {
          restore = {
            type: 'delete_harness_row',
            userId,
            organizationId,
            harnessRevisions: [after.revision],
            installedConfig: defaultConfig,
          };
        }
        throw rpcErr;
      }
      restore = {
        type: 'delete_harness_row',
        userId,
        organizationId,
        harnessRevisions: [rpcRevision],
        installedConfig: defaultConfig,
      };
      dashboardConfigInfo = {
        source: 'installed_standard_no_prior_row',
        version: defaultConfig.version,
        tileCount: defaultConfig.tiles.length,
        tileIds: defaultConfig.tiles.map((t) => t.tileId),
        revision: rpcRevision,
        restoredAfterRun: false,
      };
    }

    const images = imagePageRoutes();
    if (images.length !== 32) throw new Error(`32 Bildseiten erwartet, gefunden: ${images.length}`);
    const allTargets = [...INTERACTIVE, ...images];
    if (ONLY) {
      if (ONLY.size === 0) {
        throw new Error('Der ONLY-Filter ist leer. Lauf abgebrochen.');
      }
      const validIds = new Set(allTargets.map((t) => t.id));
      for (const requestedId of ONLY) {
        if (!validIds.has(requestedId)) {
          throw new Error(
            `Unbekannte Ziel-ID im ONLY-Filter: "${requestedId}". Gültige IDs: ${[...validIds].join(', ')}`,
          );
        }
      }
    }
    const targets = allTargets.filter((t) => !ONLY || ONLY.has(t.id));
    if (targets.length === 0) {
      throw new Error(
        'Der ONLY-Filter wählt keine gültigen Ziele aus (0 Ziele gefunden). Lauf abgebrochen.',
      );
    }
    const expected = targets.reduce((n, t) => n + (t.narrow ? 4 : 3) * THEMES.length, 0);
    const shots = [];
    for (const target of targets) {
      const viewports = target.narrow ? [...WIDTHS, NARROW] : WIDTHS;
      for (const viewport of viewports) {
        for (const theme of THEMES) {
          const name = `${target.id}-${viewport.width}-${theme}`;
          let context = null;
          try {
            const opened = await openRoute(browser, state, viewport, theme, target);
            context = opened.context;
            const { page, consoleErrors, pageErrors } = opened;
            const metrics = await measure(page, viewport);
            const vpActual = metrics.viewport;
            if (
              vpActual.innerWidth !== viewport.width ||
              vpActual.innerHeight !== viewport.height ||
              vpActual.devicePixelRatio !== 1 ||
              vpActual.visualViewportScale !== 1
            ) {
              throw new Error(
                `Browserumgebung weicht von der Vorgabe ab (CSS-Viewport ${viewport.width}×${viewport.height}, DPR 1, Zoom 100 %): ${JSON.stringify(vpActual)}`,
              );
            }
            if (metrics.timezoneId !== RECORDING_TIMEZONE) {
              throw new Error(
                `Zeitzone in Browserkontext weicht ab: erwartet ${RECORDING_TIMEZONE}, ermittelt ${metrics.timezoneId}.`,
              );
            }
            const expectedPath = target.detail ? '/dashboard/tiles/std_baseline_arr' : target.route;
            if (metrics.url !== expectedPath) {
              throw new Error(
                `Gemessene URL ${metrics.url} weicht von erwarteter Route ${expectedPath} ab.`,
              );
            }
            if (target.imageKey && (!metrics.image || metrics.image.naturalWidth <= 0)) {
              throw new Error(
                `Bildmaße auf Bildseite ${target.id} ungültig: ${JSON.stringify(metrics.image)}`,
              );
            }
            const axe = await axeSevere(page);
            const axePage = await axeSeverePage(page);
            const hashes = await capture(page, viewport, name, shotsStageDir);
            const focus = await firstFocus(page);
            shots.push({
              id: target.id,
              imageKey: target.imageKey ?? null,
              width: viewport.width,
              height: viewport.height,
              theme,
              ...metrics,
              axe,
              axePage,
              focus,
              consoleErrors: consoleErrors.length,
              pageErrors: pageErrors.length,
              dataState: target.expectedState
                ? IS_NACHHER
                  ? (target.observedState ?? null)
                  : `${target.expectedState.name} (${target.expectedState.marker})`
                : null,
              hashes,
            });
            console.log(
              `${name}: h=${metrics.mainScrollHeight} overflow=${metrics.overflowDocument}/${metrics.overflowMain} axe=${axe.length}/${axePage.length}`,
            );
          } catch (error) {
            const failed = error.message.split('\n')[0];
            shots.push({ id: target.id, width: viewport.width, theme, failed });
            console.log(`${name}: FEHLER ${failed}`);
          } finally {
            await context?.close();
          }
        }
      }
    }
    const pipelineError = ONLY ? null : await pipelineErrorCase(browser, state, shotsStageDir);

    const scriptContent = fs.readFileSync(
      path.join(ROOT, 'scripts/captureAuftrag081Inventory.mjs'),
    );
    const harnessSha256 = sha256(scriptContent);
    // Codex PR #67 Runde 21: Version aus dem (gegen Baseline bzw. Zielcommit geprüften) package.json.
    const productVersion = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'),
    ).version;
    const headCommit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT })
      .toString()
      .trim();

    // Verifiziere, dass der aktuelle Produktcode exakt der Baseline (oder im Nachher-Modus dem Zielcommit) entspricht (Befund PR #67 Runde 6/8/20)
    if (!IS_NACHHER) {
      const productDiff = execFileSync('git', ['diff', BASELINE_COMMIT, '--', ...PRODUCT_PATHS], {
        cwd: ROOT,
      })
        .toString()
        .trim();
      if (productDiff.length > 0) {
        throw new Error(
          `Produktstand weicht von der behaupteten Baseline ${BASELINE_COMMIT} ab (${productDiff.split('\n').length} Diff-Zeilen). Baseline-Schreiben abgebrochen.`,
        );
      }
    } else if (process.env.TARGET_COMMIT) {
      const productDiff = execFileSync('git', ['diff', TARGET_COMMIT, '--', ...PRODUCT_PATHS], {
        cwd: ROOT,
      })
        .toString()
        .trim();
      if (productDiff.length > 0) {
        throw new Error(
          `Produktstand weicht vom Zielcommit ${TARGET_COMMIT} ab (${productDiff.split('\n').length} Diff-Zeilen). Nachher-Schreiben abgebrochen.`,
        );
      }
    }

    // Befund 2 PR #67 Runde 11: Auch vor dem finalen Schreiben der Artefakte unversionierte/ungestagte Dateien prüfen
    const uncommittedOrUntrackedFinal = execFileSync('git', ['status', '--porcelain'], {
      cwd: ROOT,
    })
      .toString()
      .trim();
    if (uncommittedOrUntrackedFinal.length > 0) {
      throw new Error(
        `Arbeitsbaum enthält unversionierte oder ungesicherte Änderungen im ganzen Arbeitsbaum (${uncommittedOrUntrackedFinal.split('\n').length} Einträge). ${IS_NACHHER ? 'Nachher' : 'Baseline'}-Schreiben abgebrochen.`,
      );
    }

    const failed = shots.filter((s) => s.failed).length;
    const summary = { expected, ok: shots.length - failed, failed };
    runPayload = {
      mode: MODE,
      baselineCommit: BASELINE_COMMIT,
      targetCommit: TARGET_COMMIT,
      productVersion,
      harness: {
        script: 'scripts/captureAuftrag081Inventory.mjs',
        sha256: harnessSha256,
        headAtExecution: headCommit,
      },
      buildArtifact,
      testUser: testIdentity,
      crmSeed: crmSeedInfo,
      simulationWorkspace: simulationWorkspaceInfo,
      schemaState: schemaStateInfo,
      browser: {
        fixedTime: FIXED_BROWSER_TIME,
        timezoneId: RECORDING_TIMEZONE,
        locale: RECORDING_LOCALE,
        devicePixelRatio: 1,
        visualViewportScale: 1,
      },
      dashboardConfig: dashboardConfigInfo,
      commit: IS_NACHHER ? TARGET_COMMIT : BASELINE_COMMIT,
      baseUrl: BASE_URL,
      capturedAt: new Date().toISOString(),
      summary,
      shots,
      pipelineError,
    };

    isCompleteRun = !ONLY && failed === 0 && summary.ok === expected;
    if (failed > 0 || summary.ok !== expected) {
      runHadError = true;
    }
    if (isCompleteRun) {
      runSuccess = true;
    }
    // Befund PR #67 Runde 19: Weder Diagnose-JSON noch kanonische Dateien hier vor dem Cleanup schreiben!
    // Die Serialisierung erfolgt erst nach erfolgreichem Restore im finally-Block.
  } finally {
    let restoreError = null;
    if (restore?.type === 'restore_exact_row') {
      try {
        if (!CLEANUP_KEY) {
          throw new Error('Kein Cleanup-Key für revisionsgetreue Wiederherstellung verfügbar.');
        }
        await restorePreferencesRow(
          SUPABASE,
          CLEANUP_KEY,
          restore.originalRow,
          restore.harnessRevisions,
          restore.installedConfig,
        );
        const verified = await readPreferences(restore.page, SUPABASE);
        if (verified.revision !== restore.originalRow.revision) {
          throw new Error(
            `Wiederhergestellte Revision ${verified.revision} stimmt nicht mit Original ${restore.originalRow.revision} überein.`,
          );
        }
        if (dashboardConfigInfo) dashboardConfigInfo.restoredAfterRun = true;
        if (runPayload?.dashboardConfig) {
          runPayload.dashboardConfig.restoredAfterRun = true;
        }
      } catch (err) {
        console.error('Fehler beim Wiederherstellen der ursprünglichen Präferenzzeile:', err);
        restoreError = err;
        if (dashboardConfigInfo) dashboardConfigInfo.restoredAfterRun = false;
        if (runPayload?.dashboardConfig) {
          runPayload.dashboardConfig.restoredAfterRun = false;
        }
      }
    } else if (restore?.type === 'restore') {
      try {
        const current = await readPreferences(restore.page, SUPABASE);
        await savePreferencesRpc(restore.page, SUPABASE, restore.config, current.revision);
        if (dashboardConfigInfo) dashboardConfigInfo.restoredAfterRun = true;
        if (runPayload?.dashboardConfig) {
          runPayload.dashboardConfig.restoredAfterRun = true;
        }
      } catch (err) {
        console.error('Fehler beim Wiederherstellen der Dashboard-Präferenzen:', err);
        restoreError = err;
        if (dashboardConfigInfo) dashboardConfigInfo.restoredAfterRun = false;
        if (runPayload?.dashboardConfig) {
          runPayload.dashboardConfig.restoredAfterRun = false;
        }
      }
    } else if (restore?.type === 'delete_harness_row') {
      try {
        if (!CLEANUP_KEY) throw new Error('Kein Cleanup-Key für das Entfernen der Harness-Zeile.');
        await deleteHarnessPreferencesRow(SUPABASE, CLEANUP_KEY, restore);
        if (dashboardConfigInfo) dashboardConfigInfo.restoredAfterRun = true;
        if (runPayload?.dashboardConfig) runPayload.dashboardConfig.restoredAfterRun = true;
      } catch (err) {
        console.error('Fehler beim Entfernen der vom Harness angelegten Präferenzzeile:', err);
        restoreError = err;
        if (dashboardConfigInfo) dashboardConfigInfo.restoredAfterRun = false;
        if (runPayload?.dashboardConfig) runPayload.dashboardConfig.restoredAfterRun = false;
      }
    } else if (restore?.type === 'leave_unchanged') {
      // Befund PR #67 Runde 15: Ohne Ausgangszeile schreibt der Harness keine Präferenz. Eine während
      // des Laufs erscheinende Zeile stammt aus einer anderen Sitzung und bleibt unangetastet.
      if (dashboardConfigInfo) dashboardConfigInfo.restoredAfterRun = true;
      if (runPayload?.dashboardConfig) {
        runPayload.dashboardConfig.restoredAfterRun = true;
      }
    }
    await setupContext?.close().catch(() => null);
    await browser?.close().catch(() => null);

    const diagDir = path.join(ROOT, 'test-results/auftrag-081');
    fs.mkdirSync(diagDir, { recursive: true });

    const hadRunFailure = ONLY ? runHadError : !runSuccess;

    if (restoreError || hadRunFailure || !isCompleteRun) {
      process.exitCode = 1;
      // Befund PR #67 Runde 19: Diagnose-JSON erst nach dem Cleanup / Restore schreiben,
      // damit restoredAfterRun den tatsächlichen Nach-Restore-Zustand widerspiegelt.
      if (runPayload) {
        if (restoreError) {
          runPayload.restoreError = restoreError.message;
        }
        const diagFilename =
          ONLY && !restoreError && !runHadError
            ? `inventar.teillauf-${runTimestamp}.json`
            : `inventar.fehlerlauf-${runTimestamp}.json`;
        const diagOut = path.join(diagDir, diagFilename);
        fs.writeFileSync(diagOut, `${JSON.stringify(runPayload, null, 1)}\n`);
        console.log(
          `\n${ONLY ? `Teillauf (ONLY=${[...ONLY].join(',')})` : 'Unvollständiger oder fehlerhafter Lauf'}: ${runPayload.summary.ok} von ${runPayload.summary.expected} Aufnahmen, fehlgeschlagen ${runPayload.summary.failed}. Kanonische Baseline unverändert. Diagnose: ${path.relative(ROOT, diagOut)} (restoredAfterRun=${runPayload.dashboardConfig?.restoredAfterRun}).`,
        );
      }
      if (restoreError) throw restoreError;
    } else if (runPayload && isCompleteRun && !restoreError) {
      // Befund 4 PR #67 Runde 10 / Befund 1 PR #67 Runde 11:
      // Nach erfolgreichem Gesamtlauf und fehlerfreiem Cleanup nach OUT_DIR kopieren; Staging-Artefakte für Diagnose erhalten
      fs.mkdirSync(OUT_DIR, { recursive: true });
      const stagedFiles = fs.readdirSync(shotsStageDir);
      for (const file of stagedFiles) {
        fs.copyFileSync(path.join(shotsStageDir, file), path.join(OUT_DIR, file));
      }

      fs.writeFileSync(JSON_OUT, `${JSON.stringify(runPayload, null, 1)}\n`);
      writeReadme(runPayload);
      console.log(
        `\n${runPayload.summary.ok} von ${runPayload.summary.expected} Aufnahmen, fehlgeschlagen ${runPayload.summary.failed}, JSON: ${path.relative(ROOT, JSON_OUT)}`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
