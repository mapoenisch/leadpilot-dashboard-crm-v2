import type { CrmReadModelEnvelope, CrmSourceHealth, CrmSourceKind } from '../../types/dataSource';

export type FreshnessClassification = 'fresh' | 'stale' | 'expired';
export type SourceKind = CrmSourceKind | 'file' | 'simulation' | 'external';

export const SAFE_ERROR_CODES = [
  'DATA_SOURCE_UNAVAILABLE',
  'DATA_SOURCE_INTEGRITY',
  'AUTH_REQUIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'TIMEOUT',
  'NETWORK_ERROR',
  'SERVER_ERROR',
  'UNKNOWN_ERROR',
] as const;

export type SafeErrorCode = (typeof SAFE_ERROR_CODES)[number];

export interface ProvenanceState {
  sourceId: string;
  sourceKind: SourceKind;
  sourceLabel: string;
  isSynthetic: boolean;
  isTimelessBaseline?: boolean;
  status: CrmSourceHealth;
  statusLabel: string;
  statusDescription: string;
  freshness: FreshnessClassification;
  freshnessLabel: string;
  ageText: string;
  fetchedAt: string | null;
  formattedFetchedAt: string;
  errorCode?: SafeErrorCode;
}

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function sanitizeErrorCode(
  rawError: unknown,
  fallbackCode: SafeErrorCode = 'DATA_SOURCE_UNAVAILABLE',
): SafeErrorCode {
  if (!rawError) return fallbackCode;

  if (typeof rawError === 'string') {
    const trimmed = rawError.trim();
    if ((SAFE_ERROR_CODES as readonly string[]).includes(trimmed)) {
      return trimmed as SafeErrorCode;
    }
  }

  let msg = '';
  if (rawError instanceof Error) {
    msg = rawError.message;
    if ((SAFE_ERROR_CODES as readonly string[]).includes(msg)) return msg as SafeErrorCode;
    const errWithCode = rawError as Error & { code?: unknown };
    if (
      typeof errWithCode.code === 'string' &&
      (SAFE_ERROR_CODES as readonly string[]).includes(errWithCode.code)
    ) {
      return errWithCode.code as SafeErrorCode;
    }
  } else if (typeof rawError === 'object' && rawError !== null) {
    const rec = rawError as Record<string, unknown>;
    if (
      typeof rec.code === 'string' &&
      (SAFE_ERROR_CODES as readonly string[]).includes(rec.code)
    ) {
      return rec.code as SafeErrorCode;
    }
    if (typeof rec.message === 'string') msg = rec.message;
  }

  if (/auth|unauthorized|401/i.test(msg)) return 'AUTH_REQUIRED';
  if (/forbidden|permission|403/i.test(msg)) return 'FORBIDDEN';
  if (/integrity|tampered|checksum|hash mismatch/i.test(msg)) return 'DATA_SOURCE_INTEGRITY';
  if (/timeout|timed? out/i.test(msg)) return 'TIMEOUT';
  if (/not found|404/i.test(msg)) return 'NOT_FOUND';
  if (/network|fetch|connection|offline/i.test(msg)) return 'NETWORK_ERROR';
  if (/server error|500|internal/i.test(msg)) return 'SERVER_ERROR';

  return fallbackCode;
}

export function getSafeErrorDescription(code: SafeErrorCode): string {
  switch (code) {
    case 'AUTH_REQUIRED':
      return 'Authentifizierung erforderlich. Bitte melden Sie sich erneut an.';
    case 'FORBIDDEN':
      return 'Zugriff auf die Datenquelle verweigert (fehlende Berechtigungen).';
    case 'NOT_FOUND':
      return 'Die angeforderte Datenquelle wurde nicht gefunden.';
    case 'TIMEOUT':
      return 'Zeitüberschreitung bei der Kommunikation mit der Datenquelle.';
    case 'NETWORK_ERROR':
      return 'Netzwerkverbindung zur Datenquelle fehlgeschlagen.';
    case 'SERVER_ERROR':
      return 'Interner Serverfehler beim Datenquellenabruf.';
    case 'DATA_SOURCE_INTEGRITY':
      return 'Integritätsprüfung der Datenquelle fehlgeschlagen.';
    case 'DATA_SOURCE_UNAVAILABLE':
    case 'UNKNOWN_ERROR':
    default:
      return 'Die Datenquelle ist derzeit nicht erreichbar.';
  }
}

export function classifyFreshness(
  fetchedAt: string | null | undefined,
  now: number = Date.now(),
): FreshnessClassification {
  if (!fetchedAt || typeof fetchedAt !== 'string') return 'expired';
  const parsed = Date.parse(fetchedAt);
  if (Number.isNaN(parsed)) return 'expired';
  const diffMs = now - parsed;
  if (diffMs <= FIFTEEN_MINUTES_MS) return 'fresh';
  if (diffMs <= TWENTY_FOUR_HOURS_MS) return 'stale';
  return 'expired';
}

export function formatDataAge(
  fetchedAt: string | null | undefined,
  now: number = Date.now(),
): string {
  if (!fetchedAt || typeof fetchedAt !== 'string') return 'unbekannt';
  const parsed = Date.parse(fetchedAt);
  if (Number.isNaN(parsed)) return 'unbekannt';
  const diffMs = now - parsed;
  if (diffMs < 0) return 'gerade eben';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'gerade eben';
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return 'vor 1 Minute';
  if (minutes < 60) return `vor ${minutes} Minuten`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return 'vor 1 Stunde';
  if (hours < 24) return `vor ${hours} Stunden`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'vor 1 Tag';
  return `vor ${days} Tagen`;
}

export function formatSourceLabel(sourceKind: string, sourceId?: string): string {
  switch (sourceKind) {
    case 'synthetic':
      return 'Synthetisch (Demo)';
    case 'supabase':
      return 'Supabase CRM';
    case 'hubspot':
      return 'HubSpot Baseline';
    case 'file':
      return 'LeadPilot Baseline';
    case 'simulation':
      return 'Simulations-Engine';
    default:
      return sourceId ?? 'Unbekannte Quelle';
  }
}

export function formatStatusLabel(status: CrmSourceHealth): string {
  switch (status) {
    case 'healthy':
      return 'Gesund';
    case 'empty':
      return 'Leer (gültig)';
    case 'degraded':
      return 'Eingeschränkt (degraded)';
    case 'unavailable':
      return 'Nicht verfügbar';
  }
}

export function formatFreshnessLabel(freshness: FreshnessClassification): string {
  switch (freshness) {
    case 'fresh':
      return 'Aktuell';
    case 'stale':
      return 'Veraltet';
    case 'expired':
      return 'Abgelaufen';
  }
}

export function formatTimestamp(isoString: string | null | undefined): string {
  if (!isoString || typeof isoString !== 'string') return 'Kein Zeitstempel';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Ungültiges Datum';
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function deriveProvenanceState(
  envelope?: CrmReadModelEnvelope | null,
  error?: unknown,
  now: number = Date.now(),
): ProvenanceState {
  if (!envelope || error || envelope.status === 'unavailable') {
    const rawError = envelope?.errorCode ?? error;
    const safeCode = sanitizeErrorCode(rawError);
    return {
      sourceId: envelope?.sourceId ?? 'unknown',
      sourceKind: envelope?.sourceKind ?? 'synthetic',
      sourceLabel: envelope
        ? formatSourceLabel(envelope.sourceKind, envelope.sourceId)
        : 'Datenquelle nicht verfügbar',
      isSynthetic: envelope?.sourceKind === 'synthetic',
      status: 'unavailable',
      statusLabel: formatStatusLabel('unavailable'),
      statusDescription: getSafeErrorDescription(safeCode),
      freshness: 'expired',
      freshnessLabel: formatFreshnessLabel('expired'),
      ageText: 'unbekannt',
      fetchedAt: envelope?.fetchedAt ?? null,
      formattedFetchedAt: formatTimestamp(envelope?.fetchedAt),
      errorCode: safeCode,
    };
  }

  const freshness = classifyFreshness(envelope.fetchedAt, now);
  const ageText = formatDataAge(envelope.fetchedAt, now);
  const isSynthetic = envelope.sourceKind === 'synthetic';
  const sourceLabel = formatSourceLabel(envelope.sourceKind, envelope.sourceId);
  const statusLabel = formatStatusLabel(envelope.status);

  let statusDescription = 'Daten erfolgreich geladen und verifiziert.';
  if (envelope.status === 'empty') {
    statusDescription = 'Die Datenquelle ist erreichbar, enthält jedoch keine Datensätze.';
  } else if (envelope.status === 'degraded') {
    const errorCount =
      (envelope.data.audit.companiesErrors ?? 0) +
      (envelope.data.audit.contactsErrors ?? 0) +
      (envelope.data.audit.dealsErrors ?? 0);
    statusDescription = `Datenquelle mit Auffälligkeiten (${errorCount} Audit-Fehler).`;
  }

  return {
    sourceId: envelope.sourceId,
    sourceKind: envelope.sourceKind,
    sourceLabel,
    isSynthetic,
    status: envelope.status,
    statusLabel,
    statusDescription,
    freshness,
    freshnessLabel: formatFreshnessLabel(freshness),
    ageText,
    fetchedAt: envelope.fetchedAt,
    formattedFetchedAt: formatTimestamp(envelope.fetchedAt),
  };
}

export function deriveExecutiveProvenanceState(now: number = Date.now()): ProvenanceState {
  const fetchedAt = '2025-12-31T23:59:59.000Z';
  const freshness = classifyFreshness(fetchedAt, now);
  return {
    sourceId: 'leadpilot-baseline-2025',
    sourceKind: 'file',
    sourceLabel: 'LeadPilot Baseline (Ebene A)',
    isSynthetic: false,
    isTimelessBaseline: true,
    status: 'healthy',
    statusLabel: formatStatusLabel('healthy'),
    statusDescription: 'Geprüfte Geschäftsjahres-Baseline 2025 mit Ebene-C-Echtzeitfeed.',
    freshness,
    freshnessLabel: 'Historischer Snapshot',
    ageText: 'Stand 31.12.2025',
    fetchedAt,
    formattedFetchedAt: '31.12.2025, 23:59:59',
  };
}

export function deriveCrmProvenanceState(
  status: CrmSourceHealth = 'healthy',
  error?: unknown,
  dataUpdatedAt?: number,
  now: number = Date.now(),
): ProvenanceState {
  if (status === 'unavailable' || error) {
    const safeCode = sanitizeErrorCode(error);
    return {
      sourceId: 'supabase-crm',
      sourceKind: 'supabase',
      sourceLabel: 'Supabase CRM',
      isSynthetic: false,
      status: 'unavailable',
      statusLabel: formatStatusLabel('unavailable'),
      statusDescription: getSafeErrorDescription(safeCode),
      freshness: 'expired',
      freshnessLabel: formatFreshnessLabel('expired'),
      ageText: 'unbekannt',
      fetchedAt: null,
      formattedFetchedAt: 'Nicht verfügbar',
      errorCode: safeCode,
    };
  }

  const fetchedAtIso =
    dataUpdatedAt && dataUpdatedAt > 0 ? new Date(dataUpdatedAt).toISOString() : null;
  const freshness = fetchedAtIso ? classifyFreshness(fetchedAtIso, now) : 'fresh';
  const ageText = fetchedAtIso ? formatDataAge(fetchedAtIso, now) : 'gerade eben';
  const formattedTime = fetchedAtIso ? formatTimestamp(fetchedAtIso) : 'Live';

  return {
    sourceId: 'supabase-crm',
    sourceKind: 'supabase',
    sourceLabel: 'Supabase CRM',
    isSynthetic: false,
    status,
    statusLabel: formatStatusLabel(status),
    statusDescription: 'Serverseitige CRM-Listenabfrage über Supabase Edge Function.',
    freshness,
    freshnessLabel: formatFreshnessLabel(freshness),
    ageText,
    fetchedAt: fetchedAtIso,
    formattedFetchedAt: formattedTime,
  };
}

export function deriveSimulationProvenanceState(
  latestRun?: {
    runId: string;
    startedAt?: string;
    completedAt?: string;
    createdAt?: string;
    status?: string;
  } | null,
  simState?:
    | {
        isRunning?: boolean;
        hasInvariantViolation?: boolean;
        lastTickTimestamp?: string;
      }
    | string
    | null,
  now: number = Date.now(),
): ProvenanceState {
  const isError =
    typeof simState === 'string'
      ? simState === 'error'
      : (simState?.hasInvariantViolation ?? false);
  const isDegraded = !isError && latestRun?.status === 'failed';
  const status: CrmSourceHealth = isError ? 'unavailable' : isDegraded ? 'degraded' : 'healthy';

  const runTimestamp = latestRun?.completedAt ?? latestRun?.startedAt ?? latestRun?.createdAt;

  if (status === 'unavailable') {
    return {
      sourceId: latestRun?.runId ?? 'simulation-engine',
      sourceKind: 'simulation',
      sourceLabel: 'Simulations-Engine',
      isSynthetic: true,
      status: 'unavailable',
      statusLabel: formatStatusLabel('unavailable'),
      statusDescription: getSafeErrorDescription('SERVER_ERROR'),
      freshness: 'expired',
      freshnessLabel: formatFreshnessLabel('expired'),
      ageText: 'unbekannt',
      fetchedAt: runTimestamp ?? null,
      formattedFetchedAt: formatTimestamp(runTimestamp),
      errorCode: 'SERVER_ERROR',
    };
  }

  const freshness = runTimestamp ? classifyFreshness(runTimestamp, now) : 'fresh';
  const ageText = runTimestamp ? formatDataAge(runTimestamp, now) : 'Aktiv';
  const formattedTime = runTimestamp ? formatTimestamp(runTimestamp) : 'Bereit';

  let statusDescription = 'Simulationsmodell auf Basis Baseline 2026.';
  if (latestRun) {
    statusDescription = `Simulation Run ${latestRun.runId.slice(0, 8)} (${latestRun.status ?? 'aktiv'}).`;
  }

  return {
    sourceId: latestRun?.runId ?? 'simulation-engine',
    sourceKind: 'simulation',
    sourceLabel: 'Simulations-Engine',
    isSynthetic: true,
    status,
    statusLabel: formatStatusLabel(status),
    statusDescription,
    freshness,
    freshnessLabel: formatFreshnessLabel(freshness),
    ageText,
    fetchedAt: runTimestamp ?? null,
    formattedFetchedAt: formattedTime,
  };
}
