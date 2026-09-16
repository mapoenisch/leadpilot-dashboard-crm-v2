// G44 (Auftrag 067A, Block C): Roter HubSpot-Importvertrag. Bewusst rot —
// friert Limit-100-, LOST-Fallback- und Integritätsmängel als Sollvertrag ein.
// Der Workflow wird als JSON geparst, nicht als Stringdatei gelesen. Genau ein
// maßgeblicher Test pro Finding-ID; Detailassertions laufen per soft weiter,
// damit alle Ursachen im Report stehen.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

interface WorkflowNode {
  name?: string;
  type?: string;
  parameters?: {
    url?: string;
    queryParameters?: { parameters?: Array<{ name?: string; value?: string }> };
    jsCode?: string;
  };
}

interface HubSpotWorkflow {
  nodes?: WorkflowNode[];
}

function readWorkflow(): HubSpotWorkflow {
  const raw = readFileSync(
    resolve(repoRoot, 'tools/n8n/generate-baseline-hubspot.workflow.json'),
    'utf-8',
  );
  return JSON.parse(raw) as HubSpotWorkflow;
}

function codeOf(workflow: HubSpotWorkflow, namePart: string): string {
  const node = (workflow.nodes ?? []).find((candidate) => candidate.name?.includes(namePart));
  return node?.parameters?.jsCode ?? '';
}

describe('v2.3.0 hubspot import findings', () => {
  it('[PR-HUBSPOT-10] paginiert vollständig, quarantäniert Stages und weist Integrität nach', () => {
    const workflow = readWorkflow();
    const fetches = (workflow.nodes ?? []).filter(
      (node) => node.type === 'n8n-nodes-base.httpRequest',
    );
    expect.soft(fetches.length, 'drei Fetch-Nodes vorhanden').toBe(3);
    for (const node of fetches) {
      const params = node.parameters?.queryParameters?.parameters ?? [];
      const names = params.map((param) => param?.name ?? '');
      expect.soft(names, `${node.name}: kein einzelner limit=100-Request`).toContain('after');
    }
    const loopTypes = (workflow.nodes ?? []).map((node) => node.type ?? '');
    expect.soft(loopTypes, 'Paging-Schleife vorhanden').toContain('n8n-nodes-base.splitInBatches');

    const mapCode = codeOf(workflow, 'Map & Validate');
    expect.soft(mapCode, 'JSON-Parsing selbst gelungen').toContain('STAGE_MAP');
    expect.soft(mapCode, 'kein stiller LOST-Fallback').not.toContain("|| 'LOST'");

    const assertCode = codeOf(workflow, 'Assert Integrity');
    expect.soft(assertCode, 'Assert-Node vorhanden').toContain('envelope');
    expect.soft(assertCode, 'Deal-Referenzen geprüft').toContain('importedFunnelDeals');
    expect.soft(assertCode, 'Zeitraum validiert').toMatch(/periodStart|2026-01-01/);
    expect.soft(mapCode, '429-Backoff vorhanden').toMatch(/429/);
    expect.soft(mapCode, 'Abbruchsignal/Maximallaufzeit vorhanden').toMatch(/abortsignal|timeout/i);
  });
});
