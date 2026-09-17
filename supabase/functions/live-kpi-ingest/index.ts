// G46 (Auftrag 067C, Step 3): Supabase-seitiger Live-KPI-Ingress (Design §10.1).
// Ablauf: Header prüfen (HMAC-SHA-256, 5-Minuten-Fenster, Body-Limit,
// KPI-Allowlist) → Rate-Limit → Nonce-Claim (DB, atomar) → Ingest-RPC.
// Secrets ausschließlich aus Function-Secrets (Umgebung), niemals im Code.
// Antwortcodes: 201 angenommen, 200 Duplikat, 401 Signatur/Replay,
// 422 Rejection, 413 Body-Limit, 429 Rate-Limit.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { verifySignedRequest } from '../_shared/verifyLeadPilotSignature.ts';

const RATE_LIMIT_PER_MINUTE = 120;

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function readSecret(name: string): string {
  const value = Deno.env.get(name) ?? '';
  if (!value) {
    throw new Error(`Function-Secret ${name} fehlt.`);
  }
  return value;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'METHOD_NOT_ALLOWED' });
  }
  let supabaseUrl: string;
  let serviceKey: string;
  let ingestSecret: string;
  try {
    supabaseUrl = readSecret('SUPABASE_URL');
    serviceKey = readSecret('SUPABASE_SERVICE_ROLE_KEY');
    ingestSecret = readSecret('LEADPILOT_INGEST_SECRET');
  } catch {
    return jsonResponse(500, { error: 'INGEST_NOT_CONFIGURED' });
  }

  const rawBody = await req.text();
  const verification = await verifySignedRequest(
    rawBody,
    {
      timestamp: req.headers.get('X-LeadPilot-Timestamp') ?? '',
      nonce: req.headers.get('X-LeadPilot-Nonce') ?? '',
      signature: req.headers.get('X-LeadPilot-Signature') ?? '',
    },
    ingestSecret,
    Date.now(),
  );
  if (!verification.ok) {
    switch (verification.code) {
      case 'INGEST_BODY_TOO_LARGE':
        return jsonResponse(413, { error: verification.code });
      case 'INGEST_SIGNATURE_MISSING':
      case 'INGEST_SIGNATURE_INVALID':
      case 'INGEST_TIMESTAMP_INVALID':
      case 'INGEST_TIMESTAMP_EXPIRED':
      case 'INGEST_REPLAY_DETECTED':
        return jsonResponse(401, { error: verification.code });
      case 'INGEST_KPI_UNKNOWN':
        return jsonResponse(422, { error: verification.code });
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: recentCount, error: rateError } = await supabase.rpc(
    'ingress_nonce_count_last_minute',
    { p_source_system: 'edge' },
  );
  if (rateError || (typeof recentCount === 'number' && recentCount >= RATE_LIMIT_PER_MINUTE)) {
    return jsonResponse(429, { error: 'RATE_LIMITED' });
  }

  const nonce = req.headers.get('X-LeadPilot-Nonce') ?? '';
  const { data: fresh, error: claimError } = await supabase.rpc('claim_ingress_nonce', {
    p_nonce: nonce,
    p_organization_id: null,
    p_source_system: 'edge',
  });
  if (claimError || fresh !== true) {
    return jsonResponse(401, { error: 'INGEST_REPLAY_DETECTED' });
  }

  const { data: ingested, error: ingestError } = await supabase.rpc('ingest_live_kpi_event', {
    p_event: JSON.parse(rawBody) as Record<string, unknown>,
  });
  if (ingestError) {
    return jsonResponse(500, { error: 'INGEST_FAILED' });
  }
  const status = (ingested as { status?: string } | null)?.status ?? 'accepted';
  if (status === 'duplicate') {
    return jsonResponse(200, { status });
  }
  if (status === 'rejected') {
    return jsonResponse(422, { status, detail: ingested });
  }
  return jsonResponse(201, { status });
});
