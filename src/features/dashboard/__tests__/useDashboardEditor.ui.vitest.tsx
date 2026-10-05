// Auftrag 074 (Dashboard Teilauftrag 5): Arbeitskopie, Speichern, Konflikt und Navigationsschutz.
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { saveErrorMessage } from '../hooks/dashboardEditorReducer';
import { tileTitle, useDashboardEditor, type EditorPreferences } from '../hooks/useDashboardEditor';
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

describe('useDashboardEditor: Arbeitskopie', () => {
  it('legt beim Start eine Kopie an; die gespeicherte Ansicht bleibt unverändert', () => {
    const { result, prefs } = setup();
    expect(result.current.mode).toBe('ansicht');
    act(() => result.current.startEditing());
    expect(result.current.mode).toBe('bearbeiten');
    expect(result.current.dirty).toBe(false);
    act(() => void result.current.moveTile('a', 'runter'));
    expect(ids(result)).toEqual(['b', 'a', 'c']);
    expect(prefs.state?.config.tiles.map((t) => t.tileId)).toEqual(['a', 'b', 'c']);
  });

  it('startet nicht ohne Zustand oder bei gesperrter Ansicht', () => {
    const none = setup({ state: null });
    act(() => none.result.current.startEditing());
    expect(none.result.current.mode).toBe('ansicht');
    expect(none.result.current.canStart).toBe(false);
    const future = setup({
      state: {
        kind: 'zukuenftige_version',
        schemaVersion: 9,
        config: CONFIG,
        revision: 3,
        canSave: false,
      },
    });
    act(() => future.result.current.startEditing());
    expect(future.result.current.mode).toBe('ansicht');
    expect(future.result.current.canStart).toBe(false);
  });

  it('erkennt Änderung und Rückänderung als dirty', () => {
    const { result } = setup();
    act(() => result.current.startEditing());
    act(() => void result.current.moveTile('a', 'runter'));
    expect(result.current.dirty).toBe(true);
    act(() => void result.current.moveTile('a', 'hoch'));
    expect(result.current.dirty).toBe(false);
  });

  it('sagt Hinzufügen, Entfernen und neue Position an', () => {
    const { result } = setup();
    act(() => result.current.startEditing());
    act(() => void result.current.moveTile('c', 'hoch'));
    expect(result.current.announcement.text).toMatch(/steht jetzt an Position 2 von 3/);
    act(() => void result.current.removeTile('a'));
    expect(result.current.announcement.text).toMatch(/entfernt/);
    act(() => {
      result.current.addTile({
        catalogId: 'baseline.umsatz',
        view: 'zahl',
        size: 'klein',
        filterMode: 'fester_stand',
      });
    });
    expect(result.current.announcement.text).toMatch(/hinzugefügt/);
  });

  it('Abbrechen verwirft den Entwurf und sagt es an', () => {
    const { result } = setup();
    act(() => result.current.startEditing());
    act(() => void result.current.removeTile('a'));
    act(() => result.current.cancel());
    expect(result.current.mode).toBe('ansicht');
    expect(result.current.draft).toBeNull();
    expect(result.current.announcement.text).toMatch(/verworfen/);
  });
});

describe('useDashboardEditor: Speichern', () => {
  it('meldet „Gespeichert“ erst nach der Bestätigung und kehrt zur Ansicht zurück', async () => {
    let resolve: (value: SaveResult) => void = () => undefined;
    const save = vi.fn<Save>(() => new Promise<SaveResult>((r) => (resolve = r)));
    const { result } = setup({ save });
    act(() => result.current.startEditing());
    act(() => void result.current.moveTile('a', 'runter'));
    let pending: Promise<boolean> = Promise.resolve(false);
    act(() => {
      pending = result.current.save();
    });
    expect(result.current.locked).toBe(true);
    expect(result.current.saveStatus.kind).toBe('idle');
    expect(result.current.mode).toBe('bearbeiten');
    await act(async () => {
      resolve({ ok: true, revision: 2 });
      await pending;
    });
    expect(result.current.saveStatus.kind).toBe('gespeichert');
    expect(result.current.mode).toBe('ansicht');
    expect(result.current.announcement.text).toBe('Gespeichert.');
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]?.[0]?.tiles.map((t: DashboardTileConfig) => t.tileId)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  const KINDS = [
    { kind: 'konflikt' },
    { kind: 'ungueltig', detail: 'tiles[0].view: x' },
    { kind: 'keine_mitgliedschaft' },
    { kind: 'sitzung_abgelaufen' },
    { kind: 'nicht_konfiguriert' },
    { kind: 'technisch' },
    { kind: 'keine_sitzung' },
    { kind: 'gesperrt' },
    { kind: 'sitzung_gewechselt' },
  ] as const;

  it('zeigt für jede Fehlerart einen eigenen Text und behält den Entwurf', async () => {
    const texts = new Set<string>();
    for (const error of KINDS) {
      const save = vi.fn<Save>(async () => ({ ok: false, error }));
      const { result } = setup({ save });
      act(() => result.current.startEditing());
      act(() => void result.current.moveTile('a', 'runter'));
      await act(async () => {
        await result.current.save();
      });
      expect(result.current.mode).toBe('bearbeiten');
      expect(ids(result)).toEqual(['b', 'a', 'c']);
      expect(result.current.saveStatus).toMatchObject({
        kind: 'fehler',
        message: saveErrorMessage(error),
      });
      expect(result.current.announcement.text).toBe(saveErrorMessage(error));
      expect(result.current.conflict).toBe(error.kind === 'konflikt');
      texts.add(saveErrorMessage(error));
    }
    expect(texts.size).toBe(KINDS.length);
  });

  it('verhindert doppeltes Speichern und sperrt Aktionen während des Speicherns', async () => {
    let resolve: (value: SaveResult) => void = () => undefined;
    const save = vi.fn<Save>(() => new Promise<SaveResult>((r) => (resolve = r)));
    const { result } = setup({ save });
    act(() => result.current.startEditing());
    act(() => void result.current.moveTile('a', 'runter'));
    let first: Promise<boolean> = Promise.resolve(false);
    let second: Promise<boolean> = Promise.resolve(true);
    act(() => {
      first = result.current.save();
      second = result.current.save();
    });
    expect(save).toHaveBeenCalledTimes(1);
    const proceed = vi.fn();
    act(() => {
      expect(
        result.current.addTile({
          catalogId: 'baseline.arr',
          view: 'zahl',
          size: 'klein',
          filterMode: 'fester_stand',
        }).ok,
      ).toBe(false);
      result.current.removeTile('b');
      result.current.moveTile('c', 'hoch');
      result.current.resetToDefault();
      result.current.cancel();
      result.current.requestLeave(proceed);
    });
    expect(ids(result)).toEqual(['b', 'a', 'c']);
    expect(result.current.mode).toBe('bearbeiten');
    expect(result.current.leaveRequest).toBeNull();
    expect(proceed).not.toHaveBeenCalled();
    await act(async () => {
      resolve({ ok: true, revision: 2 });
      await first;
      expect(await second).toBe(false);
    });
  });
});

describe('useDashboardEditor: Konflikt', () => {
  it('führt vom Konflikt über „Serveransicht laden“ zum ausdrücklichen erneuten Speichern', async () => {
    const save = vi
      .fn<Save>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'konflikt' } })
      .mockResolvedValueOnce({ ok: true, revision: 5 });
    const { result, reload } = setup({ save });
    act(() => result.current.startEditing());
    act(() => void result.current.removeTile('a'));
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.conflict).toBe(true);
    expect(result.current.serverLoaded).toBe(false);
    await act(async () => {
      await result.current.loadServerVersion();
    });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(result.current.serverLoaded).toBe(true);
    expect(ids(result)).toEqual(['b', 'c']);
    await act(async () => {
      expect(await result.current.save()).toBe(true);
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.conflict).toBe(false);
  });

  it('übernimmt auf Wunsch die Serverfassung und verwirft den Entwurf', async () => {
    const { result, rerender, prefs, reload } = setup();
    // Das Neuladen liefert eine neuere Serverfassung (wie die Abfrage der Einstellungen).
    reload.mockImplementation(async () => {
      rerender({ ...prefs, state: gespeichert(SERVER, 7) });
    });
    act(() => result.current.startEditing());
    act(() => void result.current.removeTile('a'));
    await act(async () => {
      await result.current.takeServerVersion();
    });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(ids(result)).toEqual(['s1', 's2']);
    expect(result.current.dirty).toBe(false);
    expect(result.current.conflict).toBe(false);
    expect(result.current.mode).toBe('bearbeiten');
  });
});

describe('useDashboardEditor: Navigationsschutz', () => {
  it('führt proceed ohne Änderungen sofort aus', () => {
    const { result } = setup();
    const proceed = vi.fn();
    act(() => result.current.requestLeave(proceed));
    expect(proceed).toHaveBeenCalledTimes(1);
    expect(result.current.leaveRequest).toBeNull();
  });

  it('öffnet bei Änderungen die Anfrage und kennt drei Wege', async () => {
    const proceed = vi.fn();
    const { result } = setup();
    act(() => result.current.startEditing());
    act(() => void result.current.removeTile('a'));
    act(() => result.current.requestLeave(proceed));
    expect(result.current.leaveRequest).not.toBeNull();
    expect(proceed).not.toHaveBeenCalled();

    act(() => result.current.leaveStay());
    expect(result.current.leaveRequest).toBeNull();
    expect(result.current.mode).toBe('bearbeiten');

    act(() => result.current.requestLeave(proceed));
    act(() => result.current.leaveDiscard());
    expect(proceed).toHaveBeenCalledTimes(1);
    expect(result.current.mode).toBe('ansicht');
    expect(result.current.leaveRequest).toBeNull();
  });

  it('speichert und geht danach weiter; bei Fehler bleibt die Anfrage mit Meldung', async () => {
    const proceed = vi.fn();
    const save = vi
      .fn<Save>()
      .mockResolvedValueOnce({ ok: false, error: { kind: 'technisch' } })
      .mockResolvedValueOnce({ ok: true, revision: 3 });
    const { result } = setup({ save });
    act(() => result.current.startEditing());
    act(() => void result.current.removeTile('a'));
    act(() => result.current.requestLeave(proceed));
    await act(async () => {
      await result.current.leaveSave();
    });
    expect(proceed).not.toHaveBeenCalled();
    expect(result.current.leaveRequest).not.toBeNull();
    expect(result.current.saveStatus.kind).toBe('fehler');
    await act(async () => {
      await result.current.leaveSave();
    });
    expect(proceed).toHaveBeenCalledTimes(1);
    expect(result.current.leaveRequest).toBeNull();
  });

  it('beforeunload gilt nur bei Änderungen und wird beim Aushängen entfernt', () => {
    const fire = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    const { result, unmount } = setup();
    expect(fire()).toBe(false);
    act(() => result.current.startEditing());
    expect(fire()).toBe(false);
    act(() => void result.current.removeTile('a'));
    expect(fire()).toBe(true);
    unmount();
    expect(fire()).toBe(false);
  });
});

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
