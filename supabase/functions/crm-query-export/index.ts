// G60 (Auftrag 067N): Serverseitige CRM-Abfragen und CSV-Export Edge Function
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export type CrmResource = 'companies' | 'contacts' | 'deals';
export type CrmQueryAction = 'list' | 'export';
export type MemberRole = 'admin' | 'manager' | 'viewer';
export type MemberStatus = 'active' | 'suspended';

export type CrmUser = { id: string; email: string };
export type CrmMembership = { organizationId: string; role: MemberRole; status: MemberStatus };

export interface CrmExportResourceParams {
  resource: CrmResource;
  organizationId: string;
  q?: string;
  filters?: Record<string, string>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CrmQueryResourceParams extends CrmExportResourceParams {
  page: number;
  pageSize: number;
}

export interface CrmQueryDb {
  getUserFromToken(token: string): Promise<CrmUser | null>;
  getMembership(userId: string): Promise<CrmMembership | null>;
  queryResource(
    params: CrmQueryResourceParams,
  ): Promise<{ items: Record<string, unknown>[]; total: number }>;
  exportResource(params: CrmExportResourceParams): Promise<Record<string, unknown>[]>;
}

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

const bad = (message: string, code = 'INVALID_QUERY', status = 400) =>
  jsonResponse({ code, message }, status);

interface ResourceCfg {
  table: string;
  allowedSort: string[];
  defaultSort: string;
  defaultOrder: 'asc' | 'desc';
  allowedFilters: string[];
  searchFields: string[];
  csvColumns: [header: string, dbKey: string, itemKey: string][];
}

const parseCols = (s: string) => s.split(',').map((p) => p.split(':') as [string, string, string]);
const splitS = (s: string) => s.split(',');

const RESOURCE_CONFIG: Record<CrmResource, ResourceCfg> = {
  companies: {
    table: 'companies',
    allowedSort: splitS('name,domain,industry,city,postal_code,employee_count,created_at,id'),
    defaultSort: 'name',
    defaultOrder: 'asc',
    allowedFilters: splitS('industry,city'),
    searchFields: splitS('name,domain,city'),
    csvColumns: parseCols(
      'ID:id:id,Unternehmensname:name:name,Domain:domain:domain,Branche:industry:industry,Stadt:city:city,PLZ:postal_code:postalCode,Mitarbeiter:employee_count:employeeCount',
    ),
  },
  contacts: {
    table: 'contacts',
    allowedSort: splitS('first_name,last_name,email,job_title,created_at,id'),
    defaultSort: 'last_name',
    defaultOrder: 'asc',
    allowedFilters: splitS('job_title,company_id'),
    searchFields: splitS('first_name,last_name,email,job_title'),
    csvColumns: parseCols(
      'ID:id:id,Company ID:company_id:companyId,E-Mail:email:email,Vorname:first_name:firstName,Nachname:last_name:lastName,Jobbezeichnung:job_title:jobTitle',
    ),
  },
  deals: {
    table: 'deals',
    allowedSort: splitS('deal_name,stage,amount,close_date,created_at,id'),
    defaultSort: 'close_date',
    defaultOrder: 'desc',
    allowedFilters: splitS('stage,pipeline'),
    searchFields: splitS('deal_name,stage,pipeline'),
    csvColumns: parseCols(
      'ID:id:id,Deal Name:deal_name:dealName,Stage:stage:stage,Betrag:amount:amount,Abschlussdatum:close_date:closeDate,Pipeline:pipeline:pipeline',
    ),
  },
};

const FIELD_MAPPINGS: Record<CrmResource, string> = {
  companies:
    'name:name,domain:domain,industry:industry,city:city,postalCode:postal_code,employeeCount:employee_count',
  contacts:
    'companyId:company_id,email:email,firstName:first_name,lastName:last_name,jobTitle:job_title',
  deals: 'dealName:deal_name,stage:stage,closeDate:close_date,pipeline:pipeline',
};

export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) str = "'" + str;
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(resource: CrmResource, items: Record<string, unknown>[]): string {
  const { csvColumns } = RESOURCE_CONFIG[resource];
  const headers = csvColumns.map(([h]) => sanitizeCsvCell(h)).join(',');
  const rows = items.map((item) =>
    csvColumns.map(([, dbKey, itemKey]) => sanitizeCsvCell(item[itemKey] ?? item[dbKey])).join(','),
  );
  return '\uFEFF' + [headers, ...rows].join('\r\n');
}

export async function handleCrmQueryExport(req: Request, db: CrmQueryDb): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  // 1. Authentifizierung
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return bad('Authentifizierung erforderlich.', 'UNAUTHORIZED', 401);

  const user = await db.getUserFromToken(token);
  if (!user) return bad('Ungültiger oder abgelaufener Token.', 'UNAUTHORIZED', 401);

  // 2. Mandanten-Mitgliedschaft
  const membership = await db.getMembership(user.id);
  if (!membership || membership.status !== 'active') {
    return bad('Keine aktive Organisationsmitgliedschaft vorhanden.', 'FORBIDDEN', 403);
  }

  const verifiedOrgId = membership.organizationId;
  const userRole = membership.role;

  // 3. Request-Parameter
  let rawAction: string | undefined, rawResource: string | undefined, rawQ: string | undefined;
  let rawFilters: Record<string, unknown> | undefined,
    rawSortBy: string | undefined,
    rawSortOrder: string | undefined;
  let rawPage: unknown, rawPageSize: unknown;

  if (req.method === 'POST') {
    try {
      const b = (await req.json()) as Record<string, unknown>;
      rawAction = typeof b.action === 'string' ? b.action : undefined;
      rawResource = typeof b.resource === 'string' ? b.resource : undefined;
      rawQ = typeof b.q === 'string' ? b.q : undefined;
      if (b.filters !== undefined && b.filters !== null) {
        if (typeof b.filters !== 'object' || Array.isArray(b.filters))
          return bad('Ungültiger Filter-Parameter.');
        rawFilters = b.filters as Record<string, unknown>;
      }
      rawSortBy = typeof b.sortBy === 'string' ? b.sortBy : undefined;
      rawSortOrder = typeof b.sortOrder === 'string' ? b.sortOrder : undefined;
      rawPage = b.page;
      rawPageSize = b.pageSize;
    } catch {
      return bad('Ungültiger JSON-Request-Body.');
    }
  } else if (req.method === 'GET') {
    const url = new URL(req.url);
    rawAction = url.searchParams.get('action') || 'list';
    rawResource = url.searchParams.get('resource') || undefined;
    rawQ = url.searchParams.get('q') || undefined;
    rawSortBy = url.searchParams.get('sortBy') || undefined;
    rawSortOrder = url.searchParams.get('sortOrder') || undefined;
    rawPage = url.searchParams.get('page') ? Number(url.searchParams.get('page')) : undefined;
    rawPageSize = url.searchParams.get('pageSize')
      ? Number(url.searchParams.get('pageSize'))
      : undefined;
    const f: Record<string, unknown> = {};
    for (const [k, v] of url.searchParams.entries())
      if (k.startsWith('filter_')) f[k.replace('filter_', '')] = v;
    if (Object.keys(f).length > 0) rawFilters = f;
  } else {
    return bad('Nur GET und POST Anfragen erlaubt.');
  }

  // 4. Action & Rolle
  const action: CrmQueryAction = rawAction === 'export' ? 'export' : 'list';
  if (rawAction && rawAction !== 'list' && rawAction !== 'export')
    return bad('Ungültige Aktion. Erlaubt sind list und export.');
  if (action === 'export' && userRole === 'viewer')
    return bad('Export für Rolle viewer nicht gestattet.', 'FORBIDDEN', 403);

  // 5. Ressource
  if (!rawResource || !['companies', 'contacts', 'deals'].includes(rawResource))
    return bad('Unbekannte Ressource.');
  const resource = rawResource as CrmResource;
  const config = RESOURCE_CONFIG[resource];

  // 6. Paginierung
  const page = rawPage === undefined || rawPage === null ? 1 : Number(rawPage);
  const pageSize = rawPageSize === undefined || rawPageSize === null ? 20 : Number(rawPageSize);
  if (!Number.isInteger(page) || page < 1) return bad('Ungültiger page-Parameter.');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100)
    return bad('Ungültiger pageSize-Parameter.');

  // 7. Sortierung
  let sortBy = config.defaultSort;
  let sortOrder: 'asc' | 'desc' = config.defaultOrder;

  if (rawSortBy) {
    const norm = rawSortBy.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
    if (config.allowedSort.includes(norm)) {
      sortBy = norm;
    } else {
      return bad(`Ungültiges Sortierfeld: ${rawSortBy}`);
    }
  }

  if (rawSortOrder) {
    const lower = rawSortOrder.toLowerCase();
    if (lower === 'asc' || lower === 'desc') {
      sortOrder = lower;
    } else {
      return bad('Ungültige Sortierreihenfolge.');
    }
  }

  // 8. Filter (P2-1: Unbekannte oder Nicht-String Filter mit 400 ablehnen)
  const cleanFilters: Record<string, string> = {};
  if (rawFilters) {
    for (const [k, v] of Object.entries(rawFilters)) {
      const normKey = k.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
      if (!config.allowedFilters.includes(normKey)) return bad(`Unbekannter Filter: ${k}`);
      if (typeof v !== 'string') return bad(`Filterwert für ${k} muss ein String sein.`);
      const trimmed = v.trim();
      if (trimmed !== '' && trimmed !== 'ALL') cleanFilters[normKey] = trimmed;
    }
  }

  const cleanQ = rawQ ? String(rawQ).trim().slice(0, 200) : undefined;

  const qParams: CrmExportResourceParams = {
    resource,
    organizationId: verifiedOrgId,
    q: cleanQ,
    filters: cleanFilters,
    sortBy,
    sortOrder,
  };

  // 9. DB-Ausführung (P1-3: Sichere Fehlerbehandlung)
  try {
    if (action === 'export') {
      const items = await db.exportResource(qParams);
      return new Response(buildCsv(resource, items), {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${resource}-export.csv"`,
        },
      });
    }

    const result = await db.queryResource({ ...qParams, page, pageSize });
    return jsonResponse({ items: result.items, total: result.total, page, pageSize, resource });
  } catch (err) {
    console.error('CRM-Datenbankfehler:', err);
    return jsonResponse(
      { code: 'SERVER_ERROR', message: 'Interner Serverfehler bei der CRM-Verarbeitung.' },
      500,
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupaClient = SupabaseClient<any, any, any>;

// P2-2: Kanonischer Query-Pfad für List- und Export-Abfragen
function buildCanonicalCrmQuery(
  supabase: SupaClient,
  params: CrmExportResourceParams,
  options?: { count?: 'exact' },
) {
  const config = RESOURCE_CONFIG[params.resource];
  let query = supabase
    .from(config.table)
    .select('*', options?.count ? { count: options.count } : undefined)
    .eq('organization_id', params.organizationId);

  if (params.filters) {
    for (const [col, val] of Object.entries(params.filters)) query = query.eq(col, val);
  }

  if (params.q) {
    const sanitized = params.q.replace(/[%_,()]/g, '');
    if (sanitized)
      query = query.or(config.searchFields.map((f) => `${f}.ilike.%${sanitized}%`).join(','));
  }

  const sortCol = params.sortBy || config.defaultSort;
  query = query.order(sortCol, { ascending: (params.sortOrder || config.defaultOrder) === 'asc' });
  if (sortCol !== 'id') query = query.order('id', { ascending: true });
  return query;
}

function mapRowToFrontend(res: CrmResource, r: Record<string, unknown>): Record<string, unknown> {
  const o: Record<string, unknown> = { id: r.id, createdAt: r.created_at };
  if (res === 'deals') o.amount = r.amount !== null ? Number(r.amount) : 0;
  for (const p of FIELD_MAPPINGS[res].split(',')) {
    const [to, from] = p.split(':');
    o[to] = r[from];
  }
  return o;
}

async function execCrmQuery(
  supabase: SupaClient,
  params: CrmQueryResourceParams | CrmExportResourceParams,
  isExport = false,
) {
  let query = buildCanonicalCrmQuery(supabase, params, isExport ? undefined : { count: 'exact' });
  if (!isExport && 'page' in params && 'pageSize' in params) {
    const from = (params.page - 1) * params.pageSize;
    query = query.range(from, from + params.pageSize - 1);
  }
  const { data, error, count } = await query;
  if (error) {
    console.error('CRM DB Error:', error);
    throw new Error('Interner Fehler bei der CRM-Abfrage.');
  }
  const items = (data || []).map((row: Record<string, unknown>) =>
    mapRowToFrontend(params.resource, row),
  );
  return { items, total: count ?? 0 };
}

// Live Supabase DB Implementierung mit kanonischem Query-Pfad
export function createSupabaseCrmDb(): CrmQueryDb {
  const [url, key] = [
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  ];
  if (!url || !key) throw new Error('SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt.');
  const supabase = createClient(url, key);

  return {
    async getUserFromToken(token: string): Promise<CrmUser | null> {
      const { data, error } = await supabase.auth.getUser(token);
      return error || !data.user ? null : { id: data.user.id, email: data.user.email ?? '' };
    },

    async getMembership(userId: string): Promise<CrmMembership | null> {
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id, role, status, organizations!inner(status)')
        .eq('user_id', userId)
        .maybeSingle();
      if (error || !data) return null;
      const orgActive =
        (data as { organizations?: { status?: unknown } }).organizations?.status === 'active';
      const status: MemberStatus = data.status === 'active' && orgActive ? 'active' : 'suspended';
      return {
        organizationId: data.organization_id as string,
        role: data.role as MemberRole,
        status,
      };
    },

    queryResource: (p) => execCrmQuery(supabase, p, false),
    exportResource: async (p) => (await execCrmQuery(supabase, p, true)).items,
  };
}

if (import.meta.main) {
  Deno.serve(async (req) => {
    try {
      const db = createSupabaseCrmDb();
      return await handleCrmQueryExport(req, db);
    } catch (err) {
      console.error('Unhandled Edge Function Error:', err);
      return jsonResponse({ code: 'SERVER_ERROR', message: 'Interner Serverfehler.' }, 500);
    }
  });
}
