// G46-Nacharbeit (Review): Handler-Gegenfälle mit injizierter Fake-DB.
// Beweist: Oversize wird per Content-Length vor dem Lesen abgewiesen (413),
// parallele gleiche Nonces ergeben exakt einmal ok (Rest 401), voller Bucket
// ergibt 429 aus genau einem atomaren Slot-Aufruf.
import { assertEquals } from '@std/assert';
import { handleIngest, type IngressDb, type IngressSecrets } from '../_shared/ingressHandler.ts';
import { hmacSha256Hex } from '../_shared/verifyLeadPilotSignature.ts';

const SECRETS: IngressSecrets = {
  supabaseUrl: 'http://localhost:54321',
  serviceKey: 'service-role-test',
  ingestSecret: 'handler-test-secret',
};
// Handler nutzt Date.now(): Fixture-Zeitstempel sind relativ zu jetzt.
const NOW = Date.now();

interface FakeDb extends IngressDb {
  slots: Map<string, number>;
  slotCalls: number;
}

function makeDb(): FakeDb {
  const slots = new Map<string, number>();
  const db: FakeDb = {
    slots,
    slotCalls: 0,
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'claim_ingress_slot') {
        db.slotCalls += 1;
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
  timestamp = new Date(NOW).toISOString(),
): Promise<Request> {
  const signature = await hmacSha256Hex(SECRETS.ingestSecret, `${timestamp}.${nonce}.${rawBody}`);
  return new Request('http://localhost/ingest', {
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
}

function validBody(value = 411840): string {
  return JSON.stringify({ kpiId: 'arr', value });
}

Deno.test('gültiger Request ergibt 201 mit genau einem Slot-Aufruf', async () => {
  const db = makeDb();
  const res = await handleIngest(await signedRequest(validBody(), 'h-1'), SECRETS, db);
  assertEquals(res.status, 201);
  assertEquals(db.slotCalls, 1);
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
  const signature = await hmacSha256Hex(SECRETS.ingestSecret, `${timestamp}.race-nonce.${rawBody}`);
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': String(new TextEncoder().encode(rawBody).length),
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
