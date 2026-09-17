// G46 (Auftrag 067C, Step 3): Supabase-seitiger Live-KPI-Ingress (Design §10.1).
// Dünne Verdrahtung: Secrets aus Function-Secrets, Handler aus _shared mit
// atomarem Rate-Claim (ein RPC-Roundtrip), Ingest-RPC für Events.
// Antwortcodes: 201 angenommen, 200 Duplikat, 401 Signatur/Replay,
// 422 Rejection, 413 Body-Limit, 429 Rate-Limit, 500 ohne Konfiguration.
// Typprüfung beim Deploy (`supabase functions deploy`); lokale Vertragstests
// in ../__tests__/ingressHandler.test.ts.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleIngest } from '../_shared/ingressHandler.ts';

function readSecret(name: string): string {
  const value = Deno.env.get(name) ?? '';
  if (!value) {
    throw new Error(`Function-Secret ${name} fehlt.`);
  }
  return value;
}

Deno.serve(async (req: Request): Promise<Response> => {
  let secrets;
  try {
    secrets = {
      supabaseUrl: readSecret('SUPABASE_URL'),
      serviceKey: readSecret('SUPABASE_SERVICE_ROLE_KEY'),
      ingestSecret: readSecret('LEADPILOT_INGEST_SECRET'),
    };
  } catch {
    return new Response(JSON.stringify({ error: 'INGEST_NOT_CONFIGURED' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const supabase = createClient(secrets.supabaseUrl, secrets.serviceKey);
  return handleIngest(req, secrets, {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      const { data, error } = await supabase.rpc(fn, args);
      return { data: data as unknown, error: error as unknown };
    },
  });
});
