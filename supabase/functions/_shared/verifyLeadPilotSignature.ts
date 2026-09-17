// G46 (Auftrag 067C, Step 3): Timing-sichere HMAC-SHA-256-Prüfung für den
// Live-KPI-Ingress (Design §10.1). Signatur über
// timestamp + "." + nonce + "." + rawBody, Fünf-Minuten-Fenster, Nonce-Einmaligkeit
// (über injizierbaren Store — produktiv DB-gestützt), Body-Limit und
// KPI-Allowlist aus dem Live-KPI-Katalog (12 IDs). Vor jedem privilegierten
// DB-Zugriff auszuführen.

export interface IngressHeaders {
  timestamp: string;
  nonce: string;
  signature: string;
}

export interface NonceStore {
  has(nonce: string): boolean;
  add(nonce: string, atMs: number): void;
}

export type IngressRejectCode =
  | 'INGEST_SIGNATURE_MISSING'
  | 'INGEST_SIGNATURE_INVALID'
  | 'INGEST_TIMESTAMP_INVALID'
  | 'INGEST_TIMESTAMP_EXPIRED'
  | 'INGEST_REPLAY_DETECTED'
  | 'INGEST_BODY_TOO_LARGE'
  | 'INGEST_KPI_UNKNOWN';

export type VerificationResult = { ok: true } | { ok: false; code: IngressRejectCode };

export const SIGNATURE_TIME_WINDOW_MS = 5 * 60 * 1000;
export const MAX_BODY_BYTES = 256 * 1024;

// Allowlist aus src/services/liveKpi/liveKpiDefinitions.ts (12 Katalog-KPIs).
export const ALLOWED_KPI_IDS: readonly string[] = [
  'arr',
  'mrr',
  'pipeline_coverage',
  'arr_direct',
  'arr_partner',
  'arr_outbound',
  'arr_other',
  'pipeline_leads',
  'pipeline_mql',
  'pipeline_sql',
  'pipeline_offers',
  'pipeline_won',
];

function fail(code: IngressRejectCode): VerificationResult {
  return { ok: false, code };
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifySignedRequest(
  rawBody: string,
  headers: IngressHeaders,
  secret: string,
  nowMs: number,
  nonceStore?: NonceStore,
): Promise<VerificationResult> {
  const timestamp = (headers.timestamp ?? '').trim();
  const nonce = (headers.nonce ?? '').trim();
  const signature = (headers.signature ?? '').trim().toLowerCase();
  if (!timestamp || !nonce || !signature) {
    return fail('INGEST_SIGNATURE_MISSING');
  }

  const bodyBytes = new TextEncoder().encode(rawBody).length;
  if (bodyBytes > MAX_BODY_BYTES) {
    return fail('INGEST_BODY_TOO_LARGE');
  }

  const atMs = Date.parse(timestamp);
  if (!Number.isFinite(atMs)) {
    return fail('INGEST_TIMESTAMP_INVALID');
  }
  if (Math.abs(nowMs - atMs) > SIGNATURE_TIME_WINDOW_MS) {
    return fail('INGEST_TIMESTAMP_EXPIRED');
  }

  const expected = await hmacSha256Hex(secret, `${timestamp}.${nonce}.${rawBody}`);
  if (!timingSafeEqualHex(signature, expected)) {
    return fail('INGEST_SIGNATURE_INVALID');
  }

  if (nonceStore) {
    if (nonceStore.has(nonce)) {
      return fail('INGEST_REPLAY_DETECTED');
    }
    nonceStore.add(nonce, nowMs);
  }

  try {
    const payload: unknown = JSON.parse(rawBody);
    const kpiId = typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>)['kpiId']
      : undefined;
    if (typeof kpiId !== 'string' || !ALLOWED_KPI_IDS.includes(kpiId)) {
      return fail('INGEST_KPI_UNKNOWN');
    }
  } catch {
    return fail('INGEST_KPI_UNKNOWN');
  }

  return { ok: true };
}
