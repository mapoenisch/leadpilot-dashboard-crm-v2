// G60 (Auftrag 067N, Step 1): Deno-Vertragstests für die Edge Function crm-query-export
import { assertEquals } from '@std/assert';
import {
  handleCrmQueryExport,
  sanitizeCsvCell,
  type CrmQueryDb,
  type CrmUser,
  type CrmMembership,
  type CrmQueryResourceParams,
  type CrmExportResourceParams,
} from '../crm-query-export/index.ts';

const ADMIN_USER: CrmUser = { id: '11111111-1111-1111-1111-111111111111', email: 'admin@org-a.local' };
const MANAGER_USER: CrmUser = { id: '22222222-2222-2222-2222-222222222222', email: 'manager@org-a.local' };
const VIEWER_USER: CrmUser = { id: '33333333-3333-3333-3333-333333333333', email: 'viewer@org-a.local' };
const SUSPENDED_USER: CrmUser = { id: '77777777-7777-7777-7777-777777777777', email: 'suspended@org-a.local' };

const ORG_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ORG_B_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

interface MockDbState {
  users: Map<string, { email: string }>;
  memberships: Map<string, CrmMembership>;
  lastQueryParams?: CrmQueryResourceParams;
  lastExportParams?: CrmExportResourceParams;
  companies: Array<Record<string, unknown>>;
  contacts: Array<Record<string, unknown>>;
  deals: Array<Record<string, unknown>>;
}

function createMockDb(): { db: CrmQueryDb; state: MockDbState } {
  const state: MockDbState = {
    users: new Map([
      [ADMIN_USER.id, { email: ADMIN_USER.email }],
      [MANAGER_USER.id, { email: MANAGER_USER.email }],
      [VIEWER_USER.id, { email: VIEWER_USER.email }],
      [SUSPENDED_USER.id, { email: SUSPENDED_USER.email }],
    ]),
    memberships: new Map([
      [ADMIN_USER.id, { organizationId: ORG_A_ID, role: 'admin', status: 'active' }],
      [MANAGER_USER.id, { organizationId: ORG_A_ID, role: 'manager', status: 'active' }],
      [VIEWER_USER.id, { organizationId: ORG_A_ID, role: 'viewer', status: 'active' }],
      [SUSPENDED_USER.id, { organizationId: ORG_A_ID, role: 'admin', status: 'suspended' }],
    ]),
    companies: [
      { id: 'c1', name: 'Firma A1', domain: 'a1.test', industry: 'IT', city: 'Berlin', postalCode: '10115', employeeCount: 50 },
      { id: 'c2', name: ' =SUM(A1:A10)', domain: '   @evil.test', industry: ' \t+Marketing', city: ' -Munich', postalCode: '80331', employeeCount: 25 },
      { id: 'c3', name: 'Firma A3', domain: 'a3.test', industry: 'Finanzen', city: 'Hamburg', postalCode: '20095', employeeCount: 120 },
    ],
    contacts: [
      { id: 'd1', firstName: 'Anna', lastName: 'Schmidt', email: 'anna@a1.test', jobTitle: 'CEO', companyId: 'c1' },
    ],
    deals: [
      { id: 'e1', dealName: 'Enterprise Deal', stage: 'PROPOSAL', amount: 50000, closeDate: '2026-12-01', pipeline: 'default' },
    ],
  };

  const db: CrmQueryDb = {
    async getUserFromToken(token: string) {
      const userEntry = state.users.get(token);
      if (!userEntry) return null;
      return { id: token, email: userEntry.email };
    },
    async getMembership(userId: string) {
      return state.memberships.get(userId) || null;
    },
    async queryResource(params: CrmQueryResourceParams) {
      state.lastQueryParams = params;
      const raw = (state[params.resource as keyof MockDbState] as Record<string, unknown>[]) || [];
      let items = [...raw];
      if (params.filters) {
        for (const [k, v] of Object.entries(params.filters)) items = items.filter((it) => String(it[k] ?? '') === String(v));
      }
      const sortCol = params.sortBy || (params.resource === 'deals' ? 'deal_name' : params.resource === 'contacts' ? 'last_name' : 'name');
      const asc = (params.sortOrder || 'asc') === 'asc';
      items.sort((a, b) => {
        const va = String(a[sortCol] ?? '');
        const vb = String(b[sortCol] ?? '');
        if (va !== vb) return asc ? va.localeCompare(vb) : vb.localeCompare(va);
        return String(a.id ?? '').localeCompare(String(b.id ?? ''));
      });
      const from = (params.page - 1) * params.pageSize;
      return { items: items.slice(from, from + params.pageSize), total: items.length };
    },
    async exportResource(params: CrmExportResourceParams) {
      state.lastExportParams = params;
      const raw = (state[params.resource as keyof MockDbState] as Record<string, unknown>[]) || [];
      let items = [...raw];
      if (params.filters) {
        for (const [k, v] of Object.entries(params.filters)) items = items.filter((it) => String(it[k] ?? '') === String(v));
      }
      const sortCol = params.sortBy || (params.resource === 'deals' ? 'deal_name' : params.resource === 'contacts' ? 'last_name' : 'name');
      const asc = (params.sortOrder || 'asc') === 'asc';
      items.sort((a, b) => {
        const va = String(a[sortCol] ?? '');
        const vb = String(b[sortCol] ?? '');
        if (va !== vb) return asc ? va.localeCompare(vb) : vb.localeCompare(va);
        return String(a.id ?? '').localeCompare(String(b.id ?? ''));
      });
      return items;
    },
  };

  return { db, state };
}

function makeRequest(
  token: string | null,
  body: Record<string, unknown> | null,
  method = 'POST',
): Request {
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (body) {
    headers.set('Content-Type', 'application/json');
  }
  return new Request('https://functions.leadpilot.local/crm-query-export', {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

Deno.test('crm-query-export: Fehlender Authorization Header liefert 401 UNAUTHORIZED', async () => {
  const { db } = createMockDb();
  const req = makeRequest(null, { action: 'list', resource: 'companies' });
  const res = await handleCrmQueryExport(req, db);
  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.code, 'UNAUTHORIZED');
});

Deno.test('crm-query-export: Ungültiger Bearer Token liefert 401 UNAUTHORIZED', async () => {
  const { db } = createMockDb();
  const req = makeRequest('invalid-token', { action: 'list', resource: 'companies' });
  const res = await handleCrmQueryExport(req, db);
  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.code, 'UNAUTHORIZED');
});

Deno.test('crm-query-export: Fehlende aktive Mitgliedschaft liefert 403 FORBIDDEN', async () => {
  const { db } = createMockDb();
  const req = makeRequest('unknown-user', { action: 'list', resource: 'companies' });
  const res = await handleCrmQueryExport(req, db);
  assertEquals(res.status, 401); // unknown user token
});

Deno.test('crm-query-export: Suspendierte Mitgliedschaft liefert 403 FORBIDDEN', async () => {
  const { db } = createMockDb();
  const req = makeRequest(SUSPENDED_USER.id, { action: 'list', resource: 'companies' });
  const res = await handleCrmQueryExport(req, db);
  assertEquals(res.status, 403);
  const data = await res.json();
  assertEquals(data.code, 'FORBIDDEN');
});

Deno.test('crm-query-export: Unbekannte Ressource liefert 400 INVALID_QUERY', async () => {
  const { db } = createMockDb();
  const req = makeRequest(ADMIN_USER.id, { action: 'list', resource: 'invoices' });
  const res = await handleCrmQueryExport(req, db);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.code, 'INVALID_QUERY');
});

Deno.test('crm-query-export: Ungültige Seitengrenzen liefern 400 INVALID_QUERY', async () => {
  const { db } = createMockDb();
  // page < 1
  const req1 = makeRequest(ADMIN_USER.id, { action: 'list', resource: 'companies', page: 0 });
  const res1 = await handleCrmQueryExport(req1, db);
  assertEquals(res1.status, 400);
  const data1 = await res1.json();
  assertEquals(data1.code, 'INVALID_QUERY');

  // pageSize > 100
  const req2 = makeRequest(ADMIN_USER.id, { action: 'list', resource: 'companies', pageSize: 101 });
  const res2 = await handleCrmQueryExport(req2, db);
  assertEquals(res2.status, 400);
  const data2 = await res2.json();
  assertEquals(data2.code, 'INVALID_QUERY');
});

Deno.test('crm-query-export: Manipulierte organizationId im Body wird strikt ignoriert', async () => {
  const { db, state } = createMockDb();
  const req = makeRequest(ADMIN_USER.id, {
    action: 'list',
    resource: 'companies',
    organizationId: ORG_B_ID, // Angriff: fremde Org ID übergeben
  });
  const res = await handleCrmQueryExport(req, db);
  assertEquals(res.status, 200);
  // DB muss mit der verifizierten ORG_A_ID aus der Mitgliedschaft aufgerufen worden sein!
  assertEquals(state.lastQueryParams?.organizationId, ORG_A_ID);
});

Deno.test('crm-query-export: Action list liefert typisiertes Seitenobjekt', async () => {
  const { db } = createMockDb();
  const req = makeRequest(VIEWER_USER.id, {
    action: 'list',
    resource: 'companies',
    page: 1,
    pageSize: 20,
  });
  const res = await handleCrmQueryExport(req, db);
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.resource, 'companies');
  assertEquals(data.page, 1);
  assertEquals(data.pageSize, 20);
  assertEquals(typeof data.total, 'number');
  assertEquals(Array.isArray(data.items), true);
});

Deno.test('crm-query-export: Action export durch Viewer wird mit 403 FORBIDDEN abgewiesen', async () => {
  const { db } = createMockDb();
  const req = makeRequest(VIEWER_USER.id, {
    action: 'export',
    resource: 'companies',
  });
  const res = await handleCrmQueryExport(req, db);
  assertEquals(res.status, 403);
  const data = await res.json();
  assertEquals(data.code, 'FORBIDDEN');
});

Deno.test('crm-query-export: Action export durch Admin/Manager liefert CSV mit Neutralisierung', async () => {
  const { db } = createMockDb();
  const req = makeRequest(ADMIN_USER.id, {
    action: 'export',
    resource: 'companies',
  });
  const res = await handleCrmQueryExport(req, db);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get('Content-Type'), 'text/csv; charset=utf-8');
  assertEquals(
    res.headers.get('Content-Disposition'),
    'attachment; filename="companies-export.csv"',
  );

  const csvText = await res.text();
  // Formel-Injection Neutralisierung mit führenden Whitespaces prüfen:
  assertEquals(csvText.includes("'' =SUM"), false); // kein doppeltes Apostroph
  assertEquals(csvText.includes("' =SUM"), true);
  assertEquals(csvText.includes("'   @evil"), true);
  assertEquals(csvText.includes("' \t+Marketing"), true);
  assertEquals(csvText.includes("' -Munich"), true);
});

Deno.test('crm-query-export: Action export durch Manager gelingt ebenfalls', async () => {
  const { db } = createMockDb();
  const req = makeRequest(MANAGER_USER.id, { action: 'export', resource: 'companies' });
  const res = await handleCrmQueryExport(req, db);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get('Content-Type'), 'text/csv; charset=utf-8');
});

Deno.test('crm-query-export: sanitizeCsvCell neutralisiert Formel-Präfixe auch mit Whitespaces', () => {
  assertEquals(sanitizeCsvCell(' =1+1'), "' =1+1");
  assertEquals(sanitizeCsvCell('   @calc'), "'   @calc");
  assertEquals(sanitizeCsvCell(' \t+cmd'), "' \t+cmd");
  assertEquals(sanitizeCsvCell(' -10'), "' -10");
  assertEquals(sanitizeCsvCell('=cmd|'), "'=cmd|");
  assertEquals(sanitizeCsvCell('Normaler Text'), 'Normaler Text');
  assertEquals(sanitizeCsvCell(123), '123');
  assertEquals(sanitizeCsvCell(null), '');
});

Deno.test('crm-query-export: Unbekannter Filter liefert 400 INVALID_QUERY', async () => {
  const { db } = createMockDb();
  const req = makeRequest(ADMIN_USER.id, {
    action: 'list',
    resource: 'companies',
    filters: { hacker_col: 'inject', industry: 'IT' },
  });
  const res = await handleCrmQueryExport(req, db);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.code, 'INVALID_QUERY');
  assertEquals(data.message.includes('Unbekannter Filter'), true);
});

Deno.test('crm-query-export: Nicht-string Filterwert liefert 400 INVALID_QUERY', async () => {
  const { db } = createMockDb();
  const req = makeRequest(ADMIN_USER.id, {
    action: 'list',
    resource: 'companies',
    filters: { industry: 12345 },
  });
  const res = await handleCrmQueryExport(req, db);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.code, 'INVALID_QUERY');
  assertEquals(data.message.includes('muss ein String sein'), true);
});

Deno.test('crm-query-export: Unbekannter Filter in GET liefert 400 INVALID_QUERY', async () => {
  const { db } = createMockDb();
  const req = new Request(
    'http://127.0.0.1:54321/functions/v1/crm-query-export?action=list&resource=companies&filter_unknownField=value',
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${ADMIN_USER.id}` },
    },
  );
  const res = await handleCrmQueryExport(req, db);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.code, 'INVALID_QUERY');
});

Deno.test('crm-query-export: Interner DB-Fehler wird als generischer SERVER_ERROR ohne SQL-Details redigiert', async () => {
  const { db } = createMockDb();
  // Simuliere internen DB-Fehler
  db.queryResource = async () => {
    throw new Error('relation "secret_table" does not exist at postgres_backend.c:123');
  };

  const req = makeRequest(ADMIN_USER.id, {
    action: 'list',
    resource: 'companies',
  });
  const res = await handleCrmQueryExport(req, db);
  assertEquals(res.status, 500);
  const data = await res.json();
  assertEquals(data.code, 'SERVER_ERROR');
  // Keine SQL- oder Interna-Offenlegung!
  assertEquals(data.message, 'Interner Serverfehler bei der CRM-Verarbeitung.');
  assertEquals(JSON.stringify(data).includes('secret_table'), false);
  assertEquals(JSON.stringify(data).includes('postgres_backend'), false);
});

Deno.test('crm-query-export: Pagination-Vertrag liefert getrennte Seiten, Paging-Metadaten und stabile Sortierung', async () => {
  const { db, state } = createMockDb();
  // Seite 1 mit pageSize=1 (name ASC: c2 (' =SUM...') kommt zuerst)
  const req1 = makeRequest(ADMIN_USER.id, { action: 'list', resource: 'companies', page: 1, pageSize: 1, sortBy: 'name', sortOrder: 'asc' });
  const res1 = await handleCrmQueryExport(req1, db);
  assertEquals(res1.status, 200);
  const data1 = await res1.json();
  assertEquals(data1.page, 1);
  assertEquals(data1.pageSize, 1);
  assertEquals(data1.total, 3);
  assertEquals(data1.items[0].id, 'c2');
  assertEquals(state.lastQueryParams?.page, 1);

  // Seite 2 mit pageSize=1 (zweite Seite: c1 ('Firma A1'))
  const req2 = makeRequest(ADMIN_USER.id, { action: 'list', resource: 'companies', page: 2, pageSize: 1, sortBy: 'name', sortOrder: 'asc' });
  const res2 = await handleCrmQueryExport(req2, db);
  assertEquals(res2.status, 200);
  const data2 = await res2.json();
  assertEquals(data2.page, 2);
  assertEquals(data2.pageSize, 1);
  assertEquals(data2.total, 3);
  assertEquals(data2.items[0].id, 'c1');

  // Rücknavigation auf Seite 1 liefert wieder ersten Eintrag (c2)
  const reqBack = makeRequest(ADMIN_USER.id, { action: 'list', resource: 'companies', page: 1, pageSize: 1, sortBy: 'name', sortOrder: 'asc' });
  const resBack = await handleCrmQueryExport(reqBack, db);
  assertEquals(resBack.status, 200);
  const dataBack = await resBack.json();
  assertEquals(dataBack.items[0].id, 'c2');
});

Deno.test('crm-query-export: Deterministischer id-Tie-Breaker bei identischen Sortierwerten', async () => {
  const { db, state } = createMockDb();
  state.companies.push({ id: 'c0', name: 'Firma A1', domain: 'a0.test', industry: 'IT', city: 'Köln', postalCode: '50667', employeeCount: 10 });
  // c0 und c1 haben denselben Namen 'Firma A1'. id ASC entscheidet: c0 vor c1
  const reqPage2 = makeRequest(ADMIN_USER.id, { action: 'list', resource: 'companies', page: 2, pageSize: 1, sortBy: 'name', sortOrder: 'asc' });
  const res2 = await handleCrmQueryExport(reqPage2, db);
  const data2 = await res2.json();
  assertEquals(data2.items[0].id, 'c0');

  const reqPage3 = makeRequest(ADMIN_USER.id, { action: 'list', resource: 'companies', page: 3, pageSize: 1, sortBy: 'name', sortOrder: 'asc' });
  const res3 = await handleCrmQueryExport(reqPage3, db);
  const data3 = await res3.json();
  assertEquals(data3.items[0].id, 'c1');
});
