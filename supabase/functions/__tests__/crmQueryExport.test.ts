// G60 (Auftrag 067N, Step 1): Deno-Vertragstests für die Edge Function crm-query-export
import { assertEquals } from '@std/assert';
import {
  handleCrmQueryExport,
  type CrmQueryDb,
  type CrmUser,
  type CrmMembership,
  type CrmQueryResourceParams,
  type CrmExportResourceParams,
} from '../crm-query-export/index.ts';

const ADMIN_USER: CrmUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'admin@org-a.local',
};

const MANAGER_USER: CrmUser = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'manager@org-a.local',
};

const VIEWER_USER: CrmUser = {
  id: '33333333-3333-3333-3333-333333333333',
  email: 'viewer@org-a.local',
};

const SUSPENDED_USER: CrmUser = {
  id: '77777777-7777-7777-7777-777777777777',
  email: 'suspended@org-a.local',
};

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
      {
        id: 'c1',
        name: 'Firma A1',
        domain: 'a1.test',
        industry: 'IT',
        city: 'Berlin',
        postalCode: '10115',
        employeeCount: 50,
      },
      {
        id: 'c2',
        name: '=SUM(A1:A10)', // Formula injection test candidate
        domain: '@evil.test', // Formula injection test candidate
        industry: '+Marketing', // Formula injection test candidate
        city: '-Munich', // Formula injection test candidate
        postalCode: '80331',
        employeeCount: 25,
      },
    ],
    contacts: [
      {
        id: 'd1',
        firstName: 'Anna',
        lastName: 'Schmidt',
        email: 'anna@a1.test',
        jobTitle: 'CEO',
        companyId: 'c1',
      },
    ],
    deals: [
      {
        id: 'e1',
        dealName: 'Enterprise Deal',
        stage: 'PROPOSAL',
        amount: 50000,
        closeDate: '2026-12-01',
        pipeline: 'default',
      },
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
      let items: Record<string, unknown>[] = [];
      if (params.resource === 'companies') items = state.companies;
      if (params.resource === 'contacts') items = state.contacts;
      if (params.resource === 'deals') items = state.deals;
      return { items, total: items.length };
    },
    async exportResource(params: CrmExportResourceParams) {
      state.lastExportParams = params;
      let items: Record<string, unknown>[] = [];
      if (params.resource === 'companies') items = state.companies;
      if (params.resource === 'contacts') items = state.contacts;
      if (params.resource === 'deals') items = state.deals;
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
  // Formel-Injection Neutralisierung prüfen:
  // Werte, die mit =, +, -, @ beginnen, müssen mit Apostroph neutralisiert sein
  assertEquals(csvText.includes("'=SUM"), true);
  assertEquals(csvText.includes("'@evil"), true);
  assertEquals(csvText.includes("'+Marketing"), true);
  assertEquals(csvText.includes("'-Munich"), true);
});
