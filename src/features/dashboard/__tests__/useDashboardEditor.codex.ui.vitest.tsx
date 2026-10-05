// Auftrag 074: Regressionstests zu den Codex-Befunden aus PR #59 (Editor-Hook).
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { tileTitle } from '../hooks/dashboardEditorReducer';
import { useDashboardEditor, type EditorPreferences } from '../hooks/useDashboardEditor';
import type { SaveResult } from '../hooks/useDashboardPreferences';
import type { DashboardConfig, DashboardTileConfig } from '../model/dashboardConfig';
import type { PreferencesState } from '../model/defaultDashboard';

const tile = (
  tileId: string,
  size: DashboardTileConfig['size'] = 'klein',
): DashboardTileConfig => ({
  tileId,
  catalogId: 'baseline.arr',
  view: 'zahl',
  size,
  filterMode: 'fester_stand',
});
const CONFIG: DashboardConfig = { version: 1, tiles: [tile('a'), tile('b'), tile('c')] };
const SERVER: DashboardConfig = { version: 1, tiles: [tile('s1'), tile('s2')] };

function gespeichert(config: DashboardConfig, revision = 1): PreferencesState {
  return { kind: 'gespeichert', config, revision, unavailable: [], canSave: true };
}

type Save = EditorPreferences['save'];

function setup(overrides: Partial<EditorPreferences> = {}) {
  const save = vi.fn<Save>(async () => ({ ok: true, revision: 2 }));
  const reload = vi.fn(async () => undefined);
  const prefs: EditorPreferences = {
    state: gespeichert(CONFIG),
    isSaving: false,
    save,
    reloadServerVersion: reload,
    ...overrides,
  };
  const view = renderHook((props: EditorPreferences) => useDashboardEditor(props), {
    initialProps: prefs,
  });
  return { ...view, prefs, save, reload };
}

const ids = (hook: { current: { draft: DashboardConfig | null } }) =>
  hook.current.draft?.tiles.map((t) => t.tileId);

describe('useDashboardEditor: Codex-Befunde PR #59', () => {
  it('erlaubt nach einem erneuten Konflikt wieder „Serveransicht laden“', async () => {
    const save = vi.fn<Save>().mockResolvedValue({ ok: false, error: { kind: 'konflikt' } });
    const { result } = setup({ save });
    act(() => result.current.startEditing());
    act(() => void result.current.moveTile('a', 'runter'));
    await act(async () => void (await result.current.save()));
    await act(async () => void (await result.current.loadServerVersion()));
    expect(result.current.serverLoaded).toBe(true);
    await act(async () => void (await result.current.save()));
    expect(result.current.conflict).toBe(true);
    expect(result.current.serverLoaded).toBe(false);
  });

  it('nennt unbekannte Kacheln nie mit der technischen ID', () => {
    expect(tileTitle({ ...tile('u'), catalogId: 'baseline.gibt_es_nicht' })).toBe(
      'Nicht verfügbare Kachel',
    );
    expect(tileTitle({ ...tile('v'), title: 'Eigen' })).toBe('Eigen');
  });

  it('ignoriert „Hier bleiben“ während des Speicherns', async () => {
    let finish: (result: SaveResult) => void = () => undefined;
    const save = vi.fn<Save>(() => new Promise<SaveResult>((resolve) => (finish = resolve)));
    const { result } = setup({ save });
    act(() => result.current.startEditing());
    act(() => void result.current.moveTile('a', 'runter'));
    act(() => result.current.requestLeave(() => undefined));
    expect(result.current.leaveRequest).not.toBeNull();
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.leaveSave();
    });
    act(() => result.current.leaveStay());
    expect(result.current.leaveRequest).not.toBeNull();
    await act(async () => {
      finish({ ok: true, revision: 2 });
      await pending;
    });
  });
});

describe('useDashboardEditor: Codex-Befunde PR #59, Runde 3', () => {
  it('bindet den Entwurf an die Startrevision: neuere Serverfassung führt in den Konflikt', async () => {
    const { result, rerender, prefs, save } = setup();
    act(() => result.current.startEditing());
    act(() => void result.current.moveTile('a', 'runter'));
    // Ein Fokus-Neuladen bringt still eine neuere Fassung; gespeichert werden darf damit nichts.
    rerender({ ...prefs, state: gespeichert(SERVER, 5) });
    expect(result.current.conflict).toBe(true);
    expect(result.current.saveStatus.kind).toBe('fehler');
    await act(async () => void (await result.current.save()));
    expect(save).not.toHaveBeenCalled();
    // Erst nach bewusstem Laden ist das Speichern (mit der neuen Revision) wieder möglich.
    await act(async () => void (await result.current.loadServerVersion()));
    await act(async () => void (await result.current.save()));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('übernimmt die Serverfassung nur nach erfolgreichem Neuladen', async () => {
    const { result, reload } = setup();
    reload.mockRejectedValue(new Error('offline'));
    act(() => result.current.startEditing());
    act(() => void result.current.removeTile('a'));
    await act(async () => void (await result.current.takeServerVersion()));
    expect(ids(result)).toEqual(['b', 'c']);
    expect(result.current.saveStatus.kind).toBe('fehler');
    await act(async () => void (await result.current.loadServerVersion()));
    expect(result.current.serverLoaded).toBe(false);
  });
});

describe('useDashboardEditor: Codex-Befunde PR #59, Runde 4', () => {
  it('hebt die Freigabe bei einer weiteren Revision wieder auf', async () => {
    const { result, rerender, prefs, save } = setup();
    act(() => result.current.startEditing());
    act(() => void result.current.moveTile('a', 'runter'));
    rerender({ ...prefs, state: gespeichert(SERVER, 5) });
    await act(async () => void (await result.current.loadServerVersion()));
    expect(result.current.serverLoaded).toBe(true);
    // Ein anderer Tab speichert erneut: Revision 6 darf nicht überschrieben werden.
    rerender({ ...prefs, state: gespeichert(SERVER, 6) });
    expect(result.current.serverLoaded).toBe(false);
    expect(result.current.conflict).toBe(true);
    await act(async () => void (await result.current.save()));
    expect(save).not.toHaveBeenCalled();
  });

  it('behält nach einem Nicht-Konflikt-Fehler beim Überschreiben den Wiederholungsweg', async () => {
    const save = vi
      .fn<Save>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'konflikt' } })
      .mockResolvedValueOnce({ ok: false, error: { kind: 'technisch' } });
    const { result } = setup({ save });
    act(() => result.current.startEditing());
    act(() => void result.current.moveTile('a', 'runter'));
    await act(async () => void (await result.current.save()));
    await act(async () => void (await result.current.loadServerVersion()));
    await act(async () => void (await result.current.save()));
    expect(result.current.saveStatus.kind).toBe('fehler');
    expect(result.current.conflict).toBe(true);
    expect(result.current.serverLoaded).toBe(true);
  });
});

describe('useDashboardEditor: parallele Konfliktaktionen', () => {
  it('lässt während des Neuladens nur eine Aktion zu', async () => {
    const { result, reload } = setup();
    let finish: () => void = () => undefined;
    reload.mockImplementation(
      () => new Promise<undefined>((resolve) => (finish = () => resolve(undefined))),
    );
    act(() => result.current.startEditing());
    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.takeServerVersion();
    });
    await act(async () => void (await result.current.loadServerVersion()));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(result.current.locked).toBe(true);
    await act(async () => {
      finish();
      await first;
    });
    expect(result.current.locked).toBe(false);
  });
});
