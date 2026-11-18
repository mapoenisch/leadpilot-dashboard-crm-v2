// Executive Dashboard V2 (Auftrag 165 / P12):
// Dialoge für die Vorschau (Revoked, Versionen, Import), um DashboardEditorPreviewV2 unter 400 Zeilen zu halten.

import { Suspense, lazy } from 'react';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import type { DashboardTeamV2 } from '../services/dashboardStorageV2Types';
import type { ParseImportResult } from '../model/dashboardExchangeV2';
import { TeamAccessRevokedDialogV2 } from '../components/editor/TeamAccessRevokedDialogV2';

const RevisionHistoryPanelV2 = lazy(() =>
  import('../components/editor/versions/RevisionHistoryPanelV2').then((m) => ({
    default: m.RevisionHistoryPanelV2,
  })),
);

const ImportDashboardDialogV2 = lazy(() =>
  import('../components/editor/selection/ImportDashboardDialogV2').then((m) => ({
    default: m.ImportDashboardDialogV2,
  })),
);

export interface PreviewDialogsV2Props {
  // Revoked
  showRevoked: boolean;
  dashboardTitle: string;
  onSaveAsPersonalCopyFromRevoked: () => Promise<void>;
  onDiscardAndReloadFromRevoked: () => void;

  // Versions
  isVersionsOpen: boolean;
  dashboardId: string;
  currentRevision: number;
  currentConfig: DashboardConfigV2;
  isDirty?: boolean;
  draftConfig?: DashboardConfigV2 | null;
  onCloseVersions: () => void;
  onRestoreRevision: (targetRevision: number) => Promise<boolean>;
  pageSize?: number;

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

export function PreviewDialogsV2({
  showRevoked,
  dashboardTitle,
  onSaveAsPersonalCopyFromRevoked,
  onDiscardAndReloadFromRevoked,

  isVersionsOpen,
  dashboardId,
  currentRevision,
  currentConfig,
  isDirty,
  draftConfig,
  onCloseVersions,
  onRestoreRevision,
  pageSize = 4,

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
}: PreviewDialogsV2Props) {
  return (
    <>
      <TeamAccessRevokedDialogV2
        open={showRevoked}
        dashboardTitle={dashboardTitle}
        onSaveAsPersonalCopy={onSaveAsPersonalCopyFromRevoked}
        onDiscardAndReload={onDiscardAndReloadFromRevoked}
      />

      {isVersionsOpen && (
        <Suspense fallback={null}>
          <RevisionHistoryPanelV2
            isOpen={isVersionsOpen}
            onClose={onCloseVersions}
            dashboardId={dashboardId}
            currentRevision={currentRevision}
            currentConfig={currentConfig}
            isDirty={isDirty}
            draftConfig={draftConfig}
            canWrite={true}
            currentUserId="demo-user-preview"
            scope="personal"
            onRestoreRevision={onRestoreRevision}
            pageSize={pageSize}
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
