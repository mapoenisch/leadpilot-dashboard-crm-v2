// Executive Dashboard V2 (Auftrag 174 / P16b §2 Nr. 7): Beobachtung der Umstellung.
// Zeigt für die eigene Organisation Stufe, Zeitpunkt, Nutzer im neuen Editor und offene
// Entscheidungen. Nur Anzeige: Die Stufe setzt ausschließlich Marc per SQL.

import { useEffect, useState } from 'react';
import { formatRolloutDate } from '@/features/dashboard/components/DashboardEditorRolloutNotices';
import { ROLLOUT_ERROR_MESSAGE } from '@/features/dashboard/services/dashboardRolloutService';
import type {
  DashboardEditorRolloutOverview,
  DashboardEditorRolloutService,
} from '@/features/dashboard/services/dashboardEditorRolloutService';

export const EDITOR_STUFE_LABEL: Record<number, string> = {
  0: 'Stufe 0 – alter Editor ist Standard',
  1: 'Stufe 1 – Test-Organisation im neuen Editor',
  2: 'Stufe 2 – ausgewählte Organisation im neuen Editor',
  3: 'Stufe 3 – neuer Editor für alle',
};

export function EditorRolloutOverview({
  service,
  reloadToken,
}: {
  service: DashboardEditorRolloutService;
  /** Ändert sich nach jeder Entscheidung, damit die Zahlen aktuell bleiben. */
  reloadToken: unknown;
}) {
  const [data, setData] = useState<DashboardEditorRolloutOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void service.overview().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setData(res.value);
        setError(null);
      } else {
        setError(ROLLOUT_ERROR_MESSAGE[res.error]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [service, reloadToken]);

  if (error) {
    return (
      <p
        data-testid="editor-rollout-overview-error"
        className="m-0 rounded-xl border border-border p-3 text-xs text-[var(--color-text-muted)]"
      >
        Umstellungsstand nicht verfügbar: {error}
      </p>
    );
  }
  if (!data) return null;

  const since = formatRolloutDate(data.aktiviertAt);
  return (
    <section
      aria-labelledby="editor-rollout-overview-title"
      data-testid="editor-rollout-overview"
      className="rounded-xl border border-border p-4"
    >
      <h3
        id="editor-rollout-overview-title"
        className="m-0 text-sm font-semibold text-[var(--color-text)]"
      >
        Stand der Umstellung
      </h3>
      <p
        className="m-0 mt-1 text-xs text-[var(--color-text-soft,#cfe3e0)]"
        data-testid="editor-rollout-stufe"
      >
        {EDITOR_STUFE_LABEL[data.stufe] ?? `Stufe ${data.stufe}`}
        {since && data.stufe > 0 ? ` (seit ${since})` : ''}
      </p>
      <dl className="m-0 mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-lg border border-border-soft p-2">
          <dt className="text-[var(--color-text-muted)]">Im neuen Editor</dt>
          <dd
            className="m-0 font-semibold text-[var(--color-text)]"
            data-testid="editor-rollout-v2"
          >
            {data.nutzerV2} von {data.nutzerAktiv}
          </dd>
        </div>
        <div className="rounded-lg border border-border-soft p-2">
          <dt className="text-[var(--color-text-muted)]">Im alten Editor</dt>
          <dd
            className="m-0 font-semibold text-[var(--color-text)]"
            data-testid="editor-rollout-v1"
          >
            {Math.max(0, data.nutzerAktiv - data.nutzerV2)}
          </dd>
        </div>
        <div className="rounded-lg border border-border-soft p-2">
          <dt className="text-[var(--color-text-muted)]">Warten auf Entscheidung</dt>
          <dd
            className="m-0 font-semibold text-[var(--color-text)]"
            data-testid="editor-rollout-open"
          >
            {data.offeneEntscheidungen}
          </dd>
        </div>
      </dl>
      {data.offeneEntscheidungen > 0 && data.stufe > 0 && (
        <p className="m-0 mt-2 text-[11px] text-[var(--color-text-muted)]">
          Nutzer mit offener oder verfallener Entscheidung bleiben im alten Editor, bis unten
          entschieden ist.
        </p>
      )}
      {data.notiz && (
        <p className="m-0 mt-2 text-[11px] text-[var(--color-text-muted)]">Notiz: {data.notiz}</p>
      )}
    </section>
  );
}
