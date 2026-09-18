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

interface HubSpotEdge {
  node?: string;
}

interface HubSpotGraph extends HubSpotWorkflow {
  connections?: Record<string, { main?: HubSpotEdge[][] }>;
}

function graphSuccessors(graph: HubSpotGraph, nodeName: string): string[] {
  const outputs = graph.connections?.[nodeName]?.main ?? [];
  return outputs
    .flat()
    .map((edge) => edge?.node ?? '')
    .filter((name) => name.length > 0);
}

function reaches(graph: HubSpotGraph, from: string, to: string): boolean {
  const visited = new Set<string>();
  const queue = [from];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);
    if (current === to) {
      return true;
    }
    queue.push(...graphSuccessors(graph, current));
  }
  return false;
}

function nodesOnCycle(graph: HubSpotGraph): Set<string> {
  const names = (graph.nodes ?? [])
    .map((node) => node.name ?? '')
    .filter((name) => name.length > 0);
  const onCycle = new Set<string>();
  const visit = (name: string, stack: string[]): void => {
    if (stack.includes(name)) {
      for (const member of stack.slice(stack.indexOf(name))) {
        onCycle.add(member);
      }
      return;
    }
    for (const next of graphSuccessors(graph, name)) {
      visit(next, [...stack, name]);
    }
  };
  for (const name of names) {
    visit(name, []);
  }
  return onCycle;
}

function readGraph(): HubSpotGraph {
  return readWorkflow() as HubSpotGraph;
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

    const graph = readGraph();
    expect
      .soft(
        reaches(graph, 'Fetch Companies', 'Map & Validate Envelope'),
        'Graph-Pfad Fetch→Map belegt (Verbindungsgraph ausgewertet)',
      )
      .toBe(true);
    const cycleNodes = nodesOnCycle(graph);
    for (const fetchName of ['Fetch Companies', 'Fetch Contacts', 'Fetch Deals']) {
      expect.soft(cycleNodes.has(fetchName), `Paging-Zyklus umfasst ${fetchName}`).toBe(true);
    }
    expect
      .soft(JSON.stringify(workflow), 'Cursor paging.next.after verdrahtet')
      .toContain('paging.next.after');

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

  it('[PR-HUBSPOT-11] Map läuft genau einmal über Fan-in (kein unvollständiger Envelope)', () => {
    const graph = readGraph();
    const connections = graph.connections ?? {};

    // Alle Vorgänger von Map & Validate (exakt ein Fan-in-Knoten).
    const predecessors = Object.entries(connections)
      .filter(([, outputs]) =>
        (outputs?.main ?? []).flat().some((edge) => edge?.node === 'Map & Validate Envelope'),
      )
      .map(([name]) => name);
    expect(predecessors, 'genau ein Vorgänger (Fan-in) vor Map').toEqual(['Merge Envelopes']);

    // Alle drei Terminalpfade (IF-false) münden in den Fan-in.
    for (const moreName of ['More Companies?', 'More Contacts?', 'More Deals?']) {
      const falseBranch = (connections[moreName]?.main ?? [])[1] ?? [];
      expect(
        falseBranch.map((edge) => edge?.node),
        `${moreName}-false führt in den Fan-in`,
      ).toEqual(['Merge Envelopes']);
    }

    // Der Fan-in sammelt aus allen drei Ketten (kein direkter Fetch-Pfad).
    const mergeIncoming = Object.entries(connections)
      .filter(([, outputs]) =>
        (outputs?.main ?? []).flat().some((edge) => edge?.node === 'Merge Envelopes'),
      )
      .map(([name]) => name)
      .sort();
    expect(mergeIncoming, 'Fan-in aus allen drei Ketten').toEqual([
      'More Companies?',
      'More Contacts?',
      'More Deals?',
    ]);
  });
});
