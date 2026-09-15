/**
 * LeadPilot Auftrag 036 / Gate G20: Kontrollierter externer E2E-Runner
 *
 * Dieser Runner prüft den gesamten Live-KPI-Pfad gegen ein real bereitgestelltes
 * n8n- und Supabase-Setup:
 * 1. Lokale Contract-Validierung jedes Payloads vor dem Versand (G18-Konformität).
 * 2. Webhook-Ingest via HTTP POST an n8n.
 * 3. Automatische Trigger-Projektion in public.live_kpi_public_feed.
 * 4. Öffentlicher Lesezugriff via Supabase REST API (anon key).
 * 5. Idempotenz bei Duplikaten (Verifikation unveränderter Feed-Zeilenzahl).
 * 6. Strikte Nicht-Projektion bei Rejections (Verifikation unveränderter Feed-Zeilenzahl).
 * 7. Deterministisches Tie-Breaking bei High-Frequency Events mit gleichem occurred_at.
 *
 * SICHERHEIT:
 * - Keine Secrets oder URLs im Quellcode.
 * - Läuft NUR bei expliziter Aktivierung durch Umgebungsvariablen.
 * - Ohne Umgebungsvariablen wird SKIPPED_NOT_CONFIGURED gemeldet.
 * - Bei Fehlern werden keine rohen Remote-Antworten in die Logs geschrieben.
 */

import http from 'http';
import https from 'https';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { validateLiveKpiEvent } from '../src/services/liveKpi/liveKpiContract.js';
import { AUTH_STORAGE_KEY } from '../src/auth/localAuthAdapter.js';

console.log('=======================================================');
console.log('🌐 AUFTRAG 036 / GATE G20: EXTERNER E2E REALTIME RUNNER');
console.log('=======================================================\n');

const isEnabled = process.env.LIVE_KPI_E2E_ENABLE === 'true';
const n8nWebhookUrl = process.env.LIVE_KPI_E2E_N8N_WEBHOOK_URL;
const supabaseUrl = process.env.LIVE_KPI_E2E_SUPABASE_URL;
const supabaseAnonKey = process.env.LIVE_KPI_E2E_SUPABASE_ANON_KEY;

function maskSecret(val: string | undefined): string {
  if (!val) return '(not set)';
  if (val.length <= 8) return '***';
  return `${val.substring(0, 4)}...${val.substring(val.length - 4)}`;
}

if (!isEnabled || !n8nWebhookUrl || !supabaseUrl || !supabaseAnonKey) {
  console.log('ℹ️  STATUS: SKIPPED_NOT_CONFIGURED');
  console.log('-------------------------------------------------------');
  console.log('Der externe End-to-End-Testlauf wurde übersprungen, da keine');
  console.log('vollständige externe Testumgebung konfiguriert ist.');
  console.log('');
  console.log('HINWEIS GEMÄSS G20-SPEZIFIKATION:');
  console.log('Dieser Skip ist ehrlich und begründet, zählt aber ausdrücklich NICHT');
  console.log('als durchgeführter oder bestandener externer E2E-Nachweis.');
  console.log('');
  console.log('Status der Umgebungsvariablen:');
  console.log(`- LIVE_KPI_E2E_ENABLE:           ${isEnabled ? 'true' : 'false (benötigt: true)'}`);
  console.log(`- LIVE_KPI_E2E_N8N_WEBHOOK_URL:  ${maskSecret(n8nWebhookUrl)}`);
  console.log(`- LIVE_KPI_E2E_SUPABASE_URL:     ${maskSecret(supabaseUrl)}`);
  console.log(`- LIVE_KPI_E2E_SUPABASE_ANON_KEY: ${maskSecret(supabaseAnonKey)}`);
  console.log('');
  console.log('Zur Durchführung eines realen E2E-Laufs: Siehe Dokumentation in tools/n8n/README.md');
  console.log('Lokaler Preflight läuft separat über:');
  console.log('  npx tsx scripts/verifyLiveKpiE2e.ts');
  console.log('=======================================================\n');
  process.exit(0);
}

// Hilfsfunktion für HTTP/HTTPS-Requests
async function sendJson(urlStr: string, options: { method: string; headers?: Record<string, string>; body?: any }): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const bodyStr = options.body ? JSON.stringify(options.body) : '';
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (bodyStr) {
      reqHeaders['Content-Length'] = Buffer.byteLength(bodyStr).toString();
    }

    const req = client.request(
      url,
      {
        method: options.method,
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode || 0, data: parsed });
        });
      }
    );

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

// ---------------------------------------------------------------------------
// CDP- und Browser-Helfer für die reale Browser-E2E-Phase
// ---------------------------------------------------------------------------

function findChromePath(): string {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('Kein Google Chrome / Chromium auf dem System gefunden.');
}

function isPortFree(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function findAvailablePort(startPort: number, host = '127.0.0.1'): Promise<number> {
  let port = startPort;
  while (true) {
    const freeHost = await isPortFree(port, host);
    let freeLocalhost = true;
    try {
      freeLocalhost = await isPortFree(port, 'localhost');
    } catch {}
    if (freeHost && freeLocalhost) {
      return port;
    }
    port++;
  }
}

async function stopProcess(proc: any, timeoutMs = 8000): Promise<void> {
  if (!proc || proc.killed || proc.exitCode !== null) return;
  return new Promise((resolve) => {
    let finished = false;
    let forceKillTimer: any = null;
    let timeoutTimer: any = null;

    const onExit = () => {
      if (!finished) {
        finished = true;
        if (forceKillTimer) clearTimeout(forceKillTimer);
        if (timeoutTimer) clearTimeout(timeoutTimer);
        resolve();
      }
    };

    proc.once('exit', onExit);

    try {
      proc.kill('SIGTERM');
    } catch {
      onExit();
      return;
    }

    forceKillTimer = setTimeout(() => {
      if (!finished) {
        try {
          proc.kill('SIGKILL');
        } catch {}
      }
    }, 4000);

    timeoutTimer = setTimeout(() => {
      if (!finished) {
        finished = true;
        resolve();
      }
    }, timeoutMs);
  });
}

async function removeDirWithRetry(dirPath: string, maxAttempts = 5, delayMs = 250): Promise<void> {
  if (!fs.existsSync(dirPath)) return;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      return;
    } catch {
      await sleep(delayMs);
    }
  }
}

class CdpSession {
  private wsUrl: string;
  private ws: any = null;
  private msgId = 1;
  private pending = new Map<number, { resolve: (res: any) => void; reject: (err: any) => void }>();
  public debugEvents: string[] = [];

  constructor(wsUrl: string) {
    this.wsUrl = wsUrl;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const WsClass = (globalThis as any).WebSocket;
      this.ws = new WsClass(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err: any) => reject(err);
      this.ws.onmessage = (event: any) => {
        const res = JSON.parse(event.data);
        if (res.id && this.pending.has(res.id)) {
          const { resolve, reject } = this.pending.get(res.id)!;
          this.pending.delete(res.id);
          if (res.error) reject(new Error(JSON.stringify(res.error)));
          else resolve(res.result);
        } else if (res.method === 'Runtime.consoleAPICalled') {
          const args = (res.params?.args || []).map((a: any) => a.value ?? a.description ?? '').join(' ');
          this.debugEvents.push(`[console:${res.params?.type}] ${args}`);
        } else if (res.method === 'Runtime.exceptionThrown') {
          const desc = res.params?.exceptionDetails?.exception?.description || JSON.stringify(res.params?.exceptionDetails);
          this.debugEvents.push(`[exception] ${desc}`);
        }
      };
    });
  }

  async send(method: string, params: any = {}): Promise<any> {
    const id = this.msgId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async close(): Promise<void> {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function getWsDebugUrl(port: number, host = '127.0.0.1'): Promise<string> {
  for (let i = 0; i < 40; i++) {
    try {
      const data = await new Promise<string>((resolve, reject) => {
        http.get(`http://${host}:${port}/json/list`, (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => resolve(body));
        }).on('error', reject);
      });
      const list = JSON.parse(data);
      const target = list.find((t: any) => t.type === 'page');
      if (target && target.webSocketDebuggerUrl) {
        return target.webSocketDebuggerUrl;
      }
    } catch {
      await sleep(200);
    }
  }
  throw new Error(`Timeout beim Warten auf Chrome Debug Target auf http://${host}:${port}/json/list`);
}

async function getLiveKpiCardDomInfo(cdp: CdpSession, kpiId: string): Promise<{ exists: boolean; text: string }> {
  // Gezielt die Karte des unter Test stehenden KPI selektieren, nicht nur
  // irgendeine live-kpi-card: LivePerformanceSection rendert mehrere Karten
  // (arr, mrr, pipeline_coverage), ein generischer Selector träfe immer nur
  // die erste (arr) unabhängig vom tatsächlich eingespeisten Test-Event.
  const evalRes: any = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector('[data-testid="live-kpi-card"][data-kpi-id=${JSON.stringify(kpiId)}]');
      if (!el) return { exists: false, text: '' };
      return { exists: true, text: el.innerText || '' };
    })()`,
    returnByValue: true,
  });
  return evalRes?.result?.value || { exists: false, text: '' };
}

async function runExternalSuite() {
  console.log('🚀 Starte realen End-to-End-Lauf gegen n8n und Supabase...');
  console.log(`- Ziel n8n Webhook: ${new URL(n8nWebhookUrl!).origin}/...`);
  console.log(`- Ziel Supabase:    ${new URL(supabaseUrl!).origin}`);

  const testRunId = `e2e-${Date.now()}`;
  const testKpiId = 'pipeline_coverage';
  const testSource = 'e2e-runner';

  const authHeaders = {
    apikey: supabaseAnonKey!,
    Authorization: `Bearer ${supabaseAnonKey}`,
  };

  // 1. Healthcheck: Supabase Public Feed abfragen
  console.log('\n[1/11] Healthcheck: Erreichbarkeit des öffentlichen Supabase-Feeds...');
  const pingRes = await sendJson(`${supabaseUrl}/rest/v1/live_kpi_public_feed?select=count`, {
    method: 'GET',
    headers: authHeaders,
  });
  assert(pingRes.status === 200, `Supabase Public Feed antwortet mit HTTP 200 (Status: ${pingRes.status})`);

  // Hilfsfunktion: Zähle Datensätze im Public Feed für dieses Test-Quellsystem
  async function getFeedCount(): Promise<number> {
    const res = await sendJson(
      `${supabaseUrl}/rest/v1/live_kpi_public_feed?source_system=eq.${testSource}&select=id`,
      {
        method: 'GET',
        headers: authHeaders,
      }
    );
    if (res.status === 200 && Array.isArray(res.data)) {
      return res.data.length;
    }
    return 0;
  }

  // 2. Valides Event vorbereiten, lokal validieren und über n8n einspeisen
  console.log('\n[2/11] Valides Event: Vorab-Vertragsprüfung & Webhook-Ingest...');
  const validEvent = {
    contractVersion: '1.0',
    provenance: 'live' as const,
    sourceSystem: testSource,
    eventId: `${testRunId}-valid-1`,
    correlationId: `${testRunId}-corr-1`,
    kpiId: testKpiId,
    value: 4.85,
    unit: 'x',
    occurredAt: new Date().toISOString(),
    qualityStatus: 'valid' as const,
  };

  // Vorab-Vertragsvalidierung
  const preValidation = validateLiveKpiEvent(validEvent);
  assert(preValidation.valid, `Valides Testevent entspricht dem G18-Vertrag (Fehler: ${preValidation.errorCode || 'keiner'})`);

  const initialFeedCount = await getFeedCount();

  const webhookRes = await sendJson(n8nWebhookUrl!, {
    method: 'POST',
    body: validEvent,
  });
  assert(
    webhookRes.status === 200 || webhookRes.status === 201,
    `n8n Webhook nimmt valides Event an (HTTP ${webhookRes.status})`
  );

  // 3. Verifizieren, dass das Event im Public Feed ankommt
  console.log('\n[3/11] Projektions-Assertion: Exakten Eintrag im Public Feed nachweisen...');
  let feedRow: any = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    await sleep(500);
    const feedRes = await sendJson(
      `${supabaseUrl}/rest/v1/live_kpi_public_feed?kpi_id=eq.${testKpiId}&source_system=eq.${testSource}&order=occurred_at.desc,ingested_at.desc&limit=1`,
      {
        method: 'GET',
        headers: authHeaders,
      }
    );
    if (feedRes.status === 200 && Array.isArray(feedRes.data) && feedRes.data.length > 0) {
      if (feedRes.data[0].value === 4.85) {
        feedRow = feedRes.data[0];
        break;
      }
    }
  }

  assert(feedRow !== null, 'Event wurde automatisch durch Trigger nach public.live_kpi_public_feed projiziert');
  assert(feedRow.kpi_id === testKpiId, `Feed kpi_id stimmt überein (${feedRow.kpi_id})`);
  assert(feedRow.value === 4.85, `Feed value stimmt überein (${feedRow.value})`);
  assert(feedRow.unit === 'x', `Feed unit stimmt überein (${feedRow.unit})`);
  assert(feedRow.quality_status === 'valid', `Feed quality_status stimmt überein (${feedRow.quality_status})`);
  assert(feedRow.source_system === testSource, `Feed source_system stimmt überein (${feedRow.source_system})`);

  const countAfterFirst = await getFeedCount();
  assert(countAfterFirst === initialFeedCount + 1, `Feed-Zähler um genau 1 erhöht (${countAfterFirst})`);

  // 4. Idempotenz bei Duplikat
  console.log('\n[4/11] Duplikat-Assertion: Unveränderte Feed-Zählung nachweisen...');
  const dupRes = await sendJson(n8nWebhookUrl!, {
    method: 'POST',
    body: validEvent,
  });
  assert(dupRes.status === 200 || dupRes.status === 201, `Duplikat-Einspeisung meldet Erfolg (HTTP ${dupRes.status})`);

  await sleep(1000);
  const countAfterDuplicate = await getFeedCount();
  assert(
    countAfterDuplicate === countAfterFirst,
    `Feed-Zeilenanzahl nach Duplikat exakt unverändert geblieben (${countAfterDuplicate})`
  );

  // 5. Rejection bei ungültigem Event
  console.log('\n[5/11] Rejection-Assertion: Ablehnung & unveränderten Feed nachweisen...');
  const invalidEvent = {
    ...validEvent,
    eventId: `${testRunId}-invalid-1`,
    occurredAt: '2026-09-06T12:00:00', // ungültig ohne Zeitzone
  };

  const invalidPreValidation = validateLiveKpiEvent(invalidEvent);
  assert(!invalidPreValidation.valid, 'Ungültiges Event wird vorab als nicht vertragskonform erkannt');
  assert(
    invalidPreValidation.errorCode === 'INVALID_TIMESTAMP',
    `Fehlercode ist INVALID_TIMESTAMP (erhalten: ${invalidPreValidation.errorCode})`
  );

  const rejRes = await sendJson(n8nWebhookUrl!, {
    method: 'POST',
    body: invalidEvent,
  });
  assert(
    rejRes.status === 422 || (typeof rejRes.data === 'object' && rejRes.data?.status === 'rejected'),
    `Rejection-Pfad durchlaufen (HTTP Status ${rejRes.status})`
  );

  await sleep(1000);
  const countAfterRejection = await getFeedCount();
  assert(
    countAfterRejection === countAfterFirst,
    `Public Feed bleibt nach Rejection absolut unverändert (${countAfterRejection})`
  );

  // 6. High-Frequency Zweier-Burst mit identischem occurred_at (Tie-Break-Nachweis)
  console.log('\n[6/11] Tie-Break-Assertion: Schneller Zweier-Burst mit gleichem occurred_at...');
  const sharedOccurredAt = new Date().toISOString();

  const burstA = {
    contractVersion: '1.0',
    provenance: 'live' as const,
    sourceSystem: testSource,
    eventId: `${testRunId}-burst-a`,
    correlationId: `${testRunId}-corr-burst-a`,
    kpiId: testKpiId,
    value: 5.10,
    unit: 'x',
    occurredAt: sharedOccurredAt,
    qualityStatus: 'valid' as const,
  };

  const burstB = {
    contractVersion: '1.0',
    provenance: 'live' as const,
    sourceSystem: testSource,
    eventId: `${testRunId}-burst-b`,
    correlationId: `${testRunId}-corr-burst-b`,
    kpiId: testKpiId,
    value: 5.30,
    unit: 'x',
    occurredAt: sharedOccurredAt, // EXAKT identischer Zeitstempel
    qualityStatus: 'valid' as const,
  };

  assert(validateLiveKpiEvent(burstA).valid, 'Burst A ist vertragskonform');
  assert(validateLiveKpiEvent(burstB).valid, 'Burst B ist vertragskonform');

  // Sende A, dann mit 200ms Abstand B
  const resA = await sendJson(n8nWebhookUrl!, { method: 'POST', body: burstA });
  assert(resA.status === 200 || resA.status === 201, 'Burst A erfolgreich eingespeist');
  await sleep(200);
  const resB = await sendJson(n8nWebhookUrl!, { method: 'POST', body: burstB });
  assert(resB.status === 200 || resB.status === 201, 'Burst B erfolgreich eingespeist');

  // Warte auf Trigger-Projektion und prüfe Endwert
  let latestBurstRow: any = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    await sleep(500);
    const feedRes = await sendJson(
      `${supabaseUrl}/rest/v1/live_kpi_public_feed?kpi_id=eq.${testKpiId}&source_system=eq.${testSource}&order=occurred_at.desc,ingested_at.desc&limit=1`,
      {
        method: 'GET',
        headers: authHeaders,
      }
    );
    if (feedRes.status === 200 && Array.isArray(feedRes.data) && feedRes.data.length > 0) {
      latestBurstRow = feedRes.data[0];
      if (latestBurstRow.value === 5.30) {
        break;
      }
    }
  }

  assert(latestBurstRow !== null, 'Burst-Eintrag in Projektion gefunden');
  assert(
    latestBurstRow.value === 5.30,
    `Deterministischer Tie-Break nach ingested_at erfolgreich: neuester Wert ist 5.30 (erhalten: ${latestBurstRow?.value})`
  );

  // 7. Client-Snapshot-Kompatibilität für useLiveKpi & LiveKpiCard
  console.log('\n[7/11] Client-Kompatibilitäts-Assertion: Snapshot-Format für useLiveKpi & LiveKpiCard...');
  assert(typeof latestBurstRow.kpi_id === 'string' && latestBurstRow.kpi_id === testKpiId, 'Snapshot kpiId ist string');
  assert(typeof latestBurstRow.value === 'number' && !isNaN(latestBurstRow.value), 'Snapshot value ist gültige Zahl');
  assert(typeof latestBurstRow.unit === 'string' && latestBurstRow.unit.length > 0, 'Snapshot unit ist string');
  assert(typeof latestBurstRow.occurred_at === 'string' && !isNaN(new Date(latestBurstRow.occurred_at).getTime()), 'Snapshot occurredAt ist gültiger Zeitstempel');
  assert(latestBurstRow.quality_status === 'valid' || latestBurstRow.quality_status === 'degraded', 'Snapshot qualityStatus ist valid|degraded');
  assert(typeof latestBurstRow.source_system === 'string', 'Snapshot sourceSystem ist string');
  assert(typeof latestBurstRow.ingested_at === 'string' && !isNaN(new Date(latestBurstRow.ingested_at).getTime()), 'Snapshot ingestedAt ist gültiger Zeitstempel');

  // -------------------------------------------------------------------------
  // PHASE 2: BROWSER-E2E-RUNNER MIT ECHTEM HOOK & ECHTER LIVEKPICARD
  // Nachweis des echten Pfads: n8n -> Supabase -> useLiveKpi -> LiveKpiCard im DOM
  // -------------------------------------------------------------------------
  console.log('\n-------------------------------------------------------');
  console.log('🌐 STARTE PHASE 2: BROWSER-E2E-VERIFIKATION (CHROME CDP)');
  console.log('-------------------------------------------------------');

  const HOST = '127.0.0.1';
  let previewProc: any = null;
  let chromeProc: any = null;
  let userDataDir: string | null = null;
  let cdp: CdpSession | null = null;

  try {
    // 8. Build & Start Preview mit aktiven Test-Supabase-Umgebungsvariablen
    console.log('\n[8/11] Browser-Setup: Baue App mit Test-Supabase-Konfiguration...');
    const buildProc = spawn('npm', ['run', 'build'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        VITE_SUPABASE_URL: supabaseUrl,
        VITE_SUPABASE_PUBLISHABLE_KEY: supabaseAnonKey,
        VITE_E2E_EXPOSE_SUPABASE_CLIENT: 'true',
      },
      stdio: 'inherit',
    });
    await new Promise<void>((resolve, reject) => {
      buildProc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Build failed with code ${code}`))));
    });

    const previewPort = await findAvailablePort(4210, HOST);
    console.log(`[Preview] Starte Vite Preview auf Port ${previewPort}...`);
    const viteBin = path.resolve(process.cwd(), 'node_modules/vite/bin/vite.js');
    previewProc = spawn(process.execPath, [viteBin, 'preview', '--host', HOST, '--port', String(previewPort), '--strictPort'], {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    // Auf Preview-Server warten
    let previewReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        await new Promise<void>((resolve, reject) => {
          const req = http.get(`http://${HOST}:${previewPort}`, (res) => {
            if (res.statusCode === 200) resolve();
            else reject();
          });
          req.on('error', reject);
        });
        previewReady = true;
        break;
      } catch {
        await sleep(200);
      }
    }
    assert(previewReady, 'Vite Preview Server erfolgreich gestartet');

    // Launch Chrome
    const cdpPort = await findAvailablePort(9240, HOST);
    userDataDir = path.resolve(process.cwd(), `.tmp-chrome-e2e-${testRunId}`);
    fs.mkdirSync(userDataDir, { recursive: true });

    const chromeBin = findChromePath();
    console.log(`[Chrome] Starte Headless Chrome auf Debug-Port ${cdpPort}...`);
    chromeProc = spawn(chromeBin, [
      '--headless=new',
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--disable-extensions',
      'about:blank',
    ]);

    const wsUrl = await getWsDebugUrl(cdpPort, HOST);
    cdp = new CdpSession(wsUrl);
    await cdp.connect();
    console.log('✅ CDP-Verbindung erfolgreich aufgebaut');

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Network.enable');
    await cdp.send('Runtime.enable');

    // 8b. Login-Bootstrap für geschützte Routen (Gate G28 / Auftrag 068)
    // Zunächst navigieren, um den Origin zu initialisieren (ProtectedRoute leitet auf /login weiter)
    console.log(`[Auth-Bootstrap] Lade http://${HOST}:${previewPort}/dashboard für Origin-Initialisierung...`);
    await cdp.send('Page.navigate', { url: `http://${HOST}:${previewPort}/dashboard` });
    await sleep(1500);

    // Session direkt in localStorage injizieren (Format identisch zu LocalAuthAdapter.login)
    console.log(`[Auth-Bootstrap] Injiziere Session in localStorage (${AUTH_STORAGE_KEY})...`);
    const sessionData = JSON.stringify({ id: 'demo-user-id', email: 'demo@leadpilot.io' });
    await cdp.send('Runtime.evaluate', {
      expression: `localStorage.setItem(${JSON.stringify(AUTH_STORAGE_KEY)}, ${JSON.stringify(sessionData)})`,
    });

    // Erneut zu /dashboard navigieren (AuthProvider liest Session beim Mount aus localStorage)
    console.log(`[Navigate] Lade http://${HOST}:${previewPort}/dashboard mit aktiver Session...`);
    await cdp.send('Page.navigate', { url: `http://${HOST}:${previewPort}/dashboard` });
    await sleep(500);

    // Initialen DOM-Zustand prüfen: Poll statt fixem Sleep, da der Verbindungsaufbau
    // zur echten Supabase-Cloud (TLS + REST-Fetch für alle Katalog-KPIs + Realtime-WebSocket)
    // spürbar länger dauern kann als gegen eine lokale/Fixture-Quelle.
    let initialCard = await getLiveKpiCardDomInfo(cdp, testKpiId);
    for (let attempt = 1; attempt <= 20 && !initialCard.exists; attempt++) {
      await sleep(500);
      initialCard = await getLiveKpiCardDomInfo(cdp, testKpiId);
    }
    if (!initialCard.exists) {
      const diag: any = await cdp.send('Runtime.evaluate', {
        expression: `(() => ({
          url: document.location.href,
          bodyText: document.body.innerText.substring(0, 800),
          hasLogoutButton: !!document.querySelector('[data-testid="logout-button"]'),
          authSession: localStorage.getItem(${JSON.stringify(AUTH_STORAGE_KEY)}),
        }))()`,
        returnByValue: true,
      });
      console.log('\n🔎 DIAGNOSE: LiveKpiCard nach 10s Polling weiterhin nicht im DOM gefunden:');
      console.log(JSON.stringify(diag?.result?.value, null, 2));
      console.log('--- Erfasste Browser-Events (Console/Exceptions) ---');
      console.log(cdp.debugEvents.length ? cdp.debugEvents.join('\n') : '(keine erfasst)');
      console.log('---');
    }
    assert(initialCard.exists, 'LiveKpiCard (data-testid="live-kpi-card") ist im echten DOM gerendert');
    console.log(`✅ LiveKpiCard initial im DOM sichtbar: Text="${initialCard.text.substring(0, 60)}..."`);

    // 9. Live-Event via n8n einspeisen & Reaktivität im echten DOM abwarten
    console.log('\n[9/11] Browser-Reaktivitäts-Assertion: Sende Live-Event über n8n und warte DOM-Update ab...');
    const browserLiveEvent = {
      contractVersion: '1.0',
      provenance: 'live' as const,
      sourceSystem: testSource,
      eventId: `${testRunId}-browser-live-1`,
      correlationId: `${testRunId}-corr-browser-live-1`,
      kpiId: testKpiId,
      value: 7.25,
      unit: 'x',
      occurredAt: new Date().toISOString(),
      qualityStatus: 'valid' as const,
    };
    assert(validateLiveKpiEvent(browserLiveEvent).valid, 'Browser-Testevent entspricht G18-Vertrag');

    const liveWebhookRes = await sendJson(n8nWebhookUrl!, {
      method: 'POST',
      body: browserLiveEvent,
    });
    assert(liveWebhookRes.status === 200 || liveWebhookRes.status === 201, 'n8n Webhook akzeptiert Event');

    // Warte im DOM auf Wert 7,25 (oder 7.25)
    let domUpdated = false;
    let finalCardText = '';
    for (let attempt = 1; attempt <= 20; attempt++) {
      await sleep(500);
      const cardInfo = await getLiveKpiCardDomInfo(cdp, testKpiId);
      if (cardInfo.text.includes('7,25') || cardInfo.text.includes('7.25')) {
        domUpdated = true;
        finalCardText = cardInfo.text;
        break;
      }
    }
    assert(domUpdated, `LiveKpiCard im DOM aktualisiert über echten Realtime-Hook auf Wert 7.25 (Text: "${finalCardText}")`);
    // Badge trägt CSS text-transform: uppercase (Badge.tsx) — innerText liefert
    // den gerenderten Text ("LIVE REALTIME"), nicht den rohen Label-String.
    assert(/live realtime/i.test(finalCardText), 'LiveKpiCard zeigt Status-Badge "Live Realtime"');

    // 10. Kontrollierte Netzwerk-/Realtime-Unterbrechung & Reconnect
    console.log('\n[10/11] Reconnect-Assertion: Unterbreche Netzwerk (Offline) und stelle Verbindung wieder her...');
    // A1: Neue Verbindungsversuche blockieren (verhindert sofortigen Reconnect nach dem Disconnect unten)
    await cdp.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
    console.log('📡 Netzwerk auf OFFLINE gesetzt via CDP (blockiert neue Verbindungsversuche)');

    // A2: Bestehende Realtime-Verbindung real trennen. Network.emulateNetworkConditions
    // kappt nachweislich KEINE bereits offenen WebSocket-Verbindungen (per Debug-Test
    // gegen echte Supabase-Infrastruktur bestätigt: Kanal blieb 40s lang "live", obwohl
    // navigator.onLine bereits false war). Daher hier der echte, client-seitige Disconnect
    // über den Test-Hook aus supabaseClient.ts.
    const disconnectRes: any = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const client = window.__E2E_SUPABASE_CLIENT__;
        if (!client) return { ok: false, reason: 'Test-Hook window.__E2E_SUPABASE_CLIENT__ nicht gefunden' };
        client.realtime.disconnect();
        return { ok: true };
      })()`,
      returnByValue: true,
    });
    assert(
      disconnectRes?.result?.value?.ok === true,
      `Test-Hook trennt echte Realtime-Verbindung (${disconnectRes?.result?.value?.reason || 'ok'})`,
    );
    console.log('🔌 Echte Realtime-Verbindung über Test-Hook getrennt');

    let errorDetectedInDom = false;
    for (let attempt = 1; attempt <= 30; attempt++) {
      await sleep(500);
      const cardInfo = await getLiveKpiCardDomInfo(cdp, testKpiId);
      if (
        /verbindungsfehler/i.test(cardInfo.text) || // Badge-Label, CSS uppercase — siehe oben
        cardInfo.text.includes('Realtime-Verbindung unterbrochen') ||
        cardInfo.text.includes('vorübergehend nicht erreichbar')
      ) {
        errorDetectedInDom = true;
        assert(!cardInfo.text.includes('Error:'), 'Keine rohen Exception-Dumps im DOM bei Fehler');
        assert(!cardInfo.text.includes('stack'), 'Keine Stacktraces im DOM bei Fehler');
        break;
      }
    }
    assert(errorDetectedInDom, 'LiveKpiCard wechselt im DOM kontrolliert in den Fehlerstatus bei Netzwerkunterbrechung');

    // B: Online wiederherstellen
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
    console.log('📡 Netzwerk auf ONLINE zurückgesetzt via CDP');

    // Reconnect kann zusätzliche Zeit brauchen: Der Kanal befindet sich beim
    // Wiederherstellen ggf. noch in einem laufenden Backoff-Zyklus
    // (computeBackoffDelay, bis zu 30s Cap) aus der Offline-Phase. 80 × 500ms = 40s Marge.
    let reconnectedInDom = false;
    for (let attempt = 1; attempt <= 80; attempt++) {
      await sleep(500);
      const cardInfo = await getLiveKpiCardDomInfo(cdp, testKpiId);
      if (/live realtime/i.test(cardInfo.text) && (cardInfo.text.includes('7,25') || cardInfo.text.includes('7.25'))) {
        reconnectedInDom = true;
        break;
      }
    }
    assert(reconnectedInDom, 'LiveKpiCard erholt sich nach Reconnect und zeigt wieder "Live Realtime" mit aktuellem Snapshot');

    // 11. Weg- und Zurücknavigation ohne Subscription-Leaks
    console.log('\n[11/11] Navigation-Assertion: Wegnavigation zu /crm und Zurücknavigation zu /dashboard...');
    await cdp.send('Page.navigate', { url: `http://${HOST}:${previewPort}/crm` });
    await sleep(1500);

    const crmCard = await getLiveKpiCardDomInfo(cdp, testKpiId);
    assert(!crmCard.exists, 'LiveKpiCard existiert nach Wegnavigation zu /crm nicht mehr im DOM (Unmount)');

    await cdp.send('Page.navigate', { url: `http://${HOST}:${previewPort}/dashboard` });
    await sleep(500);

    // Poll statt fixem Sleep, gleicher Grund wie beim initialen Dashboard-Check oben.
    let dashboardCard = await getLiveKpiCardDomInfo(cdp, testKpiId);
    for (let attempt = 1; attempt <= 20 && !dashboardCard.exists; attempt++) {
      await sleep(500);
      dashboardCard = await getLiveKpiCardDomInfo(cdp, testKpiId);
    }
    assert(dashboardCard.exists, 'LiveKpiCard mountet nach Zurücknavigation sauber neu im DOM');

    // Sende weiteres Event nach Remount
    const secondBrowserEvent = {
      contractVersion: '1.0',
      provenance: 'live' as const,
      sourceSystem: testSource,
      eventId: `${testRunId}-browser-live-2`,
      correlationId: `${testRunId}-corr-browser-live-2`,
      kpiId: testKpiId,
      value: 8.10,
      unit: 'x',
      occurredAt: new Date().toISOString(),
      qualityStatus: 'valid' as const,
    };
    const preValidationSecond = validateLiveKpiEvent(secondBrowserEvent);
    assert(preValidationSecond.valid, 'Zweites Browser-Testevent entspricht G18-Vertrag');

    const secondWebhookRes = await sendJson(n8nWebhookUrl!, { method: 'POST', body: secondBrowserEvent });
    assert(
      secondWebhookRes.status === 200 || secondWebhookRes.status === 201,
      `n8n Webhook akzeptiert zweites Browser-Event (HTTP ${secondWebhookRes.status})`
    );

    let secondUpdateReceived = false;
    let lastCardTextAfterRemount = '';
    for (let attempt = 1; attempt <= 40; attempt++) {
      await sleep(500);
      const cardInfo = await getLiveKpiCardDomInfo(cdp, testKpiId);
      lastCardTextAfterRemount = cardInfo.text;
      // 8.10 ist als JS-Zahl identisch zu 8.1 (keine echte Nachkommastelle vorhanden) —
      // toLocaleString('de-DE') formatiert entsprechend ohne trailing Null als "8,1".
      if (cardInfo.text.includes('8,1') || cardInfo.text.includes('8.1')) {
        secondUpdateReceived = true;
        break;
      }
    }
    if (!secondUpdateReceived) {
      console.log('\n🔎 DIAGNOSE: Zweites Event nach Remount nach 20s nicht im DOM angekommen:');
      console.log('Letzter Kartentext:', lastCardTextAfterRemount);
      console.log('--- Erfasste Browser-Events (Console/Exceptions) ---');
      console.log(cdp.debugEvents.length ? cdp.debugEvents.slice(-20).join('\n') : '(keine erfasst)');
      console.log('---');
    }
    assert(secondUpdateReceived, 'LiveKpiCard empfängt nach Remount neue Realtime-Events ohne Leak');

    console.log('\n=======================================================');
    console.log('🎉 REALE BROWSER-E2E VERIFIKATION ERFOLGREICH BELEGT!');
    console.log('=======================================================\n');
  } finally {
    if (cdp) await cdp.close().catch(() => {});
    if (chromeProc) await stopProcess(chromeProc).catch(() => {});
    if (previewProc) await stopProcess(previewProc).catch(() => {});
    if (userDataDir) await removeDirWithRetry(userDataDir).catch(() => {});

    // Nach Testlauf: Build sauber in den unkonfigurierten Standardzustand zurückversetzen
    await new Promise<void>((resolve) => {
      const restoreProc = spawn('npm', ['run', 'build'], { cwd: process.cwd(), stdio: 'ignore' });
      restoreProc.on('exit', () => resolve());
    });
  }
}

runExternalSuite().catch((err) => {
  // P2: Sanitierte Fehlerausgabe ohne interne Payload-Dumps
  console.error('\n❌ EXTERNER E2E RUNNER FEHLGESCHLAGEN:');
  console.error(`  Grund: ${err.message || 'Unerwarteter Verbindungsfehler'}`);
  process.exit(1);
});
