// Auftrag 159 (P10a): Einfrieren je Datenquelle und Kennzeichnung nach Pausenbeginn.
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { TileDataHook } from '../components/LazyDashboardTile';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import type { ResolvedTileData } from '../data/dashboardData';
import { TimeControlProvider, useTimeControl } from '../time/TimeControlProvider';
import {
  attachCrmFetchedAt,
  attachCrmQueryMeta,
  readCrmFetchedAt,
  readCrmQueryMeta,
  readTileStand,
  useTimeControlledSource,
} from '../time/useTimeControlledData';

let setSourceValue: ((value: number) => void) | null = null;

function fakeData(
  tile: DashboardTileConfig,
  value: number,
  originLayer: 'live' | 'crm' = 'live',
): ResolvedTileData {
  return {
    catalogId: tile.catalogId,
    state: 'bereit',
    value,
    series: null,
    overview: null,
    unit: 'EUR',
    timeBasis: 'Teststand',
    asOf: '2026-11-15T14:00:00.000Z',
    origin: { layer: originLayer, module: 'test', exportName: 'fake' },
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

  it('unterstützt attachCrmFetchedAt und readCrmFetchedAt sowie attachCrmQueryMeta', () => {
    const base = fakeData(tile, 42);
    const stamped = attachCrmFetchedAt(base, 1731679200000);
    expect(readCrmFetchedAt(stamped)).toBe(1731679200000);
    expect(readCrmFetchedAt(base)).toBe(1731679200000);
    expect(readCrmQueryMeta(stamped)).toEqual({ fetchedAt: 1731679200000, isFetching: false });
  });

  it('verwirft den eingefrorenen Stand bei Änderung der Pipeline während einer Pause', () => {
    let currentPipeline = 'pl-1';
    const dynamicSource: TileDataHook = (_t, filters) => {
      currentPipeline = filters?.pipeline ?? 'pl-default';
      return {
        ...fakeData(tile, currentPipeline === 'pl-neu' ? 99 : 10),
        effectiveFilter: { mode: 'dashboard', period: null, pipeline: currentPipeline },
      };
    };

    function PipelineHarness() {
      const [pipe, setPipe] = useState('pl-1');
      const data = useTimeControlledSource(dynamicSource, tile, { pipeline: pipe }, {});
      const stand = readTileStand(data);
      return (
        <>
          <button type="button" onClick={() => setPipe('pl-neu')}>
            pipeline-wechseln
          </button>
          <span data-testid="pipe-val">{data.state === 'nicht_verfuegbar' ? '' : data.value}</span>
          <span data-testid="pipe-after">{String(stand?.loadedAfterPause ?? false)}</span>
        </>
      );
    }

    render(
      <TimeControlProvider
        initialState={{ mode: 'pausiert', analysisAt: '2026-11-15T14:32:00.000Z', resumeToken: 0 }}
      >
        <PipelineHarness />
      </TimeControlProvider>,
    );

    expect(screen.getByTestId('pipe-val')).toHaveTextContent('10');
    fireEvent.click(screen.getByRole('button', { name: 'pipeline-wechseln' }));
    expect(screen.getByTestId('pipe-val')).toHaveTextContent('99');
    expect(screen.getByTestId('pipe-after')).toHaveTextContent('true');
  });

  it('schließt Erstinitialisierung von Live-Kacheln ab, sobald nach Pausenbeginn der erste Snapshot eintrifft', () => {
    let emitSnapshot: ((snap: boolean) => void) | null = null;
    const useInitialLiveSource: TileDataHook = (t) => {
      const [hasSnap, setHasSnap] = useState(false);
      emitSnapshot = setHasSnap;
      if (!hasSnap) {
        return {
          catalogId: t.catalogId,
          state: 'keine_daten',
          value: null,
          series: null,
          overview: null,
          unit: 'EUR',
          timeBasis: 'Live',
          asOf: null,
          origin: { layer: 'live', module: 'test', exportName: 'fake' },
          scope: 'organisation',
          effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
        };
      }
      return fakeData(t, 77);
    };

    function LiveHarness() {
      const data = useTimeControlledSource(useInitialLiveSource, tile, undefined, {});
      return (
        <span data-testid="live-init-val">
          {data.state === 'nicht_verfuegbar' ? '' : data.value}
        </span>
      );
    }

    render(
      <TimeControlProvider
        initialState={{ mode: 'pausiert', analysisAt: '2026-11-15T14:32:00.000Z', resumeToken: 0 }}
      >
        <LiveHarness />
      </TimeControlProvider>,
    );

    // Zunächst keine_daten, value ist null
    expect(screen.getByTestId('live-init-val')).toHaveTextContent('');

    // Snapshot trifft asynchron ein
    act(() => emitSnapshot?.(true));
    expect(screen.getByTestId('live-init-val')).toHaveTextContent('77');
  });

  it('ignoriert globale Pipeline-Wechsel bei Live-Kacheln, da Pipeline für Live unwirksam ist', () => {
    let liveEventVal = 42;
    const useLiveStreamSource: TileDataHook = (t) => {
      return {
        ...fakeData(t, liveEventVal),
        effectiveFilter: { mode: 'dashboard', period: null, pipeline: null }, // Live hat nie eine wirksame Pipeline
      };
    };

    function LivePipelineHarness() {
      const [pipe, setPipe] = useState('pl-1');
      const data = useTimeControlledSource(useLiveStreamSource, tile, { pipeline: pipe }, {});
      return (
        <>
          <button type="button" onClick={() => setPipe('pl-2')}>
            global-pipeline-wechseln
          </button>
          <span data-testid="live-pipe-val">
            {data.state === 'nicht_verfuegbar' ? '' : data.value}
          </span>
        </>
      );
    }

    render(
      <TimeControlProvider
        initialState={{ mode: 'pausiert', analysisAt: '2026-11-15T14:32:00.000Z', resumeToken: 0 }}
      >
        <LivePipelineHarness />
      </TimeControlProvider>,
    );

    // Initial eingefroren bei 42
    expect(screen.getByTestId('live-pipe-val')).toHaveTextContent('42');

    // Im Hintergrund trifft ein neues Event ein
    liveEventVal = 100;

    // Globaler Pipelinewechsel wird ausgelöst (z. B. durch CRM-Filterung)
    fireEvent.click(screen.getByRole('button', { name: 'global-pipeline-wechseln' }));

    // Die Live-Kachel bleibt stabil auf 42 eingefroren und springt nicht auf 100!
    expect(screen.getByTestId('live-pipe-val')).toHaveTextContent('42');
  });

  it('wartet beim erstmaligen Einfrieren auf laufende CRM-Abrufe und friert erst das frische Ergebnis ein', () => {
    let completeFetch: (() => void) | null = null;
    const useCrmRefetchingSource: TileDataHook = (t) => {
      const [fetching, setFetching] = useState(true);
      completeFetch = () => setFetching(false);
      const base = fakeData(t, fetching ? 10 : 88, 'crm');
      return attachCrmQueryMeta(base, {
        fetchedAt: fetching ? 1000 : 2000,
        isFetching: fetching,
      });
    };

    function CrmHarness() {
      const data = useTimeControlledSource(useCrmRefetchingSource, tile, undefined, {});
      return (
        <span data-testid="crm-fetch-val">
          {data.state === 'nicht_verfuegbar' ? '' : data.value}
        </span>
      );
    }

    render(
      <TimeControlProvider
        initialState={{ mode: 'pausiert', analysisAt: '2026-11-15T14:32:00.000Z', resumeToken: 0 }}
      >
        <CrmHarness />
      </TimeControlProvider>,
    );

    // Während isFetching true ist, zeigt die Kachel zwar gecachte Daten, friert sie aber noch nicht ein
    expect(screen.getByTestId('crm-fetch-val')).toHaveTextContent('10');

    // Abruf wird abgeschlossen: frische Daten und neuer Zeitstempel treffen ein
    act(() => completeFetch?.());

    // Jetzt friert die Kachel auf den frischen Stand 88 ein
    expect(screen.getByTestId('crm-fetch-val')).toHaveTextContent('88');
  });
});
