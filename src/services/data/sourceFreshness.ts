import type { CrmReadModelEnvelope, CrmSourceHealth, CrmSourceKind } from '../../types/dataSource';

export type FreshnessClassification = 'fresh' | 'stale' | 'expired';

export interface ProvenanceState {
  sourceId: string;
  sourceKind: CrmSourceKind;
  sourceLabel: string;
  isSynthetic: boolean;
  status: CrmSourceHealth;
  statusLabel: string;
  statusDescription: string;
  freshness: FreshnessClassification;
  freshnessLabel: string;
  ageText: string;
  fetchedAt: string | null;
  formattedFetchedAt: string;
  errorCode?: string;
}

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * 067O / G61: Klassifiziert die Datenfrische eines Zeitstempels.
 * - fresh:   <= 15 Minuten
 * - stale:   > 15 Minuten und <= 24 Stunden
 * - expired: > 24 Stunden oder ungültig
 */
export function classifyFreshness(
  fetchedAt: string | null | undefined,
  now: number = Date.now(),
): FreshnessClassification {
  if (!fetchedAt || typeof fetchedAt !== 'string') {
    return 'expired';
  }

  const parsed = Date.parse(fetchedAt);
  if (Number.isNaN(parsed)) {
    return 'expired';
  }

  const diffMs = now - parsed;
  // Zukünftiger Zeitstempel (leichte Uhrabweichung) gilt als frisch
  if (diffMs <= FIFTEEN_MINUTES_MS) {
    return 'fresh';
  }

  if (diffMs <= TWENTY_FOUR_HOURS_MS) {
    return 'stale';
  }

  return 'expired';
}

/**
 * Formatiert das relative Datenalter auf Deutsch.
 */
export function formatDataAge(
  fetchedAt: string | null | undefined,
  now: number = Date.now(),
): string {
  if (!fetchedAt || typeof fetchedAt !== 'string') {
    return 'unbekannt';
  }

  const parsed = Date.parse(fetchedAt);
  if (Number.isNaN(parsed)) {
    return 'unbekannt';
  }

  const diffMs = now - parsed;
  if (diffMs < 0) {
    return 'gerade eben';
  }

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    return 'gerade eben';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) {
    return 'vor 1 Minute';
  }
  if (minutes < 60) {
    return `vor ${minutes} Minuten`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours === 1) {
    return 'vor 1 Stunde';
  }
  if (hours < 24) {
    return `vor ${hours} Stunden`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) {
    return 'vor 1 Tag';
  }
  return `vor ${days} Tagen`;
}

/**
 * Gibt ein anwenderfreundliches Label für eine Datenquelle zurück.
 */
export function formatSourceLabel(sourceKind: CrmSourceKind, sourceId?: string): string {
  switch (sourceKind) {
    case 'synthetic':
      return 'Synthetisch (Demo)';
    case 'supabase':
      return 'Supabase CRM';
    case 'hubspot':
      return 'HubSpot Baseline';
    default:
      return sourceId ?? 'Unbekannte Quelle';
  }
}

/**
 * Gibt die deutsche Beschreibung des Gesundheitszustands zurück.
 */
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

/**
 * Gibt die deutsche Beschreibung der Frische zurück.
 */
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

/**
 * Formatiert einen ISO-Zeitstempel in deutsches Datums-/Zeitformat.
 */
export function formatTimestamp(isoString: string | null | undefined): string {
  if (!isoString || typeof isoString !== 'string') {
    return 'Kein Zeitstempel';
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return 'Ungültiges Datum';
  }
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Leitet den gesamten Provenienz- und Frischezustand ab.
 */
export function deriveProvenanceState(
  envelope?: CrmReadModelEnvelope | null,
  error?: unknown,
  now: number = Date.now(),
): ProvenanceState {
  if (!envelope || error) {
    const errorCode =
      envelope?.errorCode ?? (error instanceof Error ? error.message : 'DATA_SOURCE_UNAVAILABLE');
    return {
      sourceId: envelope?.sourceId ?? 'unknown',
      sourceKind: envelope?.sourceKind ?? 'synthetic',
      sourceLabel: envelope
        ? formatSourceLabel(envelope.sourceKind, envelope.sourceId)
        : 'Datenquelle nicht verfügbar',
      isSynthetic: envelope?.sourceKind === 'synthetic',
      status: 'unavailable',
      statusLabel: formatStatusLabel('unavailable'),
      statusDescription: `Verbindung zur Datenquelle fehlgeschlagen: ${errorCode}`,
      freshness: 'expired',
      freshnessLabel: formatFreshnessLabel('expired'),
      ageText: 'unbekannt',
      fetchedAt: envelope?.fetchedAt ?? null,
      formattedFetchedAt: formatTimestamp(envelope?.fetchedAt),
      errorCode,
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
