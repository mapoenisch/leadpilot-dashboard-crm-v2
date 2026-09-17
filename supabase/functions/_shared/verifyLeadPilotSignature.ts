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
  | 'INGEST_KPI_UNKNOWN'
  | 'INGEST_KPI_UNIT_MISMATCH'
  | 'INGEST_KPI_SOURCE_INVALID'
  | 'INGEST_KPI_VALUE_INVALID';

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

// Einheit je KPI (aus liveKpiDefinitions) + plausible Wertebereiche (Design
// §10.1: finite Zahl, nicht negativ, Obergrenze 1e12 für alle KPIs).
export const KPI_UNITS: Record<string, 'EUR' | 'x' | 'count'> = {
  arr: 'EUR',
  mrr: 'EUR',
  pipeline_coverage: 'x',
  arr_direct: 'EUR',
  arr_partner: 'EUR',
  arr_outbound: 'EUR',
  arr_other: 'EUR',
  pipeline_leads: 'count',
  pipeline_mql: 'count',
  pipeline_sql: 'count',
  pipeline_offers: 'count',
  pipeline_won: 'count',
};

export const MAX_KPI_VALUE = 1e12;
const IDENTIFIER_PATTERN = /^[a-zA-Z0-9._-]{1,128}$/;

export type KpiRejectCode =
  | 'INGEST_KPI_UNKNOWN'
  | 'INGEST_KPI_UNIT_MISMATCH'
  | 'INGEST_KPI_SOURCE_INVALID'
  | 'INGEST_KPI_VALUE_INVALID';

export interface KpiValidation {
  ok: boolean;
  code?: KpiRejectCode;
}

// Fachvalidierung VOR jedem privilegierten DB-Zugriff (Design §10.1):
// KPI-ID aus Allowlist, Einheit passend, Quelle im Identifier-Format,
// Wert endlich und im plausiblen Bereich.
export function validateKpiPayload(payload: unknown): KpiValidation {
  if (typeof payload !== 'object' || payload === null) {
    return { ok: false, code: 'INGEST_KPI_UNKNOWN' };
  }
  const record = payload as Record<string, unknown>;
  const kpiId = record['kpiId'];
  if (typeof kpiId !== 'string' || !ALLOWED_KPI_IDS.includes(kpiId)) {
    return { ok: false, code: 'INGEST_KPI_UNKNOWN' };
  }
  if ('unit' in record && record['unit'] !== undefined && record['unit'] !== KPI_UNITS[kpiId]) {
    return { ok: false, code: 'INGEST_KPI_UNIT_MISMATCH' };
  }
  const source = record['sourceSystem'];
  if (source !== undefined && (typeof source !== 'string' || !IDENTIFIER_PATTERN.test(source))) {
    return { ok: false, code: 'INGEST_KPI_SOURCE_INVALID' };
  }
  const value = record['value'];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_KPI_VALUE) {
    return { ok: false, code: 'INGEST_KPI_VALUE_INVALID' };
  }
  return { ok: true };
}

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
    const validation = validateKpiPayload(payload);
    if (!validation.ok) {
      return fail(validation.code ?? 'INGEST_KPI_UNKNOWN');
    }
  } catch {
    return fail('INGEST_KPI_UNKNOWN');
  }

  return { ok: true };
}
