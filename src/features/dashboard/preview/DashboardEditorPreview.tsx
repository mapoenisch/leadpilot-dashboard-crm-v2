// Auftrag 074 (Dashboard Teilauftrag 5): Vorschau des Arbeitsbereichs ohne Anmeldung. Der Speicher
// ist ein Ersatz im Arbeitsspeicher (nichts wird dauerhaft gespeichert); die Teststeuerung wählt, wie
// das nächste Speichern ausgeht. Alle Kacheldaten sind Testdaten.
import { useCallback, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import type { DashboardConfig } from '../model/dashboardConfig';
import { DEFAULT_DASHBOARD_CONFIG, type PreferencesState } from '../model/defaultDashboard';
import type { SaveResult } from '../hooks/useDashboardPreferences';
import { DashboardWorkspace } from '../components/DashboardWorkspace';
import { EDITOR_PREVIEW_NOTICE, useEditorPreviewData } from './editorPreviewData';

type NextSave = 'erfolg' | 'fehler' | 'konflikt';

const NEXT_SAVE_LABEL: Record<NextSave, string> = {
  erfolg: 'Erfolg',
  fehler: 'Technischer Fehler',
  konflikt: 'Konflikt',
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function DashboardEditorPreview() {
  const [stored, setStored] = useState<{ config: DashboardConfig; revision: number } | null>(null);
  const [server, setServer] = useState<{ config: DashboardConfig; revision: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [nextSave, setNextSave] = useState<NextSave>('erfolg');
  const [activated, setActivated] = useState<ReadonlySet<string>>(new Set());
  const nextSaveRef = useRef<NextSave>('erfolg');
  nextSaveRef.current = nextSave;
  const storedRef = useRef(stored);
  storedRef.current = stored;

  const state: PreferencesState = stored
    ? {
        kind: 'gespeichert',
        config: stored.config,
        revision: stored.revision,
        unavailable: [],
        canSave: true,
      }
    : { kind: 'standard', config: DEFAULT_DASHBOARD_CONFIG, revision: 0, canSave: true };

  const save = useCallback(
    async (config: DashboardConfig): Promise<SaveResult> => {
      setSaving(true);
      await wait(250);
      setSaving(false);
      const mode = nextSaveRef.current;
      if (mode === 'fehler') {
        setNextSave('erfolg');
        return { ok: false, error: { kind: 'technisch' } };
      }
      if (mode === 'konflikt') {
        setNextSave('erfolg');
        // Die „neuere Fassung“ auf dem Server: Standardansicht ohne die erste Kachel.
        const serverConfig = {
          ...DEFAULT_DASHBOARD_CONFIG,
          tiles: DEFAULT_DASHBOARD_CONFIG.tiles.slice(1),
        };
        setServer({ config: serverConfig, revision: (storedRef.current?.revision ?? 0) + 1 });
        return { ok: false, error: { kind: 'konflikt' } };
      }
      const revision = (server?.revision ?? storedRef.current?.revision ?? 0) + 1;
      setServer(null);
      setStored({ config, revision });
      return { ok: true, revision };
    },
    [server],
  );

  const reloadServerVersion = useCallback(async () => {
    await wait(100);
    if (server) setStored(server);
  }, [server]);

  const preferences = useMemo(
    () => ({ status: 'bereit' as const, state, isSaving: saving, save, reloadServerVersion }),
    // `state` wird aus `stored` abgeleitet.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst über `stored` gesteuert
    [stored, saving, save, reloadServerVersion],
  );
  const total = (stored?.config ?? DEFAULT_DASHBOARD_CONFIG).tiles.length;

  return (
    <section aria-labelledby="editor-vorschau" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="editor-vorschau" className="m-0 text-[20px] font-semibold">
          Dashboard-Arbeitsbereich
        </h2>
        <Badge variant="mint" size="sm">
          {EDITOR_PREVIEW_NOTICE}
        </Badge>
      </header>
      <fieldset className="m-0 flex flex-wrap items-center gap-3 rounded-xl border border-solid border-border p-3 text-[13px]">
        <legend className="px-1 text-[12px] text-[var(--color-text-muted)]">
          Teststeuerung: nächstes Speichern
        </legend>
        {(Object.keys(NEXT_SAVE_LABEL) as NextSave[]).map((mode) => (
          <label key={mode} className="flex items-center gap-1">
            <input
              type="radio"
              name="naechstes-speichern"
              checked={nextSave === mode}
              onChange={() => setNextSave(mode)}
            />
            {NEXT_SAVE_LABEL[mode]}
          </label>
        ))}
        <span data-testid="aktivierte-kacheln" className="ml-auto text-[var(--color-text-muted)]">
          aktivierte Kacheln {activated.size} von {total}
        </span>
      </fieldset>
      <DashboardWorkspace
        preferences={preferences}
        useData={useEditorPreviewData}
        onTileActivated={(tileId) =>
          setActivated((current) => (current.has(tileId) ? current : new Set(current).add(tileId)))
        }
      />
    </section>
  );
}
