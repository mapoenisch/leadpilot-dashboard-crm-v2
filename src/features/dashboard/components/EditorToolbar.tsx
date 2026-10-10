// Executive Dashboard, Teilauftrag 5 (Auftrag 074): Werkzeugleiste mit Bearbeiten, Speichern,
// Verwerfen, Zurücksetzen, Statuszeile und Konfliktführung. Alle Texte sind verständlich; Ansagen
// laufen über eine Live-Region, die auch gleiche Texte erneut vorliest.
// Auftrag 090 (Paket F): im Bearbeitungsmodus haftet die Leiste (Speichern, Verwerfen, Status) oben,
// damit beide beim Scrollen erreichbar bleiben, ohne unten Inhalte oder die Bildschirmtastatur zu
// verdecken. „Kachel hinzufügen“, Zurücksetzen und Hinweise folgen darunter im normalen Fluss.
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { Announcement, SaveStatus } from '../hooks/useDashboardEditor';

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
  onStart: () => void;
  onCancel: () => void;
  onSave: () => void;
  onAdd: () => void;
  onReset: () => void;
  onLoadServer: () => void;
  onTakeServer: () => void;
}

function statusText(props: EditorToolbarProps): string {
  const { editing, dirty, locked, saveStatus } = props;
  if (locked) return 'Speichert …';
  if (saveStatus.kind === 'fehler') return 'Nicht gespeichert.';
  if (saveStatus.kind === 'gespeichert' && !editing) return 'Gespeichert.';
  if (!editing) return '';
  return dirty ? 'Ungespeicherte Änderungen.' : 'Keine Änderungen.';
}

export function EditorToolbar(props: EditorToolbarProps) {
  const { editing, locked, saveStatus, conflict, serverLoaded, announcement } = props;
  const status = statusText(props);
  const live = `${announcement.text}${announcement.seq % 2 ? '​' : ''}`;

  return (
    <>
      <section
        aria-label="Dashboard bearbeiten"
        data-testid="editor-toolbar"
        className={cn(
          'flex flex-col gap-2',
          editing &&
            'sticky top-0 z-20 -mx-1 border-0 border-b border-solid border-border bg-[var(--color-bg)] px-1 py-2',
        )}
      >
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {live}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <Button
                size="sm"
                disabled={locked || !props.dirty || serverLoaded}
                onClick={props.onSave}
              >
                Speichern
              </Button>
              <Button size="sm" variant="secondary" disabled={locked} onClick={props.onCancel}>
                Verwerfen
              </Button>
            </>
          ) : (
            <Button size="sm" disabled={!props.canStart || locked} onClick={props.onStart}>
              Dashboard bearbeiten
            </Button>
          )}
          <span className="min-h-[20px] text-[13px] text-[var(--color-text-muted)]">{status}</span>
        </div>
        {!editing && !props.canStart && props.startBlockedReason ? (
          <p className="m-0 text-[13px] text-[var(--color-text-muted)]">
            {props.startBlockedReason}
          </p>
        ) : null}
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
      </section>
      {editing ? (
        // Nicht haftend: seltene Aktionen und Hinweise, damit die haftende Leiste mobil schmal bleibt.
        <div data-testid="editor-extras" className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={locked || props.atMax}
              onClick={props.onAdd}
            >
              Kachel hinzufügen
            </Button>
            <Button size="sm" variant="secondary" disabled={locked} onClick={props.onReset}>
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
