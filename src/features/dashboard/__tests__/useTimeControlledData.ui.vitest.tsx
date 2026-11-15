// Auftrag 159 (P10a): Einfrieren je Datenquelle und Kennzeichnung nach Pausenbeginn.
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { TileDataHook } from '../components/LazyDashboardTile';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import type { TileData } from '../data/dashboardData';
import { TimeControlProvider, useTimeControl } from '../time/TimeControlProvider';
import { readTileStand, useTimeControlledSource } from '../time/useTimeControlledData';

let setSourceValue: ((value: number) => void) | null = null;

function fakeData(tile: DashboardTileConfig, value: number): TileData {
  return {
    catalogId: tile.catalogId,
    state: 'bereit',
    value,
    series: null,
    overview: null,
    unit: 'EUR',
    timeBasis: 'Teststand',
    asOf: '2026-11-15T14:00:00.000Z',
    origin: { layer: 'live', module: 'test', exportName: 'fake' },
    scope: 'organisation',
    effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
  };
}

const useMutableSource: TileDataHook = (tile) => {
  const [value, setValue] = useState(10);
  setSourceValue = setValue;
  return fakeData(tile, value);
};

const tile: DashboardTileConfig = {
  tileId: 'tile-live',
  catalogId: 'live.arr',
  view: 'zahl',
  size: 'klein',
  filterMode: 'dashboard',
};

function ControlledConsumer() {
  const data = useTimeControlledSource(useMutableSource, tile, undefined, {});
  const stand = readTileStand(data);
  return (
    <>
      <span data-testid="value">{data.state === 'nicht_verfuegbar' ? '' : data.value}</span>
      <span data-testid="mode">{stand?.mode ?? 'ohne'}</span>
      <span data-testid="after">{String(stand?.loadedAfterPause ?? false)}</span>
    </>
  );
}

function Harness() {
  const control = useTimeControl();
  return (
    <>
      <button type="button" onClick={() => control.pause('2026-11-15T14:32:00.000Z')}>
        pausieren
      </button>
      <button type="button" onClick={() => control.resume()}>
        fortsetzen
      </button>
      <ControlledConsumer />
    </>
  );
}

describe('useTimeControlledData', () => {
  it('zeigt live den aktuellen Wert und friert ihn beim Pausieren ein', () => {
    render(
      <TimeControlProvider>
        <Harness />
      </TimeControlProvider>,
    );

    expect(screen.getByTestId('value')).toHaveTextContent('10');
    expect(screen.getByTestId('mode')).toHaveTextContent('live');

    fireEvent.click(screen.getByRole('button', { name: 'pausieren' }));
    expect(screen.getByTestId('mode')).toHaveTextContent('pausiert');
    expect(screen.getByTestId('after')).toHaveTextContent('false');

    // Ein Live-Ereignis während der Pause ändert den sichtbaren Wert nicht.
    act(() => setSourceValue?.(11));
    expect(screen.getByTestId('value')).toHaveTextContent('10');

    // Fortsetzen übernimmt den aktuellen Stand.
    fireEvent.click(screen.getByRole('button', { name: 'fortsetzen' }));
    expect(screen.getByTestId('value')).toHaveTextContent('11');
    expect(screen.getByTestId('mode')).toHaveTextContent('live');
  });

  it('kennzeichnet eine erst nach Pausenbeginn geladene Kachel', () => {
    render(
      <TimeControlProvider
        initialState={{ mode: 'pausiert', analysisAt: '2026-11-15T14:32:00.000Z', resumeToken: 0 }}
      >
        <ControlledConsumer />
      </TimeControlProvider>,
    );

    expect(screen.getByTestId('value')).toHaveTextContent('10');
    expect(screen.getByTestId('mode')).toHaveTextContent('pausiert');
    expect(screen.getByTestId('after')).toHaveTextContent('true');
  });
});
