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

/** Auftrag 076: Kombinationskacheln für die Höchstbelegung (bereit, Anteil, nicht berechenbar). */
const COMBINATION_TILES: DashboardConfig['tiles'] = [
  {
    tileId: 'kombi_marge',
    catalogId: 'kombination.ebitda_marge',
    view: 'zahl',
    size: 'klein',
    filterMode: 'fester_stand',
  },
  {
    tileId: 'kombi_cac',
    catalogId: 'kombination.cac_aufschlag',
    view: 'zahl',
    size: 'klein',
    filterMode: 'fester_stand',
  },
  {
    tileId: 'kombi_growth',
    catalogId: 'kombination.mrr_anteil_growth',
    view: 'ring',
    size: 'mittel',
    filterMode: 'fester_stand',
  },
];

function paddedConfig(count: number): DashboardConfig {
  const base = DEFAULT_DASHBOARD_CONFIG.tiles;
  const extra = Array.from({ length: Math.max(0, count - base.length) }, (_, i) =>
    i < COMBINATION_TILES.length
      ? COMBINATION_TILES[i]!
      : { ...base[i % base.length]!, tileId: `zusatz_${i + 1}` },
  );
  return { ...DEFAULT_DASHBOARD_CONFIG, tiles: [...base, ...extra].slice(0, count) };
}

/** `loading` hält den Arbeitsbereich im Ladezustand (Skelett), z. B. für die Höhenmessung. */
export function DashboardEditorPreview({
  loading = false,
  tileCount,
}: {
  loading?: boolean;
  /** Startet mit dieser Kachelzahl (aufgefüllt mit Kopien der Standardkacheln), z. B. 24 für die Lazy-Prüfung. */
  tileCount?: number;
}) {
  const [stored, setStored] = useState<{ config: DashboardConfig; revision: number } | null>(() =>
    tileCount ? { config: paddedConfig(tileCount), revision: 1 } : null,
  );
  const [server, setServer] = useState<{ config: DashboardConfig; revision: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [nextSave, setNextSave] = useState<NextSave>('erfolg');
  const [activated, setActivated] = useState<ReadonlySet<string>>(new Set());
  const [shownIds, setShownIds] = useState<readonly string[]>([]);
  const nextSaveRef = useRef<NextSave>('erfolg');
  nextSaveRef.current = nextSave;
  const storedRef = useRef(stored);
  storedRef.current = stored;

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

  const preferences = useMemo(() => {
    const state: PreferencesState = stored
      ? {
          kind: 'gespeichert',
          config: stored.config,
          revision: stored.revision,
          unavailable: [],
          canSave: true,
        }
      : { kind: 'standard', config: DEFAULT_DASHBOARD_CONFIG, revision: 0, canSave: true };
    if (loading) {
      return { status: 'laden' as const, state: null, isSaving: saving, save, reloadServerVersion };
    }
    return { status: 'bereit' as const, state, isSaving: saving, save, reloadServerVersion };
  }, [stored, saving, save, reloadServerVersion, loading]);
  // Gezählt wird, was der Arbeitsbereich gerade zeigt (auch der Entwurf); entfernte IDs zählen nicht.
  const activeShown = shownIds.filter((id) => activated.has(id)).length;

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
          aktivierte Kacheln {activeShown} von {shownIds.length}
        </span>
      </fieldset>
      <DashboardWorkspace
        preferences={preferences}
        useData={useEditorPreviewData}
        onShownTilesChange={setShownIds}
        onTileActivated={(tileId) =>
          setActivated((current) => (current.has(tileId) ? current : new Set(current).add(tileId)))
        }
      />
    </section>
  );
}
