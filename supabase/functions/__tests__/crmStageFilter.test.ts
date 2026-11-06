// Tests für kanonische Deal-Phasen und Serverfilter (Auftrag 129 / Codex-Review Runde 10)
import { assertEquals } from '@std/assert';
import {
  buildCanonicalCrmQuery,
  type CrmExportResourceParams,
  type CrmMembership,
  type CrmQueryDb,
  type CrmQueryResourceParams,
  type CrmUser,
  getDealStageFilterVariants,
  handleCrmQueryExport,
  normalizeCanonicalStage,
} from '../crm-query-export/index.ts';
import { sortDealsByStageLabel } from '../crm-query-export/stageHelper.ts';

const ADMIN_USER: CrmUser = { id: 'admin-1', email: 'admin@leadpilot.test' };
const ORG_ID = 'org-1';

function createDealsMockDb() {
  const deals: Array<Record<string, unknown>> = [
    {
      id: 'deal-1',
      dealName: 'Enterprise Won Alpha',
      stage: 'WON',
      amount: 80000,
      closeDate: '2026-11-01',
      pipeline: 'default',
    },
    {
      id: 'deal-2',
      dealName: 'Enterprise Won Beta',
      stage: 'Deal gewonnen',
      amount: 45000,
      closeDate: '2026-11-02',
      pipeline: 'default',
    },
    {
      id: 'deal-3',
      dealName: 'Midmarket ClosedWon',
      stage: 'closedwon',
      amount: 20000,
      closeDate: '2026-11-03',
      pipeline: 'default',
    },
    {
      id: 'deal-4',
      dealName: 'Open Proposal',
      stage: 'PROPOSAL',
      amount: 30000,
      closeDate: '2026-11-04',
      pipeline: 'default',
    },
    {
      id: 'deal-5',
      dealName: 'Lost Lead',
      stage: 'LOST',
      amount: 10000,
      closeDate: '2026-11-05',
      pipeline: 'default',
    },
  ];

  const db: CrmQueryDb = {
    async getUserFromToken(token: string) {
      return token === ADMIN_USER.id ? ADMIN_USER : null;
    },
    async getMembership(userId: string): Promise<CrmMembership | null> {
      if (userId === ADMIN_USER.id) {
        return { organizationId: ORG_ID, role: 'admin', status: 'active' };
      }
      return null;
    },
    async queryResource(params: CrmQueryResourceParams) {
      let items = [...deals];
      if (params.filters) {
        for (const [k, v] of Object.entries(params.filters)) {
          if (params.resource === 'deals' && k === 'stage') {
            const variants = getDealStageFilterVariants(String(v)).map((s) => s.toLowerCase());
            items = items.filter((it) => variants.includes(String(it.stage ?? '').toLowerCase()));
            continue;
          }
          items = items.filter((it) => String(it[k] ?? '') === String(v));
        }
      }
      const mapped = items.map((d) => ({
        ...d,
        stage: typeof d.stage === 'string' ? normalizeCanonicalStage(d.stage) : d.stage,
      }));
      return { items: mapped, total: mapped.length };
    },
    async exportResource(params: CrmExportResourceParams) {
      let items = [...deals];
      if (params.filters) {
        for (const [k, v] of Object.entries(params.filters)) {
          if (params.resource === 'deals' && k === 'stage') {
            const variants = getDealStageFilterVariants(String(v)).map((s) => s.toLowerCase());
            items = items.filter((it) => variants.includes(String(it.stage ?? '').toLowerCase()));
            continue;
          }
          items = items.filter((it) => String(it[k] ?? '') === String(v));
        }
      }
      return items.map((d) => ({
        ...d,
        stage: typeof d.stage === 'string' ? normalizeCanonicalStage(d.stage) : d.stage,
      }));
    },
  };

  return { db, deals };
}

Deno.test('crm-query-export: getDealStageFilterVariants liefert alle äquivalenten Werte', () => {
  const wonVariants = getDealStageFilterVariants('Deal gewonnen');
  assertEquals(wonVariants.includes('WON'), true);
  assertEquals(wonVariants.includes('closedwon'), true);
  assertEquals(wonVariants.includes('Deal gewonnen'), true);

  const wonFromCode = getDealStageFilterVariants('WON');
  assertEquals(wonFromCode.includes('Deal gewonnen'), true);
  assertEquals(wonFromCode.includes('closedwon'), true);

  const proposalVariants = getDealStageFilterVariants('Angebot erstellt');
  assertEquals(proposalVariants.includes('PROPOSAL'), true);

  const custom = getDealStageFilterVariants('Individuelle Phase');
  assertEquals(custom, ['Individuelle Phase']);
});

Deno.test('crm-query-export: normalizeCanonicalStage normalisiert Identifier auf Standard-Labels', () => {
  assertEquals(normalizeCanonicalStage('WON'), 'Deal gewonnen');
  assertEquals(normalizeCanonicalStage('closedwon'), 'Deal gewonnen');
  assertEquals(normalizeCanonicalStage('PROPOSAL'), 'Angebot erstellt');
  assertEquals(normalizeCanonicalStage('LOST'), 'Deal verloren');
  assertEquals(normalizeCanonicalStage('Deal gewonnen'), 'Deal gewonnen');
  assertEquals(normalizeCanonicalStage('Sonderphase'), 'Sonderphase');
});

Deno.test('crm-query-export: buildCanonicalCrmQuery verwendet in("stage", variants) für Deals', () => {
  const calls: { method: string; args: unknown[] }[] = [];
  const fakeQuery: Record<string, unknown> = {
    select: () => fakeQuery,
    eq: (col: string, val: unknown) => {
      calls.push({ method: 'eq', args: [col, val] });
      return fakeQuery;
    },
    in: (col: string, vals: unknown[]) => {
      calls.push({ method: 'in', args: [col, vals] });
      return fakeQuery;
    },
    order: () => fakeQuery,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fakeSupabase: any = {
    from: () => fakeQuery,
  };

  buildCanonicalCrmQuery(fakeSupabase, {
    resource: 'deals',
    organizationId: ORG_ID,
    filters: { stage: 'Deal gewonnen' },
  });

  const inCall = calls.find((c) => c.method === 'in');
  assertEquals(Boolean(inCall), true);
  assertEquals(inCall?.args[0], 'stage');
  const stageList = inCall?.args[1] as string[];
  assertEquals(stageList.includes('WON'), true);
  assertEquals(stageList.includes('Deal gewonnen'), true);
  assertEquals(stageList.includes('closedwon'), true);
});

Deno.test('crm-query-export: Action list mit Filter "Deal gewonnen" liefert WON und normalisierte Deals', async () => {
  const { db } = createDealsMockDb();
  const req = new Request('https://functions.leadpilot.local/crm-query-export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ADMIN_USER.id}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'list',
      resource: 'deals',
      filters: { stage: 'Deal gewonnen' },
    }),
  });

  const res = await handleCrmQueryExport(req, db);
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.total, 3);
  assertEquals(data.items.length, 3);
  const ids = data.items.map((it: { id: string }) => it.id);
  assertEquals(ids.includes('deal-1'), true); // war 'WON'
  assertEquals(ids.includes('deal-2'), true); // war 'Deal gewonnen'
  assertEquals(ids.includes('deal-3'), true); // war 'closedwon'
  for (const item of data.items) {
    assertEquals(item.stage, 'Deal gewonnen');
  }
});

Deno.test('crm-query-export: Action export mit Filter "Deal gewonnen" schließt WON-Deals im CSV ein', async () => {
  const { db } = createDealsMockDb();
  const req = new Request('https://functions.leadpilot.local/crm-query-export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ADMIN_USER.id}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'export',
      resource: 'deals',
      filters: { stage: 'Deal gewonnen' },
    }),
  });

  const res = await handleCrmQueryExport(req, db);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get('Content-Type'), 'text/csv; charset=utf-8');
  const csv = await res.text();
  assertEquals(csv.includes('Enterprise Won Alpha'), true);
  assertEquals(csv.includes('Enterprise Won Beta'), true);
  assertEquals(csv.includes('Midmarket ClosedWon'), true);
  assertEquals(csv.includes('Open Proposal'), false);
  assertEquals(csv.includes('Lost Lead'), false);
});

Deno.test('crm-query-export: Textsuche findet kanonische Phasen über normalisiertes Label', () => {
  const orCalls: string[] = [];
  const fakeQuery: Record<string, unknown> = {
    select: () => fakeQuery,
    eq: () => fakeQuery,
    in: () => fakeQuery,
    or: (expr: string) => {
      orCalls.push(expr);
      return fakeQuery;
    },
    order: () => fakeQuery,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fakeSupabase: any = { from: () => fakeQuery };

  buildCanonicalCrmQuery(fakeSupabase, {
    resource: 'deals',
    organizationId: ORG_ID,
    q: 'gewonnen',
  });

  assertEquals(orCalls.length, 1);
  assertEquals(orCalls[0].includes('stage.ilike.%gewonnen%'), true);
  assertEquals(orCalls[0].includes('stage.in.('), true);
  assertEquals(orCalls[0].includes('"WON"'), true);
  assertEquals(orCalls[0].includes('"closedwon"'), true);
  assertEquals(orCalls[0].includes('"LOST"'), false);
});

Deno.test('crm-query-export: sortDealsByStageLabel sortiert nach normalisiertem Label statt Rohwert', () => {
  const items = [
    { id: 'a', stage: 'CLOSING' },
    { id: 'b', stage: 'LEAD' },
    { id: 'c', stage: 'Angebot erstellt' },
    { id: 'd', stage: 'LEAD' },
  ];
  const asc = sortDealsByStageLabel(items, 'asc').map((i) => i.id);
  // Angebot erstellt < Lead eingegangen < Verhandlung
  assertEquals(asc, ['c', 'b', 'd', 'a']);
  const desc = sortDealsByStageLabel(items, 'desc').map((i) => i.id);
  assertEquals(desc, ['a', 'b', 'd', 'c']);
});
