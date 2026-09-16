// G44 (Auftrag 067A, Block A): Unveränderliches v2.3.0-Finding-Register.
// IDs, Zielgates und Titel werden nach G44 nicht umbenannt. Ein späterer
// Auftrag darf nur den erwarteten Status von 'failing' auf 'passing' ändern
// und muss denselben Sollvertrag grün erfüllen.
export type V23FindingId =
  | 'PR-AUTH-01'
  | 'PR-RLS-02'
  | 'PR-INGEST-03'
  | 'PR-SOURCE-04'
  | 'PR-SEED-05'
  | 'PR-BASELINE-06'
  | 'PR-FREEZE-07'
  | 'PR-PERSIST-08'
  | 'PR-WORKER-09'
  | 'PR-HUBSPOT-10'
  | 'PR-SEMANTIC-11'
  | 'PR-A11Y-12'
  | 'PR-CLIP-13'
  | 'PR-ASSET-14'
  | 'PR-DEPENDENCY-15'
  | 'PR-QUALITY-16'
  | 'PR-RELEASE-17'
  | 'PR-CI-18'
  | 'PR-LICENSE-19'
  | 'PR-BRANCH-20';

export type V23FindingStatus = 'failing' | 'passing';

export interface V23FindingContract {
  id: V23FindingId;
  title: string;
  severity: 'critical' | 'important';
  targetGate: `G${number}`;
  runner: 'vitest' | 'playwright';
  expected: V23FindingStatus;
}

const gateById: Record<V23FindingId, `G${number}`> = {
  'PR-AUTH-01': 'G45',
  'PR-RLS-02': 'G45',
  'PR-INGEST-03': 'G46',
  'PR-SOURCE-04': 'G47',
  'PR-SEED-05': 'G46',
  'PR-BASELINE-06': 'G48',
  'PR-FREEZE-07': 'G48',
  'PR-PERSIST-08': 'G49',
  'PR-WORKER-09': 'G50',
  'PR-HUBSPOT-10': 'G51',
  'PR-SEMANTIC-11': 'G55',
  'PR-A11Y-12': 'G56',
  'PR-CLIP-13': 'G56',
  'PR-ASSET-14': 'G56',
  'PR-DEPENDENCY-15': 'G57',
  'PR-QUALITY-16': 'G57',
  'PR-RELEASE-17': 'G58',
  'PR-CI-18': 'G58',
  'PR-LICENSE-19': 'G65',
  'PR-BRANCH-20': 'G58',
};

const titleById: Record<V23FindingId, string> = {
  'PR-AUTH-01': 'Browser-/Demo-Auth und manipulierbare LocalStorage-Sitzung',
  'PR-RLS-02': 'öffentliche Reads und fehlende Organisationsgrenze in RLS',
  'PR-INGEST-03': 'n8n-Ingress ohne HMAC, Timestamp und Nonce',
  'PR-SOURCE-04': 'stiller Demo-Fallback und mögliche Quellenmischung',
  'PR-SEED-05': 'nicht-atomarer Browser-Seeder mit öffentlichen Schreibpfaden',
  'PR-BASELINE-06': 'Baseline wird erfasst, aber nicht in die Engine eingespeist',
  'PR-FREEZE-07': 'nur flaches Freeze und kein kanonischer Content-Hash',
  'PR-PERSIST-08': 'Szenarien und Runs leben nur in In-Memory-Maps',
  'PR-WORKER-09': 'vorhandener Web Worker wird im Produktpfad nicht verwendet',
  'PR-HUBSPOT-10': 'Limit 100, keine Pagination, unbekannte Stage wird LOST',
  'PR-SEMANTIC-11': '33 Ansichten transportieren Fachinhalt als Ganzseiten-WebP',
  'PR-A11Y-12': 'Skip-Link, Fokusführung und doppelte Responsive-DOMs',
  'PR-CLIP-13': 'internes Clipping auf /resources/materials bei 375 Pixel',
  'PR-ASSET-14': 'fehlerhafte Assets, externe Fonts, fehlende Sicherheitsheader',
  'PR-DEPENDENCY-15': 'bekannte produktive und hohe Dev-Abhängigkeitsbefunde',
  'PR-QUALITY-16': 'Lint-/Max-Lines-Baselines, Format und globale Coverage',
  'PR-RELEASE-17': 'Release-Readiness hardcodiert Werte und endet immer mit Exit 0',
  'PR-CI-18': 'bewegliche Action-Tags und unvollständige E2E-Ausführung',
  'PR-LICENSE-19': 'Root-Lizenz fehlt; Entscheidung ist All Rights Reserved',
  'PR-BRANCH-20': 'main besitzt kein nachgewiesenes Ruleset',
};

const severityById: Record<V23FindingId, 'critical' | 'important'> = {
  'PR-AUTH-01': 'critical',
  'PR-RLS-02': 'critical',
  'PR-INGEST-03': 'critical',
  'PR-SOURCE-04': 'critical',
  'PR-SEED-05': 'critical',
  'PR-BASELINE-06': 'critical',
  'PR-FREEZE-07': 'critical',
  'PR-PERSIST-08': 'critical',
  'PR-WORKER-09': 'important',
  'PR-HUBSPOT-10': 'important',
  'PR-SEMANTIC-11': 'important',
  'PR-A11Y-12': 'important',
  'PR-CLIP-13': 'important',
  'PR-ASSET-14': 'important',
  'PR-DEPENDENCY-15': 'important',
  'PR-QUALITY-16': 'important',
  'PR-RELEASE-17': 'important',
  'PR-CI-18': 'important',
  'PR-LICENSE-19': 'important',
  'PR-BRANCH-20': 'important',
};

const runnerById: Record<V23FindingId, 'vitest' | 'playwright'> = {
  'PR-AUTH-01': 'vitest',
  'PR-RLS-02': 'vitest',
  'PR-INGEST-03': 'vitest',
  'PR-SOURCE-04': 'vitest',
  'PR-SEED-05': 'vitest',
  'PR-BASELINE-06': 'vitest',
  'PR-FREEZE-07': 'vitest',
  'PR-PERSIST-08': 'vitest',
  'PR-WORKER-09': 'vitest',
  'PR-HUBSPOT-10': 'vitest',
  'PR-SEMANTIC-11': 'vitest',
  'PR-A11Y-12': 'vitest',
  'PR-CLIP-13': 'playwright',
  'PR-ASSET-14': 'vitest',
  'PR-DEPENDENCY-15': 'vitest',
  'PR-QUALITY-16': 'vitest',
  'PR-RELEASE-17': 'vitest',
  'PR-CI-18': 'vitest',
  'PR-LICENSE-19': 'vitest',
  'PR-BRANCH-20': 'vitest',
};

const ORDER: readonly V23FindingId[] = [
  'PR-AUTH-01',
  'PR-RLS-02',
  'PR-INGEST-03',
  'PR-SOURCE-04',
  'PR-SEED-05',
  'PR-BASELINE-06',
  'PR-FREEZE-07',
  'PR-PERSIST-08',
  'PR-WORKER-09',
  'PR-HUBSPOT-10',
  'PR-SEMANTIC-11',
  'PR-A11Y-12',
  'PR-CLIP-13',
  'PR-ASSET-14',
  'PR-DEPENDENCY-15',
  'PR-QUALITY-16',
  'PR-RELEASE-17',
  'PR-CI-18',
  'PR-LICENSE-19',
  'PR-BRANCH-20',
];

export const V23_FINDINGS: readonly V23FindingContract[] = ORDER.map((id) => ({
  id,
  title: titleById[id],
  severity: severityById[id],
  targetGate: gateById[id],
  runner: runnerById[id],
  expected: 'failing',
}));

export function getFinding(id: V23FindingId): V23FindingContract {
  const finding = V23_FINDINGS.find((candidate) => candidate.id === id);
  if (!finding) {
    throw new Error(`Unbekannte Finding-ID "${id}".`);
  }
  return finding;
}
