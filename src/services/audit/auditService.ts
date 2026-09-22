// G62 (Auftrag 067P, Step 3a): Audit-Log-Service fuer Eintragen und Abfragen von Audit-Events.
// Typen werden HIER definiert (nicht in src/types/) um den Schutzbereich zu wahren.
// Keine Secrets, Tokens, JWTs oder PII in details-Payloads — Sanitizer entfernt sensible Felder.
import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';

// ---------------------------------------------------------------- Typen
export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.password_reset'
  | 'member.role_changed'
  | 'member.invited'
  | 'member.deactivated'
  | 'data_source.switch'
  | 'data_source.sync_started'
  | 'data_source.sync_completed'
  | 'baseline.created'
  | 'scenario.run_started'
  | 'scenario.run_completed'
  | 'scenario.exported'
  | 'config.changed';

export interface AuditEntry {
  id: string;
  organizationId: string;
  actorId: string | null;
  actorEmail: string | null;
  action: AuditAction | string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
  correlationId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogFilter {
  action?: string;
  correlationId?: string;
  fromDate?: string; // ISO 8601
  toDate?: string; // ISO 8601
  limit?: number;
  offset?: number;
}

export type AuditServiceErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_CONFIGURED' | 'UNKNOWN';

export class AuditServiceError extends Error {
  constructor(
    public readonly code: AuditServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuditServiceError';
  }
}

// ---------------------------------------------------------------- Sanitizer
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'key',
  'api_key',
  'apikey',
  'authorization',
  'jwt',
  'bearer',
  'credential',
  'email',
  'phone',
  'ssn',
  'dob',
]);

function sanitizeDetails(raw: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const lower = k.toLowerCase();
    if (SENSITIVE_KEYS.has(lower) || lower.includes('secret') || lower.includes('token')) {
      result[k] = 'REDACTED';
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      result[k] = sanitizeDetails(v as Record<string, unknown>);
    } else {
      result[k] = v;
    }
  }
  return result;
}

// ---------------------------------------------------------------- Row-Mapper
function mapRow(row: Record<string, unknown>): AuditEntry {
  return {
    id: String(row.id ?? ''),
    organizationId: String(row.organization_id ?? ''),
    actorId: row.actor_id != null ? String(row.actor_id) : null,
    actorEmail: row.actor_email != null ? String(row.actor_email) : null,
    action: String(row.action ?? ''),
    targetType: row.target_type != null ? String(row.target_type) : null,
    targetId: row.target_id != null ? String(row.target_id) : null,
    details: (row.details as Record<string, unknown>) ?? {},
    correlationId: row.correlation_id != null ? String(row.correlation_id) : null,
    ipAddress: row.ip_address != null ? String(row.ip_address) : null,
    createdAt: String(row.created_at ?? ''),
  };
}

// ---------------------------------------------------------------- Service-Funktionen
async function getSession() {
  if (!isSupabaseConfigured || !supabase) {
    throw new AuditServiceError('NOT_CONFIGURED', 'Supabase ist nicht konfiguriert.');
  }
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new AuditServiceError('UNAUTHORIZED', 'Keine aktive Sitzung vorhanden.');
  }
  return data.session;
}

/** Schreibt einen Audit-Eintrag fuer die eigene Organisation. */
export async function logAuditEvent(params: {
  action: AuditAction | string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  correlationId?: string;
  organizationId: string;
}): Promise<void> {
  const session = await getSession();
  const db = supabase!;

  const sanitized = sanitizeDetails(params.details ?? {});

  const { error } = await db.from('audit_log').insert({
    organization_id: params.organizationId,
    actor_id: session.user.id,
    actor_email: 'REDACTED',
    action: params.action,
    target_type: params.targetType ?? null,
    target_id: params.targetId ?? null,
    details: sanitized,
    correlation_id: params.correlationId ?? null,
    ip_address: null,
  });

  if (error) {
    throw new AuditServiceError('UNKNOWN', error.message);
  }
}

/** Listet Audit-Eintraege fuer Admins der eigenen Organisation. */
export async function listAuditLogs(
  organizationId: string,
  filter: AuditLogFilter = {},
): Promise<AuditEntry[]> {
  await getSession();
  const db = supabase!;

  let query = db
    .from('audit_log')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(filter.limit ?? 100)
    .range(filter.offset ?? 0, (filter.offset ?? 0) + (filter.limit ?? 100) - 1);

  if (filter.action) {
    query = query.eq('action', filter.action);
  }
  if (filter.correlationId) {
    query = query.eq('correlation_id', filter.correlationId);
  }
  if (filter.fromDate) {
    query = query.gte('created_at', filter.fromDate);
  }
  if (filter.toDate) {
    query = query.lte('created_at', filter.toDate);
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === '42501' || error.message.includes('permission')) {
      throw new AuditServiceError('FORBIDDEN', 'Keine Berechtigung zum Lesen des Audit-Logs.');
    }
    throw new AuditServiceError('UNKNOWN', error.message);
  }

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export const auditService = { logAuditEvent, listAuditLogs };
