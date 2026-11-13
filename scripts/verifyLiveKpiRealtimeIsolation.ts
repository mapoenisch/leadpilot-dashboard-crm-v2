/**
 * Verifikationsskript: Realtime-Mandantenisolation (Auftrag 153 §8)
 *
 * Belegt die RLS- und Adapter-gestützte Isolation von Supabase Realtime
 * mit drei gleichzeitigen Clients:
 *   1. Client A: Angemeldet als Mitglied von Organisation A (admin-a@e2e.local)
 *   2. Client B: Angemeldet als Mitglied von Organisation B (admin-b@e2e.local)
 *   3. Client Anon: Unangemeldet (nur Anon-Key)
 *
 * Ablauf:
 *   - Alle drei Clients abonnieren Realtime-Events auf `live_kpi_public_feed`.
 *   - Client A abonniert mandantengebunden für Organisation A.
 *   - Client B abonniert (eigene Organisation B und versucht unbefugt Org A mitzuhören).
 *   - Client Anon abonniert ohne Sitzung.
 *   - Ein Event wird für Organisation A eingefügt.
 *   - Assertion:
 *       Client A empfängt das Event.
 *       Client B empfängt 0 Events (Mandantentrennung via Filter & RLS).
 *       Client Anon empfängt 0 Events (RLS verwehrt Anon den Lesezugriff).
 *
 * Aufruf:
 *   npx tsx scripts/verifyLiveKpiRealtimeIsolation.ts
 *   Optionen: --fail-if-offline (bricht mit Exit 1 ab, falls Supabase nicht läuft)
 */

import { createClient, type RealtimeChannel } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.E2E_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON_KEY =
  process.env.E2E_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const SERVICE_ROLE_KEY = process.env.E2E_CLEANUP_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const ORG_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const EMAIL_A = process.env.E2E_AUTH_EMAIL || 'admin-a@e2e.local';
const PASSWORD_A = process.env.E2E_AUTH_PASSWORD || 'TestPassword123!';

const EMAIL_B = process.env.E2E_AUTH_EMAIL_B || 'admin-b@e2e.local';
const PASSWORD_B = process.env.E2E_AUTH_PASSWORD_B || 'TestPassword123!';

const failIfOffline = process.argv.includes('--fail-if-offline');

function log(msg: string) {
  console.log(`[Realtime-Isolation] ${msg}`);
}

async function isSupabaseReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/rest/v1/`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

interface SubscribeResult {
  status: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';
  error?: Error;
}

function subscribeAndAwait(channel: RealtimeChannel, timeoutMs = 15000): Promise<SubscribeResult> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ status: 'TIMED_OUT', error: new Error(`Subscription timed out after ${timeoutMs}ms`) });
      }
    }, timeoutMs);

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({ status: 'SUBSCRIBED' });
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({ status, error: err });
        }
      }
    });
  });
}

async function run() {
  log(`Prüfe Erreichbarkeit von Supabase unter ${SUPABASE_URL}...`);
  const reachable = await isSupabaseReachable(SUPABASE_URL);
  if (!reachable) {
    if (failIfOffline) {
      console.error(`❌ FEHLER: Supabase ist unter ${SUPABASE_URL} nicht erreichbar (--fail-if-offline gesetzt).`);
      process.exit(1);
    } else {
      console.log(`ℹ️ Supabase unter ${SUPABASE_URL} nicht erreichbar. Überspringe Realtime-Nachweis (Docker/supabase start erforderlich).`);
      process.exit(0);
    }
  }

  if (!ANON_KEY || !SERVICE_ROLE_KEY) {
    if (failIfOffline) {
      console.error('❌ FEHLER: ANON_KEY oder SERVICE_ROLE_KEY fehlt in Umgebungsvariablen.');
      process.exit(1);
    } else {
      console.log('ℹ️ Keine API-Keys gesetzt. Überspringe Realtime-Nachweis.');
      process.exit(0);
    }
  }

  log('Supabase ist erreichbar. Authentifiziere Testbenutzer...');

  // 1. Authentifizierung durchführen
  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  log(`Melde Client A (${EMAIL_A}) an...`);
  const { data: sessionA, error: errA } = await authClient.auth.signInWithPassword({
    email: EMAIL_A,
    password: PASSWORD_A,
  });
  if (errA || !sessionA.session?.access_token) {
    throw new Error(`Login für Client A fehlgeschlagen: ${errA?.message}`);
  }
  const tokenA = sessionA.session.access_token;

  log(`Melde Client B (${EMAIL_B}) an...`);
  const { data: sessionB, error: errB } = await authClient.auth.signInWithPassword({
    email: EMAIL_B,
    password: PASSWORD_B,
  });
  if (errB || !sessionB.session?.access_token) {
    throw new Error(`Login für Client B fehlgeschlagen: ${errB?.message}`);
  }
  const tokenB = sessionB.session.access_token;

  // 2. Clients mit fest verdrahtetem JWT initialisieren
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const clientA = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${tokenA}` } },
    accessToken: async () => tokenA,
  });
  await clientA.realtime.setAuth(tokenA);

  const clientB = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${tokenB}` } },
    accessToken: async () => tokenB,
  });
  await clientB.realtime.setAuth(tokenB);

  const clientAnon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 3. Kanäle abonnieren
  const receivedA: any[] = [];
  const receivedB: any[] = [];
  const receivedAnon: any[] = [];

  log('Richte Realtime-Subscriptions ein...');

  // Client A: reguläres Abo auf eigene Organisation
  const channelA = clientA
    .channel(`live-kpi-feed:${ORG_A}`, {
      config: {
        postgres_changes_options: { wait: true },
      },
    })
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'live_kpi_public_feed',
        filter: `organization_id=eq.${ORG_A}`,
      },
      (payload) => {
        log(`Client A empfängt Event: ${JSON.stringify(payload.new)}`);
        receivedA.push(payload.new);
      },
    );

  // Client B: versucht unberechtigt Org A mitzuhören
  const channelB = clientB
    .channel(`live-kpi-feed:cross-tenant-attempt`, {
      config: {
        postgres_changes_options: { wait: true },
      },
    })
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'live_kpi_public_feed',
        filter: `organization_id=eq.${ORG_A}`,
      },
      (payload) => {
        const row = payload?.new as Record<string, unknown> | undefined;
        if (row && Object.keys(row).length > 0 && row.id) {
          log(`[WARNUNG] Client B hat unberechtigt Event empfangen: ${JSON.stringify(row)}`);
          receivedB.push(row);
        } else {
          log('Client B hat kein Fremdmandanten-Event empfangen (RLS-Filterung aktiv).');
        }
      },
    );

  // Client Anon: versucht ohne Auth mitzuhören
  const channelAnon = clientAnon
    .channel(`live-kpi-feed:anon-attempt`, {
      config: {
        postgres_changes_options: { wait: true },
      },
    })
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'live_kpi_public_feed',
      },
      (payload) => {
        const row = payload?.new as Record<string, unknown> | undefined;
        if (row && Object.keys(row).length > 0 && row.id) {
          log(`[WARNUNG] Client Anon hat unberechtigt Daten empfangen: ${JSON.stringify(row)}`);
          receivedAnon.push(row);
        } else {
          log('Client Anon hat leeres CDC-Signal ohne Zeilendaten empfangen (RLS-Schutz aktiv).');
        }
      },
    );

  log('Warte auf serverseitige Bestätigung der Abonnements (SUBSCRIBED)...');
  const [resA, resB, resAnon] = await Promise.all([
    subscribeAndAwait(channelA),
    subscribeAndAwait(channelB),
    subscribeAndAwait(channelAnon),
  ]);

  log(`Abonnement-Status: Client A=${resA.status}, Client B=${resB.status}, Client Anon=${resAnon.status}`);

  if (resA.status !== 'SUBSCRIBED') {
    throw new Error(`Client A konnte Kanal nicht abonnieren (${resA.status}): ${resA.error?.message}`);
  }
  if (resB.status !== 'SUBSCRIBED') {
    throw new Error(`Client B konnte Kanal nicht abonnieren (${resB.status}): ${resB.error?.message}`);
  }
  if (resAnon.status !== 'SUBSCRIBED') {
    log(`Hinweis: Client Anon wurde serverseitig abgewiesen (${resAnon.status}) — keine Berechtigung.`);
  }

  // Kurze Pause zur Sicherstellung der Replikations-Bereitschaft
  await new Promise((r) => setTimeout(r, 500));

  // 4. Test-Event für Organisation A einfügen
  const testKpiValue = Math.floor(Math.random() * 1000000) + 100000;
  const now = new Date().toISOString();

  log(`Füge Test-Event in Org A ein (value=${testKpiValue})...`);
  const { data: inserted, error: insertError } = await adminClient
    .from('live_kpi_public_feed')
    .insert({
      organization_id: ORG_A,
      kpi_id: 'arr',
      value: testKpiValue,
      unit: 'EUR',
      occurred_at: now,
      quality_status: 'valid',
      source_system: 'realtime-isolation-verifier',
      ingested_at: now,
    })
    .select('id')
    .single();

  if (insertError || !inserted?.id) {
    throw new Error(`Einfügen des Test-Events fehlgeschlagen: ${insertError?.message}`);
  }

  const insertedId = inserted.id;
  log(`Test-Event mit ID ${insertedId} angelegt. Warte auf Realtime-Zustellung...`);

  // Wartefenster für Realtime-Delivery (bis zu 6 Sekunden, Polling alle 200ms)
  const waitStart = Date.now();
  while (Date.now() - waitStart < 6000 && receivedA.length === 0) {
    await new Promise((r) => setTimeout(r, 200));
  }
  // Zusätzliche Karenzzeit (1,5 Sekunden), um auszuschließen, dass verzögerte Fremd-Events für B oder Anon eintreffen
  await new Promise((r) => setTimeout(r, 1500));

  // 5. Aufräumen
  log('Lösche Test-Event und baue Kanäle ab...');
  await adminClient.from('live_kpi_public_feed').delete().eq('id', insertedId);
  await clientA.removeChannel(channelA);
  await clientB.removeChannel(channelB);
  await clientAnon.removeChannel(channelAnon);

  // 6. Auswertung der Isolation
  console.log('\n=======================================================');
  console.log('📊 REALTIME MANDANTENISOLATION ERGEBNIS');
  console.log('=======================================================');
  console.log(`Client A (Org A, berechtigt):   ${receivedA.length} Events empfangen (erwartet: 1)`);
  console.log(`Client B (Org B, fremd):         ${receivedB.length} Events empfangen (erwartet: 0)`);
  console.log(`Client Anon (unangemeldet):      ${receivedAnon.length} Events empfangen (erwartet: 0)`);
  console.log('=======================================================\n');

  let failed = false;

  if (receivedA.length === 1 && receivedA[0]?.value === testKpiValue) {
    console.log('✅ Client A hat das eigene Mandanten-Event korrekt empfangen.');
  } else {
    console.error(`❌ Client A: Erwartet 1 Event mit value=${testKpiValue}, erhalten: ${receivedA.length}`);
    failed = true;
  }

  if (receivedB.length === 0) {
    console.log('✅ Client B hat KEIN Fremd-Event empfangen (Mandantentrennung bestätigt).');
  } else {
    console.error(`❌ SICHERHEITSFEHLER: Client B hat ${receivedB.length} Fremdereignisse empfangen!`);
    failed = true;
  }

  if (receivedAnon.length === 0) {
    if (resAnon.status === 'SUBSCRIBED') {
      console.log('✅ Client Anon war verbunden, hat aber KEIN Event empfangen (RLS-Filterung bestätigt).');
    } else {
      console.log('✅ Client Anon wurde bereits am Kanal abgewiesen (Abonnement ohne Berechtigung unterbunden).');
    }
  } else {
    console.error(`❌ SICHERHEITSFEHLER: Client Anon hat ${receivedAnon.length} Ereignisse empfangen!`);
    failed = true;
  }

  if (failed) {
    console.error('\n❌ REALTIME MANDANTENISOLATION NICHT ERFÜLLT.');
    process.exit(1);
  } else {
    console.log('\n🎉 REALTIME MANDANTENISOLATION ERFOLGREICH BELEGT.');
  }
}

run().catch((err) => {
  console.error('❌ Unerwarteter Fehler beim Realtime-Nachweis:', err);
  process.exit(1);
});
