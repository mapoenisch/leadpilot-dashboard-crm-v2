// G46-Nacharbeit / Auftrag 153: Handler-Gegenfälle mit injizierter Fake-DB.
// Beweist:
// - Absender fehlt (401 INGEST_SENDER_MISSING)
// - Absender unbekannt (401 INGEST_SENDER_UNKNOWN)
// - Vertauschter Absender bricht Signatur (401 INGEST_SIGNATURE_INVALID)
// - Body mit organizationId wird mit 422 INGEST_ORGANIZATION_IN_BODY abgelehnt
// - Gültiger Request übergibt p_sender_id an RPC und p_source_system an Slot
// - Oversize wird per Content-Length vor dem Lesen abgewiesen (413)
// - parallele gleiche Nonces ergeben exakt einmal ok (Rest 401)
// - voller Bucket ergibt 429 aus genau einem atomaren Slot-Aufruf
import { assertEquals } from '@std/assert';
import { handleIngest, type IngressDb, type IngressSecrets } from '../_shared/ingressHandler.ts';
import { hmacSha256Hex } from '../_shared/verifyLeadPilotSignature.ts';

const SECRETS: IngressSecrets = {
  supabaseUrl: 'http://localhost:54321',
  serviceKey: 'service-role-test',
  ingestSenders: {
    'sender-test': 'handler-test-secret',
    'sender-other': 'other-test-secret',
  },
};
// Handler nutzt Date.now(): Fixture-Zeitstempel sind relativ zu jetzt.
const NOW = Date.now();

interface FakeDb extends IngressDb {
  slots: Map<string, number>;
  slotCalls: number;
  lastSlotSender?: string;
  lastIngestSender?: string;
}

function makeDb(): FakeDb {
  const slots = new Map<string, number>();
  const db: FakeDb = {
    slots,
    slotCalls: 0,
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'claim_ingress_slot') {
        db.slotCalls += 1;
        db.lastSlotSender = String(args['p_source_system'] ?? '');
        const nonce = String(args['p_nonce'] ?? '');
        const max = Number(args['p_max_per_minute'] ?? 120);
        if (slots.has(nonce)) {
          return { data: 'replay', error: null };
        }
        if (slots.size >= max) {
          return { data: 'rate_limited', error: null };
        }
        slots.set(nonce, Date.now());
        return { data: 'ok', error: null };
      }
      if (fn === 'ingest_live_kpi_event') {
        db.lastIngestSender = String(args['p_sender_id'] ?? '');
        return { data: { status: 'accepted' }, error: null };
      }
      return { data: null, error: new Error(`unbekannte RPC ${fn}`) };
    },
  };
  return db;
}

async function signedRequest(
  rawBody: string,
  nonce: string,
  sender = 'sender-test',
  secret: string = SECRETS.ingestSenders[sender] ?? 'unknown-secret',
  timestamp = new Date(NOW).toISOString(),
): Promise<Request> {
  const signature = await hmacSha256Hex(secret, `${sender}.${timestamp}.${nonce}.${rawBody}`);
  return new Request('http://localhost/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(new TextEncoder().encode(rawBody).length),
      'X-LeadPilot-Sender': sender,
      'X-LeadPilot-Timestamp': timestamp,
      'X-LeadPilot-Nonce': nonce,
      'X-LeadPilot-Signature': signature,
    },
    body: rawBody,
  });
}

function validBody(value = 411840): string {
  return JSON.stringify({ kpiId: 'arr', unit: 'EUR', sourceSystem: 'edge-test', value });
}

Deno.test('gültiger Request ergibt 201 mit genau einem Slot-Aufruf und übergibt sender an RPC und Slot', async () => {
  const db = makeDb();
  const res = await handleIngest(await signedRequest(validBody(), 'h-1', 'sender-test'), SECRETS, db);
  assertEquals(res.status, 201);
  assertEquals(db.slotCalls, 1);
  assertEquals(db.lastSlotSender, 'sender-test');
  assertEquals(db.lastIngestSender, 'sender-test');
});

Deno.test('fehlender Absender-Header ergibt 401 INGEST_SENDER_MISSING', async () => {
  const db = makeDb();
  const rawBody = validBody();
  const timestamp = new Date(NOW).toISOString();
  const nonce = 'h-nosender';
  const signature = await hmacSha256Hex(SECRETS.ingestSenders['sender-test'], `.${timestamp}.${nonce}.${rawBody}`);
  const req = new Request('http://localhost/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(new TextEncoder().encode(rawBody).length),
      'X-LeadPilot-Timestamp': timestamp,
      'X-LeadPilot-Nonce': nonce,
      'X-LeadPilot-Signature': signature,
    },
    body: rawBody,
  });
  const res = await handleIngest(req, SECRETS, db);
  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.error, 'INGEST_SENDER_MISSING');
  assertEquals(db.slotCalls, 0);
});

Deno.test('unbekannter Absender ergibt 401 INGEST_SENDER_UNKNOWN', async () => {
  const db = makeDb();
  const req = await signedRequest(validBody(), 'h-unknown', 'unregistered-sender', 'some-secret');
  const res = await handleIngest(req, SECRETS, db);
  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.error, 'INGEST_SENDER_UNKNOWN');
  assertEquals(db.slotCalls, 0);
});

Deno.test('vertauschter Absender bricht Signatur (401 INGEST_SIGNATURE_INVALID)', async () => {
  const db = makeDb();
  // Signiert mit Secret von sender-other, aber Header behauptet sender-test
  const req = await signedRequest(
    validBody(),
    'h-tampered-sender',
    'sender-test',
    SECRETS.ingestSenders['sender-other'],
  );
  const res = await handleIngest(req, SECRETS, db);
  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.error, 'INGEST_SIGNATURE_INVALID');
  assertEquals(db.slotCalls, 0);
});

Deno.test('Body mit organizationId wird mit 422 INGEST_ORGANIZATION_IN_BODY abgelehnt', async () => {
  const db = makeDb();
  const bodyWithOrg = JSON.stringify({
    kpiId: 'arr',
    unit: 'EUR',
    sourceSystem: 'edge-test',
    value: 100,
    organizationId: '00000000-0000-0000-0000-000000000001',
  });
  const req = await signedRequest(bodyWithOrg, 'h-body-org');
  const res = await handleIngest(req, SECRETS, db);
  assertEquals(res.status, 422);
  const data = await res.json();
  assertEquals(data.error, 'INGEST_ORGANIZATION_IN_BODY');
  assertEquals(db.slotCalls, 0);
});

Deno.test('Body mit organization_id wird mit 422 INGEST_ORGANIZATION_IN_BODY abgelehnt', async () => {
  const db = makeDb();
  const bodyWithOrg = JSON.stringify({
    kpiId: 'arr',
    unit: 'EUR',
    sourceSystem: 'edge-test',
    value: 100,
    organization_id: '00000000-0000-0000-0000-000000000001',
  });
  const req = await signedRequest(bodyWithOrg, 'h-body-org-snake');
  const res = await handleIngest(req, SECRETS, db);
  assertEquals(res.status, 422);
  const data = await res.json();
  assertEquals(data.error, 'INGEST_ORGANIZATION_IN_BODY');
  assertEquals(db.slotCalls, 0);
});

Deno.test('Oversize per Content-Length ergibt 413 ohne DB-Kontakt', async () => {
  const db = makeDb();
  const rawBody = validBody();
  const req = await signedRequest(rawBody, 'h-big');
  const oversized = new Request(req, {
    headers: {
      ...Object.fromEntries(req.headers.entries()),
      'Content-Length': String(300 * 1024),
    },
  });
  const res = await handleIngest(oversized, SECRETS, db);
  assertEquals(res.status, 413);
  assertEquals(db.slotCalls, 0);
});

Deno.test('parallele gleiche Nonces ergeben exakt einmal ok', async () => {
  const db = makeDb();
  const rawBody = validBody();
  const timestamp = new Date(NOW).toISOString();
  const sender = 'sender-test';
  const signature = await hmacSha256Hex(
    SECRETS.ingestSenders[sender],
    `${sender}.${timestamp}.race-nonce.${rawBody}`,
  );
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': String(new TextEncoder().encode(rawBody).length),
    'X-LeadPilot-Sender': sender,
    'X-LeadPilot-Timestamp': timestamp,
    'X-LeadPilot-Nonce': 'race-nonce',
    'X-LeadPilot-Signature': signature,
  };
  const results = await Promise.all(
    Array.from(
      { length: 5 },
      () =>
        handleIngest(
          new Request('http://localhost/ingest', { method: 'POST', headers, body: rawBody }),
          SECRETS,
          db,
        ),
    ),
  );
  const okCount = results.filter((res) => res.status === 201).length;
  const replayCount = results.filter((res) => res.status === 401).length;
  assertEquals(okCount, 1);
  assertEquals(replayCount, 4);
});

Deno.test('voller Bucket ergibt 429', async () => {
  const db = makeDb();
  const first = await handleIngest(await signedRequest(validBody(), 'r-1'), SECRETS, db, {
    rateLimitPerMinute: 1,
  });
  assertEquals(first.status, 201);
  const second = await handleIngest(await signedRequest(validBody(), 'r-2'), SECRETS, db, {
    rateLimitPerMinute: 1,
  });
  assertEquals(second.status, 429);
});

Deno.test('fehlende Secrets ergeben 500', async () => {
  const db = makeDb();
  const res = await handleIngest(await signedRequest(validBody(), 'h-nosec'), null, db);
  assertEquals(res.status, 500);
});

Deno.test('fachlich ungültige Payload ergibt 422', async () => {
  const db = makeDb();
  const rawBody = JSON.stringify({
    kpiId: 'arr',
    unit: 'count',
    sourceSystem: 'edge-test',
    value: 1,
  });
  const res = await handleIngest(await signedRequest(rawBody, 'h-422'), SECRETS, db);
  assertEquals(res.status, 422);
  assertEquals(db.slotCalls, 0);
});
