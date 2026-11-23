// Executive Dashboard V2 (Auftrag 173 / P16a §2.1 Nr. 3):
// Admin-Ansicht „Umstellung vorbereiten“. Zeigt je Nutzer, ob alter Editor (V1) und
// Pilotkopie (V2) auseinanderlaufen, und nimmt die Entscheidung entgegen.
// Diese Seite stellt niemanden um und ändert den Rollout-Schalter nicht (das ist Auftrag 174).

import { useMemo, useState } from 'react';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { useOrganization } from '@/auth/organizationContext';
import { ForbiddenView } from '../components/InvitationForm';
import { RolloutUserCard } from '../components/RolloutUserCard';
import { useModalA11y } from '@/features/dashboard/components/editor/versions/useModalA11y';
import { useRolloutPreparation } from '@/features/dashboard/hooks/useRolloutPreparation';
import {
  needsDecision,
  ROLLOUT_CLASS_LABEL,
  type RolloutClass,
  type RolloutReconciliationRow,
} from '@/features/dashboard/model/dashboardRolloutReconciliation';
import {
  ROLLOUT_ERROR_MESSAGE,
  supabaseRolloutService,
  type RolloutPrepService,
} from '@/features/dashboard/services/dashboardRolloutService';

const CLASS_ORDER: RolloutClass[] = [
  'beide_geaendert',
  'v1_geaendert',
  'keine_kopie',
  'gleich',
  'nur_v2',
];

export interface RolloutPrepPageProps {
  service?: RolloutPrepService;
  /** Nur für Vorschau und Tests: Admin-Prüfung über die Sitzung überspringen. */
  previewAsAdmin?: boolean;
}

export function RolloutPrepPage({
  service = supabaseRolloutService,
  previewAsAdmin = false,
}: RolloutPrepPageProps) {
  const { session, isLoading } = useOrganization();
  const isAdmin = previewAsAdmin || session?.role === 'admin';
  const state = useRolloutPreparation(service, isAdmin);
  const [confirmRow, setConfirmRow] = useState<RolloutReconciliationRow | null>(null);
  const confirming = confirmRow !== null && state.busyUserId === confirmRow.userId;
  const dialogRef = useModalA11y<HTMLDivElement>({
    isOpen: confirmRow !== null,
    onClose: () => {
      if (!confirming) setConfirmRow(null);
    },
    closeOnEscape: !confirming,
  });

  const sorted = useMemo(
    () =>
      [...state.rows].sort((a, b) => CLASS_ORDER.indexOf(a.klasse) - CLASS_ORDER.indexOf(b.klasse)),
    [state.rows],
  );
  const counts = useMemo(() => {
    const c: Record<RolloutClass, number> = {
      gleich: 0,
      v1_geaendert: 0,
      beide_geaendert: 0,
      keine_kopie: 0,
      nur_v2: 0,
    };
    for (const r of state.rows) c[r.klasse] += 1;
    return c;
  }, [state.rows]);
  const openCount = state.rows.filter(needsDecision).length;

  if (isLoading && !previewAsAdmin) {
    return (
      <div className="flex items-center justify-center py-16 text-text">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <span className="ml-2 text-xs">Lade Administrationsbereich…</span>
      </div>
    );
  }
  if (!isAdmin) return <ForbiddenView />;

  const handleAdopt = async () => {
    if (!confirmRow) return;
    await state.adopt(confirmRow);
    setConfirmRow(null);
  };

  return (
    <div data-testid="rollout-prep-page" className="mx-auto max-w-5xl space-y-5">
      <header className="border-b border-border pb-4">
        <h2 className="m-0 flex items-center gap-2 text-xl font-bold tracking-tight text-[var(--color-text)]">
          <ArrowLeftRight className="h-5 w-5 text-primary" aria-hidden="true" />
          Umstellung vorbereiten
        </h2>
        <p className="m-0 mt-1 max-w-3xl text-xs text-[var(--color-text-muted)]">
          Vergleicht für jeden Nutzer den Stand im alten Editor mit seiner Pilotkopie im neuen
          Editor. Ohne Entscheidung wird nichts übernommen. Übernehmen legt eine neue Revision an;
          die bisherige Pilotfassung bleibt in der Versionshistorie. Diese Seite stellt niemanden
          um.
        </p>
      </header>

      <p className="sr-only" role="status" aria-live="polite" data-testid="rollout-announcement">
        {state.announcement}
      </p>

      {state.status === 'laden' && (
        <div className="flex items-center justify-center py-16 text-text">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
          <span className="ml-2 text-xs">Lade Abgleich…</span>
        </div>
      )}

      {state.status === 'fehler' && state.loadError && (
        <div
          role="alert"
          data-testid="rollout-load-error"
          className="rounded-xl border border-[var(--color-error)] bg-[var(--color-error-soft)] p-4 text-xs text-[var(--color-error)]"
        >
          <p className="m-0">{ROLLOUT_ERROR_MESSAGE[state.loadError]}</p>
          <button
            type="button"
            onClick={() => void state.reload()}
            className="mt-3 inline-flex min-h-[44px] items-center rounded-md border border-border bg-transparent px-3 text-xs text-[var(--color-text)] hover:bg-surface-raised"
          >
            Erneut laden
          </button>
        </div>
      )}

      {state.status === 'bereit' && (
        <>
          <section aria-label="Zusammenfassung" data-testid="rollout-summary">
            <p className="m-0 text-sm text-[var(--color-text)]" data-testid="rollout-open-count">
              {openCount === 0
                ? 'Keine offenen Entscheidungen.'
                : `${openCount} ${openCount === 1 ? 'Entscheidung' : 'Entscheidungen'} offen.`}
            </p>
            <ul className="m-0 mt-2 flex flex-wrap gap-2 p-0">
              {CLASS_ORDER.map((k) => (
                <li
                  key={k}
                  className="list-none rounded-full border border-border px-2.5 py-1 text-[11px] text-[var(--color-text-soft,#cfe3e0)]"
                >
                  {ROLLOUT_CLASS_LABEL[k]}:{' '}
                  <strong className="text-[var(--color-text)]">{counts[k]}</strong>
                </li>
              ))}
            </ul>
          </section>

          {sorted.length === 0 ? (
            <p
              data-testid="rollout-empty"
              className="rounded-xl border border-border p-6 text-center text-xs text-[var(--color-text-muted)]"
            >
              In dieser Organisation hat noch niemand ein Dashboard gespeichert. Es gibt nichts
              abzugleichen.
            </p>
          ) : (
            <ul className="m-0 space-y-3 p-0" data-testid="rollout-list">
              {sorted.map((row) => (
                <RolloutUserCard
                  key={row.userId}
                  row={row}
                  busy={state.busyUserId === row.userId}
                  disabled={state.busyUserId !== null}
                  error={
                    state.actionError?.userId === row.userId ? state.actionError.message : null
                  }
                  onKeep={() => void state.decide(row, 'v2_behalten')}
                  onLater={() => void state.decide(row, 'spaeter')}
                  onAdopt={() => setConfirmRow(row)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {confirmRow && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rollout-adopt-title"
            aria-describedby="rollout-adopt-text"
            data-testid="rollout-adopt-dialog"
            className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-[var(--color-bg-deep,#041110)] p-5 text-xs shadow-2xl outline-none"
          >
            <h3
              id="rollout-adopt-title"
              className="m-0 text-sm font-semibold text-[var(--color-text)]"
            >
              Alten Stand übernehmen?
            </h3>
            <p id="rollout-adopt-text" className="m-0 text-[var(--color-text-soft,#cfe3e0)]">
              Der Stand aus dem alten Editor (Revision {confirmRow.v1Revision}) von{' '}
              <strong className="break-all text-[var(--color-text)]">
                {confirmRow.email ?? 'diesem Nutzer'}
              </strong>{' '}
              wird als neue Pilot-Revision {(confirmRow.v2Revision ?? 0) + 1} gespeichert. Die
              bisherige Pilotfassung (Revision {confirmRow.v2Revision}) bleibt in der
              Versionshistorie erhalten.
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-soft pt-3">
              <button
                type="button"
                disabled={confirming}
                onClick={() => setConfirmRow(null)}
                className="inline-flex min-h-[44px] items-center rounded-md border border-border bg-transparent px-3 text-xs text-[var(--color-text)] hover:bg-surface-raised disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={confirming}
                data-testid="rollout-adopt-confirm"
                onClick={() => void handleAdopt()}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-black hover:bg-primary/90 disabled:opacity-50"
              >
                {confirming && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                Übernehmen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RolloutPrepPage;
