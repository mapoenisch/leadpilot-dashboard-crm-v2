// Executive Dashboard, Teilauftrag 7 (Auftrag 077) & Auftrag 150 (P07): persönliche Ansicht unter `/dashboard`.
// V2 nutzt den persistenten Speicheradapter useDashboardV2Storage mit Revisionshistorie,
// optimistischer Konflikterkennung und deterministischer V1->V2-Kopiermigration.
import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrganization } from '@/auth/organizationContext';
import { DashboardWorkspace } from '../components/DashboardWorkspace';
import { DashboardEditorShellV2 } from '../components/editor/DashboardEditorShellV2';
import { PersonalDashboardDialogsV2 } from '../components/editor/PersonalDashboardDialogsV2';
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

import { useDashboardImport } from '../components/editor/selection/useDashboardImport';
import { DashboardStorageNoticesV2 } from '../components/editor/DashboardStorageNoticesV2';
import { restoreDashboardV2Revision } from '../services/dashboardStorageV2';
import { buildDerivedDashboardTitle } from '../model/dashboardTitles';

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
  const [isCopyingPersonal, setIsCopyingPersonal] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [versionsContext, setVersionsContext] = useState<{
    isDirty: boolean;
    draftConfig?: DashboardConfigV2;
  } | null>(null);

  const personalCount = (v2Storage.dashboards ?? []).filter((d) => d.scope === 'personal').length;
  const dashboardImport = useDashboardImport({
    userId: userId ?? 'anonymous',
    organizationId: organizationId ?? 'default-org',
    personalCount,
    onOpenDashboard: v2Storage.openDashboard,
    onRefreshList: v2Storage.refreshList,
  });

  const handleRestoreRevision = async (
    targetRevision: number,
    options?: { saveDraftAsCopy: boolean },
  ): Promise<boolean> => {
    if (!v2Storage.dashboard) return false;
    const originalDashboardId = v2Storage.dashboard.id;
    const currentDraft = versionsContext?.draftConfig || v2Storage.dashboard.config;
    if (options?.saveDraftAsCopy && versionsContext?.draftConfig) {
      const copyRes = await v2Storage.saveAsNewPersonalCopy(
        versionsContext.draftConfig,
        buildDerivedDashboardTitle(versionsContext.draftConfig.title, ' (Entwurf-Kopie)'),
      );
      if (!copyRes.ok) {
        handleStorageError(copyRes.error.kind, currentDraft);
        return false;
      }
    }
    const res = await restoreDashboardV2Revision({
      dashboardId: originalDashboardId,
      targetRevision,
      expectedRevision: v2Storage.dashboard.revision,
    });
    if (res.ok) {
      setIsVersionsOpen(false);
      setVersionsContext(null);
      await v2Storage.openDashboard(originalDashboardId);
      await v2Storage.refreshList();
      setReloadKey((k) => k + 1);
      return true;
    }
    setIsVersionsOpen(false);
    setVersionsContext(null);
    handleStorageError(
      res.error.kind,
      currentDraft,
      'Die Version konnte nicht wiederhergestellt werden, da das Dashboard zwischenzeitlich geändert wurde.',
    );
    return false;
  };

  const handleStorageError = (
    kind: string,
    draft: DashboardConfigV2,
    conflictMsg: string | null = null,
  ) => {
    if (kind === 'team_zugriff_entzogen') {
      setRevokedDraft(draft);
      setShowRevokedDialog(true);
    } else if (kind === 'konflikt') {
      setConflictDraft(draft);
      setConflictDialogError(conflictMsg);
      setShowConflictDialog(true);
    } else if (kind === 'nicht_gefunden') {
      setDeletedDraft(draft);
      setDeletedDialogError(null);
      setShowDeletedDialog(true);
    }
  };

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
      handleStorageError(res.error.kind, cfg);
      return false;
    }
    return true;
  };

  const reloadAndRefresh = async () => {
    await v2Storage.reload();
    setReloadKey((k) => k + 1);
  };

  const handleReloadConflict = async () => {
    setShowConflictDialog(false);
    setConflictDraft(null);
    setConflictDialogError(null);
    await reloadAndRefresh();
  };

  const getCopyError = (kind?: string, maxMsg = 'Maximale Anzahl von 20 Dashboards erreicht.') =>
    kind === 'obergrenze_erreicht'
      ? maxMsg
      : kind === 'nicht_berechtigt'
        ? 'Keine Berechtigung zum Speichern.'
        : 'Fehler beim Speichern. Bitte erneut versuchen.';

  const handleSaveAsCopyConflict = async () => {
    if (!conflictDraft) return;
    setConflictDialogError(null);
    const res = await v2Storage.saveAsNewPersonalCopy(conflictDraft);
    if (res.ok) {
      setShowConflictDialog(false);
      setConflictDraft(null);
    } else {
      setConflictDialogError(
        getCopyError(
          res.error?.kind,
          'Maximale Anzahl von 20 Dashboards erreicht. Bitte lösche zunächst ein anderes Dashboard.',
        ),
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
      setDeletedDialogError(getCopyError(res.error?.kind));
    }
  };

  const handleOpenOtherFromDeleted = async () => {
    setShowDeletedDialog(false);
    setDeletedDraft(null);
    setDeletedDialogError(null);
    await reloadAndRefresh();
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
    if (isCopyingPersonal || v2Storage.isSaving) return;
    setIsCopyingPersonal(true);
    setReadOnlyCopyError(null);
    try {
      const res = await v2Storage.duplicateCurrent(undefined, { scope: 'personal' });
      if (!res.ok) {
        const msg =
          res.error?.kind === 'obergrenze_erreicht'
            ? 'Maximale Anzahl von 20 persönlichen Dashboards erreicht. Bitte löschen Sie ein anderes Dashboard.'
            : 'Persönliche Kopie konnte nicht erstellt werden.';
        setReadOnlyCopyError(msg);
      }
    } finally {
      setIsCopyingPersonal(false);
    }
  };

  const handleDiscardAndReloadFromRevoked = async () => {
    setShowRevokedDialog(false);
    setRevokedDraft(null);
    await reloadAndRefresh();
  };

  return (
    <>
      <DashboardStorageNoticesV2
        fallbackNotice={v2Storage.fallbackNotice}
        onClearFallbackNotice={v2Storage.clearFallbackNotice}
        storageError={v2Storage.error}
        onClearStorageError={v2Storage.clearError}
      />
      <TimeControlProvider key={v2Storage.dashboard.id}>
        <DashboardEditorShellV2
          key={`${v2Storage.dashboard.id}_${reloadKey}`}
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
          isSavingPersonalCopy={isCopyingPersonal || v2Storage.isSaving}
          readOnlyCopyError={readOnlyCopyError}
          onRefreshList={v2Storage.refreshList}
          listError={v2Storage.listError}
          onOpenVersions={(ctx) => {
            setVersionsContext(ctx ?? null);
            setIsVersionsOpen(true);
          }}
          onOpenImport={dashboardImport.openImport}
        />
      </TimeControlProvider>
      <PersonalDashboardDialogsV2
        showConflict={showConflictDialog}
        isSaving={v2Storage.isSaving}
        conflictError={conflictDialogError}
        dashboard={v2Storage.dashboard}
        onReloadConflict={handleReloadConflict}
        onSaveAsCopyConflict={handleSaveAsCopyConflict}
        onStayConflict={() => {
          setShowConflictDialog(false);
          setConflictDialogError(null);
        }}
        showDeleted={showDeletedDialog}
        deletedError={deletedDialogError}
        onSaveAsNewFromDeleted={handleSaveAsNewFromDeleted}
        onOpenOtherFromDeleted={handleOpenOtherFromDeleted}
        onStayDeleted={() => {
          setShowDeletedDialog(false);
          setDeletedDialogError(null);
        }}
        showRevoked={showRevokedDialog}
        onSaveAsPersonalCopyFromRevoked={handleSaveAsPersonalCopyFromRevoked}
        onDiscardAndReloadFromRevoked={handleDiscardAndReloadFromRevoked}
        isVersionsOpen={isVersionsOpen}
        userId={userId}
        isDirty={versionsContext?.isDirty ?? false}
        draftConfig={versionsContext?.draftConfig}
        onCloseVersions={() => {
          setIsVersionsOpen(false);
          setVersionsContext(null);
        }}
        onRestoreRevision={handleRestoreRevision}
        onSaveAsCopy={v2Storage.saveAsNewPersonalCopy}
        isImportOpen={dashboardImport.isOpen}
        importFile={dashboardImport.file}
        importParseResult={dashboardImport.parseResult}
        importTitle={dashboardImport.title}
        onImportTitleChange={dashboardImport.setTitle}
        importTargetScope={dashboardImport.targetScope}
        importTargetTeamId={dashboardImport.targetTeamId}
        onImportTargetChange={dashboardImport.setTargetScope}
        importTeams={dashboardImport.teams}
        isImportSubmitting={dashboardImport.isSubmitting}
        importSubmitError={dashboardImport.submitError}
        onImportFileSelect={dashboardImport.handleFileSelect}
        onConfirmImport={dashboardImport.executeImport}
        onCloseImport={dashboardImport.closeImport}
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
        dashboardId={arrival?.dashboardId ?? 'personal'}
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
