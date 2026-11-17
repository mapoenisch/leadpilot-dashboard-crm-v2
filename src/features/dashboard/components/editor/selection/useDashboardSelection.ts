// Auftrag 158 (P09b): Hook für Dashboard-Auswahl, Dialoge, Tastatur, Schutz und Ansagen.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardV2StorageError } from '../../../services/dashboardStorageV2Types';
import { MAX_PERSONAL_DASHBOARDS } from '../../../model/dashboardTitles';
import {
  type ActiveDialogType,
  type PendingSelectionAction,
  type UseDashboardSelectionParams,
  clearPendingFollowUpSelectionAction,
  getPendingFocusTriggerOnMount,
  getPendingFollowUpSelectionAction,
  getPendingPostSwitchAnnouncement,
  getPendingPostSwitchError,
  setPendingFocusTriggerOnMount,
  setPendingFollowUpSelectionAction,
  setPendingPostSwitchAnnouncement,
  setPendingPostSwitchError,
} from './dashboardSelectionState';

export type { ActiveDialogType, PendingSelectionAction, UseDashboardSelectionParams };
export { clearPendingFollowUpSelectionAction };

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
  onShareWithTeam,
}: UseDashboardSelectionParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<ActiveDialogType>(() => {
    const act = getPendingFollowUpSelectionAction();
    return act?.type === 'new' || act?.type === 'delete' ? act.type : null;
  });
  const [pendingAction, setPendingAction] = useState<PendingSelectionAction | null>(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [announcement, setAnnouncement] = useState<string>(
    () => getPendingPostSwitchAnnouncement() ?? '',
  );
  const [errorText, setErrorText] = useState<string | null>(() => getPendingPostSwitchError());
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
    requestAnimationFrame(() => triggerButtonRef.current?.focus());
  }, []);

  // Fokus & Fehler nach Shell-Remount auf den Auswahlknopf zurücksetzen (Codex P2)
  useEffect(() => {
    const err = getPendingPostSwitchError();
    if (err) setErrorText(err);
    if (getPendingFocusTriggerOnMount()) {
      setPendingFocusTriggerOnMount(false);
      returnFocusToTrigger();
    }
  }, [returnFocusToTrigger]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    returnFocusToTrigger();
  }, [returnFocusToTrigger]);

  const announce = useCallback((msg: string) => setAnnouncement(msg), []);

  const executeAction = useCallback(
    async (action: PendingSelectionAction) => {
      if (action.type === 'open') {
        if (action.id === currentDashboard.id) return;
        setIsProcessing(true);
        setPendingPostSwitchAnnouncement(null);
        setPendingPostSwitchError(null);
        setPendingFocusTriggerOnMount(true);

        const ok = await onOpenDashboard(action.id);

        if (ok) {
          setPendingPostSwitchAnnouncement(`Dashboard ‚${action.title}‘ geöffnet`);
          setPendingPostSwitchError(null);
        } else {
          setPendingPostSwitchAnnouncement(null);
          setPendingPostSwitchError('Dashboard konnte nicht geöffnet werden.');
        }

        if (isMountedRef.current) {
          setIsProcessing(false);
          setPendingFocusTriggerOnMount(false);
          if (ok) {
            setPendingPostSwitchAnnouncement(null);
            announce(`Dashboard ‚${action.title}‘ geöffnet`);
          } else {
            setPendingPostSwitchError(null);
            setErrorText('Dashboard konnte nicht geöffnet werden.');
          }
          returnFocusToTrigger();
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
    const act = getPendingFollowUpSelectionAction();
    if (act) {
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
    setPendingFollowUpSelectionAction(act);
    const saved = await onSaveCurrent();
    if (!isMountedRef.current) return;
    setIsProcessing(false);
    if (!saved) {
      setPendingFollowUpSelectionAction(null);
      setShowUnsavedConfirm(false);
      setPendingAction(null);
      return;
    }
    setShowUnsavedConfirm(false);
    setPendingAction(null);
    const followUp = getPendingFollowUpSelectionAction();
    if (followUp) {
      await executeAction(followUp);
    }
  }, [onSaveCurrent, pendingAction, executeAction]);

  // Dialog-Aktionen
  const handleCreate = useCallback(
    async (
      templateId: string,
      title?: string,
      target?: { scope: 'personal' | 'team'; teamId?: string },
    ): Promise<{ ok: boolean; error?: DashboardV2StorageError }> => {
      setIsProcessing(true);
      setErrorText(null);
      const targetTitle = title?.trim() || 'Neues Dashboard';
      setPendingPostSwitchAnnouncement(`Dashboard ‚${targetTitle}‘ angelegt`);
      setPendingFocusTriggerOnMount(true);

      const res = (
        target && target.scope === 'team'
          ? await onCreateFromTemplate(templateId, title, target)
          : await onCreateFromTemplate(templateId, title)
      ) as {
        ok: boolean;
        error?: DashboardV2StorageError;
      };

      if (!isMountedRef.current) return res;

      setIsProcessing(false);
      if (res.ok) {
        setPendingPostSwitchAnnouncement(null);
        setPendingFocusTriggerOnMount(false);
        setActiveDialog(null);
        announce(`Dashboard ‚${targetTitle}‘ angelegt`);
        returnFocusToTrigger();
        return { ok: true };
      }

      setPendingPostSwitchAnnouncement(null);
      setPendingFocusTriggerOnMount(false);
      return { ok: false, error: res.error };
    },
    [onCreateFromTemplate, announce, returnFocusToTrigger],
  );

  const handleDuplicate = useCallback(
    async (
      title?: string,
      saveFirst = false,
      target?: { scope: 'personal' | 'team'; teamId?: string },
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
              detail:
                'Ungespeicherte Änderungen konnten vor dem Duplizieren nicht gesichert werden.',
            },
          };
        }
      }

      const targetTitle = title?.trim() || `${currentDashboard.title} (Kopie)`;
      setPendingPostSwitchAnnouncement(`Dashboard ‚${targetTitle}‘ angelegt`);
      setPendingFocusTriggerOnMount(true);

      const res = (
        target && target.scope === 'team'
          ? await onDuplicateCurrent(title, target)
          : await onDuplicateCurrent(title)
      ) as {
        ok: boolean;
        error?: DashboardV2StorageError;
      };

      if (!isMountedRef.current) return res;

      setIsProcessing(false);
      if (res.ok) {
        setPendingPostSwitchAnnouncement(null);
        setPendingFocusTriggerOnMount(false);
        setActiveDialog(null);
        announce(`Dashboard ‚${targetTitle}‘ angelegt`);
        returnFocusToTrigger();
        return { ok: true };
      }

      setPendingPostSwitchAnnouncement(null);
      setPendingFocusTriggerOnMount(false);
      return { ok: false, error: res.error };
    },
    [
      currentDashboard.title,
      isDirty,
      onDuplicateCurrent,
      onSaveCurrent,
      announce,
      returnFocusToTrigger,
    ],
  );

  const handleShareWithTeam = useCallback(
    async (
      teamId: string,
      title: string,
    ): Promise<{ ok: boolean; error?: DashboardV2StorageError }> => {
      if (!onShareWithTeam) {
        return { ok: false, error: { kind: 'nicht_verfuegbar' } };
      }
      setIsProcessing(true);
      setErrorText(null);
      const res = (await onShareWithTeam(teamId, title)) as {
        ok: boolean;
        error?: DashboardV2StorageError;
      };
      if (!isMountedRef.current) return res;
      setIsProcessing(false);
      if (res.ok) {
        setActiveDialog(null);
        announce(`Dashboard ‚${title}‘ mit Team geteilt`);
        returnFocusToTrigger();
        return { ok: true };
      }
      return { ok: false, error: res.error };
    },
    [onShareWithTeam, announce, returnFocusToTrigger],
  );

  const handleDelete = useCallback(async (): Promise<{
    ok: boolean;
    error?: DashboardV2StorageError;
  }> => {
    setIsProcessing(true);
    setErrorText(null);
    const deletedTitle = currentDashboard.title;
    setPendingFocusTriggerOnMount(true);

    const res = (await onDeleteDashboard(currentDashboard.id)) as {
      ok: boolean;
      nextDashboardId?: string | null;
      error?: DashboardV2StorageError;
    };

    if (res.ok) {
      const remaining = dashboards.find((d) => d.id === res.nextDashboardId);
      const msg = `Dashboard ‚${deletedTitle}‘ gelöscht, ‚${remaining?.title ?? 'Nächstes'}‘ geöffnet`;
      setPendingPostSwitchAnnouncement(msg);
      if (!isMountedRef.current) return res;
      setIsProcessing(false);
      setPendingPostSwitchAnnouncement(null);
      setPendingFocusTriggerOnMount(false);
      setActiveDialog(null);
      announce(msg);
      returnFocusToTrigger();
      return { ok: true };
    }

    if (!isMountedRef.current) return res;
    setIsProcessing(false);
    setPendingPostSwitchAnnouncement(null);
    setPendingFocusTriggerOnMount(false);
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
    handleShareWithTeam,
  };
}
