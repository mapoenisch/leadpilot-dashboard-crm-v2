// Executive Dashboard V2 (Auftrag 165 / P12):
// Bündelt alle V2-Dialoge (Konflikt, Gelöscht, Entzogen, Versionen, Import)
// zur Entlastung von PersonalExecutiveDashboard (strikte <= 400 Zeilen-Grenze).

import { Suspense, lazy } from 'react';
import type { DashboardTeamV2, StoredDashboardV2Row } from '../../services/dashboardStorageV2Types';
import type { ParseImportResult } from '../../model/dashboardExchangeV2';
import { DashboardConflictDialogV2 } from './DashboardConflictDialogV2';
import { DashboardDeletedDialogV2 } from './DashboardDeletedDialogV2';
import { TeamAccessRevokedDialogV2 } from './TeamAccessRevokedDialogV2';

const RevisionHistoryPanelV2 = lazy(() =>
  import('./versions/RevisionHistoryPanelV2').then((m) => ({
    default: m.RevisionHistoryPanelV2,
  })),
);

const ImportDashboardDialogV2 = lazy(() =>
  import('./selection/ImportDashboardDialogV2').then((m) => ({
    default: m.ImportDashboardDialogV2,
  })),
);

export interface PersonalDashboardDialogsV2Props {
  // Konflikt
  showConflict: boolean;
  isSaving: boolean;
  conflictError: string | null;
  dashboard: StoredDashboardV2Row;
  onReloadConflict: () => Promise<void>;
  onSaveAsCopyConflict: () => Promise<void>;
  onStayConflict: () => void;

  // Gelöscht
  showDeleted: boolean;
  deletedError: string | null;
  onSaveAsNewFromDeleted: () => Promise<void>;
  onOpenOtherFromDeleted: () => Promise<void>;
  onStayDeleted: () => void;

  // Entzogen
  showRevoked: boolean;
  onSaveAsPersonalCopyFromRevoked: () => Promise<void>;
  onDiscardAndReloadFromRevoked: () => Promise<void>;

  // Versionen
  isVersionsOpen: boolean;
  userId?: string;
  isDirty?: boolean;
  draftConfig?: import('../../model/dashboardConfigV2').DashboardConfigV2 | null;
  onCloseVersions: () => void;
  onRestoreRevision: (targetRevision: number) => Promise<boolean>;

  // Import
  isImportOpen: boolean;
  importFile: File | null;
  importParseResult: ParseImportResult | null;
  importTitle: string;
  onImportTitleChange: (title: string) => void;
  importTargetScope: 'personal' | 'team';
  importTargetTeamId?: string;
  onImportTargetChange: (scope: 'personal' | 'team', teamId?: string) => void;
  importTeams?: DashboardTeamV2[];
  isImportSubmitting: boolean;
  importSubmitError: string | null;
  onImportFileSelect: (file: File) => void;
  onConfirmImport: () => Promise<boolean>;
  onCloseImport: () => void;
}

export function PersonalDashboardDialogsV2({
  showConflict,
  isSaving,
  conflictError,
  dashboard,
  onReloadConflict,
  onSaveAsCopyConflict,
  onStayConflict,

  showDeleted,
  deletedError,
  onSaveAsNewFromDeleted,
  onOpenOtherFromDeleted,
  onStayDeleted,

  showRevoked,
  onSaveAsPersonalCopyFromRevoked,
  onDiscardAndReloadFromRevoked,

  isVersionsOpen,
  userId,
  isDirty,
  draftConfig,
  onCloseVersions,
  onRestoreRevision,

  isImportOpen,
  importFile,
  importParseResult,
  importTitle,
  onImportTitleChange,
  importTargetScope,
  importTargetTeamId,
  onImportTargetChange,
  importTeams,
  isImportSubmitting,
  importSubmitError,
  onImportFileSelect,
  onConfirmImport,
  onCloseImport,
}: PersonalDashboardDialogsV2Props) {
  return (
    <>
      <DashboardConflictDialogV2
        open={showConflict}
        isSaving={isSaving}
        error={conflictError}
        scope={dashboard.scope}
        onReload={onReloadConflict}
        onSaveAsCopy={onSaveAsCopyConflict}
        onStay={onStayConflict}
      />

      <DashboardDeletedDialogV2
        open={showDeleted}
        isSaving={isSaving}
        error={deletedError}
        onSaveAsNew={onSaveAsNewFromDeleted}
        onOpenOther={onOpenOtherFromDeleted}
        onStay={onStayDeleted}
      />

      <TeamAccessRevokedDialogV2
        open={showRevoked}
        dashboardTitle={dashboard.title}
        isSaving={isSaving}
        onSaveAsPersonalCopy={onSaveAsPersonalCopyFromRevoked}
        onDiscardAndReload={onDiscardAndReloadFromRevoked}
      />

      {isVersionsOpen && (
        <Suspense fallback={null}>
          <RevisionHistoryPanelV2
            isOpen={isVersionsOpen}
            onClose={onCloseVersions}
            dashboardId={dashboard.id}
            currentRevision={dashboard.revision}
            currentConfig={dashboard.config}
            isDirty={isDirty}
            draftConfig={draftConfig}
            canWrite={dashboard.canWrite !== false}
            currentUserId={userId}
            scope={dashboard.scope}
            teamName={dashboard.teamName}
            onRestoreRevision={onRestoreRevision}
          />
        </Suspense>
      )}

      {isImportOpen && (
        <Suspense fallback={null}>
          <ImportDashboardDialogV2
            isOpen={isImportOpen}
            onClose={onCloseImport}
            file={importFile}
            parseResult={importParseResult}
            title={importTitle}
            onTitleChange={onImportTitleChange}
            targetScope={importTargetScope}
            targetTeamId={importTargetTeamId}
            onTargetChange={onImportTargetChange}
            teams={importTeams}
            isSubmitting={isImportSubmitting}
            submitError={importSubmitError}
            onFileSelect={onImportFileSelect}
            onConfirmImport={onConfirmImport}
          />
        </Suspense>
      )}
    </>
  );
}
