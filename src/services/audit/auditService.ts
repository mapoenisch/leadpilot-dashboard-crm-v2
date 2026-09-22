// G62 (Auftrag 067P, Nacharbeit P0 + P1): Audit-Log-Service.
// Schreibzugriff läuft ausschließlich über die SECURITY-DEFINER-Funktion
// `log_audit_event(...)` — Organisation und Akteur werden serverseitig aus der
// Sitzung abgeleitet (kein Client-Input), Aktion/Kontext gegen Whitelist.
// G62-Vertrag: keine PII — weder actor_email noch ip_address werden gespeichert
// oder gelesen; Details werden clientseitig sanitisiert (Server prüft zusätzlich
// auf JSON-Objektform).
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
  action: AuditAction | string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
  correlationId: string | null;
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
// Substring-Regeln (kleingeschrieben): deckt zusammengesetzte Feldnamen wie
// `userEmail`, `apiKey`, `authToken`, `clientSecret` ab. Arrays werden rekursiv
// bereinigt, unbekannte Strukturen fallen auf REDACTED zurück.
const SENSITIVE_SUBSTRINGS = [
  'password',
  'passwd',
  'secret',
  'token',
  'api_key',
  'apikey',
  'auth',
  'credential',
  'jwt',
  'bearer',
  'session',
  'cookie',
  'email',
  'e-mail',
  'phone',
  'tel_nr',
  'ssn',
  'social_security',
  'dob',
  'birthdate',
  'geburt',
  'address',
  'adresse',
  'iban',
  'creditcard',
  'kreditkarte',
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase().replace(/[_-]/g, '');
  const compact = SENSITIVE_SUBSTRINGS.map((s) => s.toLowerCase().replace(/[_-]/g, ''));
  return compact.some((s) => s.length > 0 && lower.includes(s));
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  if (value !== null && typeof value === 'object') {
    return sanitizeDetails(value as Record<string, unknown>);
  }
  return value;
}

function sanitizeDetails(raw: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (isSensitiveKey(k)) {
      result[k] = 'REDACTED';
    } else {
      result[k] = sanitizeValue(v);
    }
  }
  return result;
}

// ---------------------------------------------------------------- Row-Mapper
// Explizite Spaltenliste statt select('*') — PII-Spalten existieren serverseitig
// nicht mehr und werden hier grundsätzlich nicht gemappt.
const AUDIT_COLUMNS =
  'id,organization_id,actor_id,action,target_type,target_id,details,correlation_id,created_at';

function mapRow(row: Record<string, unknown>): AuditEntry {
  return {
    id: String(row.id ?? ''),
    organizationId: String(row.organization_id ?? ''),
    actorId: row.actor_id != null ? String(row.actor_id) : null,
    action: String(row.action ?? ''),
    targetType: row.target_type != null ? String(row.target_type) : null,
    targetId: row.target_id != null ? String(row.target_id) : null,
    details: (row.details as Record<string, unknown>) ?? {},
    correlationId: row.correlation_id != null ? String(row.correlation_id) : null,
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

/** Schreibt ein Audit-Ereignis über den kontrollierten Serverpfad. */
export async function logAuditEvent(params: {
  action: AuditAction | string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  correlationId?: string;
}): Promise<void> {
  await getSession();
  const db = supabase!;

  const sanitized = sanitizeDetails(params.details ?? {});

  const { error } = await db.rpc('log_audit_event', {
    p_action: params.action,
    p_target_type: params.targetType ?? null,
    p_target_id: params.targetId ?? null,
    p_details: sanitized,
    p_correlation_id: params.correlationId ?? null,
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
    .select(AUDIT_COLUMNS)
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
