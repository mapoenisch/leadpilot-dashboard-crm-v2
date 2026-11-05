// Executive Dashboard: Werkzeugleiste mit Bearbeiten, Speichern, Verwerfen, Undo/Redo,
// Vorlagen-Auswahl, Zurücksetzen, Statuszeile und Konfliktführung.
// Auftrag 090 (Paket F): im Bearbeitungsmodus haftet die Leiste oben.
import { useState, useRef, useEffect } from 'react';
import {
  Undo2,
  Redo2,
  Save,
  X,
  Pencil,
  Plus,
  LayoutTemplate,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { Announcement, SaveStatus } from '../hooks/useDashboardEditor';
import { DASHBOARD_PRESETS } from '../model/dashboardPresets';

export interface EditorToolbarProps {
  editing: boolean;
  canStart: boolean;
  /** Warum Bearbeiten nicht möglich ist (z. B. neuere Formatversion), sonst `undefined`. */
  startBlockedReason?: string;
  dirty: boolean;
  locked: boolean;
  atMax: boolean;
  saveStatus: SaveStatus;
  conflict: boolean;
  serverLoaded: boolean;
  announcement: Announcement;
  canUndo?: boolean;
  canRedo?: boolean;
  onStart: () => void;
  onCancel: () => void;
  onSave: () => void;
  onAdd: () => void;
  onReset: () => void;
  onLoadServer: () => void;
  onTakeServer: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onApplyPreset?: (presetId: string) => void;
}

function statusText(props: EditorToolbarProps): string {
  const { editing, dirty, locked, saveStatus } = props;
  if (locked) return 'Speichert …';
  if (saveStatus.kind === 'fehler') return 'Nicht gespeichert.';
  if (saveStatus.kind === 'gespeichert' && !editing) return 'Gespeichert.';
  if (!editing) return '';
  return dirty ? 'Ungespeicherte Änderungen.' : 'Keine Änderungen.';
}

/** Kurzform für schmale Ansichten, damit die haftende Leiste einzeilig bleibt (Codex PR #76). */
const SHORT_STATUS: Record<string, string> = {
  'Ungespeicherte Änderungen.': 'Ungespeichert',
  'Keine Änderungen.': 'Unverändert',
  'Nicht gespeichert.': 'Nicht gespeichert',
};

export function EditorToolbar(props: EditorToolbarProps) {
  const {
    editing,
    locked,
    saveStatus,
    conflict,
    serverLoaded,
    announcement,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,
    onApplyPreset,
  } = props;
  const status = statusText(props);
  const live = `${announcement.text}${announcement.seq % 2 ? '​' : ''}`;

  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const presetMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!presetMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (presetMenuRef.current && !presetMenuRef.current.contains(e.target as Node)) {
        setPresetMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresetMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [presetMenuOpen]);

  return (
    <>
      <section
        aria-label="Dashboard bearbeiten"
        data-testid="editor-toolbar"
        className={cn(
          'flex flex-col gap-2',
          editing &&
            'sticky top-0 z-20 -mx-1 border-0 border-b border-solid border-border bg-[var(--color-bg)] px-1 py-2 backdrop-blur-sm',
        )}
      >
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {live}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {editing ? (
              <>
                <Badge
                  variant="cyan"
                  size="sm"
                  className="hidden md:inline-flex items-center gap-1.5 shrink-0"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Bearbeitungsmodus
                </Badge>
                <Button
                  size="sm"
                  disabled={locked || !props.dirty || serverLoaded}
                  onClick={props.onSave}
                  className={cn(
                    'flex items-center gap-1.5 shrink-0',
                    props.dirty && 'ring-1 ring-primary/40 shadow-sm',
                  )}
                >
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Speichern</span>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={locked}
                  onClick={props.onCancel}
                  className="flex items-center gap-1.5 shrink-0"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Verwerfen</span>
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                disabled={!props.canStart || locked}
                onClick={props.onStart}
                className="flex items-center gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Dashboard bearbeiten
              </Button>
            )}
            <span className="min-h-[20px] min-w-0 truncate text-[13px] text-[var(--color-text-muted)]">
              {editing && SHORT_STATUS[status] ? (
                <>
                  <span aria-hidden="true" className="md:hidden">
                    {SHORT_STATUS[status]}
                  </span>
                  <span className="max-md:sr-only">{status}</span>
                </>
              ) : (
                status
              )}
            </span>
          </div>

          {editing ? (
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <Button
                size="sm"
                variant="secondary"
                disabled={locked || !canUndo}
                onClick={onUndo}
                title="Aktion rückgängig machen (Strg+Z / Cmd+Z)"
                aria-label="Aktion rückgängig machen"
                className="h-8 w-8 p-0"
              >
                <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={locked || !canRedo}
                onClick={onRedo}
                title="Aktion wiederholen (Strg+Y / Cmd+Shift+Z)"
                aria-label="Aktion wiederholen"
                className="h-8 w-8 p-0"
              >
                <Redo2 className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </div>
        {!editing && !props.canStart && props.startBlockedReason ? (
          <p className="m-0 text-[13px] text-[var(--color-text-muted)]">
            {props.startBlockedReason}
          </p>
        ) : null}
      </section>

      {/* Nicht haftend (Codex PR #76): Fehler und Konfliktwege verdecken beim Scrollen keinen Inhalt. */}
      {saveStatus.kind === 'fehler' ? (
        <div
          data-testid="save-error"
          className="flex flex-wrap items-center gap-2 rounded-lg border border-solid border-error p-3 text-sm [overflow-wrap:anywhere]"
        >
          <p className="m-0 basis-full">{saveStatus.message}</p>
          {conflict ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                disabled={locked || serverLoaded}
                onClick={props.onLoadServer}
              >
                Aktuelle Serveransicht laden
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="max-w-full shrink whitespace-normal text-left"
                disabled={locked}
                onClick={props.onTakeServer}
              >
                Entwurf verwerfen und Serverfassung übernehmen
              </Button>
              {serverLoaded ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="max-w-full shrink whitespace-normal border-error text-left text-error"
                  disabled={locked}
                  onClick={props.onSave}
                >
                  Trotzdem speichern (ersetzt die neuere Fassung)
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        // Nicht haftend: Kachel hinzufügen, Vorlagen, Zurücksetzen und Hinweise im Fluss.
        <div data-testid="editor-extras" className="flex flex-col gap-2">
          <div className="relative flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={locked || props.atMax}
              onClick={props.onAdd}
              className="flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Kachel hinzufügen
            </Button>

            {/* Vorlagen-Dropdown */}
            <div className="sm:relative" ref={presetMenuRef}>
              <Button
                size="sm"
                variant="secondary"
                disabled={locked}
                onClick={() => setPresetMenuOpen((open) => !open)}
                aria-expanded={presetMenuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-1.5"
              >
                <LayoutTemplate className="h-3.5 w-3.5" aria-hidden="true" />
                Vorlagen
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform duration-150',
                    presetMenuOpen && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </Button>
              {presetMenuOpen ? (
                <div
                  role="menu"
                  aria-label="Dashboard-Vorlagen"
                  className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-border bg-[var(--color-surface)] p-1.5 shadow-xl sm:left-0 sm:right-auto sm:w-72 sm:max-w-[calc(100vw-32px)]"
                >
                  {DASHBOARD_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      role="menuitem"
                      type="button"
                      className="flex w-full flex-col rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-surface-hover)] focus:bg-[var(--color-surface-hover)] focus:outline-none"
                      onClick={() => {
                        setPresetMenuOpen(false);
                        onApplyPreset?.(preset.id);
                      }}
                    >
                      <span className="font-semibold text-text">{preset.name}</span>
                      <span className="text-[12px] text-[var(--color-text-muted)] line-clamp-2">
                        {preset.description}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <Button
              size="sm"
              variant="secondary"
              disabled={locked}
              onClick={props.onReset}
              className="flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Auf Standard zurücksetzen
            </Button>
          </div>
          <p
            data-testid="editor-draft-hint"
            className="m-0 text-[12px] text-[var(--color-text-muted)]"
          >
            Änderungen liegen in der Arbeitskopie, gespeichert wird erst mit „Speichern“.
          </p>
          {props.atMax ? (
            <p className="m-0 text-[13px] text-[var(--color-text-muted)]">
              Das Dashboard hat die höchste Kachelanzahl erreicht.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
