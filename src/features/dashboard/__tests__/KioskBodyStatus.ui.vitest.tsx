// Auftrag 171 (Codex PR #212): Live-Status des Kiosks zählt auch Kacheln aus Sektionen, die im
// gespeicherten Dashboard eingeklappt sind — der Kiosk zeigt sie aufgeklappt.
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DashboardTileConfigV2 } from '../model/dashboardConfigV2';
import { createPreviewThresholdsConfig } from '../preview/previewThresholds';

const seen = vi.hoisted(() => ({ tiles: [] as DashboardTileConfigV2[] }));
vi.mock('../time/useEditorLiveStatus', () => ({
  useEditorLiveStatus: ({ tiles }: { tiles: DashboardTileConfigV2[] }) => {
    seen.tiles = tiles;
    return { connection: 'verbunden', lastEventAt: null, dataAsOf: null, pausedSince: null };
  },
}));
vi.mock('../components/editor/sections/SectionedCanvasV2', () => ({
  SectionedCanvasV2: () => null,
}));

import { KioskBody } from '../components/kiosk/KioskBody';

describe('KioskBody Live-Status', () => {
  it('berechnet den Status über alle Kacheln, auch aus eingeklappten Sektionen', () => {
    const base = createPreviewThresholdsConfig();
    const ids = base.tiles.map((t) => t.id);
    const config = {
      ...base,
      sections: [{ id: 's1', title: 'Zu', collapsed: true, tileIds: ids }],
    } as typeof base;
    render(
      <KioskBody
        requestedIds={[]}
        intervalSec={60}
        source={{ list: vi.fn(), load: vi.fn() }}
        useData={vi.fn() as never}
        online={{ online: true, offlineSince: null }}
        theme="dark"
        onToggleTheme={() => {}}
        exitHref="/dashboard"
        onExit={() => {}}
        listStatus="bereit"
        onRetryList={() => {}}
        loadFailed={false}
        onRetryLoad={() => {}}
        dashboard={{
          id: 'd',
          title: 'D',
          scope: 'personal',
          revision: 1,
          config,
          updatedAt: '2026-11-21T07:00:00Z',
        }}
        isLoadingCurrent={false}
        position={1}
        total={1}
        skippedCount={0}
        rotation={{
          index: 0,
          isPaused: false,
          pauseReason: null,
          togglePause: () => {},
          noteInteraction: () => {},
          next: () => {},
          previous: () => {},
        }}
      />,
    );
    expect(seen.tiles.map((t) => t.id)).toEqual(ids);
  });

  it('Auftrag 172 (§2.3 Nr. 10): Strg/Cmd+P druckt im Kiosk nicht', () => {
    const base = createPreviewThresholdsConfig();
    const config = base;
    render(
      <KioskBody
        requestedIds={[]}
        intervalSec={60}
        source={{ list: vi.fn(), load: vi.fn() }}
        useData={vi.fn() as never}
        online={{ online: true, offlineSince: null }}
        theme="dark"
        onToggleTheme={() => {}}
        exitHref="/dashboard"
        onExit={() => {}}
        listStatus="bereit"
        onRetryList={() => {}}
        loadFailed={false}
        onRetryLoad={() => {}}
        dashboard={{
          id: 'd',
          title: 'D',
          scope: 'personal',
          revision: 1,
          config,
          updatedAt: '2026-11-21T07:00:00Z',
        }}
        isLoadingCurrent={false}
        position={1}
        total={1}
        skippedCount={0}
        rotation={{
          index: 0,
          isPaused: false,
          pauseReason: null,
          togglePause: () => {},
          noteInteraction: () => {},
          next: () => {},
          previous: () => {},
        }}
      />,
    );
    for (const init of [{ metaKey: true }, { ctrlKey: true }]) {
      const event = new KeyboardEvent('keydown', { key: 'p', cancelable: true, ...init });
      fireEvent(window, event);
      expect(event.defaultPrevented).toBe(true);
    }
  });
});
