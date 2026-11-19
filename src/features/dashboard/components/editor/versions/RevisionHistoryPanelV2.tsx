// Executive Dashboard V2 (Auftrag 165 / P12):
// Versionsbereich: Revisionshistorie, Autorenanzeige, Paging, Vergleich und Wiederherstellen.

import { useState } from 'react';
import { X, History, Download, GitCompare, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { DashboardConfigV2 } from '../../../model/dashboardConfigV2';
import { buildDashboardExportV2, buildExportFileNameV2 } from '../../../model/dashboardExchangeV2';
import { DASHBOARD_VERSION_MESSAGES } from '../../../model/dashboardVersionMessages';
import { useRevisionHistory } from './useRevisionHistory';
import { RevisionDiffViewV2 } from './RevisionDiffViewV2';
import { RestoreRevisionDialogV2 } from './RestoreRevisionDialogV2';
import { RevisionItemRowV2 } from './RevisionItemRowV2';
import { useModalA11y } from './useModalA11y';
import { useDashboardAlarms } from '../../../hooks/useDashboardAlarms';

export interface RevisionHistoryPanelV2Props {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: string;
  currentRevision: number;
  currentConfig: DashboardConfigV2;
  draftConfig?: DashboardConfigV2 | null;
  isDirty?: boolean;
  canWrite?: boolean;
  currentUserId?: string;
  scope?: 'personal' | 'team';
  teamName?: string | null;
  onRestoreRevision: (
    targetRevision: number,
    options: { saveDraftAsCopy: boolean },
  ) => Promise<boolean>;
  onSaveAsCopy?: (config: DashboardConfigV2, title?: string) => Promise<unknown>;
  pageSize?: number;
}

export function RevisionHistoryPanelV2({
  isOpen,
  onClose,
  dashboardId,
  currentRevision,
  currentConfig,
  draftConfig,
  isDirty = false,
  canWrite = true,
  currentUserId,
  scope,
  teamName,
  onRestoreRevision,
  onSaveAsCopy: _onSaveAsCopy,
  pageSize,
}: RevisionHistoryPanelV2Props) {
  const {
    revisions,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    isFallbackMode,
    loadMore,
    fetchRevisionConfig,
  } = useRevisionHistory({
    dashboardId,
    currentRevision,
    currentUserId,
    isOpen,
    pageSize,
  });

  const { retentionInfo } = useDashboardAlarms({ dashboardId });

  // Vergleichszustand
  const [comparing, setComparing] = useState<{
    labelA: string;
    configA: DashboardConfigV2;
    labelB: string;
    configB: DashboardConfigV2;
  } | null>(null);

  // Auswahlmodus für "Zwei Versionen vergleichen"
  const [selectMode, setSelectMode] = useState(false);
  const [selectedRevisions, setSelectedRevisions] = useState<number[]>([]);

  // Wiederherstellungs-Dialog
  const [restoreTargetRevision, setRestoreTargetRevision] = useState<number | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  // Während laufender Wiederherstellung bleibt der Versionsbereich geschlossen-gesperrt.
  const guardedClose = () => {
    if (!isRestoring) onClose();
  };

  const panelRef = useModalA11y<HTMLDivElement>({
    isOpen,
    onClose: guardedClose,
    closeOnEscape: restoreTargetRevision === null && !isRestoring,
  });

  if (!isOpen) return null;

  const handleExport = (configToExport: DashboardConfigV2, revNumber: number) => {
    const envelope = buildDashboardExportV2(configToExport, { sourceRevision: revNumber });
    const fileName = buildExportFileNameV2(configToExport.title, revNumber);
    const blob = new Blob([JSON.stringify(envelope, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportRevision = async (revNumber: number) => {
    if (revNumber === currentRevision) {
      handleExport(currentConfig, revNumber);
      return;
    }
    const config = await fetchRevisionConfig(revNumber);
    if (config) {
      handleExport(config, revNumber);
    }
  };

  const handleCompareWithCurrent = async (revNumber: number) => {
    const config = await fetchRevisionConfig(revNumber);
    if (!config) return;
    setComparing({
      labelA: `Revision ${revNumber}`,
      configA: config,
      labelB: 'Aktueller Stand',
      configB: currentConfig,
    });
  };

  const handleCompareSelected = async () => {
    if (selectedRevisions.length !== 2) return;
    const revA = Math.min(selectedRevisions[0]!, selectedRevisions[1]!);
    const revB = Math.max(selectedRevisions[0]!, selectedRevisions[1]!);
    const [cfgA, cfgB] = await Promise.all([
      revA === currentRevision ? currentConfig : fetchRevisionConfig(revA),
      revB === currentRevision ? currentConfig : fetchRevisionConfig(revB),
    ]);
    if (!cfgA || !cfgB) return;
    setComparing({
      labelA: `Revision ${revA}`,
      configA: cfgA,
      labelB: `Revision ${revB}`,
      configB: cfgB,
    });
    setSelectMode(false);
    setSelectedRevisions([]);
  };

  const toggleSelectRevision = (rev: number) => {
    setSelectedRevisions((prev) => {
      if (prev.includes(rev)) {
        return prev.filter((r) => r !== rev);
      }
      if (prev.length >= 2) {
        return [prev[1]!, rev];
      }
      return [...prev, rev];
    });
  };

  const handleConfirmRestore = async (options: { saveDraftAsCopy: boolean }) => {
    if (restoreTargetRevision == null) return;
    setIsRestoring(true);
    let success = false;
    try {
      success = await onRestoreRevision(restoreTargetRevision, options);
    } finally {
      setIsRestoring(false);
    }
    if (success) {
      setRestoreTargetRevision(null);
      setComparing(null);
    }
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Versionshistorie"
      tabIndex={-1}
      data-testid="revision-history-panel"
      className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-xs outline-none"
    >
      <div className="flex h-full w-full flex-col bg-[var(--color-bg-deep,#051413)] border-l border-[var(--color-border,#1b3d39)] p-4 shadow-2xl md:w-[480px]">
        {/* Panel Kopf */}
        <div className="flex items-center justify-between border-b border-[var(--color-border,#1b3d39)] pb-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-white">Versionshistorie</h2>
          </div>
          <button
            type="button"
            data-testid="close-versions-panel"
            onClick={guardedClose}
            disabled={isRestoring}
            className="rounded p-1 text-[var(--color-text-muted)] hover:text-white transition-colors focus:ring-1 focus:ring-primary"
            aria-label="Versionsbereich schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Diff-Ansicht oder Historien-Liste */}
        {comparing ? (
          <div className="flex-1 overflow-hidden pt-3">
            <RevisionDiffViewV2
              labelA={comparing.labelA}
              configA={comparing.configA}
              labelB={comparing.labelB}
              configB={comparing.configB}
              draftConfig={draftConfig}
              isDirty={isDirty}
              onBack={() => setComparing(null)}
              onCompareWithDraft={() => {
                if (!draftConfig) return;
                setComparing({
                  labelA: comparing.labelA,
                  configA: comparing.configA,
                  labelB: 'Mein Entwurf',
                  configB: draftConfig,
                });
              }}
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden pt-3 space-y-3">
            {/* Fallback-Warnung (§2.4 Nr. 24) */}
            {isFallbackMode && (
              <div
                data-testid="fallback-notice"
                className="flex items-center gap-2 rounded border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-300"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{DASHBOARD_VERSION_MESSAGES.serverUpdateNeeded}</span>
              </div>
            )}

            {/* Obere Leiste: Globaler Export & Zwei Versionen vergleichen */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border,#1b3d39)] pb-2">
              <Button
                type="button"
                data-testid="export-current-button"
                variant="secondary"
                size="sm"
                onClick={() => handleExport(currentConfig, currentRevision)}
                className="h-8 gap-1.5 px-2 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Aktuellen Stand exportieren</span>
              </Button>

              {!isFallbackMode && (
                <Button
                  type="button"
                  data-testid="toggle-select-mode-button"
                  variant={selectMode ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setSelectMode(!selectMode);
                    setSelectedRevisions([]);
                  }}
                  className="h-8 text-xs"
                >
                  <GitCompare className="h-3.5 w-3.5" />
                  <span>{selectMode ? 'Abbrechen' : 'Zwei Versionen vergleichen'}</span>
                </Button>
              )}
            </div>

            {/* Auswahlanweisung für 2 Versionen */}
            {selectMode && (
              <div className="flex items-center justify-between rounded bg-primary/10 border border-primary/30 p-2 text-xs text-primary">
                <span>Wähle 2 Versionen aus ({selectedRevisions.length}/2):</span>
                <Button
                  type="button"
                  data-testid="compare-selected-button"
                  variant="primary"
                  size="sm"
                  disabled={selectedRevisions.length !== 2}
                  onClick={handleCompareSelected}
                  className="h-7 text-xs"
                >
                  Vergleichen
                </Button>
              </div>
            )}

            {/* Liste der Revisionen */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {isLoading ? (
                <div className="flex items-center justify-center p-8 text-xs text-[var(--color-text-muted)] gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Versionen laden…</span>
                </div>
              ) : error ? (
                <div className="p-4 text-xs text-rose-400">Fehler beim Laden der Versionen.</div>
              ) : revisions.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">
                  {DASHBOARD_VERSION_MESSAGES.noVersionsFound}
                </div>
              ) : (
                revisions.map((rev, idx) => (
                  <RevisionItemRowV2
                    key={rev.revision}
                    rev={rev}
                    isCurrent={rev.revision === currentRevision || idx === 0}
                    isSelected={selectedRevisions.includes(rev.revision)}
                    selectMode={selectMode}
                    isFallbackMode={isFallbackMode}
                    canWrite={canWrite}
                    onToggleSelect={() => toggleSelectRevision(rev.revision)}
                    onCompareWithCurrent={() => handleCompareWithCurrent(rev.revision)}
                    onExport={() => handleExportRevision(rev.revision)}
                    onRestore={() => setRestoreTargetRevision(rev.revision)}
                  />
                ))
              )}

              {/* Paging: Weitere laden */}
              {hasMore && !isFallbackMode && (
                <div className="pt-2 text-center">
                  <Button
                    type="button"
                    data-testid="load-more-revisions-button"
                    variant="secondary"
                    size="sm"
                    disabled={isLoadingMore}
                    onClick={loadMore}
                    className="w-full text-xs"
                  >
                    {isLoadingMore ? 'Lade weitere…' : 'Weitere laden'}
                  </Button>
                </div>
              )}

              {/* Aufbewahrungshinweis (Auftrag 168 §2.1 Nr. 10 / Auftrag 165 §8 Nr. 5) */}
              {retentionInfo?.entfernt && (
                <div
                  data-testid="revisions-retention-notice"
                  className="pt-2 text-center text-[11px] text-[var(--color-text-muted)] italic"
                >
                  Ältere Versionen wurden nach der Aufbewahrungsregel entfernt.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wiederherstellen Bestätigungsdialog */}
        <RestoreRevisionDialogV2
          isOpen={restoreTargetRevision !== null}
          targetRevision={restoreTargetRevision ?? 1}
          currentRevision={currentRevision}
          isDirty={isDirty}
          scope={scope}
          teamName={teamName}
          onConfirmRestore={handleConfirmRestore}
          onCancel={() => setRestoreTargetRevision(null)}
        />
      </div>
    </div>
  );
}
