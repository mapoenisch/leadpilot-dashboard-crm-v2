// G60 (Auftrag 067N): Serverseitige CRM-Abfragen und CSV-Export Edge Function
import { createClient } from 'jsr:@supabase/supabase-js@2';

export type CrmResource = 'companies' | 'contacts' | 'deals';
export type CrmQueryAction = 'list' | 'export';
export type MemberRole = 'admin' | 'manager' | 'viewer';
export type MemberStatus = 'active' | 'suspended';

export interface CrmUser {
  id: string;
  email: string;
}

export interface CrmMembership {
  organizationId: string;
  role: MemberRole;
  status: MemberStatus;
}

export interface CrmQueryResourceParams {
  resource: CrmResource;
  organizationId: string;
  q?: string;
  filters?: Record<string, string>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface CrmExportResourceParams {
  resource: CrmResource;
  organizationId: string;
  q?: string;
  filters?: Record<string, string>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

// Whitelist-Definitionen für Spalten und Filter
const RESOURCE_CONFIG: Record<
  CrmResource,
  {
    table: string;
    allowedSort: Record<string, string>; // mapping param -> db_column
    defaultSort: string;
    defaultOrder: 'asc' | 'desc';
    allowedFilters: string[]; // db_columns
    searchFields: string[]; // db_columns
    csvColumns: { header: string; dbKey: string; itemKey: string }[];
  }
> = {
  companies: {
    table: 'companies',
    allowedSort: {
      name: 'name',
      domain: 'domain',
      industry: 'industry',
      city: 'city',
      postalCode: 'postal_code',
      postal_code: 'postal_code',
      employeeCount: 'employee_count',
      employee_count: 'employee_count',
      createdAt: 'created_at',
      created_at: 'created_at',
      id: 'id',
    },
    defaultSort: 'name',
    defaultOrder: 'asc',
    allowedFilters: ['industry', 'city'],
    searchFields: ['name', 'domain', 'city'],
    csvColumns: [
      { header: 'ID', dbKey: 'id', itemKey: 'id' },
      { header: 'Unternehmensname', dbKey: 'name', itemKey: 'name' },
      { header: 'Domain', dbKey: 'domain', itemKey: 'domain' },
      { header: 'Branche', dbKey: 'industry', itemKey: 'industry' },
      { header: 'Stadt', dbKey: 'city', itemKey: 'city' },
      { header: 'PLZ', dbKey: 'postal_code', itemKey: 'postalCode' },
      { header: 'Mitarbeiter', dbKey: 'employee_count', itemKey: 'employeeCount' },
    ],
  },
  contacts: {
    table: 'contacts',
    allowedSort: {
      lastName: 'last_name',
      last_name: 'last_name',
      firstName: 'first_name',
      first_name: 'first_name',
      email: 'email',
      jobTitle: 'job_title',
      job_title: 'job_title',
      companyId: 'company_id',
      company_id: 'company_id',
      createdAt: 'created_at',
      created_at: 'created_at',
      id: 'id',
    },
    defaultSort: 'last_name',
    defaultOrder: 'asc',
    allowedFilters: ['company_id', 'job_title'],
    searchFields: ['first_name', 'last_name', 'email', 'job_title'],
    csvColumns: [
      { header: 'ID', dbKey: 'id', itemKey: 'id' },
      { header: 'Vorname', dbKey: 'first_name', itemKey: 'firstName' },
      { header: 'Nachname', dbKey: 'last_name', itemKey: 'lastName' },
      { header: 'E-Mail', dbKey: 'email', itemKey: 'email' },
      { header: 'Jobtitel', dbKey: 'job_title', itemKey: 'jobTitle' },
      { header: 'Company-ID', dbKey: 'company_id', itemKey: 'companyId' },
    ],
  },
  deals: {
    table: 'imported_funnel_deals',
    allowedSort: {
      dealName: 'deal_name',
      deal_name: 'deal_name',
      stage: 'stage',
      amount: 'amount',
      closeDate: 'close_date',
      close_date: 'close_date',
      pipeline: 'pipeline',
      createdAt: 'created_at',
      created_at: 'created_at',
      id: 'id',
    },
    defaultSort: 'close_date',
    defaultOrder: 'desc',
    allowedFilters: ['stage', 'pipeline'],
    searchFields: ['deal_name', 'stage', 'pipeline'],
    csvColumns: [
      { header: 'ID', dbKey: 'id', itemKey: 'id' },
      { header: 'Deal-Name', dbKey: 'deal_name', itemKey: 'dealName' },
      { header: 'Stage', dbKey: 'stage', itemKey: 'stage' },
      { header: 'Betrag (€)', dbKey: 'amount', itemKey: 'amount' },
      { header: 'Abschlussdatum', dbKey: 'close_date', itemKey: 'closeDate' },
      { header: 'Pipeline', dbKey: 'pipeline', itemKey: 'pipeline' },
    ],
  },
};

// Formel-Injection Neutralisierung
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  let str = String(value);
  const trimmed = str.trimStart();
  // Wenn nach führenden Leerzeichen mit =, +, -, @ begonnen wird: führendes Apostroph voranstellen
  if (
    trimmed.startsWith('=') ||
    trimmed.startsWith('+') ||
    trimmed.startsWith('-') ||
    trimmed.startsWith('@')
  ) {
    str = `'${str}`;
  }

  // Wenn Zeichen enthalten sind, die CSV-Escaping erfordern: in Anführungszeichen setzen und " verdoppeln
  if (
    str.includes('"') ||
    str.includes(',') ||
    str.includes('\n') ||
    str.includes('\r') ||
    str.includes(';')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(
  resource: CrmResource,
  items: Record<string, unknown>[],
): string {
  const config = RESOURCE_CONFIG[resource];
  const headers = config.csvColumns.map((col) => sanitizeCsvCell(col.header)).join(',');
  const rows = items.map((item) => {
    return config.csvColumns
      .map((col) => {
        // Wert entweder über itemKey (camelCase) oder dbKey (snake_case)
        const val = item[col.itemKey] !== undefined ? item[col.itemKey] : item[col.dbKey];
        return sanitizeCsvCell(val);
      })
      .join(',');
  });

  // UTF-8 BOM voranstellen
  return '\uFEFF' + [headers, ...rows].join('\r\n');
}

export async function handleCrmQueryExport(
  req: Request,
  db: CrmQueryDb,
): Promise<Response> {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // 1. Authentifizierung: Bearer-Token extrahieren
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse(
      { code: 'UNAUTHORIZED', message: 'Fehlender oder ungültiger Authorization-Header.' },
      401,
    );
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return jsonResponse(
      { code: 'UNAUTHORIZED', message: 'Bearer-Token ist leer.' },
      401,
    );
  }

  const user = await db.getUserFromToken(token);
  if (!user) {
    return jsonResponse(
      { code: 'UNAUTHORIZED', message: 'Ungültiger oder abgelaufener Token.' },
      401,
    );
  }

  // 2. Mitgliedschaft und Mandant verifizieren
  const membership = await db.getMembership(user.id);
  if (!membership || membership.status !== 'active') {
    return jsonResponse(
      { code: 'FORBIDDEN', message: 'Keine aktive Organisationsmitgliedschaft vorhanden.' },
      403,
    );
  }

  const verifiedOrgId = membership.organizationId;
  const userRole = membership.role;

  // 3. Request-Parameter parsen (POST Body oder GET SearchParams)
  let rawAction: string | undefined;
  let rawResource: string | undefined;
  let rawQ: string | undefined;
  let rawFilters: Record<string, string> | undefined;
  let rawSortBy: string | undefined;
  let rawSortOrder: string | undefined;
  let rawPage: unknown;
  let rawPageSize: unknown;

  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as Record<string, unknown>;
      rawAction = typeof body.action === 'string' ? body.action : undefined;
      rawResource = typeof body.resource === 'string' ? body.resource : undefined;
      rawQ = typeof body.q === 'string' ? body.q : undefined;
      rawFilters =
        typeof body.filters === 'object' && body.filters !== null
          ? (body.filters as Record<string, string>)
          : undefined;
      rawSortBy = typeof body.sortBy === 'string' ? body.sortBy : undefined;
      rawSortOrder = typeof body.sortOrder === 'string' ? body.sortOrder : undefined;
      rawPage = body.page;
      rawPageSize = body.pageSize;
    } catch {
      return jsonResponse(
        { code: 'INVALID_QUERY', message: 'Ungültiger JSON-Request-Body.' },
        400,
      );
    }
  } else if (req.method === 'GET') {
    const url = new URL(req.url);
    rawAction = url.searchParams.get('action') || 'list';
    rawResource = url.searchParams.get('resource') || undefined;
    rawQ = url.searchParams.get('q') || undefined;
    rawSortBy = url.searchParams.get('sortBy') || undefined;
    rawSortOrder = url.searchParams.get('sortOrder') || undefined;
    const pageStr = url.searchParams.get('page');
    rawPage = pageStr ? Number(pageStr) : undefined;
    const pageSizeStr = url.searchParams.get('pageSize');
    rawPageSize = pageSizeStr ? Number(pageSizeStr) : undefined;

    // Filter-Parameter (Präfix filter_)
    const filters: Record<string, string> = {};
    for (const [k, v] of url.searchParams.entries()) {
      if (k.startsWith('filter_')) {
        filters[k.replace('filter_', '')] = v;
      }
    }
    if (Object.keys(filters).length > 0) {
      rawFilters = filters;
    }
  } else {
    return jsonResponse(
      { code: 'INVALID_QUERY', message: 'Nur GET und POST Anfragen erlaubt.' },
      400,
    );
  }

  // 4. Action validieren
  const action: CrmQueryAction = rawAction === 'export' ? 'export' : 'list';
  if (rawAction && rawAction !== 'list' && rawAction !== 'export') {
    return jsonResponse(
      { code: 'INVALID_QUERY', message: 'Ungültige Aktion. Erlaubt sind list und export.' },
      400,
    );
  }

  // 5. Rolle prüfen für export
  if (action === 'export' && userRole === 'viewer') {
    return jsonResponse(
      { code: 'FORBIDDEN', message: 'Export für Rolle viewer nicht gestattet.' },
      403,
    );
  }

  // 6. Ressource validieren
  if (!rawResource || !['companies', 'contacts', 'deals'].includes(rawResource)) {
    return jsonResponse(
      { code: 'INVALID_QUERY', message: 'Unbekannte Ressource. Erlaubt sind companies, contacts, deals.' },
      400,
    );
  }
  const resource = rawResource as CrmResource;
  const config = RESOURCE_CONFIG[resource];

  // 7. Paginierung validieren
  const page = rawPage === undefined || rawPage === null ? 1 : Number(rawPage);
  const pageSize =
    rawPageSize === undefined || rawPageSize === null ? 20 : Number(rawPageSize);

  if (!Number.isInteger(page) || page < 1) {
    return jsonResponse(
      { code: 'INVALID_QUERY', message: 'Ungültiger page-Parameter. Muss eine Ganzzahl >= 1 sein.' },
      400,
    );
  }

  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return jsonResponse(
      { code: 'INVALID_QUERY', message: 'Ungültiger pageSize-Parameter. Muss zwischen 1 und 100 liegen.' },
      400,
    );
  }

  // 8. Sortierung validieren (Whitelist)
  let sortBy = config.defaultSort;
  let sortOrder: 'asc' | 'desc' = config.defaultOrder;

  if (rawSortBy && config.allowedSort[rawSortBy]) {
    sortBy = config.allowedSort[rawSortBy];
  } else if (rawSortBy) {
    return jsonResponse(
      { code: 'INVALID_QUERY', message: `Ungültiges Sortierfeld: ${rawSortBy}` },
      400,
    );
  }

  if (rawSortOrder) {
    const lower = rawSortOrder.toLowerCase();
    if (lower === 'asc' || lower === 'desc') {
      sortOrder = lower;
    } else {
      return jsonResponse(
        { code: 'INVALID_QUERY', message: 'Ungültige Sortierreihenfolge. Erlaubt sind asc und desc.' },
        400,
      );
    }
  }

  // 9. Filter bereinigen (nur Whitelist-Felder)
  const cleanFilters: Record<string, string> = {};
  if (rawFilters) {
    for (const [k, v] of Object.entries(rawFilters)) {
      // camelCase zu snake_case normalisieren
      const normalizedKey = k.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (config.allowedFilters.includes(normalizedKey) && v && v !== 'ALL') {
        cleanFilters[normalizedKey] = String(v).trim();
      }
    }
  }

  // 10. Suchbegriff säubern
  const cleanQ = rawQ ? String(rawQ).trim().slice(0, 200) : undefined;

  // 11. Ausführung (list oder export)
  if (action === 'export') {
    const items = await db.exportResource({
      resource,
      organizationId: verifiedOrgId,
      q: cleanQ,
      filters: cleanFilters,
      sortBy,
      sortOrder,
    });

    const csvContent = buildCsv(resource, items);
    return new Response(csvContent, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${resource}-export.csv"`,
      },
    });
  }

  // action === 'list'
  const result = await db.queryResource({
    resource,
    organizationId: verifiedOrgId,
    q: cleanQ,
    filters: cleanFilters,
    sortBy,
    sortOrder,
    page,
    pageSize,
  });

  return jsonResponse({
    items: result.items,
    total: result.total,
    page,
    pageSize,
    resource,
  });
}

// Live Supabase DB Implementierung
export function createSupabaseCrmDb(): CrmQueryDb {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  return {
    async getUserFromToken(token: string): Promise<CrmUser | null> {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) return null;
      return { id: data.user.id, email: data.user.email ?? '' };
    },

    async getMembership(userId: string): Promise<CrmMembership | null> {
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id, role, status, organizations!inner(status)')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;
      const orgStatus = (data as { organizations?: { status?: unknown } }).organizations?.status;
      if (data.status !== 'active' || orgStatus !== 'active') {
        return {
          organizationId: data.organization_id as string,
          role: data.role as MemberRole,
          status: 'suspended',
        };
      }

      return {
        organizationId: data.organization_id as string,
        role: data.role as MemberRole,
        status: 'active',
      };
    },

    async queryResource(
      params: CrmQueryResourceParams,
    ): Promise<{ items: Record<string, unknown>[]; total: number }> {
      const config = RESOURCE_CONFIG[params.resource];
      let query = supabase
        .from(config.table)
        .select('*', { count: 'exact' })
        .eq('organization_id', params.organizationId);

      // Filter anwenden
      if (params.filters) {
        for (const [col, val] of Object.entries(params.filters)) {
          query = query.eq(col, val);
        }
      }

      // Suche anwenden
      if (params.q) {
        const sanitized = params.q.replace(/[%_,()]/g, '');
        if (sanitized) {
          const orFilter = config.searchFields
            .map((field) => `${field}.ilike.%${sanitized}%`)
            .join(',');
          query = query.or(orFilter);
        }
      }

      // Sortierung anwenden
      const sortCol = params.sortBy || config.defaultSort;
      const ascending = (params.sortOrder || config.defaultOrder) === 'asc';
      query = query.order(sortCol, { ascending });
      // Sekundärer Tie-Breaker für stabile Paginierung
      if (sortCol !== 'id') {
        query = query.order('id', { ascending: true });
      }

      // Paginierung anwenden
      const from = (params.page - 1) * params.pageSize;
      const to = from + params.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) {
        throw new Error(`DB-Fehler bei ${params.resource}: ${error.message}`);
      }

      // Mapping DB snake_case -> Frontend camelCase
      const items = (data || []).map((row) => mapRowToFrontend(params.resource, row));
      return { items, total: count ?? 0 };
    },

    async exportResource(params: CrmExportResourceParams): Promise<Record<string, unknown>[]> {
      const config = RESOURCE_CONFIG[params.resource];
      let query = supabase
        .from(config.table)
        .select('*')
        .eq('organization_id', params.organizationId);

      if (params.filters) {
        for (const [col, val] of Object.entries(params.filters)) {
          query = query.eq(col, val);
        }
      }

      if (params.q) {
        const sanitized = params.q.replace(/[%_,()]/g, '');
        if (sanitized) {
          const orFilter = config.searchFields
            .map((field) => `${field}.ilike.%${sanitized}%`)
            .join(',');
          query = query.or(orFilter);
        }
      }

      const sortCol = params.sortBy || config.defaultSort;
      const ascending = (params.sortOrder || config.defaultOrder) === 'asc';
      query = query.order(sortCol, { ascending });
      if (sortCol !== 'id') {
        query = query.order('id', { ascending: true });
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`DB-Export-Fehler bei ${params.resource}: ${error.message}`);
      }

      return (data || []).map((row) => mapRowToFrontend(params.resource, row));
    },
  };
}

function mapRowToFrontend(resource: CrmResource, row: Record<string, unknown>): Record<string, unknown> {
  if (resource === 'companies') {
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      industry: row.industry,
      city: row.city,
      postalCode: row.postal_code,
      employeeCount: row.employee_count,
      createdAt: row.created_at,
    };
  }
  if (resource === 'contacts') {
    return {
      id: row.id,
      companyId: row.company_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      jobTitle: row.job_title,
      createdAt: row.created_at,
    };
  }
  if (resource === 'deals') {
    return {
      id: row.id,
      dealName: row.deal_name,
      stage: row.stage,
      amount: row.amount !== null ? Number(row.amount) : 0,
      closeDate: row.close_date,
      pipeline: row.pipeline,
      createdAt: row.created_at,
    };
  }
  return row;
}

// Deno / Supabase Edge Runtime Entrypoint
if (import.meta.main) {
  Deno.serve(async (req) => {
    try {
      const db = createSupabaseCrmDb();
      return await handleCrmQueryExport(req, db);
    } catch (err) {
      return jsonResponse(
        {
          code: 'SERVER_ERROR',
          message: err instanceof Error ? err.message : 'Interner Serverfehler.',
        },
        500,
      );
    }
  });
}
