// Executive Dashboard V2 (Auftrag 173 / P16a §2.1 Nr. 2–3):
// Eine Karte je Nutzer in „Umstellung vorbereiten“: Klasse, Revisionsstände, inhaltlicher
// Vergleich und Entscheidung. Übernehmen fragt vorher nach, weil eine neue Revision entsteht.

import { useId, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import {
  compareV1WithV2,
  needsDecision,
  ROLLOUT_CLASS_HINT,
  ROLLOUT_CLASS_LABEL,
  ROLLOUT_DECISION_LABEL,
  type RolloutClass,
  type RolloutReconciliationRow,
} from '@/features/dashboard/model/dashboardRolloutReconciliation';

// Status-Tokens aus global.css: im hellen Theme abgedunkelt (≥ 4,6:1 auf den Flächen, Auftrag 083).
const CLASS_TONE: Record<RolloutClass, string> = {
  gleich: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
  v1_geaendert: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  beide_geaendert: 'bg-[var(--color-error-soft)] text-[var(--color-error)]',
  keine_kopie: 'bg-[var(--cyan-a12)] text-[var(--cyan)]',
  nur_v2: 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]',
};

const BUTTON =
  'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';

export function formatRolloutDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

export interface RolloutUserCardProps {
  row: RolloutReconciliationRow;
  busy: boolean;
  disabled: boolean;
  error: string | null;
  onKeep: () => void;
  onLater: () => void;
  onAdopt: () => void;
}

export function RolloutUserCard({
  row,
  busy,
  disabled,
  error,
  onKeep,
  onLater,
  onAdopt,
}: RolloutUserCardProps) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const decidable = row.klasse === 'v1_geaendert' || row.klasse === 'beide_geaendert';
  const comparison = useMemo(() => (decidable ? compareV1WithV2(row) : null), [decidable, row]);
  const pending = needsDecision(row);
  const name = row.email ?? 'Unbekannter Nutzer';

  return (
    <li
      data-testid={`rollout-row-${row.userId}`}
      data-klasse={row.klasse}
      className="list-none rounded-xl border border-border bg-[var(--color-surface,#0b1d1b)] p-4 text-xs"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="m-0 break-all text-sm font-semibold text-[var(--color-text)]">{name}</h3>
          <p className="m-0 mt-0.5 text-[11px] text-[var(--color-text-muted)]">
            Rolle: {row.orgRole ?? 'kein Mitglied mehr'}
            {row.orgStatus && row.orgStatus !== 'active' ? ` (${row.orgStatus})` : ''}
          </p>
        </div>
        <span
          data-testid={`rollout-class-${row.userId}`}
          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${CLASS_TONE[row.klasse]}`}
        >
          {ROLLOUT_CLASS_LABEL[row.klasse]}
        </span>
      </div>

      <p className="m-0 mt-2 text-[var(--color-text-soft,#cfe3e0)]">
        {ROLLOUT_CLASS_HINT[row.klasse]}
      </p>

      <dl className="m-0 mt-3 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-3">
        <div>
          <dt className="text-[var(--color-text-muted)]">Alter Editor</dt>
          <dd className="m-0 text-[var(--color-text)]">
            {row.v1Revision === null
              ? 'kein Stand'
              : `Revision ${row.v1Revision}, ${formatRolloutDate(row.v1UpdatedAt)}`}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-muted)]">Pilot (neuer Editor)</dt>
          <dd className="m-0 text-[var(--color-text)]">
            {row.v2Revision === null
              ? 'keine Kopie'
              : `Revision ${row.v2Revision}, ${formatRolloutDate(row.v2UpdatedAt)}`}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-muted)]">Kopiert aus</dt>
          <dd className="m-0 text-[var(--color-text)]">
            {row.v2Revision === null
              ? '—'
              : row.lastMigratedRevision
                ? `alter Revision ${row.lastMigratedRevision}`
                : 'unbekannt (Standardstand)'}
          </dd>
        </div>
      </dl>

      {row.entscheidung && (
        <p
          data-testid={`rollout-decision-${row.userId}`}
          className="m-0 mt-3 text-[var(--color-text)]"
        >
          Entscheidung: <strong>{ROLLOUT_DECISION_LABEL[row.entscheidung]}</strong>
          {row.entschiedenAt ? ` am ${formatRolloutDate(row.entschiedenAt)}` : ''}
          {row.entschiedenVonEmail ? ` von ${row.entschiedenVonEmail}` : ''}
        </p>
      )}
      {row.entscheidung && row.entscheidungGueltig === false && (
        <p
          data-testid={`rollout-decision-stale-${row.userId}`}
          className="m-0 mt-1 flex items-start gap-1.5 text-[var(--color-warning)]"
        >
          <AlertTriangle size={14} className="mt-px shrink-0" aria-hidden="true" />
          Entscheidung verfallen: Seitdem wurde weiter bearbeitet. Bitte neu entscheiden.
        </p>
      )}

      {decidable && comparison && (
        <div className="mt-3">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            data-testid={`rollout-diff-toggle-${row.userId}`}
            onClick={() => setOpen((v) => !v)}
            className={`${BUTTON} border border-border bg-transparent px-2 text-[var(--color-text)] hover:bg-surface-raised`}
          >
            {open ? (
              <ChevronDown size={14} aria-hidden="true" />
            ) : (
              <ChevronRight size={14} aria-hidden="true" />
            )}
            Unterschiede {comparison.status === 'verglichen' ? `(${comparison.items.length})` : ''}
          </button>
          <div id={listId} hidden={!open} data-testid={`rollout-diff-${row.userId}`}>
            {comparison.status === 'nicht_moeglich' ? (
              <p className="m-0 mt-2 text-[var(--color-warning)]">{comparison.reason}</p>
            ) : comparison.items.length === 0 ? (
              <p className="m-0 mt-2 text-[var(--color-text-soft,#cfe3e0)]">
                Keine inhaltlichen Unterschiede. Übernehmen gleicht nur die Revisionsstände an.
              </p>
            ) : (
              <ul className="m-0 mt-2 list-disc space-y-0.5 pl-5 text-[var(--color-text)]">
                {comparison.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          data-testid={`rollout-error-${row.userId}`}
          className="m-0 mt-3 text-[var(--color-error)]"
        >
          {error}
        </p>
      )}

      {decidable && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid={`rollout-adopt-${row.userId}`}
            disabled={disabled || comparison?.status !== 'verglichen'}
            onClick={onAdopt}
            className={`${BUTTON} bg-primary text-black hover:bg-primary/90`}
          >
            {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            Alten Stand übernehmen
          </button>
          <button
            type="button"
            data-testid={`rollout-keep-${row.userId}`}
            disabled={disabled}
            onClick={onKeep}
            className={`${BUTTON} border border-border bg-transparent text-[var(--color-text)] hover:bg-surface-raised`}
          >
            Pilot behalten
          </button>
          <button
            type="button"
            data-testid={`rollout-later-${row.userId}`}
            disabled={disabled}
            onClick={onLater}
            className={`${BUTTON} border border-border bg-transparent text-[var(--color-text)] hover:bg-surface-raised`}
          >
            Später entscheiden
          </button>
        </div>
      )}
      {decidable && !pending && (
        <p className="m-0 mt-2 text-[11px] text-[var(--color-text-muted)]">
          Entschieden. Eine neue Entscheidung ersetzt die bisherige.
        </p>
      )}
    </li>
  );
}
