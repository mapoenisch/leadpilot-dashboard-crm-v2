// Auftrag 158 (P09b): Hook für Dashboard-Auswahl, Dialoge, Tastatur, Schutz und Ansagen.

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DashboardV2StorageError,
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

// Modulweiter Zwischenspeicher für Folgeaktionen, Ansagen und Trigger-Fokus über Shell-Remounts hinweg (P09b / Codex P2)
let pendingFollowUpSelectionAction: PendingSelectionAction | null = null;
let pendingPostSwitchAnnouncement: string | null = null;
let pendingFocusTriggerOnMount = false;

export function clearPendingFollowUpSelectionAction(): void {
  pendingFollowUpSelectionAction = null;
  pendingPostSwitchAnnouncement = null;
  pendingFocusTriggerOnMount = false;
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
  const [activeDialog, setActiveDialog] = useState<ActiveDialogType>(() => {
    if (
      pendingFollowUpSelectionAction &&
      (pendingFollowUpSelectionAction.type === 'new' ||
        pendingFollowUpSelectionAction.type === 'delete')
    ) {
      const type = pendingFollowUpSelectionAction.type;
      pendingFollowUpSelectionAction = null;
      return type;
    }
    return null;
  });
  const [pendingAction, setPendingAction] = useState<PendingSelectionAction | null>(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [announcement, setAnnouncement] = useState<string>(() => {
    if (pendingPostSwitchAnnouncement) {
      const msg = pendingPostSwitchAnnouncement;
      pendingPostSwitchAnnouncement = null;
      return msg;
    }
    return '';
  });
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isLimitReached = dashboards.length >= MAX_PERSONAL_DASHBOARDS;
  const isOnlyOneDashboard = dashboards.length <= 1;

  const returnFocusToTrigger = useCallback(() => {
    requestAnimationFrame(() => {
      triggerButtonRef.current?.focus();
    });
  }, []);

  // Fokus nach Shell-Remount auf den Auswahlknopf zurücksetzen (Codex P2)
  useEffect(() => {
    if (pendingFocusTriggerOnMount) {
      pendingFocusTriggerOnMount = false;
      returnFocusToTrigger();
    }
  }, [returnFocusToTrigger]);

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
        pendingPostSwitchAnnouncement = `Dashboard ‚${action.title}‘ geöffnet`;
        pendingFocusTriggerOnMount = true;
        const ok = await onOpenDashboard(action.id);
        if (!isMountedRef.current) return;
        setIsProcessing(false);
        if (ok) {
          pendingPostSwitchAnnouncement = null;
          pendingFocusTriggerOnMount = false;
          announce(`Dashboard ‚${action.title}‘ geöffnet`);
          returnFocusToTrigger();
        } else {
          pendingPostSwitchAnnouncement = null;
          pendingFocusTriggerOnMount = false;
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

  // Folgeaktion nach Mount (z. B. nach Speicher-Remount bei type === 'open') ausführen
  useEffect(() => {
    if (pendingFollowUpSelectionAction) {
      const act = pendingFollowUpSelectionAction;
      pendingFollowUpSelectionAction = null;
      if (act.type === 'new' || act.type === 'delete') {
        setActiveDialog(act.type);
      } else if (act.type === 'open') {
        executeAction(act);
      }
    }
  }, [executeAction]);

  const handleSaveAndProceed = useCallback(async () => {
    setIsProcessing(true);
    const act = pendingAction;
    pendingFollowUpSelectionAction = act;
    const saved = await onSaveCurrent();
    if (!isMountedRef.current) {
      // Instanz wurde während des Speicherns unmounted (z. B. Revisions-Remount).
      // Die Folgeaktion bleibt für die neu einhängende Instanz erhalten.
      return;
    }
    setIsProcessing(false);
    if (!saved) {
      // Speichern fehlgeschlagen oder Revisionskonflikt -> nicht wechseln
      pendingFollowUpSelectionAction = null;
      setShowUnsavedConfirm(false);
      setPendingAction(null);
      return;
    }
    setShowUnsavedConfirm(false);
    setPendingAction(null);
    // Falls keine Unmount/Remount-Welle erfolgte (z. B. im selben Render-Baum):
    if (pendingFollowUpSelectionAction) {
      const followUp = pendingFollowUpSelectionAction;
      pendingFollowUpSelectionAction = null;
      await executeAction(followUp);
    }
  }, [onSaveCurrent, pendingAction, executeAction]);

  // Dialog-Aktionen
  const handleCreate = useCallback(
    async (
      templateId: string,
      title?: string,
    ): Promise<{ ok: boolean; error?: DashboardV2StorageError }> => {
      setIsProcessing(true);
      setErrorText(null);
      const targetTitle = title?.trim() || 'Neues Dashboard';
      pendingPostSwitchAnnouncement = `Dashboard ‚${targetTitle}‘ angelegt`;
      pendingFocusTriggerOnMount = true;

      const res = (await onCreateFromTemplate(templateId, title)) as {
        ok: boolean;
        error?: DashboardV2StorageError;
      };

      if (!isMountedRef.current) {
        return res;
      }

      setIsProcessing(false);
      if (res.ok) {
        pendingPostSwitchAnnouncement = null;
        pendingFocusTriggerOnMount = false;
        setActiveDialog(null);
        announce(`Dashboard ‚${targetTitle}‘ angelegt`);
        returnFocusToTrigger();
        return { ok: true };
      }

      pendingPostSwitchAnnouncement = null;
      pendingFocusTriggerOnMount = false;
      return { ok: false, error: res.error };
    },
    [onCreateFromTemplate, announce, returnFocusToTrigger],
  );

  const handleDuplicate = useCallback(
    async (
      title?: string,
      saveFirst = false,
    ): Promise<{ ok: boolean; error?: DashboardV2StorageError }> => {
      setIsProcessing(true);
      setErrorText(null);
      if (saveFirst && isDirty) {
        const saved = await onSaveCurrent();
        if (!saved) {
          setIsProcessing(false);
          return {
            ok: false,
            error: {
              kind: 'konflikt',
              detail: 'Ungespeicherte Änderungen konnten vor dem Duplizieren nicht gesichert werden.',
            },
          };
        }
      }

      const targetTitle = title?.trim() || `${currentDashboard.title} (Kopie)`;
      pendingPostSwitchAnnouncement = `Dashboard ‚${targetTitle}‘ angelegt`;
      pendingFocusTriggerOnMount = true;

      const res = (await onDuplicateCurrent(title)) as {
        ok: boolean;
        error?: DashboardV2StorageError;
      };

      if (!isMountedRef.current) {
        return res;
      }

      setIsProcessing(false);
      if (res.ok) {
        pendingPostSwitchAnnouncement = null;
        pendingFocusTriggerOnMount = false;
        setActiveDialog(null);
        announce(`Dashboard ‚${targetTitle}‘ angelegt`);
        returnFocusToTrigger();
        return { ok: true };
      }

      pendingPostSwitchAnnouncement = null;
      pendingFocusTriggerOnMount = false;
      return { ok: false, error: res.error };
    },
    [
      isDirty,
      onSaveCurrent,
      currentDashboard.title,
      onDuplicateCurrent,
      announce,
      returnFocusToTrigger,
    ],
  );

  const handleDelete = useCallback(async (): Promise<{
    ok: boolean;
    error?: DashboardV2StorageError;
  }> => {
    setIsProcessing(true);
    setErrorText(null);
    const deletedTitle = currentDashboard.title;
    pendingFocusTriggerOnMount = true;

    const res = (await onDeleteDashboard(currentDashboard.id)) as {
      ok: boolean;
      nextDashboardId?: string | null;
      error?: DashboardV2StorageError;
    };

    if (res.ok) {
      const remaining = dashboards.find((d) => d.id === res.nextDashboardId);
      const msg = `Dashboard ‚${deletedTitle}‘ gelöscht, ‚${remaining?.title ?? 'Nächstes'}‘ geöffnet`;
      pendingPostSwitchAnnouncement = msg;
    }

    if (!isMountedRef.current) {
      return res;
    }

    setIsProcessing(false);
    if (res.ok) {
      pendingPostSwitchAnnouncement = null;
      pendingFocusTriggerOnMount = false;
      setActiveDialog(null);
      const remaining = dashboards.find((d) => d.id === res.nextDashboardId);
      const msg = `Dashboard ‚${deletedTitle}‘ gelöscht, ‚${remaining?.title ?? 'Nächstes'}‘ geöffnet`;
      announce(msg);
      returnFocusToTrigger();
      return { ok: true };
    }

    pendingPostSwitchAnnouncement = null;
    pendingFocusTriggerOnMount = false;
    return { ok: false, error: res.error };
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
