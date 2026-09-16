// G44 (Auftrag 067A, Block C): Rote Sicherheitsverträge für Auth, RLS und
// Ingress. Bewusst rot — friert den bestätigten Mangel als Sollvertrag ein.
// Produktdateien werden dafür nicht verändert.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function readRepo(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf-8');
}

interface WorkflowNode {
  name?: string;
  type?: string;
  parameters?: Record<string, unknown>;
}

interface WorkflowEdge {
  node?: string;
}

interface WorkflowGraph {
  nodes?: WorkflowNode[];
  connections?: Record<string, { main?: WorkflowEdge[][] }>;
}

function readWorkflowGraph(relativePath: string): WorkflowGraph {
  return JSON.parse(readRepo(relativePath)) as WorkflowGraph;
}

function successors(graph: WorkflowGraph, nodeName: string): string[] {
  const outputs = graph.connections?.[nodeName]?.main ?? [];
  return outputs.flat().map((edge) => edge?.node ?? '').filter((name) => name.length > 0);
}

function isGuardNode(graph: WorkflowGraph, nodeName: string): boolean {
  const node = (graph.nodes ?? []).find((candidate) => candidate.name === nodeName);
  const haystack = `${node?.name ?? ''} ${JSON.stringify(node?.parameters ?? {})}`;
  return /hmac|signatur|signature|verify/i.test(haystack) && !/postgres/i.test(haystack);
}

function ingressPath(graph: WorkflowGraph): { path: string[]; guardOnPath: boolean } {
  const nodes = graph.nodes ?? [];
  const starts = nodes
    .filter((node) => node.type === 'n8n-nodes-base.webhook' || /webhook/i.test(node.name ?? ''))
    .map((node) => node.name ?? '');
  const postgres = nodes.find((node) => /postgres/i.test(node.name ?? ''))?.name ?? '';
  const visited = new Set<string>();
  const queue: Array<{ name: string; path: string[] }> = starts.map((name) => ({ name, path: [name] }));
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current.name)) {
      continue;
    }
    visited.add(current.name);
    if (current.name === postgres && postgres.length > 0) {
      return {
        path: current.path,
        guardOnPath: current.path.some((name) => isGuardNode(graph, name)),
      };
    }
    for (const next of successors(graph, current.name)) {
      queue.push({ name: next, path: [...current.path, next] });
    }
  }
  return { path: [], guardOnPath: false };
}

describe('v2.3.0 security findings', () => {
  it('[PR-AUTH-01] nutzt serverseitig prüfbare Supabase-Sitzungen', () => {
    const authContextSource = readRepo('src/auth/AuthContext.tsx');
    const localAuthSource = readRepo('src/auth/localAuthAdapter.ts');
    expect(authContextSource).not.toContain("from './localAuthAdapter'");
    expect(localAuthSource).not.toContain('localStorage.setItem');
    expect(localAuthSource).not.toContain("DEFAULT_DEMO_PASSWORD = 'demo'");
  });

  it('[PR-RLS-02] begrenzt Reads auf die eigene Organisation', () => {
    const schema = readRepo('supabase/schema.sql');
    const tenantTables = ['companies', 'contacts', 'imported_funnel_deals'];
    for (const table of tenantTables) {
      const blockPattern = new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(([\\s\\S]*?)\\);`);
      const block = blockPattern.exec(schema)?.[1] ?? '';
      expect.soft(block, `${table}: Tabellendefinition vorhanden`).not.toBe('');
      expect.soft(block, `${table}: eigene organization_id-Spalte`).toContain('organization_id');
      const rlsPattern = new RegExp(`ALTER TABLE\\s+(public\\.)?${table}\\s+ENABLE ROW LEVEL SECURITY`);
      expect.soft(rlsPattern.test(schema), `${table}: RLS aktiviert`).toBe(true);
      const statements = schema.split(';');
      const tablePolicies = statements.filter((statement) =>
        new RegExp(`CREATE POLICY[\\s\\S]*ON\\s+(public\\.)?${table}\\b`).test(statement),
      );
      expect.soft(tablePolicies.length, `${table}: Policies vorhanden`).toBeGreaterThan(0);
      expect.soft(
        tablePolicies.some((policy) => policy.includes('organization_id')),
        `${table}: organisationsgebundene Policy`,
      ).toBe(true);
      expect.soft(
        tablePolicies.some((policy) => /USING\s*\(\s*true\s*\)/.test(policy)),
        `${table}: kein offener USING (true)-Read`,
      ).toBe(false);
      expect.soft(
        tablePolicies.some((policy) => /WITH CHECK\s*\(\s*true\s*\)/.test(policy)),
        `${table}: kein offener WITH CHECK (true)-Write`,
      ).toBe(false);
    }
  });

  it('[PR-INGEST-03] weist unsignierte Ingress-Anfragen ab', () => {
    const graph = readWorkflowGraph('tools/n8n/live-kpi-ingest.workflow.json');
    const nodeNames = (graph.nodes ?? []).map((node) => node.name ?? '');
    expect.soft(nodeNames.some((name) => name.includes('Postgres')), 'Postgres-Node vorhanden').toBe(
      true,
    );
    const ingress = ingressPath(graph);
    expect.soft(ingress.path.length, 'Webhook→Postgres-Pfad im Verbindungsgraph').toBeGreaterThan(0);
    expect.soft(ingress.guardOnPath, 'Signaturprüfung auf dem Ingress-Pfad').toBe(true);
    const guardNode = (graph.nodes ?? []).find((node) => isGuardNode(graph, node.name ?? ''));
    const guardText = JSON.stringify(guardNode?.parameters ?? {});
    expect.soft(guardText, 'Timestamp-Prüfung').toMatch(/timestamp/i);
    expect.soft(guardText, 'Nonce-Prüfung').toMatch(/nonce/i);
    expect.soft(guardText, "HMAC über timestamp + '.' + nonce + '.' + rawBody").toMatch(/rawBody/);
  });
});
