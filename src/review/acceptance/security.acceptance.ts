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
  return outputs
    .flat()
    .map((edge) => edge?.node ?? '')
    .filter((name) => name.length > 0);
}

function isGuardNode(graph: WorkflowGraph, nodeName: string): boolean {
  const node = (graph.nodes ?? []).find((candidate) => candidate.name === nodeName);
  const haystack = `${node?.name ?? ''} ${JSON.stringify(node?.parameters ?? {})}`;
  return /hmac|signatur|signature|verify/i.test(haystack) && !/postgres/i.test(haystack);
}

function isPrivilegedDbNode(graph: WorkflowGraph, nodeName: string): boolean {
  const node = (graph.nodes ?? []).find((candidate) => candidate.name === nodeName);
  return /postgres/i.test(node?.name ?? '') || /postgres|database/i.test(node?.type ?? '');
}

function allIngressPaths(graph: WorkflowGraph): {
  webhooks: string[];
  dbNodes: string[];
  paths: string[][];
} {
  const nodes = graph.nodes ?? [];
  const webhooks = nodes
    .filter((node) => node.type === 'n8n-nodes-base.webhook' || /webhook/i.test(node.name ?? ''))
    .map((node) => node.name ?? '')
    .filter((name) => name.length > 0);
  const dbNodes = nodes
    .filter((node) => isPrivilegedDbNode(graph, node.name ?? ''))
    .map((node) => node.name ?? '')
    .filter((name) => name.length > 0);
  const paths: string[][] = [];
  const visit = (current: string, target: string, trail: string[]): void => {
    if (current === target) {
      paths.push(trail);
      return;
    }
    for (const next of successors(graph, current)) {
      if (!trail.includes(next)) {
        visit(next, target, [...trail, next]);
      }
    }
  };
  for (const webhook of webhooks) {
    for (const db of dbNodes) {
      visit(webhook, db, [webhook]);
    }
  }
  return { webhooks, dbNodes, paths };
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
      const rlsPattern = new RegExp(
        `ALTER TABLE\\s+(public\\.)?${table}\\s+ENABLE ROW LEVEL SECURITY`,
      );
      expect.soft(rlsPattern.test(schema), `${table}: RLS aktiviert`).toBe(true);
      const statements = schema.split(';');
      const tablePolicies = statements.filter((statement) =>
        new RegExp(`CREATE POLICY[\\s\\S]*ON\\s+(public\\.)?${table}\\b`).test(statement),
      );
      expect.soft(tablePolicies.length, `${table}: Policies vorhanden`).toBeGreaterThan(0);
      expect
        .soft(
          tablePolicies.some(
            (policy) => policy.includes('organization_id') && policy.includes('auth.uid()'),
          ),
          `${table}: Policy an Mandant und auth.uid() gebunden`,
        )
        .toBe(true);
      expect
        .soft(
          tablePolicies.some((policy) =>
            /organization_member|membership|user_role|app_role/.test(policy),
          ),
          `${table}: aktive Mitgliedschaft/Rolle geprüft`,
        )
        .toBe(true);
      expect
        .soft(
          tablePolicies.some((policy) => /USING\s*\(\s*true\s*\)/.test(policy)),
          `${table}: kein offener USING (true)-Read`,
        )
        .toBe(false);
      expect
        .soft(
          tablePolicies.some((policy) => /WITH CHECK\s*\(\s*true\s*\)/.test(policy)),
          `${table}: kein offener WITH CHECK (true)-Write`,
        )
        .toBe(false);
    }
  });

  it('[PR-INGEST-03] weist unsignierte Ingress-Anfragen ab', () => {
    const graph = readWorkflowGraph('tools/n8n/live-kpi-ingest.workflow.json');
    const ingress = allIngressPaths(graph);
    expect.soft(ingress.webhooks.length, 'Webhook-Nodes inventarisiert').toBeGreaterThan(0);
    expect.soft(ingress.dbNodes.length, 'privilegierte DB-Nodes inventarisiert').toBeGreaterThan(0);
    expect
      .soft(ingress.paths.length, 'alle Webhook→DB-Pfade im Verbindungsgraph')
      .toBeGreaterThan(0);
    for (const path of ingress.paths) {
      expect
        .soft(
          path.some((name) => isGuardNode(graph, name)),
          `Signaturprüfung auf dem Ingress-Pfad ${path.join(' → ')}`,
        )
        .toBe(true);
    }
    const guardNode = (graph.nodes ?? []).find((node) => isGuardNode(graph, node.name ?? ''));
    const guardText = JSON.stringify(guardNode?.parameters ?? {});
    expect.soft(guardText, 'Timestamp-Prüfung').toMatch(/timestamp/i);
    expect.soft(guardText, 'Nonce-Prüfung').toMatch(/nonce/i);
    expect.soft(guardText, "HMAC über timestamp + '.' + nonce + '.' + rawBody").toMatch(/rawBody/);
  });
});
