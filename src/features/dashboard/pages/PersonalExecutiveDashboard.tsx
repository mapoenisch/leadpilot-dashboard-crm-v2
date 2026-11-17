// Executive Dashboard, Teilauftrag 7 (Auftrag 077) & Auftrag 150 (P07): persönliche Ansicht unter `/dashboard`.
// V2 nutzt den persistenten Speicheradapter useDashboardV2Storage mit Revisionshistorie,
// optimistischer Konflikterkennung und deterministischer V1->V2-Kopiermigration.
import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/auth/organizationContext';
import { DashboardWorkspace } from '../components/DashboardWorkspace';
import { DashboardEditorShellV2 } from '../components/editor/DashboardEditorShellV2';
import { DashboardConflictDialogV2 } from '../components/editor/DashboardConflictDialogV2';
import { TeamAccessRevokedDialogV2 } from '../components/editor/TeamAccessRevokedDialogV2';
import { useBrowserBackGuard } from '../hooks/useBrowserBackGuard';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';
import { useDashboardPreferences } from '../hooks/useDashboardPreferences';
import { useDashboardV2Storage } from '../hooks/useDashboardV2Storage';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import {
  isDashboardEditorV2Enabled,
  setDashboardEditorV2Override,
} from '../model/dashboardRollout';
import { TimeControlProvider } from '../time/TimeControlProvider';
import { invalidateCrmOverviewQueries } from '../time/resumeCrmRefresh';
import { useTimeControlledData } from '../time/useTimeControlledData';

import { Info } from 'lucide-react';
import { DashboardDeletedDialogV2 } from '../components/editor/DashboardDeletedDialogV2';

export const RETURN_ANNOUNCEMENT = 'Zurück im Dashboard. Die Filter deiner Sitzung gelten weiter.';
export const RETURN_MISSING_ANNOUNCEMENT =
  'Zurück im Dashboard. Die zuvor geöffnete Kachel gibt es nicht mehr.';

function PersonalExecutiveDashboardV2Container({
  onShowDetails,
  preferredDashboardId,
}: {
  onShowDetails: (tileId: string, dashboardId?: string) => void;
  preferredDashboardId?: string;
}) {
  const v2Storage = useDashboardV2Storage({ preferredDashboardId });
  const queryClient = useQueryClient();
  const { session } = useOrganization();
  const organizationId = session?.organizationId;
  const userId = session?.userId ?? (organizationId ? 'anonymous' : undefined);
  const handleResume = useCallback(() => {
    if (!organizationId || !userId) return;
    void invalidateCrmOverviewQueries(queryClient, organizationId, userId);
  }, [queryClient, organizationId, userId]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictDraft, setConflictDraft] = useState<DashboardConfigV2 | null>(null);
  const [conflictDialogError, setConflictDialogError] = useState<string | null>(null);
  const [showDeletedDialog, setShowDeletedDialog] = useState(false);
  const [deletedDraft, setDeletedDraft] = useState<DashboardConfigV2 | null>(null);
  const [deletedDialogError, setDeletedDialogError] = useState<string | null>(null);
  const [showRevokedDialog, setShowRevokedDialog] = useState(false);
  const [revokedDraft, setRevokedDraft] = useState<DashboardConfigV2 | null>(null);
  const [readOnlyCopyError, setReadOnlyCopyError] = useState<string | null>(null);

  if (v2Storage.status === 'laden' || !v2Storage.dashboard) {
    return (
      <div
        data-testid="dashboard-v2-loading"
        className="flex h-screen w-full items-center justify-center bg-[var(--color-bg-deep,#030c0b)] text-[var(--color-text-soft,#e6f3f1)]"
      >
        <p className="text-sm text-muted-foreground animate-pulse">Lade Dashboard...</p>
      </div>
    );
  }

  const handleSave = async (cfg: DashboardConfigV2): Promise<boolean> => {
    const res = await v2Storage.save(cfg);
    if (!res.ok) {
      if (res.error.kind === 'team_zugriff_entzogen') {
        setRevokedDraft(cfg);
        setShowRevokedDialog(true);
      } else if (res.error.kind === 'konflikt') {
        setConflictDraft(cfg);
        setConflictDialogError(null);
        setShowConflictDialog(true);
      } else if (res.error.kind === 'nicht_gefunden') {
        setDeletedDraft(cfg);
        setDeletedDialogError(null);
        setShowDeletedDialog(true);
      }
      return false;
    }
    return true;
  };

  const handleReloadConflict = async () => {
    setShowConflictDialog(false);
    setConflictDraft(null);
    setConflictDialogError(null);
    await v2Storage.reload();
  };

  const handleSaveAsCopyConflict = async () => {
    if (!conflictDraft) return;
    setConflictDialogError(null);
    const res = await v2Storage.saveAsNewPersonalCopy(conflictDraft);
    if (res.ok) {
      setShowConflictDialog(false);
      setConflictDraft(null);
    } else {
      setConflictDialogError(
        res.error?.kind === 'obergrenze_erreicht'
          ? 'Maximale Anzahl von 20 Dashboards erreicht. Bitte lösche zunächst ein anderes Dashboard, um Platz für die Kopie zu schaffen.'
          : res.error?.kind === 'nicht_berechtigt'
            ? 'Keine Berechtigung zum Speichern einer neuen Kopie.'
            : 'Fehler beim Speichern der Kopie. Bitte erneut versuchen.',
      );
    }
  };

  const handleSaveAsNewFromDeleted = async () => {
    if (!deletedDraft) return;
    setDeletedDialogError(null);
    const res = await v2Storage.saveAsNewPersonalCopy(deletedDraft);
    if (res.ok) {
      setShowDeletedDialog(false);
      setDeletedDraft(null);
    } else {
      setDeletedDialogError(
        res.error?.kind === 'obergrenze_erreicht'
          ? 'Maximale Anzahl von 20 Dashboards erreicht.'
          : res.error?.kind === 'nicht_berechtigt'
            ? 'Keine Berechtigung zum Speichern eines neuen Dashboards.'
            : 'Fehler beim Speichern des neuen Dashboards. Bitte erneut versuchen.',
      );
    }
  };

  const handleOpenOtherFromDeleted = async () => {
    setShowDeletedDialog(false);
    setDeletedDraft(null);
    setDeletedDialogError(null);
    await v2Storage.reload();
  };

  const handleSaveAsPersonalCopyFromRevoked = async () => {
    if (!revokedDraft) return;
    const res = await v2Storage.saveAsNewPersonalCopy(revokedDraft);
    if (res.ok) {
      setShowRevokedDialog(false);
      setRevokedDraft(null);
    }
  };

  const handleSaveAsPersonalCopy = async () => {
    setReadOnlyCopyError(null);
    const res = await v2Storage.duplicateCurrent(undefined, { scope: 'personal' });
    if (!res.ok) {
      const msg =
        res.error?.kind === 'obergrenze_erreicht'
          ? 'Maximale Anzahl von 20 persönlichen Dashboards erreicht. Bitte löschen Sie ein anderes Dashboard.'
          : 'Persönliche Kopie konnte nicht erstellt werden.';
      setReadOnlyCopyError(msg);
    }
  };

  const handleDiscardAndReloadFromRevoked = async () => {
    setShowRevokedDialog(false);
    setRevokedDraft(null);
    await v2Storage.reload();
  };

  return (
    <>
      {v2Storage.fallbackNotice && (
        <div
          role="status"
          data-testid="dashboard-fallback-notice"
          className="flex items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span>{v2Storage.fallbackNotice}</span>
          </div>
          <button
            type="button"
            data-testid="dismiss-fallback-notice"
            onClick={v2Storage.clearFallbackNotice}
            className="text-xs text-amber-300 hover:text-white"
          >
            Ausblenden
          </button>
        </div>
      )}
      <TimeControlProvider key={v2Storage.dashboard.id}>
        <DashboardEditorShellV2
          key={`${v2Storage.dashboard.id}_${v2Storage.dashboard.revision}`}
          initialConfig={v2Storage.dashboard.config}
          useData={useTimeControlledData}
          onSave={handleSave}
          onResume={handleResume}
          onCancel={() => {
            setDashboardEditorV2Override(false);
            window.location.reload();
          }}
          onShowDetails={(tileId) => onShowDetails(tileId, v2Storage.dashboard?.id)}
          dashboards={v2Storage.dashboards}
          currentStoredDashboard={v2Storage.dashboard}
          onOpenDashboard={v2Storage.openDashboard}
          onCreateFromTemplate={v2Storage.createFromTemplate}
          onDuplicateCurrent={v2Storage.duplicateCurrent}
          onDeleteDashboard={v2Storage.deleteDashboard}
          onShareWithTeam={v2Storage.shareWithTeam}
          onSaveAsPersonalCopy={handleSaveAsPersonalCopy}
          readOnlyCopyError={readOnlyCopyError}
          onRefreshList={v2Storage.refreshList}
          listError={v2Storage.listError}
        />
      </TimeControlProvider>
      <DashboardConflictDialogV2
        open={showConflictDialog}
        isSaving={v2Storage.isSaving}
        error={conflictDialogError}
        scope={v2Storage.dashboard.scope}
        onReload={handleReloadConflict}
        onSaveAsCopy={handleSaveAsCopyConflict}
        onStay={() => {
          setShowConflictDialog(false);
          setConflictDialogError(null);
        }}
      />
      <DashboardDeletedDialogV2
        open={showDeletedDialog}
        isSaving={v2Storage.isSaving}
        error={deletedDialogError}
        onSaveAsNew={handleSaveAsNewFromDeleted}
        onOpenOther={handleOpenOtherFromDeleted}
        onStay={() => {
          setShowDeletedDialog(false);
          setDeletedDialogError(null);
        }}
      />
      <TeamAccessRevokedDialogV2
        open={showRevokedDialog}
        dashboardTitle={v2Storage.dashboard.title}
        isSaving={v2Storage.isSaving}
        onSaveAsPersonalCopy={handleSaveAsPersonalCopyFromRevoked}
        onDiscardAndReload={handleDiscardAndReloadFromRevoked}
      />
    </>
  );
}

export function PersonalExecutiveDashboard() {
  const preferences = useDashboardPreferences();
  const nav = useDashboardNavigation();
  const { session } = useOrganization();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Der mitgereiste Kontext gilt nur beim Öffnen der Seite; spätere Ersetzungen des Eintrags
  // (beim Öffnen der Details) dürfen den Arbeitsbereich nicht erneut steuern.
  const [arrival] = useState(nav.incoming);
  const [announcement, setAnnouncement] = useState('');

  // Auftrag 150 / P07: Neuer persistenter V2-Editor hinter Rollout-Schalter
  if (isDashboardEditorV2Enabled()) {
    return (
      <PersonalExecutiveDashboardV2Container
        preferredDashboardId={arrival?.dashboardId ?? undefined}
        onShowDetails={(tileId, dashboardId) => nav.openDetails(tileId, null, dashboardId)}
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-[var(--space-4,16px)]">
      {/* Auftrag 089 (Paket E): Die Kopfzeile nennt Bereich und Seite bereits – hier nur noch eine
          kompakte Zeile statt Bereichszeile, großer Überschrift und Einleitung. */}
      <header className="flex flex-wrap items-baseline gap-x-[12px] gap-y-[4px]">
        <h2
          ref={headingRef}
          tabIndex={-1}
          data-testid="dashboard-heading"
          className="m-0 text-[18px] font-semibold text-[var(--color-text-primary,#fff)] outline-none focus:ring-2 focus:ring-primary"
        >
          Executive Dashboard
        </h2>
        <p className="m-0 text-[13px] text-[var(--color-text-muted)]">
          „Details“ zeigt Herkunft, Zeitraum und Werte jeder Kachel.
        </p>
      </header>
      <p role="status" className="sr-only" data-testid="dashboard-nav-status">
        {announcement}
      </p>
      <DashboardWorkspace
        preferences={preferences}
        useData={useDashboardData}
        organizationName={
          session?.organizationId ? `Organisation ${session.organizationId}` : undefined
        }
        initialSession={arrival?.session ?? null}
        returnFocusTileId={arrival?.returnFocus ?? null}
        onReturnFocus={(found) => {
          setAnnouncement(found ? RETURN_ANNOUNCEMENT : RETURN_MISSING_ANNOUNCEMENT);
          if (!found) headingRef.current?.focus();
        }}
        onShowDetails={nav.openDetails}
        navigate={nav.goTo}
        useBackGuard={useBrowserBackGuard}
      />
    </div>
  );
}
