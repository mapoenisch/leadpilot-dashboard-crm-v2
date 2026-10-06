// Auftrag 074 (Dashboard Teilauftrag 5): Arbeitsbereich aus Speicherzustand, Editor, Raster, Dialog.
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  DashboardWorkspace,
  type DashboardWorkspaceProps,
  type WorkspacePreferences,
} from '../components/DashboardWorkspace';
import type { TileDataHook } from '../components/LazyDashboardTile';
import type { ChartLoaders } from '../components/charts/chartLoaders';
import type { DashboardConfig, DashboardTileConfig } from '../model/dashboardConfig';
import type { PreferencesState } from '../model/defaultDashboard';
import type { SaveResult } from '../hooks/useDashboardPreferences';

const zahl = (id: string, catalogId: string): DashboardTileConfig => ({
  tileId: id,
  catalogId,
  view: 'zahl',
  size: 'klein',
  filterMode: 'fester_stand',
});
const CONFIG: DashboardConfig = {
  version: 1,
  tiles: [zahl('a', 'baseline.arr'), zahl('b', 'baseline.umsatz'), zahl('c', 'baseline.ebitda')],
};
const stored = (config: DashboardConfig = CONFIG): PreferencesState => ({
  kind: 'gespeichert',
  config,
  revision: 3,
  unavailable: [],
  canSave: true,
});

const enabledCalls: (boolean | undefined)[] = [];
const useData: TileDataHook = (tile, _filters, options) => {
  enabledCalls.push(options?.enabled);
  return {
    catalogId: tile.catalogId,
    state: options?.enabled ? 'bereit' : 'laden',
    value: options?.enabled ? 1 : null,
    series: options?.enabled ? [{ label: 'A', value: 1 }] : null,
    overview: null,
    unit: 'EUR',
    timeBasis: 'Stand 31.12.2025',
    asOf: null,
    origin: { layer: 'baseline', module: 'src/domain/x.ts', exportName: 'X' },
    scope: 'stammdaten',
    effectiveFilter: { mode: 'fester_stand', period: null, pipeline: null },
  };
};

function prefs(extra: Partial<WorkspacePreferences> = {}): WorkspacePreferences {
  return {
    status: 'bereit',
    state: stored(),
    isSaving: false,
    save: vi.fn(async (): Promise<SaveResult> => ({ ok: true, revision: 4 })),
    reloadServerVersion: vi.fn(async () => undefined),
    ...extra,
  };
}

function setup(preferences: WorkspacePreferences, extra: Partial<DashboardWorkspaceProps> = {}) {
  const props: DashboardWorkspaceProps = {
    preferences,
    useData,
    onShowDetails: undefined,
    onReload: vi.fn(),
    ...extra,
  };
  const view = render(<DashboardWorkspace {...props} />);
  return { props, ...view };
}

const items = () => screen.getAllByRole('listitem', { hidden: true });
const startEditing = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Dashboard bearbeiten' }));

describe('DashboardWorkspace – Zustände', () => {
  it('zeigt beim Laden ein Skelett der Standardansicht ohne jede Abfrage', () => {
    enabledCalls.length = 0;
    setup(prefs({ status: 'laden', state: null }));
    expect(screen.getByTestId('dashboard-workspace')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Dein Dashboard wird geladen …')).toBeInTheDocument();
    expect(items().length).toBeGreaterThan(3);
    expect(enabledCalls.every((enabled) => enabled === false)).toBe(true);
    expect(screen.getByRole('button', { name: 'Dashboard bearbeiten' })).toBeDisabled();
  });

  it('meldet einen Ladefehler verständlich und lädt auf Wunsch neu', () => {
    const { props } = setup(prefs({ status: 'fehler', state: null }));
    expect(screen.getByTestId('dashboard-error')).toHaveTextContent(/nicht geladen werden/);
    fireEvent.click(screen.getByRole('button', { name: 'Erneut laden' }));
    expect(props.onReload).toHaveBeenCalled();
  });

  it('weist ohne Sitzung auf die Anmeldung hin', () => {
    setup(prefs({ status: 'keine_sitzung', state: null }));
    expect(screen.getByTestId('dashboard-no-session')).toBeInTheDocument();
  });

  it('zeigt die gespeicherten Kacheln und sperrt Bearbeiten bei neuerer Formatversion', () => {
    const state: PreferencesState = {
      kind: 'zukuenftige_version',
      schemaVersion: 9,
      config: CONFIG,
      revision: 1,
      canSave: false,
    };
    setup(prefs({ state }));
    expect(items()).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Dashboard bearbeiten' })).toBeDisabled();
    expect(screen.getByText(/neueren Version/)).toBeInTheDocument();
  });

  it('zeigt Platzhalter und Anzahl für nicht verfügbare Kacheln', () => {
    const config: DashboardConfig = {
      version: 1,
      tiles: [CONFIG.tiles[0]!, zahl('u', 'baseline.gibt_es_nicht')],
    };
    const state: PreferencesState = {
      ...stored(config),
      unavailable: [{ path: 'tiles[1]', code: 'x', message: 'x' }],
    } as PreferencesState;
    setup(prefs({ state }));
    expect(screen.getByTestId('unavailable-slot')).toBeInTheDocument();
    expect(screen.getByText(/1 Kachel ist in dieser Version nicht verfügbar/)).toBeInTheDocument();
  });

  it('nennt ohne Detailansicht einen sichtbaren Hinweis statt nichts zu tun', () => {
    setup(prefs());
    fireEvent.click(screen.getAllByRole('button', { name: /Details/ })[0]!);
    expect(screen.getByText('In dieser Vorschau gibt es keine Detailansicht.')).toBeInTheDocument();
  });
});

describe('DashboardWorkspace – Bearbeiten', () => {
  it('verschiebt eine Kachel, sagt es an und hält den Fokus auf der Schaltfläche', () => {
    setup(prefs());
    startEditing();
    fireEvent.click(within(items()[0]!).getByRole('button', { name: /Nach unten/ }));
    expect(
      screen.getAllByRole('status').some((el) => /Position 2 von 3/.test(el.textContent ?? '')),
    ).toBe(true);
    expect(items()[1]!.getAttribute('data-tile-id')).toBe('a');
    expect(within(items()[1]!).getByRole('button', { name: /Nach unten/ })).toHaveFocus();
    expect(screen.getByText('Ungespeicherte Änderungen.')).toBeInTheDocument();
  });

  it('speichert die Arbeitskopie erst auf Wunsch und kehrt danach in die Ansicht zurück', async () => {
    const preferences = prefs();
    setup(preferences);
    startEditing();
    fireEvent.click(within(items()[0]!).getByRole('button', { name: /Nach unten/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    });
    expect(preferences.save).toHaveBeenCalledTimes(1);
    const saved = (preferences.save as ReturnType<typeof vi.fn>).mock
      .calls[0]![0] as DashboardConfig;
    expect(saved.tiles.map((tile) => tile.tileId)).toEqual(['b', 'a', 'c']);
    expect(screen.getByText('Gespeichert.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dashboard bearbeiten' })).toBeInTheDocument();
  });

  it('behält den Entwurf bei einem Speicherfehler und nennt den Grund', async () => {
    const save = vi.fn(async (): Promise<SaveResult> => ({
      ok: false,
      error: { kind: 'technisch' },
    }));
    setup(prefs({ save }));
    startEditing();
    fireEvent.click(within(items()[0]!).getByRole('button', { name: /Nach unten/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    });
    expect(screen.getByTestId('save-error')).toHaveTextContent(/nicht gespeichert werden/);
    expect(items()[1]!.getAttribute('data-tile-id')).toBe('a');
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeEnabled();
  });

  it('führt bei einem Konflikt durch drei klar benannte Wege', async () => {
    const save = vi.fn(async (): Promise<SaveResult> => ({
      ok: false,
      error: { kind: 'konflikt' },
    }));
    const preferences = prefs({ save });
    setup(preferences);
    startEditing();
    fireEvent.click(within(items()[0]!).getByRole('button', { name: /Nach unten/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    });
    expect(
      screen.getByRole('button', { name: 'Entwurf verwerfen und Serverfassung übernehmen' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Trotzdem speichern/ })).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Aktuelle Serveransicht laden' }));
    });
    expect(preferences.reloadServerVersion).toHaveBeenCalled();
    // Die Freigabe folgt nach einem Takt; dann gibt es nur noch den bestätigten Weg, nicht „Speichern“.
    await screen.findByRole('button', { name: /Trotzdem speichern/ });
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Trotzdem speichern (ersetzt die neuere Fassung)' }),
    ).toBeInTheDocument();
  });

  it('entfernt eine Kachel und setzt den Fokus auf die Nachbarkachel', () => {
    setup(prefs());
    startEditing();
    fireEvent.click(within(items()[1]!).getByRole('button', { name: /Entfernen/ }));
    expect(items()).toHaveLength(2);
    expect(items()[1]).toHaveFocus();
  });
});

describe('DashboardWorkspace – Konfigurationsfenster und Verlassen', () => {
  it('lädt das Konfigurationsfenster erst beim Öffnen; ein Ladefehler bietet echtes Neuladen', async () => {
    const loader = vi.fn<() => Promise<never>>().mockRejectedValue(new Error('Chunk'));
    const { props } = setup(prefs(), { configuratorLoader: loader });
    startEditing();
    expect(loader).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Kachel hinzufügen' }));
    // Das Fenster ist von Anfang an modal (Laden und Fehler), der Arbeitsbereich ist gesperrt.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Seite neu laden' }));
    expect(props.onReload).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('zeigt den Ladezustand des Konfigurators bereits als Fenster', () => {
    const never = vi.fn(() => new Promise<never>(() => undefined));
    setup(prefs(), { configuratorLoader: never });
    startEditing();
    fireEvent.click(screen.getByRole('button', { name: 'Kachel hinzufügen' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Konfigurationsfenster wird geladen');
  });

  it('schließt das Konfigurationsfenster mit Escape und gibt den Fokus zurück', async () => {
    setup(prefs());
    startEditing();
    const trigger = screen.getByRole('button', { name: 'Kachel hinzufügen' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    // Aus dem Dialog heraus: `Modal` stoppt keydown dort, Escape muss trotzdem schließen.
    fireEvent.keyDown(screen.getByRole('button', { name: 'Dialog schließen' }), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger).toHaveFocus();
  });

  const CHART: DashboardTileConfig = {
    tileId: 'chart',
    catalogId: 'baseline.mrr_paketmix',
    view: 'balken',
    size: 'mittel',
    filterMode: 'fester_stand',
  };
  const failing: ChartLoaders = {
    balken: () => Promise.reject(new Error('x')),
    ring: () => Promise.reject(new Error('x')),
    linie: () => Promise.reject(new Error('x')),
    flaeche: () => Promise.reject(new Error('x')),
  };

  it('fragt vor dem Neuladen nach, wenn Änderungen offen sind', async () => {
    const config = { version: 1 as const, tiles: [CONFIG.tiles[0]!, CHART] };
    const { props } = setup(prefs({ state: stored(config) }), { chartLoaders: failing });
    startEditing();
    fireEvent.click(within(items()[0]!).getByRole('button', { name: /Nach unten/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Wiederholen' }));
    expect(props.onReload).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Verwerfen und weiter' }));
    await waitFor(() => expect(props.onReload).toHaveBeenCalledTimes(1));
  });

  it('lädt ohne offene Änderungen sofort neu', async () => {
    const config = { version: 1 as const, tiles: [CONFIG.tiles[0]!, CHART] };
    const { props } = setup(prefs({ state: stored(config) }), { chartLoaders: failing });
    fireEvent.click(await screen.findByRole('button', { name: 'Wiederholen' }));
    expect(props.onReload).toHaveBeenCalledTimes(1);
  });
});
