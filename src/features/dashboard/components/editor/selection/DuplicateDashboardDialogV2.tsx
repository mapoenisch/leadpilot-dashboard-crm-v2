// Auftrag 158 (P09b): Dialog zum Duplizieren eines Dashboards.
// Titel vorbelegt über buildDerivedDashboardTitle, Prüfung auf ungespeicherte Änderungen.

import { useEffect, useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type {
  AccessibleDashboardListItemV2,
  DashboardTeamV2,
  DashboardV2StorageError,
  PersonalDashboardListItemV2,
  StoredDashboardV2Row,
} from '../../../services/dashboardStorageV2Types';
import {
  MAX_DASHBOARD_TITLE_LENGTH,
  MAX_PERSONAL_DASHBOARDS,
  buildDerivedDashboardTitle,
} from '../../../model/dashboardTitles';
import { useEscapeToClose } from '../../UnsavedChangesDialog';
import { listDashboardTeamsV2 } from '../../../services/dashboardTeamsV2';
import { getDashboardTeamErrorMessage } from '../../../model/dashboardTeamMessages';

export type DuplicateTarget = { scope: 'personal' } | { scope: 'team'; teamId: string };

export type DuplicateConfirmResult = boolean | { ok: boolean; error?: DashboardV2StorageError };

export interface DuplicateDashboardDialogV2Props {
  open: boolean;
  onClose: () => void;
  currentDashboard: StoredDashboardV2Row;
  existingDashboards?: (AccessibleDashboardListItemV2 | PersonalDashboardListItemV2)[];
  isDirty: boolean;
  onDuplicate: (
    title: string,
    saveFirst?: boolean,
    target?: DuplicateTarget,
  ) => Promise<DuplicateConfirmResult>;
  isSaving?: boolean;
  teams?: DashboardTeamV2[];
}

function getDuplicateErrorMessage(error?: DashboardV2StorageError): string {
  if (!error) return 'Das Dashboard konnte nicht dupliziert werden.';
  return getDashboardTeamErrorMessage(error, 'dashboard');
}

export function DuplicateDashboardDialogV2({
  open,
  onClose,
  currentDashboard,
  existingDashboards,
  isDirty,
  onDuplicate,
  isSaving = false,
  teams: providedTeams,
}: DuplicateDashboardDialogV2Props) {
  const [title, setTitle] = useState('');
  const [targetValue, setTargetValue] = useState<string>('personal');
  const [teams, setTeams] = useState<DashboardTeamV2[]>(providedTeams ?? []);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const targetSelectId = useId();

  // Teams laden, falls nicht über Props bereitgestellt
  useEffect(() => {
    if (!open) return;
    if (providedTeams) {
      setTeams(providedTeams);
      return;
    }
    let isMounted = true;
    listDashboardTeamsV2()
      .then((res) => {
        if (isMounted && res.ok) {
          setTeams(res.value);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [open, providedTeams]);

  const isReadOnly = currentDashboard.canWrite === false;
  const writableTeams = useMemo(
    () => (isReadOnly ? [] : teams.filter((t) => t.canWrite)),
    [isReadOnly, teams],
  );

  const isPersonalLimitReached = existingDashboards
    ? existingDashboards.filter((d) => d.scope !== 'team').length >= MAX_PERSONAL_DASHBOARDS
    : false;
  const isTargetBlocked = targetValue === 'personal' && isPersonalLimitReached;

  useEffect(() => {
    if (open) {
      setTitle(buildDerivedDashboardTitle(currentDashboard.title, ' (Kopie)'));
      const defaultToTeam = isPersonalLimitReached && writableTeams.length > 0 && writableTeams[0];
      setTargetValue(defaultToTeam ? `team:${defaultToTeam.id}` : 'personal');
      setError(null);
    }
  }, [open, currentDashboard.title, isPersonalLimitReached, writableTeams]);

  const handleClose = () => {
    if (!isSaving) onClose();
  };

  useEscapeToClose(open, handleClose);

  const handleSubmit = async (saveFirst: boolean) => {
    if (isSaving || isTargetBlocked) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Bitte gib einen Titel für das duplizierte Dashboard ein.');
      return;
    }
    if (trimmed.length > MAX_DASHBOARD_TITLE_LENGTH) {
      setError(`Der Titel darf höchstens ${MAX_DASHBOARD_TITLE_LENGTH} Zeichen lang sein.`);
      return;
    }

    setError(null);
    const target: DuplicateTarget | undefined =
      targetValue === 'personal' ? undefined : { scope: 'team', teamId: targetValue.slice(5) };

    const res = target
      ? await onDuplicate(trimmed, saveFirst, target)
      : await onDuplicate(trimmed, saveFirst);
    if (typeof res === 'boolean') {
      if (!res) setError('Das Dashboard konnte nicht dupliziert werden.');
    } else if (res && !res.ok) {
      setError(getDuplicateErrorMessage(res.error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Dashboard duplizieren"
      maxWidth="580px"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            variant="secondary"
            disabled={isSaving}
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Abbrechen
          </Button>
          {isDirty ? (
            <>
              <Button
                variant="secondary"
                disabled={isSaving || !title.trim() || isTargetBlocked}
                onClick={() => handleSubmit(false)}
                className="w-full sm:w-auto"
              >
                Nur Stand duplizieren
              </Button>
              <Button
                data-testid="duplicate-submit-button"
                disabled={isSaving || !title.trim() || isTargetBlocked}
                onClick={() => handleSubmit(true)}
                className="w-full sm:w-auto"
              >
                {isSaving ? 'Wird gespeichert & dupliziert...' : 'Speichern & duplizieren'}
              </Button>
            </>
          ) : (
            <Button
              data-testid="duplicate-submit-button"
              disabled={isSaving || !title.trim() || isTargetBlocked}
              onClick={() => handleSubmit(false)}
              className="w-full sm:w-auto"
            >
              {isSaving ? 'Wird dupliziert...' : 'Dashboard duplizieren'}
            </Button>
          )}
        </div>
      }
    >
      <div
        data-testid="duplicate-dashboard-dialog"
        className="flex flex-col gap-4 text-sm text-[var(--color-text-soft,#e6f3f1)]"
      >
        {error && (
          <div
            role="alert"
            data-testid="duplicate-dashboard-error"
            className="rounded border border-error/40 bg-error/10 p-2.5 text-xs text-error"
          >
            {error}
          </div>
        )}

        {isTargetBlocked && (
          <div
            role="alert"
            data-testid="duplicate-target-blocked"
            className="rounded border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300"
          >
            Das Limit von {MAX_PERSONAL_DASHBOARDS} persönlichen Dashboards ist erreicht. Wähle ein
            Team als Ziel.
          </div>
        )}

        {isDirty && (
          <div
            role="note"
            className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-300"
          >
            <p className="font-semibold">Ungespeicherte Änderungen vorhanden</p>
            <p className="mt-1">
              Es wird der gespeicherte Server-Stand dupliziert. Ungespeicherte Änderungen im
              aktuellen Entwurf werden nicht übernommen, es sei denn, du wählst „Speichern &
              duplizieren“.
            </p>
          </div>
        )}

        {/* Zielauswahl (§2.4 Nr. 21) */}
        {isReadOnly ? (
          <div
            role="note"
            className="rounded border border-primary/30 bg-primary/10 p-2.5 text-xs text-[var(--color-text-soft,#e6f3f1)]"
          >
            Team-Dashboards ohne Schreibrecht werden als persönliche Kopie dupliziert.
          </div>
        ) : (
          writableTeams.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={targetSelectId}
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Bereich
              </label>
              <select
                id={targetSelectId}
                data-testid="duplicate-dashboard-target-select"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                disabled={isSaving}
                className="h-9 w-full rounded border border-[var(--color-border,#1b3d39)] bg-[var(--color-surface,#0c1e1c)] px-3 text-sm text-white outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="personal">Persönlich</option>
                {writableTeams.map((team) => (
                  <option key={team.id} value={`team:${team.id}`}>
                    Team: {team.name}
                  </option>
                ))}
              </select>
            </div>
          )
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={inputId}
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Titel des neuen Dashboards
          </label>
          <input
            id={inputId}
            data-testid="duplicate-dashboard-title-input"
            type="text"
            disabled={isSaving}
            value={title}
            maxLength={MAX_DASHBOARD_TITLE_LENGTH}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-3 text-sm text-white outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            autoFocus
          />
          <span className="text-[11px] text-muted-foreground">
            {title.length} / {MAX_DASHBOARD_TITLE_LENGTH} Zeichen
          </span>
        </div>
      </div>
    </Modal>
  );
}
