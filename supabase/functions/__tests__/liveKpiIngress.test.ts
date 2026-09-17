// G46 (Auftrag 067C, Steps 1-2): Vertragsfälle für den signierten
// Live-KPI-Ingress (Design §10.1). TDD-rot vor Implementierung von
// verifySignedRequest: gültig, unsigned, manipuliert, älter als fünf Minuten,
// Nonce-Replay, zu großer Body, unbekannte KPI.
import { assertEquals } from '@std/assert';
import {
  type IngressHeaders,
  type NonceStore,
  validateKpiPayload,
  verifySignedRequest,
} from '../_shared/verifyLeadPilotSignature.ts';

const SECRET = 'test-secret-nur-fuer-tests';
const NOW = Date.parse('2026-09-17T12:00:00.000Z');

function makeStore(): NonceStore & { seen: Set<string> } {
  const seen = new Set<string>();
  return {
    seen,
    has: (nonce: string) => seen.has(nonce),
    add: (nonce: string) => {
      seen.add(nonce);
    },
  };
}

async function sign(
  timestamp: string,
  nonce: string,
  rawBody: string,
  secret: string = SECRET,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${nonce}.${rawBody}`),
  );
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function validBody(): string {
  return JSON.stringify({ kpiId: 'arr', value: 411840 });
}

async function validHeaders(
  store?: NonceStore,
): Promise<{ headers: IngressHeaders; store: NonceStore & { seen: Set<string> } }> {
  const s = store ?? makeStore();
  const timestamp = new Date(NOW).toISOString();
  const nonce = `nonce-${Math.random().toString(36).slice(2)}`;
  const rawBody = validBody();
  return {
    headers: {
      timestamp,
      nonce,
      signature: await sign(timestamp, nonce, rawBody),
    },
    store: s as NonceStore & { seen: Set<string> },
  };
}

Deno.test('gültiger signierter Request wird akzeptiert', async () => {
  const { headers, store } = await validHeaders();
  const result = await verifySignedRequest(validBody(), headers, SECRET, NOW, store);
  assertEquals(result.ok, true);
});

Deno.test('fehlende Signatur-Header werden abgewiesen', async () => {
  const store = makeStore();
  const result = await verifySignedRequest(
    validBody(),
    { timestamp: new Date(NOW).toISOString(), nonce: 'n1', signature: '' },
    SECRET,
    NOW,
    store,
  );
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.code, 'INGEST_SIGNATURE_MISSING');
  }
});

Deno.test('manipulierte Signatur wird abgewiesen', async () => {
  const { headers, store } = await validHeaders();
  const tampered = { ...headers, signature: '0'.repeat(64) };
  const result = await verifySignedRequest(validBody(), tampered, SECRET, NOW, store);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.code, 'INGEST_SIGNATURE_INVALID');
  }
});

Deno.test('manipulierter Body wird abgewiesen', async () => {
  const { headers, store } = await validHeaders();
  const other = JSON.stringify({ kpiId: 'arr', value: 999999 });
  const result = await verifySignedRequest(other, headers, SECRET, NOW, store);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.code, 'INGEST_SIGNATURE_INVALID');
  }
});

Deno.test('Request älter als fünf Minuten wird abgewiesen', async () => {
  const store = makeStore();
  const timestamp = new Date(NOW - 6 * 60 * 1000).toISOString();
  const nonce = 'old-nonce-1';
  const rawBody = validBody();
  const headers = { timestamp, nonce, signature: await sign(timestamp, nonce, rawBody) };
  const result = await verifySignedRequest(rawBody, headers, SECRET, NOW, store);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.code, 'INGEST_TIMESTAMP_EXPIRED');
  }
});

Deno.test('wiederholte Nonce wird als Replay abgewiesen', async () => {
  const store = makeStore();
  const first = await validHeaders(store);
  const okFirst = await verifySignedRequest(validBody(), first.headers, SECRET, NOW, store);
  assertEquals(okFirst.ok, true);
  const replay = await verifySignedRequest(validBody(), first.headers, SECRET, NOW, store);
  assertEquals(replay.ok, false);
  if (!replay.ok) {
    assertEquals(replay.code, 'INGEST_REPLAY_DETECTED');
  }
});

Deno.test('zu großer Body wird abgewiesen', async () => {
  const { headers, store } = await validHeaders();
  const big = `{"kpiId":"arr","value":1,"pad":"${'x'.repeat(300 * 1024)}"}`;
  const result = await verifySignedRequest(big, headers, SECRET, NOW, store);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.code, 'INGEST_BODY_TOO_LARGE');
  }
});

Deno.test('unbekannte KPI wird abgewiesen', async () => {
  const store = makeStore();
  const timestamp = new Date(NOW).toISOString();
  const nonce = 'unknown-kpi-1';
  const rawBody = JSON.stringify({ kpiId: 'nope_nonexistent', value: 1 });
  const headers = { timestamp, nonce, signature: await sign(timestamp, nonce, rawBody) };
  const result = await verifySignedRequest(rawBody, headers, SECRET, NOW, store);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.code, 'INGEST_KPI_UNKNOWN');
  }
});

Deno.test('Fachvalidierung akzeptiert vollständigen gültigen Payload', () => {
  const result = validateKpiPayload({
    kpiId: 'arr',
    unit: 'EUR',
    sourceSystem: 'n8n',
    value: 411840,
  });
  assertEquals(result, { ok: true });
});

Deno.test('Fachvalidierung weist falsche Einheit ab', () => {
  const result = validateKpiPayload({ kpiId: 'arr', unit: 'count', value: 1 });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.code, 'INGEST_KPI_UNIT_MISMATCH');
  }
});

Deno.test('Fachvalidierung weist ungültige Quelle ab', () => {
  const result = validateKpiPayload({ kpiId: 'arr', sourceSystem: 'böse quelle!', value: 1 });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.code, 'INGEST_KPI_SOURCE_INVALID');
  }
});

Deno.test('Fachvalidierung weist unplausible Werte ab', () => {
  for (const value of [Number.NaN, -1, 1e13, 'viel']) {
    const result = validateKpiPayload({ kpiId: 'mrr', value });
    assertEquals(result.ok, false, `Wert abgewiesen: ${String(value)}`);
    if (!result.ok) {
      assertEquals(result.code, 'INGEST_KPI_VALUE_INVALID');
    }
  }
});
