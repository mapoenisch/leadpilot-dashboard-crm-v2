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

function readWorkflowNodes(relativePath: string): WorkflowNode[] {
  const workflow = JSON.parse(readRepo(relativePath)) as { nodes?: WorkflowNode[] };
  return Array.isArray(workflow.nodes) ? workflow.nodes : [];
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
      expect(schema, `${table}: Organisationsspalte`).toContain('organization_id');
    }
    expect(schema).not.toContain('USING (true)');
    expect(schema).not.toContain('WITH CHECK (true)');
  });

  it('[PR-INGEST-03] weist unsignierte Ingress-Anfragen ab', () => {
    const nodes = readWorkflowNodes('tools/n8n/live-kpi-ingest.workflow.json');
    const nodeNames = nodes.map((node) => node.name ?? '');
    const postgresIndex = nodeNames.findIndex((name) => name.includes('Postgres'));
    expect(postgresIndex, 'Postgres-Node vorhanden').toBeGreaterThanOrEqual(0);
    const guardIndex = nodeNames.findIndex(
      (name) => /signatur|hmac|verify/i.test(name) && !name.includes('Postgres'),
    );
    expect(guardIndex, 'Signaturprüfung vor dem Postgres-Node').toBeGreaterThanOrEqual(0);
    expect(guardIndex).toBeLessThan(postgresIndex);
    const workflow = JSON.parse(readRepo('tools/n8n/live-kpi-ingest.workflow.json')) as {
      nodes?: WorkflowNode[];
    };
    const guardNode = (workflow.nodes ?? [])[guardIndex];
    const guardText = JSON.stringify(guardNode?.parameters ?? {});
    expect(guardText, 'Timestamp-Prüfung').toMatch(/timestamp/i);
    expect(guardText, 'Nonce-Prüfung').toMatch(/nonce/i);
    expect(guardText, "HMAC über timestamp + '.' + nonce + '.' + rawBody").toMatch(/rawBody/);
  });
});
