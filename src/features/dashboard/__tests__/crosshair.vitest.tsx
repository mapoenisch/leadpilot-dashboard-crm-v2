// Auftrag 161 (P10b-2): Tests für das gemeinsame Fadenkreuz (crosshairStore).
import { describe, expect, it } from 'vitest';
import { createCrosshairStore } from '../time/crosshairStore';

describe('crosshairStore', () => {
  it('initialisiert mit at: null und sourceTileId: null', () => {
    const store = createCrosshairStore();
    expect(store.getSnapshot()).toEqual({ at: null, sourceTileId: null });
  });

  it('setzt Fadenkreuz-Position und benachrichtigt Subscriber', () => {
    const store = createCrosshairStore();
    let notified = 0;
    const unsubscribe = store.subscribe(() => {
      notified++;
    });

    store.setCrosshair('2026-10-12T00:00:00+02:00', 'tile-1');
    expect(store.getSnapshot()).toEqual({
      at: '2026-10-12T00:00:00+02:00',
      sourceTileId: 'tile-1',
    });
    expect(notified).toBe(1);

    store.clearCrosshair();
    expect(store.getSnapshot()).toEqual({ at: null, sourceTileId: null });
    expect(notified).toBe(2);

    unsubscribe();
  });
});
