// Executive Dashboard V2 (Auftrag 174 / P16b §2 Nr. 3 und 5): Hinweise zur Umstellung.
// - Ladezustand, solange der Server-Schalter noch nicht geladen ist (kein Aufblitzen eines Editors).
// - Hinweis bei Schalterwechsel während offener Ansicht (wirkt erst beim nächsten Öffnen).
// - Rückweg-Hinweis im alten Editor: zeigt den gesicherten Stand, schreibt nichts zurück.

import { Info, Loader2 } from 'lucide-react';
import type { DashboardEditorServerChoice } from '../model/dashboardRollout';
import { EDITOR_SWITCH_NOTICE } from '../hooks/useDashboardEditorChoice';

export function DashboardEditorChoiceLoading() {
  return (
    <div
      role="status"
      data-testid="dashboard-editor-loading"
      className="flex items-center justify-center py-16 text-[var(--color-text-muted)]"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
      <span className="ml-2 text-xs">Dashboard wird geladen …</span>
    </div>
  );
}

/** TT.MM.JJJJ in deutscher Schreibweise; ungültige Werte liefern null. */
export function formatRolloutDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function rueckwegNoticeText(v1UpdatedAt: string | null): string {
  const date = formatRolloutDate(v1UpdatedAt);
  return date
    ? `Stand vom ${date}; Änderungen im neuen Editor sind hier nicht enthalten.`
    : 'Änderungen im neuen Editor sind hier nicht enthalten.';
}

const NOTICE_CLASS =
  'flex items-start gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-[var(--color-text-soft,#cfe3e0)]';

export function DashboardEditorRolloutNotices({
  server,
  pendingEditor,
  showRueckweg,
}: {
  server: DashboardEditorServerChoice | null;
  pendingEditor: 'v1' | 'v2' | null;
  showRueckweg: boolean;
}) {
  const rueckweg = showRueckweg && server?.grund === 'rueckweg';
  if (!rueckweg && !pendingEditor) return null;
  return (
    <div className="flex flex-col gap-2">
      {rueckweg && (
        <p className={`m-0 ${NOTICE_CLASS}`} data-testid="dashboard-rueckweg-notice">
          <Info className="mt-px h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>{rueckwegNoticeText(server?.v1UpdatedAt ?? null)}</span>
        </p>
      )}
      {pendingEditor && (
        <p
          role="status"
          className={`m-0 ${NOTICE_CLASS}`}
          data-testid="dashboard-editor-switch-notice"
        >
          <Info className="mt-px h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>{EDITOR_SWITCH_NOTICE[pendingEditor]}</span>
        </p>
      )}
    </div>
  );
}
