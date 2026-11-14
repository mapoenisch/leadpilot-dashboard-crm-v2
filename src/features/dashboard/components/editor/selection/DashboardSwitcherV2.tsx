// Auftrag 158 (P09b): Dashboard-Auswahl in der Top-Bar.
// Scope-Badge, Disclosure-Menü, Tastaturbedienung und barrierefreie Ansagen.

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type {
  PersonalDashboardListItemV2,
  StoredDashboardV2Row,
} from '../../../services/dashboardStorageV2Types';
import { NewDashboardDialogV2 } from './NewDashboardDialogV2';
import { DuplicateDashboardDialogV2 } from './DuplicateDashboardDialogV2';
import { DeleteDashboardDialogV2 } from './DeleteDashboardDialogV2';
import { DashboardSwitcherMenuV2 } from './DashboardSwitcherMenuV2';
import { useDashboardSelection } from './useDashboardSelection';
import { UnsavedChangesDialog } from '../../UnsavedChangesDialog';

export interface DashboardSwitcherV2Props {
  currentDashboard: StoredDashboardV2Row;
  dashboards: PersonalDashboardListItemV2[];
  isDirty: boolean;
  isPreviewMode?: boolean;
  onOpenDashboard: (id: string) => Promise<boolean>;
  onCreateFromTemplate: (templateId: string, title?: string) => Promise<{ ok: boolean; error?: unknown }>;
  onDuplicateCurrent: (title?: string) => Promise<{ ok: boolean; error?: unknown }>;
  onDeleteDashboard: (id: string) => Promise<{ ok: boolean; nextDashboardId?: string | null; error?: unknown }>;
  onSaveCurrent: () => Promise<boolean>;
  className?: string;
}

export function DashboardSwitcherV2({
  currentDashboard,
  dashboards,
  isDirty,
  isPreviewMode = false,
  onOpenDashboard,
  onCreateFromTemplate,
  onDuplicateCurrent,
  onDeleteDashboard,
  onSaveCurrent,
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
  } = selection;

  const [, setFocusedIndex] = useState<number>(-1);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

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

  // Tastaturnavigation im Menü (Pfeiltasten, Home, End)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    const itemsCount = itemRefs.current.filter(Boolean).length;
    if (itemsCount === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev + 1 >= itemsCount ? 0 : prev + 1;
        itemRefs.current[next]?.focus();
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev - 1 < 0 ? itemsCount - 1 : prev - 1;
        itemRefs.current[next]?.focus();
        return next;
      });
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusedIndex(0);
      itemRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = itemsCount - 1;
      setFocusedIndex(last);
      itemRefs.current[last]?.focus();
    }
  };

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
        data-testid="dashboard-switcher-button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((prev) => !prev);
          setFocusedIndex(-1);
        }}
        className={cn(
          'flex h-9 items-center gap-2 rounded-md border border-[var(--color-border,#1b3d39)] bg-black/30 px-2.5 py-1 text-xs font-medium text-white transition-all hover:border-primary/50 hover:bg-black/50 focus:outline-none focus:ring-1 focus:ring-primary',
          isOpen && 'border-primary bg-black/60',
        )}
      >
        <span data-testid="scope-badge">
          <Badge
            variant="neutral"
            className="border-blue-500/40 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-300"
          >
            Persönlich
          </Badge>
        </span>
        <span className="max-w-[160px] truncate sm:max-w-[220px]">
          {currentDashboard.title}
        </span>
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
          errorText={errorText}
          isPreviewMode={isPreviewMode}
          isLimitReached={isLimitReached}
          isOnlyOneDashboard={isOnlyOneDashboard}
          onOpenAction={handleProtectedAction}
          onOpenDuplicateDialog={() => {
            setIsOpen(false);
            setActiveDialog('duplicate');
          }}
          onKeyDown={handleKeyDown}
          itemRefs={itemRefs}
        />
      )}

      {/* Dialog 1: Neues Dashboard */}
      <NewDashboardDialogV2
        open={activeDialog === 'new'}
        onClose={() => setActiveDialog(null)}
        existingDashboards={dashboards}
        onCreate={handleCreate}
        isSaving={isProcessing}
      />

      {/* Dialog 2: Duplizieren */}
      <DuplicateDashboardDialogV2
        open={activeDialog === 'duplicate'}
        onClose={() => setActiveDialog(null)}
        currentDashboard={currentDashboard}
        isDirty={isDirty}
        onDuplicate={handleDuplicate}
        isSaving={isProcessing}
      />

      {/* Dialog 3: Löschen */}
      <DeleteDashboardDialogV2
        open={activeDialog === 'delete'}
        onClose={() => setActiveDialog(null)}
        dashboard={currentDashboard}
        onConfirm={handleDelete}
        isSaving={isProcessing}
      />

      {/* Dialog 4: Navigationsschutz bei ungespeicherten Änderungen vor Wechsel/Neu/Löschen */}
      <UnsavedChangesDialog
        open={showUnsavedConfirm}
        locked={isProcessing}
        onStay={() => setShowUnsavedConfirm(false)}
        onDiscard={handleDiscardAndProceed}
        onSave={handleSaveAndProceed}
      />
    </div>
  );
}
