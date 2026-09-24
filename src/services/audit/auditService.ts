// G62 (Auftrag 067P, Nacharbeit P0 + P1, Scope-Erweiterung 2026-09-22):
// Audit-Log-Service — NUR LESEPFAD.
// Es existiert kein schreibender RPC-Einstieg mehr: `log_audit_event(...)`
// wurde ersatzlos entfernt (Migration 20260930), direkte INSERTs sind per RLS
// Default-Deny blockiert. Echte Ereignisse erzeugt ausschließlich der DB-Trigger
// `trg_audit_log_member_changes` auf `organization_members` (Organisation aus
// der Zeile, Akteur aus `auth.uid()`, keine PII).
// G62-Vertrag: keine PII — weder actor_email noch ip_address werden gespeichert
// oder gelesen.
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

export const auditService = { listAuditLogs };
