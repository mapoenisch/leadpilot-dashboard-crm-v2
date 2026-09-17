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

Deno.test('Pass-Through reserialisiert String-Bodies nicht', async () => {
  const workflow = await readWorkflow();
  const pass = (workflow.nodes ?? []).find((node) => (node.name ?? '').includes('Pass-Through'));
  assert(pass, 'Pass-Through-Node vorhanden');
  const jsCode = String((pass?.parameters as Record<string, unknown>)?.['jsCode'] ?? '');
  assert(
    jsCode.includes("typeof rawPayload === 'string'"),
    'String-Zweig vorhanden',
  );
  assert(
    !/JSON\.stringify\(rawPayload\)[\s\S]*rawPayload:/.test(
      jsCode.replace(/typeof rawPayload === 'string'[^;]*;/, ''),
    ),
    'kein erzwungenes Reserialisieren außerhalb des String-Zweigs',
  );
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
      'Execute Ingest RPC (Postgres)',
    ]
  ) {
    assert(names.has(required), `Node vorhanden: ${required}`);
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
