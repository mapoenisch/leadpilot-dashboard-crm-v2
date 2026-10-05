// Auftrag 074: Regressionstests zu den Codex-Befunden aus PR #59 (Arbeitsbereich und Vorschau).
import { describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  DashboardWorkspace,
  type DashboardWorkspaceProps,
  type WorkspacePreferences,
} from '../components/DashboardWorkspace';
import type { TileDataHook } from '../components/LazyDashboardTile';
import { UnsavedChangesDialog } from '../components/UnsavedChangesDialog';
import { DashboardPreviewPage } from '../preview/DashboardPreviewPage';
import { DashboardEditorPreview } from '../preview/DashboardEditorPreview';
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

describe('DashboardWorkspace: Codex-Befunde PR #59', () => {
  const CRM: DashboardTileConfig = {
    tileId: 'crm',
    catalogId: 'crm.pipeline_deals',
    view: 'zahl',
    size: 'klein',
    filterMode: 'dashboard',
  };

  it('hält den Sitzungsfilter unabhängig von Änderungen am Entwurf', () => {
    const seen: (string | undefined)[] = [];
    const useSpy: TileDataHook = (tile, filters, options) => {
      seen.push(filters?.pipeline);
      return useData(tile, filters, options);
    };
    const config: DashboardConfig = { version: 1, filters: { pipeline: 'Direkt' }, tiles: [CRM] };
    setup(prefs({ state: stored(config) }), { useData: useSpy });
    startEditing();
    seen.length = 0;
    fireEvent.click(screen.getByRole('button', { name: 'Startfilter entfernen' }));
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((value) => value === 'Direkt')).toBe(true);
  });

  it('setzt nach dem Entfernen der letzten Kachel den Fokus auf „Kachel hinzufügen“', () => {
    const config: DashboardConfig = { version: 1, tiles: [CONFIG.tiles[0]!] };
    setup(prefs({ state: stored(config) }));
    startEditing();
    fireEvent.click(within(items()[0]!).getByRole('button', { name: /Entfernen/ }));
    expect(
      within(screen.getByTestId('dashboard-empty')).getByRole('button', {
        name: 'Kachel hinzufügen',
      }),
    ).toHaveFocus();
  });

  it('zählt in der Vorschau die angezeigten Kacheln, auch im Entwurf', () => {
    render(<DashboardEditorPreview />);
    const count = () => {
      const [, active, total] = /(\d+) von (\d+)/.exec(
        screen.getByTestId('aktivierte-kacheln').textContent ?? '',
      )!;
      return { active: Number(active), total: Number(total) };
    };
    const before = count();
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard bearbeiten' }));
    fireEvent.click(within(items()[0]!).getByRole('button', { name: /Entfernen/ }));
    const after = count();
    expect(after.total).toBe(before.total - 1);
    expect(after.active).toBeLessThanOrEqual(after.total);
  });

  it('wirkt beim Speichern in keinem Dialog-Schließweg', () => {
    const onStay = vi.fn();
    render(
      <UnsavedChangesDialog open locked onSave={vi.fn()} onDiscard={vi.fn()} onStay={onStay} />,
    );
    fireEvent.keyDown(screen.getByRole('button', { name: 'Dialog schließen' }), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Dialog schließen' }));
    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(onStay).not.toHaveBeenCalled();
  });
});

describe('DashboardWorkspace: Codex-Befunde PR #59, Runde 2', () => {
  it('sagt jeden Klick auf „Details“ erneut an', () => {
    setup(prefs());
    const click = () => fireEvent.click(screen.getAllByRole('button', { name: /Details/ })[0]!);
    const text = () =>
      screen.getAllByRole('status').find((el) => /Detailansicht folgt/.test(el.textContent ?? ''))
        ?.textContent;
    click();
    const first = text();
    click();
    expect(text()).not.toBe(first);
  });

  it('kann beim Bearbeiten einen gesetzten Titel wieder löschen', async () => {
    const config: DashboardConfig = {
      version: 1,
      tiles: [{ ...CONFIG.tiles[0]!, title: 'Mein Titel' }],
    };
    setup(prefs({ state: stored(config) }));
    startEditing();
    expect(screen.getByText('Mein Titel')).toBeInTheDocument();
    fireEvent.click(within(items()[0]!).getByRole('button', { name: /Bearbeiten/ }));
    const field = await screen.findByLabelText('Eigener Titel (optional)');
    fireEvent.change(field, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }));
    await waitFor(() => expect(screen.queryByText('Mein Titel')).toBeNull());
  });
});

describe('DashboardWorkspace: Codex-Befunde PR #59, Runde 3', () => {
  it('hängt die Vorschau bei Texteingaben nicht aus und wieder ein', async () => {
    let mounts = 0;
    const useCounting: TileDataHook = (tile, filters, options) => {
      useEffect(() => {
        mounts += 1;
      }, []);
      return useData(tile, filters, options);
    };
    setup(prefs(), { useData: useCounting });
    startEditing();
    fireEvent.click(screen.getByRole('button', { name: 'Kachel hinzufügen' }));
    fireEvent.click((await screen.findAllByRole('radio', { name: /ARR/ }))[0]!);
    const before = mounts;
    const title = screen.getByLabelText('Eigener Titel (optional)');
    for (const text of ['A', 'AB', 'ABC']) fireEvent.change(title, { target: { value: text } });
    expect(mounts).toBe(before);
  });
});

describe('DashboardWorkspace: Codex-Befunde PR #59, Runde 4', () => {
  it('schließt mit einem Escape nur den obersten Dialog', async () => {
    const loader = vi.fn<() => Promise<never>>().mockRejectedValue(new Error('Chunk'));
    const { props } = setup(prefs(), { configuratorLoader: loader });
    startEditing();
    fireEvent.click(within(items()[0]!).getByRole('button', { name: /Nach unten/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Kachel hinzufügen' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Seite neu laden' }));
    expect(screen.getAllByRole('dialog', { hidden: true }).length).toBe(2);
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Hier bleiben' })).toBeNull());
    // Die Hülle des Konfigurators bleibt: nur die Rückfrage wurde geschlossen.
    expect(screen.getByRole('button', { name: 'Seite neu laden' })).toBeInTheDocument();
    expect(props.onReload).not.toHaveBeenCalled();
  });

  it('startet für die Pipeline-Eingabe der Vorschau keine Abfrage je Buchstabe', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const seen = new Set<string | undefined>();
      const useSpy: TileDataHook = (tile, filters, options) => {
        seen.add(tile.pipeline);
        return useData(tile, filters, options);
      };
      setup(prefs(), { useData: useSpy });
      startEditing();
      fireEvent.click(screen.getByRole('button', { name: 'Kachel hinzufügen' }));
      fireEvent.change(await screen.findByLabelText('Kennzahl suchen'), {
        target: { value: 'Pipeline' },
      });
      fireEvent.click(screen.getAllByRole('radio', { name: /Pipeline/ })[0]!);
      seen.clear();
      const field = await screen.findByLabelText(/Eigene Pipeline/);
      for (const text of ['D', 'Di', 'Dir']) fireEvent.change(field, { target: { value: text } });
      act(() => void vi.advanceTimersByTime(500));
      expect([...seen].filter((value) => value && value !== 'Dir')).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('DashboardWorkspace: Neuladefehler mit vorhandener Fassung', () => {
  it('zeigt weiter den Editor statt der Ladefehleranzeige', () => {
    setup(prefs({ status: 'fehler' }));
    expect(screen.queryByTestId('dashboard-error')).toBeNull();
    expect(items()).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard bearbeiten' }));
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
  });
});

describe('DashboardPreviewPage: Arbeitsbereich', () => {
  it('zeigt den Arbeitsbereich unter der Galerie; ?bereich=editor nur ihn; ?ansicht= nicht', () => {
    const { unmount } = render(<DashboardPreviewPage search="" />);
    expect(screen.getByTestId('dashboard-workspace')).toBeInTheDocument();
    unmount();
    const editor = render(<DashboardPreviewPage search="?bereich=editor" />);
    expect(screen.getByTestId('dashboard-workspace')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-test-tile')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Kachelgalerie' })).toBeNull();
    editor.unmount();
    render(<DashboardPreviewPage search="?ansicht=zahl" />);
    expect(screen.queryByTestId('dashboard-workspace')).toBeNull();
  });
});
