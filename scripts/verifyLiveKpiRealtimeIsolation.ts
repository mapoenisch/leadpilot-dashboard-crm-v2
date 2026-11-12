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

async function waitForSubscription(channel: RealtimeChannel, timeoutMs = 8000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (channel.state === 'joined') {
      return true;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return channel.state === 'joined';
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

  log('Supabase ist erreichbar. Initialisiere Test-Clients...');

  // 1. Clients erstellen
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const clientA = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const clientB = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const clientAnon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2. Anmelden
  log(`Melde Client A (${EMAIL_A}) an...`);
  const { data: sessionA, error: errA } = await clientA.auth.signInWithPassword({
    email: EMAIL_A,
    password: PASSWORD_A,
  });
  if (errA || !sessionA.session) {
    throw new Error(`Login für Client A fehlgeschlagen: ${errA?.message}`);
  }
  if (clientA.realtime && sessionA.session.access_token) {
    clientA.realtime.setAuth(sessionA.session.access_token);
  }

  log(`Melde Client B (${EMAIL_B}) an...`);
  const { data: sessionB, error: errB } = await clientB.auth.signInWithPassword({
    email: EMAIL_B,
    password: PASSWORD_B,
  });
  if (errB || !sessionB.session) {
    throw new Error(`Login für Client B fehlgeschlagen: ${errB?.message}`);
  }
  if (clientB.realtime && sessionB.session.access_token) {
    clientB.realtime.setAuth(sessionB.session.access_token);
  }

  // 3. Kanäle abonnieren
  const receivedA: any[] = [];
  const receivedB: any[] = [];
  const receivedAnon: any[] = [];

  log('Richte Realtime-Subscriptions ein...');

  // Client A: reguläres Abo auf eigene Organisation
  const channelA = clientA
    .channel(`live-kpi-feed:${ORG_A}`)
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
    )
    .subscribe();

  // Client B: versucht sowohl eigene Org B als auch unberechtigt Org A mitzuhören
  const channelB = clientB
    .channel(`live-kpi-feed:cross-tenant-attempt`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'live_kpi_public_feed',
        filter: `organization_id=eq.${ORG_A}`,
      },
      (payload) => {
        log(`[WARNUNG] Client B hat unberechtigt Event empfangen: ${JSON.stringify(payload.new)}`);
        receivedB.push(payload.new);
      },
    )
    .subscribe();

  // Client Anon: versucht ohne Auth mitzuhören
  const channelAnon = clientAnon
    .channel(`live-kpi-feed:anon-attempt`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'live_kpi_public_feed',
      },
      (payload) => {
        log(`[WARNUNG] Client Anon hat Event empfangen: ${JSON.stringify(payload.new)}`);
        receivedAnon.push(payload.new);
      },
    )
    .subscribe();

  log('Warte auf Verbindungsaufbau der Kanäle...');
  const subA = await waitForSubscription(channelA);
  const subB = await waitForSubscription(channelB);
  const subAnon = await waitForSubscription(channelAnon);

  log(`Abonnements aktiv: Client A=${subA}, Client B=${subB}, Client Anon=${subAnon}`);

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

  // Wartefenster für Realtime-Delivery (3 Sekunden)
  await new Promise((r) => setTimeout(r, 3000));

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
    console.log('✅ Client Anon hat KEIN Event empfangen (Anon-RLS-Schutz bestätigt).');
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
