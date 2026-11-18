import { lazy, Suspense, useCallback, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type {
  AccessibleDashboardListItemV2,
  DashboardV2StorageError,
  PersonalDashboardListItemV2,
  StoredDashboardV2Row,
} from '../../../services/dashboardStorageV2Types';
import { NewDashboardDialogV2 } from './NewDashboardDialogV2';
import { DuplicateDashboardDialogV2 } from './DuplicateDashboardDialogV2';
import { DeleteDashboardDialogV2 } from './DeleteDashboardDialogV2';
import { DashboardSwitcherMenuV2, groupDashboardsForMenu } from './DashboardSwitcherMenuV2';
import { useDashboardSelection } from './useDashboardSelection';
import { UnsavedChangesDialog } from '../../UnsavedChangesDialog';

const ShareWithTeamDialogV2 = lazy(() =>
  import('./ShareWithTeamDialogV2').then((m) => ({ default: m.ShareWithTeamDialogV2 })),
);

export interface DashboardSwitcherV2Props {
  currentDashboard: StoredDashboardV2Row;
  dashboards: (AccessibleDashboardListItemV2 | PersonalDashboardListItemV2)[];
  isDirty: boolean;
  isPreviewMode?: boolean;
  isSaving?: boolean;
  onOpenDashboard: (id: string) => Promise<boolean>;
  onCreateFromTemplate: (
    templateId: string,
    title?: string,
  ) => Promise<{ ok: boolean; error?: unknown }>;
  onDuplicateCurrent: (title?: string) => Promise<{ ok: boolean; error?: unknown }>;
  onDeleteDashboard: (
    id: string,
  ) => Promise<{ ok: boolean; nextDashboardId?: string | null; error?: unknown }>;
  onSaveCurrent: () => Promise<boolean>;
  onShareWithTeam?: (teamId: string, title: string) => Promise<{ ok: boolean; error?: unknown }>;
  onRefreshList?: () => Promise<void>;
  listError?: DashboardV2StorageError | null;
  onOpenImport?: () => void;
  className?: string;
}

function getListErrorMessage(error?: DashboardV2StorageError | null): string | null {
  if (!error) return null;
  return error.kind === 'nicht_berechtigt' || error.kind === 'keine_mitgliedschaft'
    ? 'Keine Berechtigung zum Laden der Dashboards.'
    : 'Dashboard-Liste konnte nicht geladen werden.';
}

export function DashboardSwitcherV2({
  currentDashboard,
  dashboards,
  isDirty,
  isPreviewMode = false,
  isSaving = false,
  onOpenDashboard,
  onCreateFromTemplate,
  onDuplicateCurrent,
  onDeleteDashboard,
  onSaveCurrent,
  onShareWithTeam,
  onRefreshList,
  listError,
  onOpenImport,
  className,
}: DashboardSwitcherV2Props) {
  const selection = useDashboardSelection({
    currentDashboard,
    dashboards,
    isDirty,
    isPreviewMode,
    onOpenDashboard,
    onCreateFromTemplate,
    onDuplicateCurrent,
    onDeleteDashboard,
    onSaveCurrent,
    onShareWithTeam,
    onOpenImport,
  });

  const {
    isOpen,
    setIsOpen,
    activeDialog,
    setActiveDialog,
    showUnsavedConfirm,
    setShowUnsavedConfirm,
    announcement,
    errorText,
    isProcessing,
    isLimitReached,
    isOnlyOneDashboard,
    triggerButtonRef,
    menuRef,
    handleProtectedAction,
    handleDiscardAndProceed,
    handleSaveAndProceed,
    handleCreate,
    handleDuplicate,
    handleDelete,
    handleShareWithTeam,
    returnFocusToTrigger,
  } = selection;

  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const wasOpenRef = useRef(false);

  // Beim Öffnen des Menüs Fokus auf das aktive Dashboard oder ersten Eintrag übertragen (Codex P2)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const { orderedDashboards } = groupDashboardsForMenu(dashboards);
      const currentIdx = orderedDashboards.findIndex((d) => d.id === currentDashboard.id);
      const activeEl = currentIdx >= 0 ? itemRefs.current[currentIdx] : null;
      if (activeEl && !activeEl.disabled) {
        activeEl.focus();
      } else {
        const firstEnabled = itemRefs.current.find(
          (el): el is HTMLButtonElement => el !== null && !el.disabled,
        );
        firstEnabled?.focus();
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, currentDashboard.id, dashboards]);

  // Beim Öffnen des Menüs Liste vom Server aktualisieren (Codex P2 / Auftrag 158 §2.5 Nr. 29)
  useEffect(() => {
    if (isOpen && onRefreshList) {
      void onRefreshList();
    }
  }, [isOpen, onRefreshList]);

  // Bei laufendem Speichern Menü schließen (Codex P2)
  useEffect(() => {
    if (isSaving && isOpen) {
      setIsOpen(false);
    }
  }, [isSaving, isOpen, setIsOpen]);

  // Klick außerhalb schließt das Menü
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerButtonRef.current &&
        !triggerButtonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setIsOpen, triggerButtonRef, menuRef]);

  // Tastaturnavigation im Menü (Pfeiltasten, Home, End - überspringt deaktivierte Einträge)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    const enabledItems = itemRefs.current.filter(
      (el): el is HTMLButtonElement => el !== null && !el.disabled,
    );
    if (enabledItems.length === 0) return;

    const currentIndex = enabledItems.indexOf(document.activeElement as HTMLButtonElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex =
        currentIndex === -1 || currentIndex + 1 >= enabledItems.length ? 0 : currentIndex + 1;
      enabledItems[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIndex = currentIndex <= 0 ? enabledItems.length - 1 : currentIndex - 1;
      enabledItems[nextIndex]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      enabledItems[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      enabledItems[enabledItems.length - 1]?.focus();
    }
  };

  const handleCloseActiveDialog = useCallback(() => {
    setActiveDialog(null);
    returnFocusToTrigger();
  }, [setActiveDialog, returnFocusToTrigger]);

  const handleCloseUnsavedConfirm = useCallback(() => {
    setShowUnsavedConfirm(false);
    returnFocusToTrigger();
  }, [setShowUnsavedConfirm, returnFocusToTrigger]);

  return (
    <div className={cn('relative inline-block', className)}>
      {/* Live Region für barrierefreie Ansagen */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="dashboard-switcher-announcement"
      >
        {announcement}
      </div>

      {/* Auswahlknopf mit Scope-Badge */}
      <button
        ref={triggerButtonRef}
        type="button"
        disabled={isSaving}
        data-testid="dashboard-switcher-button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => {
          if (isSaving) return;
          setIsOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (isSaving) return;
          if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            setIsOpen(true);
          } else if (isOpen) {
            handleKeyDown(e);
          }
        }}
        className={cn(
          'flex h-9 items-center gap-2 rounded-md border border-[var(--color-border,#1b3d39)] bg-black/30 px-2.5 py-1 text-xs font-medium text-white transition-all hover:border-primary/50 hover:bg-black/50 focus:outline-none focus:ring-1 focus:ring-primary',
          isOpen && 'border-primary bg-black/60',
          isSaving && 'cursor-not-allowed opacity-60',
        )}
      >
        <span data-testid="scope-badge">
          <Badge
            variant="neutral"
            className="border-blue-500/40 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-300"
          >
            {currentDashboard.scope === 'team'
              ? currentDashboard.teamName
                ? `Team: ${currentDashboard.teamName}`
                : (
                      dashboards.find((d) => d.id === currentDashboard.id) as
                        AccessibleDashboardListItemV2 | undefined
                    )?.teamName
                  ? `Team: ${
                      (
                        dashboards.find(
                          (d) => d.id === currentDashboard.id,
                        ) as AccessibleDashboardListItemV2
                      ).teamName
                    }`
                  : 'Team'
              : 'Persönlich'}
          </Badge>
        </span>
        <span className="max-w-[160px] truncate sm:max-w-[220px]">{currentDashboard.title}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180 text-primary',
          )}
        />
      </button>

      {/* Menü-Dropdown */}
      {isOpen && (
        <DashboardSwitcherMenuV2
          menuRef={menuRef}
          currentDashboard={currentDashboard}
          dashboards={dashboards}
          errorText={errorText ?? getListErrorMessage(listError)}
          isPreviewMode={isPreviewMode}
          isLimitReached={isLimitReached}
          isOnlyOneDashboard={isOnlyOneDashboard}
          onOpenAction={(action) => {
            if (!isSaving) handleProtectedAction(action);
          }}
          onOpenDuplicateDialog={() => {
            if (!isSaving) {
              setIsOpen(false);
              setActiveDialog('duplicate');
            }
          }}
          onOpenShareDialog={() => {
            if (!isSaving) {
              setIsOpen(false);
              setActiveDialog('share');
            }
          }}
          canShareWithTeam={
            currentDashboard.scope === 'personal' && !isPreviewMode && Boolean(onShareWithTeam)
          }
          onOpenImportDialog={
            onOpenImport
              ? () => {
                  if (!isSaving) handleProtectedAction({ type: 'import' });
                }
              : undefined
          }
          onKeyDown={handleKeyDown}
          itemRefs={itemRefs}
        />
      )}

      {/* Dialog 1: Neues Dashboard */}
      <NewDashboardDialogV2
        open={activeDialog === 'new'}
        onClose={handleCloseActiveDialog}
        existingDashboards={dashboards}
        onCreate={handleCreate}
        isSaving={isProcessing || isSaving}
      />

      {/* Dialog 2: Duplizieren */}
      <DuplicateDashboardDialogV2
        open={activeDialog === 'duplicate'}
        onClose={handleCloseActiveDialog}
        currentDashboard={currentDashboard}
        existingDashboards={dashboards}
        isDirty={isDirty}
        onDuplicate={handleDuplicate}
        isSaving={isProcessing || isSaving}
      />

      {/* Dialog 3: Löschen */}
      <DeleteDashboardDialogV2
        open={activeDialog === 'delete'}
        onClose={handleCloseActiveDialog}
        dashboard={currentDashboard}
        onConfirm={handleDelete}
        isSaving={isProcessing || isSaving}
      />

      {/* Dialog 4: Mit Team teilen */}
      {activeDialog === 'share' && (
        <Suspense fallback={null}>
          <ShareWithTeamDialogV2
            open={true}
            onClose={handleCloseActiveDialog}
            currentDashboard={currentDashboard}
            isDirty={isDirty}
            onShare={handleShareWithTeam}
            isSaving={isProcessing || isSaving}
          />
        </Suspense>
      )}

      {/* Dialog 4: Navigationsschutz bei ungespeicherten Änderungen vor Wechsel/Neu/Löschen */}
      <UnsavedChangesDialog
        open={showUnsavedConfirm}
        locked={isProcessing || isSaving}
        onStay={handleCloseUnsavedConfirm}
        onDiscard={() => {
          if (isSaving) return;
          handleDiscardAndProceed();
        }}
        onSave={() => {
          if (isSaving) return;
          handleSaveAndProceed();
        }}
      />
    </div>
  );
}
