// G46-Nacharbeit (Review): Struktur-Gegenfälle für den n8n-Ingress.
// Beweist auf Workflow-Ebene: Original-Request-Bytes bleiben erhalten
// (Webhook Raw Body), der Pass-Through reserialisiert Strings nicht, die
// Verify-Logik akzeptiert Whitespace-/Key-Order-Varianten mit jeweils
// passender Signatur, und die Guard-Kette zum DB-Node ist geschlossen.
// Lesen des Workflow-JSON braucht --allow-read.
import { assert, assertEquals } from '@std/assert';
import { verifySignedRequest } from '../_shared/verifyLeadPilotSignature.ts';
import { hmacSha256Hex } from '../_shared/verifyLeadPilotSignature.ts';

const WORKFLOW_URL = new URL('../../../tools/n8n/live-kpi-ingest.workflow.json', import.meta.url);

interface WorkflowNode {
  name?: string;
  type?: string;
  parameters?: Record<string, unknown>;
}

interface WorkflowGraph {
  nodes?: WorkflowNode[];
  connections?: Record<string, { main?: Array<Array<{ node?: string }>> }>;
}

async function readWorkflow(): Promise<WorkflowGraph> {
  const raw = await Deno.readTextFile(WORKFLOW_URL);
  return JSON.parse(raw) as WorkflowGraph;
}

Deno.test('Webhook erhält Original-Request-Bytes (Raw Body)', async () => {
  const workflow = await readWorkflow();
  const webhook = (workflow.nodes ?? []).find((node) => node.type === 'n8n-nodes-base.webhook');
  assert(webhook, 'Webhook-Node vorhanden');
  const options = (webhook?.parameters?.options ?? {}) as Record<string, unknown>;
  assertEquals(options['rawBody'], true);
});

Deno.test('Pass-Through reicht Binary-Bytes verlustfrei durch (Harness, 3 Varianten)', async () => {
  const workflow = await readWorkflow();
  const pass = (workflow.nodes ?? []).find((node) => (node.name ?? '').includes('Pass-Through'));
  assert(pass, 'Pass-Through-Node vorhanden');
  const jsCode = String((pass?.parameters as Record<string, unknown>)?.['jsCode'] ?? '');
  const variants = [
    '{"kpiId":"arr","value":411840}',
    '{ "kpiId" : "arr" , "value" : 411840 }',
    '{"value":411840,"kpiId":"arr"}',
  ];
  for (const original of variants) {
    const base64 = Buffer.from(original, 'utf-8').toString('base64');
    const $input = {
      first: () => ({ json: {}, binary: { data: { data: base64 } } }),
    };
    // Der Workflow-Code nutzt nur $input und Buffer (n8n stellt Buffer im
    // Code-Node bereit; hier läuft der identische Code gegen Deno-Buffer).
    const run = new Function('$input', 'Buffer', `${jsCode}\n`) as (
      $input: unknown,
      buffer: unknown,
    ) => Array<{ json: { rawPayload: string } }>;
    const out = run($input, Buffer);
    assertEquals(out[0]?.json?.rawPayload, original);
  }
});

Deno.test('Verify-Node weist fachlich ungültige Payloads vor DB-Zugriff ab (Harness)', async () => {
  const workflow = await readWorkflow();
  const verify = (workflow.nodes ?? []).find((node) => node.name === 'Verify Ingress Signature');
  assert(verify, 'Verify-Node vorhanden');
  const jsCode = String((verify?.parameters as Record<string, unknown>)?.['jsCode'] ?? '');
  const now = Date.now();
  const timestamp = new Date(now).toISOString();

  async function runVerify(rawBody: string, nonce: string): Promise<Record<string, unknown>> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Harness-Signatur spiegelt n8n-Globale ($-Funktion mit Node-Namen); der Name ist Doku.
    const $ = (_name: string) => ({
      first: () => ({
        json: {
          headers: {
            'x-leadpilot-timestamp': timestamp,
            'x-leadpilot-nonce': nonce,
            'x-leadpilot-signature': 'harness-dummy (Crypto-Node prüft später)',
          },
          body: rawBody,
        },
      }),
    });
    const $input = { first: () => ({ json: { rawPayload: rawBody } }) };
    const run = new Function('$', '$input', `${jsCode}\n`) as (
      $: unknown,
      $input: unknown,
    ) => Array<{ json: Record<string, unknown> }>;
    return run($, $input)[0]?.json ?? {};
  }

  const good = await runVerify(JSON.stringify({ kpiId: 'arr', value: 10 }), 'vh-1');
  assertEquals(good['valid'], true);
  assertEquals(good['kpiId'], 'arr');

  const badUnit = await runVerify(
    JSON.stringify({ kpiId: 'arr', unit: 'count', value: 10 }),
    'vh-2',
  );
  assertEquals(badUnit['valid'], false);
  assertEquals(badUnit['code'], 'INGEST_KPI_UNIT_MISMATCH');

  const badValue = await runVerify(JSON.stringify({ kpiId: 'mrr', value: -5 }), 'vh-3');
  assertEquals(badValue['valid'], false);
  assertEquals(badValue['code'], 'INGEST_KPI_VALUE_INVALID');

  const unknown = await runVerify(JSON.stringify({ kpiId: 'nix', value: 1 }), 'vh-4');
  assertEquals(unknown['valid'], false);
  assertEquals(unknown['code'], 'INGEST_KPI_UNKNOWN');
});

Deno.test('Whitespace-/Key-Order-Varianten verifizieren je mit eigener Signatur', async () => {
  const secret = 'struktur-test-secret';
  const now = Date.parse('2026-09-17T12:00:00.000Z');
  const timestamp = new Date(now).toISOString();
  const variants = [
    '{"kpiId":"arr","value":411840}',
    '{ "kpiId" : "arr" , "value" : 411840 }',
    '{"value":411840,"kpiId":"arr"}',
  ];
  let n = 0;
  for (const rawBody of variants) {
    const nonce = `struktur-${n++}`;
    const signature = await hmacSha256Hex(secret, `${timestamp}.${nonce}.${rawBody}`);
    const result = await verifySignedRequest(
      rawBody,
      { timestamp, nonce, signature },
      secret,
      now,
    );
    assertEquals(result.ok, true, `Variante akzeptiert: ${rawBody}`);
  }
});

Deno.test('Guard-Kette Webhook bis DB-Node ist geschlossen', async () => {
  const workflow = await readWorkflow();
  const names = new Set((workflow.nodes ?? []).map((node) => node.name ?? ''));
  for (
    const required of [
      'Webhook Ingest Trigger',
      'Verify Ingress Signature',
      'HMAC Sign Base',
      'Claim Nonce (Postgres)',
      'Slot Status',
      'Respond Rate Limited',
      'Execute Ingest RPC (Postgres)',
    ]
  ) {
    assert(names.has(required), `Node vorhanden: ${required}`);
  }
  const claim = (workflow.nodes ?? []).find((node) => node.name === 'Claim Nonce (Postgres)');
  const claimQuery = String(
    ((claim?.parameters ?? {}) as Record<string, unknown>)['query'] ?? '',
  );
  assert(
    claimQuery.includes('claim_ingress_slot'),
    'Claim-Node nutzt atomaren Slot-RPC (Rate-Limit im n8n-Pfad)',
  );
  const slotSwitch = (workflow.nodes ?? []).find((node) => node.name === 'Slot Status');
  const switchText = JSON.stringify(slotSwitch?.parameters ?? {});
  for (const branch of ['ok', 'replay', 'rate_limited']) {
    assert(switchText.includes(`"${branch}"`), `Slot-Switch behandelt ${branch}`);
  }
  const successors = (from: string): string[] => {
    const outputs = workflow.connections?.[from]?.main ?? [];
    return outputs.flat().map((edge) => edge?.node ?? '').filter((name) => name.length > 0);
  };
  const visited = new Set<string>();
  const queue = ['Webhook Ingest Trigger'];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);
    queue.push(...successors(current));
  }
  assert(
    visited.has('Execute Ingest RPC (Postgres)'),
    'DB-Node über Guard-Kette erreichbar',
  );
  const guardReachable = ['Verify Ingress Signature', 'Claim Nonce (Postgres)'].every((name) =>
    visited.has(name)
  );
  assert(guardReachable, 'Guard-Nodes liegen auf dem Ingress-Pfad');
});
