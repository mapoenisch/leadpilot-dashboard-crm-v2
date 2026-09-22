// G62 (Auftrag 067P, Step 4a): Audit-Log-Seite fuer Administratoren.
// Zeigt filterbares Audit-Log mit Aktion, Zeitstempel, Akteur, Korrelations-ID
// und sicherem Detail-Modal (kein Secret, kein PII).
import { useEffect, useState, useCallback } from 'react';
import { useOrganization } from '@/auth/organizationContext';
import {
  auditService,
  AuditServiceError,
  type AuditEntry,
  type AuditLogFilter,
} from '@/services/audit/auditService';

// ---------------------------------------------------------------- Forbidden-Guard
function ForbiddenView() {
  return (
    <main tabIndex={-1} id="main-content" aria-label="Hauptinhalt" className="p-[var(--space-6)]">
      <div
        role="alert"
        className="rounded-lg border border-red-800/40 bg-red-900/20 p-[var(--space-4)] text-sm text-red-300"
      >
        <strong>Zugriff verweigert.</strong> Diese Seite ist nur für Administratoren zugänglich.
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- Detail-Modal
interface DetailModalProps {
  entry: AuditEntry;
  onClose: () => void;
}

function DetailModal({ entry, onClose }: DetailModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Audit-Eintrag Details"
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-[rgba(6,22,19,0.82)] backdrop-blur-[4px]"
    >
      <button
        type="button"
        aria-label="Dialog durch Klick auf Hintergrund schließen"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-transparent border-0"
      />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-background-deep p-[var(--space-6)] shadow-modal">
        <button
          type="button"
          aria-label="Dialog schließen"
          onClick={onClose}
          className="absolute right-4 top-4 cursor-pointer rounded border-0 bg-transparent p-1 text-[var(--color-text-muted)] hover:text-primary"
        >
          ✕
        </button>
        <h2 className="font-display text-base font-semibold text-text mb-[var(--space-4)]">
          Detail: <span className="text-primary font-mono">{entry.action}</span>
        </h2>
        <dl className="grid gap-2 text-sm">
          <div className="flex gap-3">
            <dt className="w-32 shrink-0 text-[var(--color-text-muted)]">ID</dt>
            <dd className="font-mono text-text break-all">{entry.id}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-32 shrink-0 text-[var(--color-text-muted)]">Zeitstempel</dt>
            <dd className="font-mono text-text">
              {new Date(entry.createdAt).toLocaleString('de-DE')}
            </dd>
          </div>
          {entry.correlationId && (
            <div className="flex gap-3">
              <dt className="w-32 shrink-0 text-[var(--color-text-muted)]">Korrelation</dt>
              <dd className="font-mono text-text break-all">{entry.correlationId}</dd>
            </div>
          )}
          {entry.targetType && (
            <div className="flex gap-3">
              <dt className="w-32 shrink-0 text-[var(--color-text-muted)]">Ziel-Typ</dt>
              <dd className="text-text">{entry.targetType}</dd>
            </div>
          )}
          {entry.targetId && (
            <div className="flex gap-3">
              <dt className="w-32 shrink-0 text-[var(--color-text-muted)]">Ziel-ID</dt>
              <dd className="font-mono text-text break-all">{entry.targetId}</dd>
            </div>
          )}
          <div className="mt-2">
            <dt className="text-[var(--color-text-muted)] mb-1">Details (bereinigt)</dt>
            <dd>
              <pre
                className="rounded bg-surface p-3 text-xs text-text overflow-auto max-h-48"
                data-testid="audit-detail-json"
              >
                {JSON.stringify(entry.details, null, 2)}
              </pre>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Hauptseite
export function AuditPage() {
  const { session, isLoading: isOrgLoading } = useOrganization();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  // Filter-State
  const [filterAction, setFilterAction] = useState('');
  const [filterCorrelation, setFilterCorrelation] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const loadEntries = useCallback(async () => {
    if (!session || session.role !== 'admin') return;
    setIsLoadingData(true);
    setErrorMessage(null);
    try {
      const filter: AuditLogFilter = {
        action: filterAction || undefined,
        correlationId: filterCorrelation || undefined,
        fromDate: filterFrom || undefined,
        toDate: filterTo || undefined,
        limit: 100,
      };
      const data = await auditService.listAuditLogs(session.organizationId, filter);
      setEntries(data);
    } catch (err: unknown) {
      if (err instanceof AuditServiceError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Fehler beim Laden des Audit-Logs.');
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [session, filterAction, filterCorrelation, filterFrom, filterTo]);

  useEffect(() => {
    if (session?.role === 'admin') {
      void loadEntries();
    }
  }, [session, loadEntries]);

  if (isOrgLoading) {
    return (
      <main tabIndex={-1} id="main-content" aria-label="Hauptinhalt" className="p-[var(--space-6)]">
        <div className="text-sm text-[var(--color-text-muted)] animate-pulse">
          Lade Organisationsdaten...
        </div>
      </main>
    );
  }

  if (!session || session.role !== 'admin') {
    return <ForbiddenView />;
  }

  return (
    <main tabIndex={-1} id="main-content" aria-label="Audit-Log" className="p-[var(--space-6)]">
      {selectedEntry && (
        <DetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}

      <div className="mb-[var(--space-6)]">
        <h1 className="font-display text-xl font-bold text-text">Audit-Log</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Unveränderliches Protokoll sicherheitsrelevanter Ereignisse der Organisation.
        </p>
      </div>

      {/* Filter */}
      <div
        className="mb-[var(--space-4)] flex flex-wrap gap-3"
        role="search"
        aria-label="Audit-Log Filter"
      >
        <input
          type="text"
          placeholder="Aktion filtern (z. B. auth.login)"
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          aria-label="Aktion filtern"
          data-testid="filter-action"
          className="rounded border border-border-soft bg-surface px-3 py-2 text-sm text-text placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          type="text"
          placeholder="Korrelations-ID"
          value={filterCorrelation}
          onChange={(e) => setFilterCorrelation(e.target.value)}
          aria-label="Korrelations-ID filtern"
          data-testid="filter-correlation"
          className="rounded border border-border-soft bg-surface px-3 py-2 text-sm text-text placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          aria-label="Von Datum"
          data-testid="filter-from"
          className="rounded border border-border-soft bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          aria-label="Bis Datum"
          data-testid="filter-to"
          className="rounded border border-border-soft bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={() => void loadEntries()}
          disabled={isLoadingData}
          className="rounded border-0 bg-primary px-4 py-2 text-sm font-medium text-white cursor-pointer hover:opacity-90 disabled:opacity-50"
        >
          {isLoadingData ? 'Lädt...' : 'Filtern'}
        </button>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mb-4 rounded border border-red-800/40 bg-red-900/20 p-3 text-sm text-red-300"
        >
          {errorMessage}
        </div>
      )}

      {/* Tabelle */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-sm" aria-label="Audit-Log Einträge">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-muted)]">
                Zeitstempel
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-muted)]">
                Aktion
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-muted)]">
                Akteur-ID
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-muted)]">
                Korrelation
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-muted)]">
                Detail
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && !isLoadingData && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                  Keine Einträge vorhanden.
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-border/50 hover:bg-surface/60 transition-colors"
                data-testid="audit-row"
              >
                <td className="px-4 py-3 font-mono text-xs text-text whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleString('de-DE')}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-primary">{entry.action}</td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-muted)] max-w-[160px] truncate">
                  {entry.actorId ?? '—'}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-muted)] max-w-[120px] truncate">
                  {entry.correlationId ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setSelectedEntry(entry)}
                    aria-label={`Details für Eintrag ${entry.action}`}
                    className="rounded border border-border-soft bg-transparent px-2 py-1 text-xs text-[var(--color-text-muted)] cursor-pointer hover:border-primary hover:text-primary"
                  >
                    Anzeigen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
