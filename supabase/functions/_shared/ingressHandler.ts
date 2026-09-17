// G46-Nacharbeit (Review): Produktiver Ingress-Handler mit injizierbaren
// Abhängigkeiten (testbar ohne DB/Netzwerk).
// - Body-Limit ressourcenschonend: Content-Length wird vor dem Lesen geprüft;
//   ohne Längenangabe wird gestreamt und bei Überschreitung abgebrochen — der
//   komplette Body landet nie unbegrenzt im Speicher.
// - Rate-Limit atomar: genau ein Server-Roundtrip (claim_ingress_slot gibt
//   ok/replay/rate_limited aus einer Transaktion zurück) statt getrennter
//   Count- und Claim-Aufrufe (keine TOCTOU-Lücke).
import { MAX_BODY_BYTES, verifySignedRequest } from './verifyLeadPilotSignature.ts';

export const RATE_LIMIT_PER_MINUTE = 120;

export interface IngressSecrets {
  supabaseUrl: string;
  serviceKey: string;
  ingestSecret: string;
}

export interface IngressDb {
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: unknown }>;
}

export interface IngressOptions {
  rateLimitPerMinute?: number;
}

type SlotStatus = 'ok' | 'replay' | 'rate_limited';

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function readBoundedBody(req: Request): Promise<{ ok: true; text: string } | { ok: false }> {
  const lengthHeader = req.headers.get('content-length');
  if (lengthHeader !== null) {
    const declared = Number(lengthHeader);
    if (!Number.isFinite(declared) || declared < 0) {
      return { ok: false };
    }
    if (declared > MAX_BODY_BYTES) {
      return { ok: false };
    }
  }
  if (!req.body) {
    const text = await req.text();
    return text.length <= MAX_BODY_BYTES ? { ok: true, text } : { ok: false };
  }
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return { ok: false };
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(merged) };
}

export async function handleIngest(
  req: Request,
  secrets: IngressSecrets | null,
  db: IngressDb | null,
  options: IngressOptions = {},
): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'METHOD_NOT_ALLOWED' });
  }
  if (!secrets || !db) {
    return jsonResponse(500, { error: 'INGEST_NOT_CONFIGURED' });
  }
  const body = await readBoundedBody(req);
  if (!body.ok) {
    return jsonResponse(413, { error: 'INGEST_BODY_TOO_LARGE' });
  }
  const verification = await verifySignedRequest(
    body.text,
    {
      timestamp: req.headers.get('X-LeadPilot-Timestamp') ?? '',
      nonce: req.headers.get('X-LeadPilot-Nonce') ?? '',
      signature: req.headers.get('X-LeadPilot-Signature') ?? '',
    },
    secrets.ingestSecret,
    Date.now(),
  );
  if (!verification.ok) {
    switch (verification.code) {
      case 'INGEST_BODY_TOO_LARGE':
        return jsonResponse(413, { error: verification.code });
      case 'INGEST_KPI_UNKNOWN':
        return jsonResponse(422, { error: verification.code });
      default:
        return jsonResponse(401, { error: verification.code });
    }
  }

  const nonce = (req.headers.get('X-LeadPilot-Nonce') ?? '').trim();
  const slot = await db.rpc('claim_ingress_slot', {
    p_nonce: nonce,
    p_organization_id: null,
    p_source_system: 'edge',
    p_max_per_minute: options.rateLimitPerMinute ?? RATE_LIMIT_PER_MINUTE,
  });
  if (slot.error) {
    return jsonResponse(500, { error: 'INGEST_FAILED' });
  }
  const status = slot.data as SlotStatus;
  if (status === 'replay') {
    return jsonResponse(401, { error: 'INGEST_REPLAY_DETECTED' });
  }
  if (status === 'rate_limited') {
    return jsonResponse(429, { error: 'RATE_LIMITED' });
  }

  const { data: ingested, error: ingestError } = await db.rpc('ingest_live_kpi_event', {
    p_event: JSON.parse(body.text) as Record<string, unknown>,
  });
  if (ingestError) {
    return jsonResponse(500, { error: 'INGEST_FAILED' });
  }
  const ingestStatus = (ingested as { status?: string } | null)?.status ?? 'accepted';
  if (ingestStatus === 'duplicate') {
    return jsonResponse(200, { status: ingestStatus });
  }
  if (ingestStatus === 'rejected') {
    return jsonResponse(422, { status: ingestStatus, detail: ingested });
  }
  return jsonResponse(201, { status: ingestStatus });
}
