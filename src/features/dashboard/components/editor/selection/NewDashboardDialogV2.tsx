// Auftrag 158 (P09b): Dialog zur Neuanlage eines Dashboards aus einer V2-Vorlage.
// Dynamischer Import der Vorlagen für optimales Code-Splitting (P09b §2.5 Nr. 30).

import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import type { DashboardTemplateV2 } from '../../../model/dashboardTemplatesV2';
import type { PersonalDashboardListItemV2 } from '../../../services/dashboardStorageV2Types';
import {
  MAX_DASHBOARD_TITLE_LENGTH,
  buildDerivedDashboardTitle,
} from '../../../model/dashboardTitles';
import { useEscapeToClose } from '../../UnsavedChangesDialog';

export interface NewDashboardDialogV2Props {
  open: boolean;
  onClose: () => void;
  existingDashboards: PersonalDashboardListItemV2[];
  onCreate: (templateId: string, title: string) => Promise<boolean>;
  isSaving?: boolean;
}

function computeUniqueTitle(
  baseName: string,
  existingTitles: Set<string>,
): string {
  if (!existingTitles.has(baseName)) {
    return baseName;
  }
  let counter = 2;
  while (counter <= 99) {
    const candidate = buildDerivedDashboardTitle(baseName, ` ${counter}`);
    if (!existingTitles.has(candidate)) {
      return candidate;
    }
    counter++;
  }
  return buildDerivedDashboardTitle(baseName, ` ${Date.now().toString().slice(-4)}`);
}

export function NewDashboardDialogV2({
  open,
  onClose,
  existingDashboards,
  onCreate,
  isSaving = false,
}: NewDashboardDialogV2Props) {
  const [templates, setTemplates] = useState<readonly DashboardTemplateV2[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('executive');
  const [title, setTitle] = useState('');
  const [userHasEditedTitle, setUserHasEditedTitle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleInputId = useId();

  // Dynamischer Import der Vorlagen erst beim Öffnen des Dialogs (P09b §2.5 Nr. 30)
  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    import('../../../model/dashboardTemplatesV2').then((mod) => {
      if (isMounted) {
        setTemplates(mod.DASHBOARD_TEMPLATES_V2);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [open]);

  // Vorbelegung des Titels beim Öffnen oder Vorlagenwechsel
  useEffect(() => {
    if (!open) {
      setUserHasEditedTitle(false);
      setError(null);
      return;
    }

    if (!userHasEditedTitle) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      const baseName = template?.name ?? 'Executive Summary';
      const existingTitles = new Set(existingDashboards.map((d) => d.title));
      setTitle(computeUniqueTitle(baseName, existingTitles));
    }
  }, [open, selectedTemplateId, templates, existingDashboards, userHasEditedTitle]);

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  useEscapeToClose(open, handleClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Bitte gib einen Titel für das Dashboard ein.');
      return;
    }
    if (trimmed.length > MAX_DASHBOARD_TITLE_LENGTH) {
      setError(`Der Titel darf höchstens ${MAX_DASHBOARD_TITLE_LENGTH} Zeichen lang sein.`);
      return;
    }

    setError(null);
    const success = await onCreate(selectedTemplateId, trimmed);
    if (!success) {
      setError('Das Dashboard konnte nicht angelegt werden.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Neues Dashboard anlegen"
      maxWidth="680px"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={isSaving} onClick={handleClose}>
            Abbrechen
          </Button>
          <Button
            data-testid="create-dashboard-submit-button"
            disabled={isSaving || !title.trim()}
            onClick={handleSubmit}
          >
            {isSaving ? 'Wird angelegt...' : 'Dashboard anlegen'}
          </Button>
        </div>
      }
    >
      <form
        data-testid="new-dashboard-dialog"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 text-sm text-[var(--color-text-soft,#e6f3f1)]"
      >
        {error && (
          <div
            role="alert"
            data-testid="new-dashboard-error"
            className="rounded border border-error/40 bg-error/10 p-2.5 text-xs text-error"
          >
            {error}
          </div>
        )}

        {/* Titel-Eingabe */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={titleInputId} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Titel (1–80 Zeichen)
          </label>
          <input
            id={titleInputId}
            data-testid="new-dashboard-title-input"
            type="text"
            value={title}
            maxLength={MAX_DASHBOARD_TITLE_LENGTH}
            onChange={(e) => {
              setTitle(e.target.value);
              setUserHasEditedTitle(true);
            }}
            placeholder="Dashboard-Titel..."
            className="h-9 w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-3 text-sm text-white outline-none focus:border-primary"
            autoFocus
          />
          <span className="text-[11px] text-muted-foreground">
            {title.length} / {MAX_DASHBOARD_TITLE_LENGTH} Zeichen
          </span>
        </div>

        {/* Vorlagenauswahl */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Vorlage wählen
          </span>

          <div
            role="radiogroup"
            aria-label="Vorlage auswählen"
            data-testid="template-selection-group"
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
          >
            {templates.map((tpl) => {
              const isSelected = selectedTemplateId === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  data-testid={`template-card-${tpl.id}`}
                  onClick={() => {
                    setSelectedTemplateId(tpl.id);
                  }}
                  className={cn(
                    'flex min-h-[92px] flex-col justify-between rounded-lg border p-3 text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-[0_0_12px_rgba(30,174,152,0.15)]'
                      : 'border-[var(--color-border,#1b3d39)] bg-black/20 hover:border-primary/40 hover:bg-black/40',
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-white">{tpl.name}</span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {tpl.description}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-primary/80">
                    <span>
                      {tpl.tileCount} {tpl.tileCount === 1 ? 'Kachel' : 'Kacheln'} · {tpl.sectionCount}{' '}
                      {tpl.sectionCount === 1 ? 'Sektion' : 'Sektionen'}
                    </span>
                    {isSelected && <span className="font-semibold text-primary">Ausgewählt</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}
