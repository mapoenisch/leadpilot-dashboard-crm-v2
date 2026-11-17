// Executive Dashboard V2 (Auftrag 163 / P11b):
// Dialog zum Teilen eines Dashboards mit einem Team als unabhängige Team-Kopie (§2.1 Nr. 3 & §2.4 Nr. 20).
// Zielteams sind nur Teams mit Schreibrecht (canWrite === true).

import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type {
  DashboardTeamV2,
  DashboardV2StorageError,
  StoredDashboardV2Row,
} from '../../../services/dashboardStorageV2Types';
import { listDashboardTeamsV2 } from '../../../services/dashboardTeamsV2';
import { MAX_DASHBOARD_TITLE_LENGTH } from '../../../model/dashboardTitles';
import { getDashboardTeamErrorMessage } from '../../../model/dashboardTeamMessages';
import { useEscapeToClose } from '../../UnsavedChangesDialog';

export type ShareWithTeamConfirmResult = boolean | { ok: boolean; error?: DashboardV2StorageError };

export interface ShareWithTeamDialogV2Props {
  open: boolean;
  onClose: () => void;
  currentDashboard: StoredDashboardV2Row;
  onShare: (targetTeamId: string, title: string) => Promise<ShareWithTeamConfirmResult>;
  teams?: DashboardTeamV2[];
  isSaving?: boolean;
}

export function ShareWithTeamDialogV2({
  open,
  onClose,
  currentDashboard,
  onShare,
  teams: providedTeams,
  isSaving = false,
}: ShareWithTeamDialogV2Props) {
  const [teams, setTeams] = useState<DashboardTeamV2[]>(providedTeams ?? []);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamSelectId = useId();
  const titleInputId = useId();

  // Teams laden, falls nicht über Props bereitgestellt
  useEffect(() => {
    if (!open) return;

    setTitle(currentDashboard.title);
    setError(null);

    if (providedTeams) {
      setTeams(providedTeams);
      const writable = providedTeams.filter((t) => t.canWrite);
      if (writable.length > 0 && writable[0]) {
        setSelectedTeamId(writable[0].id);
      }
      return;
    }

    let isMounted = true;
    setIsLoadingTeams(true);

    listDashboardTeamsV2()
      .then((res) => {
        if (!isMounted) return;
        if (res.ok) {
          setTeams(res.value);
          const writable = res.value.filter((t) => t.canWrite);
          if (writable.length > 0 && writable[0]) {
            setSelectedTeamId(writable[0].id);
          }
        } else {
          setError(getDashboardTeamErrorMessage(res.error, 'team'));
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setError('Teams konnten nicht geladen werden.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingTeams(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, providedTeams, currentDashboard.title]);

  const handleClose = () => {
    if (!isSaving) {
      setError(null);
      onClose();
    }
  };

  useEscapeToClose(open, handleClose);

  const writableTeams = teams.filter((t) => t.canWrite);
  const trimmedTitle = title.trim();
  const isSubmitDisabled =
    isSaving ||
    isLoadingTeams ||
    !selectedTeamId ||
    !trimmedTitle ||
    trimmedTitle.length > MAX_DASHBOARD_TITLE_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled) return;

    setError(null);
    try {
      const res = await onShare(selectedTeamId, trimmedTitle);
      if (typeof res === 'boolean') {
        if (res) {
          onClose();
        } else {
          setError('Das Dashboard konnte nicht mit dem Team geteilt werden.');
        }
      } else if (res && !res.ok) {
        setError(getDashboardTeamErrorMessage(res.error, 'dashboard'));
      } else {
        onClose();
      }
    } catch {
      setError('Das Dashboard konnte nicht mit dem Team geteilt werden.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Mit Team teilen"
      maxWidth="540px"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            disabled={isSaving}
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Abbrechen
          </Button>
          <Button
            data-testid="share-with-team-confirm-button"
            variant="primary"
            disabled={isSubmitDisabled}
            onClick={handleSubmit}
            className="w-full sm:w-auto"
          >
            {isSaving ? 'Wird geteilt...' : 'Mit Team teilen'}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 text-sm text-[var(--color-text-soft,#e6f3f1)]"
      >
        {error && (
          <div
            role="alert"
            data-testid="share-with-team-error"
            className="rounded border border-error/40 bg-error/10 p-2.5 text-xs text-error"
          >
            {error}
          </div>
        )}

        {/* Hinweisfeld (§2.1 Nr. 3) */}
        <div
          role="note"
          className="rounded border border-primary/30 bg-primary/10 p-3 text-xs text-[var(--color-text-soft,#e6f3f1)]"
        >
          <p className="font-semibold text-white">Unabhängige Team-Kopie</p>
          <p className="mt-1">
            Das Team erhält eine eigene Kopie. Dein persönliches Dashboard bleibt bestehen; spätere
            Änderungen werden nicht abgeglichen.
          </p>
        </div>

        {/* Teamauswahl */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={teamSelectId} className="text-xs font-semibold text-white">
            Ziel-Team
          </label>
          {isLoadingTeams ? (
            <p className="text-xs text-muted-foreground">Teams werden geladen...</p>
          ) : writableTeams.length === 0 ? (
            <p className="text-xs text-amber-300">
              Du hast in keinem Team die Berechtigung, Dashboards zu erstellen.
            </p>
          ) : (
            <select
              id={teamSelectId}
              data-testid="share-team-select"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              disabled={isSaving}
              className="w-full rounded border border-[var(--color-border,#1b3d39)] bg-[var(--color-surface,#0c1e1c)] px-3 py-2 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {writableTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Titel der Kopie */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={titleInputId} className="text-xs font-semibold text-white">
            Name des Team-Dashboards
          </label>
          <input
            id={titleInputId}
            data-testid="share-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={MAX_DASHBOARD_TITLE_LENGTH}
            disabled={isSaving}
            className="w-full rounded border border-[var(--color-border,#1b3d39)] bg-[var(--color-surface,#0c1e1c)] px-3 py-2 text-sm text-white placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Dashboard-Titel"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Titel für alle Teammitglieder sichtbar</span>
            <span>
              {title.length}/{MAX_DASHBOARD_TITLE_LENGTH}
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
