// Auftrag 158 (P09b): Hook für Dashboard-Auswahl, Dialoge, Tastatur, Schutz und Ansagen.

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  PersonalDashboardListItemV2,
  StoredDashboardV2Row,
} from '../../../services/dashboardStorageV2Types';
import { MAX_PERSONAL_DASHBOARDS } from '../../../model/dashboardTitles';

export type ActiveDialogType = null | 'new' | 'duplicate' | 'delete';

export type PendingSelectionAction =
  | { type: 'open'; id: string; title: string }
  | { type: 'new' }
  | { type: 'delete'; id: string; title: string };

export interface UseDashboardSelectionParams {
  currentDashboard: StoredDashboardV2Row;
  dashboards: PersonalDashboardListItemV2[];
  isDirty: boolean;
  isPreviewMode?: boolean;
  onOpenDashboard: (id: string) => Promise<boolean>;
  onCreateFromTemplate: (templateId: string, title?: string) => Promise<{ ok: boolean; error?: unknown }>;
  onDuplicateCurrent: (title?: string) => Promise<{ ok: boolean; error?: unknown }>;
  onDeleteDashboard: (id: string) => Promise<{ ok: boolean; nextDashboardId?: string | null; error?: unknown }>;
  onSaveCurrent: () => Promise<boolean>;
}

export function useDashboardSelection({
  currentDashboard,
  dashboards,
  isDirty,
  isPreviewMode = false,
  onOpenDashboard,
  onCreateFromTemplate,
  onDuplicateCurrent,
  onDeleteDashboard,
  onSaveCurrent,
}: UseDashboardSelectionParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<ActiveDialogType>(null);
  const [pendingAction, setPendingAction] = useState<PendingSelectionAction | null>(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [announcement, setAnnouncement] = useState<string>('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isLimitReached = dashboards.length >= MAX_PERSONAL_DASHBOARDS;
  const isOnlyOneDashboard = dashboards.length <= 1;

  // Fokus zurück auf den Auswahlknopf nach Schließen eines Dialogs oder Menüs
  const returnFocusToTrigger = useCallback(() => {
    requestAnimationFrame(() => {
      triggerButtonRef.current?.focus();
    });
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    returnFocusToTrigger();
  }, [returnFocusToTrigger]);

  const announce = useCallback((msg: string) => {
    setAnnouncement(msg);
  }, []);

  const executeAction = useCallback(
    async (action: PendingSelectionAction) => {
      if (action.type === 'open') {
        if (action.id === currentDashboard.id) return;
        setIsProcessing(true);
        const ok = await onOpenDashboard(action.id);
        setIsProcessing(false);
        if (ok) {
          announce(`Dashboard ‚${action.title}‘ geöffnet`);
          returnFocusToTrigger();
        } else {
          setErrorText('Dashboard konnte nicht geöffnet werden.');
        }
      } else if (action.type === 'new') {
        setActiveDialog('new');
      } else if (action.type === 'delete') {
        setActiveDialog('delete');
      }
    },
    [currentDashboard.id, onOpenDashboard, announce, returnFocusToTrigger],
  );

  // Aktion mit Navigationsschutz (isDirty) absichern
  const handleProtectedAction = useCallback(
    (action: PendingSelectionAction) => {
      setIsOpen(false);
      setErrorText(null);

      if (isDirty) {
        setPendingAction(action);
        setShowUnsavedConfirm(true);
      } else {
        executeAction(action);
      }
    },
    [isDirty, executeAction],
  );

  // Behandlung im UnsavedChangesDialog
  const handleDiscardAndProceed = useCallback(async () => {
    setShowUnsavedConfirm(false);
    if (pendingAction) {
      const act = pendingAction;
      setPendingAction(null);
      await executeAction(act);
    }
  }, [pendingAction, executeAction]);

  const handleSaveAndProceed = useCallback(async () => {
    setIsProcessing(true);
    const saved = await onSaveCurrent();
    setIsProcessing(false);
    if (!saved) {
      // Speichern fehlgeschlagen oder Revisionskonflikt -> nicht wechseln
      setShowUnsavedConfirm(false);
      setPendingAction(null);
      return;
    }
    setShowUnsavedConfirm(false);
    if (pendingAction) {
      const act = pendingAction;
      setPendingAction(null);
      await executeAction(act);
    }
  }, [onSaveCurrent, pendingAction, executeAction]);

  // Dialog-Aktionen
  const handleCreate = useCallback(
    async (templateId: string, title?: string): Promise<boolean> => {
      setIsProcessing(true);
      setErrorText(null);
      const res = await onCreateFromTemplate(templateId, title);
      setIsProcessing(false);
      if (res.ok) {
        setActiveDialog(null);
        announce(`Dashboard ‚${title}‘ angelegt`);
        returnFocusToTrigger();
        return true;
      }
      return false;
    },
    [onCreateFromTemplate, announce, returnFocusToTrigger],
  );

  const handleDuplicate = useCallback(
    async (title?: string, saveFirst = false): Promise<boolean> => {
      setIsProcessing(true);
      setErrorText(null);
      if (saveFirst && isDirty) {
        const saved = await onSaveCurrent();
        if (!saved) {
          setIsProcessing(false);
          return false;
        }
      }
      const res = await onDuplicateCurrent(title);
      setIsProcessing(false);
      if (res.ok) {
        setActiveDialog(null);
        announce(`Dashboard ‚${title}‘ angelegt`);
        returnFocusToTrigger();
        return true;
      }
      return false;
    },
    [isDirty, onSaveCurrent, onDuplicateCurrent, announce, returnFocusToTrigger],
  );

  const handleDelete = useCallback(async (): Promise<boolean> => {
    setIsProcessing(true);
    setErrorText(null);
    const res = await onDeleteDashboard(currentDashboard.id);
    setIsProcessing(false);
    if (res.ok) {
      setActiveDialog(null);
      const remaining = dashboards.find((d) => d.id === res.nextDashboardId);
      announce(
        `Dashboard ‚${currentDashboard.title}‘ gelöscht, ‚${remaining?.title ?? 'Nächstes'}‘ geöffnet`,
      );
      returnFocusToTrigger();
      return true;
    }
    return false;
  }, [
    currentDashboard.id,
    currentDashboard.title,
    dashboards,
    onDeleteDashboard,
    announce,
    returnFocusToTrigger,
  ]);

  // Escape-Taste schließt Menü
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeMenu]);

  return {
    isOpen,
    setIsOpen,
    activeDialog,
    setActiveDialog,
    showUnsavedConfirm,
    setShowUnsavedConfirm,
    announcement,
    errorText,
    setErrorText,
    isProcessing,
    isLimitReached,
    isOnlyOneDashboard,
    isPreviewMode,
    triggerButtonRef,
    menuRef,
    closeMenu,
    returnFocusToTrigger,
    handleProtectedAction,
    handleDiscardAndProceed,
    handleSaveAndProceed,
    handleCreate,
    handleDuplicate,
    handleDelete,
  };
}
