// Auftrag 172 (Codex-Befunde PR #213): Der V2-Report übernimmt den angezeigten (ggf. eingefrorenen)
// Datenstand der Ansicht und nennt die Organisation der Sitzung statt fest „LeadPilot GmbH“.

import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import type { ResolvedTileData, TileData } from '../data/dashboardData';
import type { TileDataHook } from '../components/LazyDashboardTile';
import { TimeControlProvider, useTimeControl } from '../time/TimeControlProvider';
import { createReportTileDataHook } from '../components/export/reportTileData';
import { DashboardReportV2 } from '../components/export/DashboardReportV2';

const orgState = vi.hoisted(() => ({
  session: null as null | { userId: string; organizationId: string; role: string },
}));
vi.mock('@/auth/organizationContext', () => ({
  useOrganization: () => ({ session: orgState.session, isLoading: false }),
}));
vi.mock('../hooks/useDashboardAlarms', () => ({
  useDashboardAlarms: () => ({ rules: [] }),
}));

function ready(value: number, over: Partial<ResolvedTileData> = {}): ResolvedTileData {
  return {
    catalogId: 'baseline.arr',
    state: 'bereit',
    value,
    series: null,
    overview: null,
    unit: 'EUR',
    timeBasis: 'Stand 31.12.2025',
    asOf: null,
    origin: { layer: 'baseline', module: 'm', exportName: 'e' },
    scope: 'stammdaten',
    effectiveFilter: { pipeline: null } as ResolvedTileData['effectiveFilter'],
    ...over,
  };
}

const config = {
  version: 2,
  id: 'dash_report',
  title: 'Vorstandsbericht',
  scope: 'personal',
  ownerUserId: 'u',
  organizationId: 'o',
  globalTimeframe: '30d',
  globalPipeline: 'standard',
  tiles: [
    {
      id: 't_warn',
      catalogId: 'baseline.arr',
      title: 'ARR',
      presentation: 'zahl',
      layouts: { desktop: { x: 0, y: 0, w: 6, h: 4 } },
      threshold: {
        formatVersion: 2,
        enabled: true,
        art: 'hoch_ist_schlecht',
        einheit: 'EUR',
        warnung: 200,
        kritisch: 500,
      },
    },
  ],
} as DashboardConfigV2;

/** Simuliert die Canvas-Kachel, die ihren angezeigten Stand in den geteilten Store legt. */
function ShownTile({ id, data }: { id: string; data: TileData }) {
  const { tileDataStore } = useTimeControl();
  useEffect(() => tileDataStore.set(id, data, data), [tileDataStore, id, data]);
  return null;
}

function Wrapper({ children, shown }: { children: ReactNode; shown?: TileData }) {
  return (
    <TimeControlProvider>
      {shown && <ShownTile id="t_warn" data={shown} />}
      {children}
    </TimeControlProvider>
  );
}

function openAndPrint(useData: TileDataHook, shown?: TileData) {
  render(
    <Wrapper shown={shown}>
      <DashboardReportV2 open onClose={vi.fn()} config={config} useData={useData} />
    </Wrapper>,
  );
  fireEvent.click(screen.getByTestId('print-submit-btn'));
}

describe('V2-Report: Datenstand der Ansicht', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    orgState.session = null;
  });
  afterEach(() => vi.useRealTimers());

  it('übernimmt den angezeigten (eingefrorenen) Wert statt des neuen Quellwerts', () => {
    // Ansicht pausiert bei 250 (Warnung), die Quelle liefert inzwischen 900 (kritisch)
    openAndPrint(() => ready(900), ready(250));
    expect(screen.getByTestId('print-tile-threshold-t_warn').textContent).toMatch(/^Warnung: /);
  });

  it('ohne angezeigten Stand (oder noch im Laden) gilt die Quelle', () => {
    const source: TileDataHook = () => ready(900);
    const hook = createReportTileDataHook(source);
    const tile = { tileId: 't_warn', catalogId: 'baseline.arr' } as Parameters<TileDataHook>[0];
    const empty = renderHook(() => hook(tile), {
      wrapper: ({ children }) => <Wrapper>{children}</Wrapper>,
    });
    expect((empty.result.current as ResolvedTileData).value).toBe(900);

    const loading = { ...ready(0), state: 'laden' } as unknown as TileData;
    const pending = renderHook(() => hook(tile), {
      wrapper: ({ children }) => <Wrapper shown={loading}>{children}</Wrapper>,
    });
    expect((pending.result.current as ResolvedTileData).value).toBe(900);
  });
});

describe('V2-Report: Organisation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    orgState.session = null;
  });

  it('nennt die Organisation der Sitzung wie der V1-Report', () => {
    orgState.session = { userId: 'u', organizationId: 'org-77', role: 'admin' };
    openAndPrint(() => ready(1));
    expect(screen.getByTestId('print-report-organisation')).toHaveTextContent(
      'Organisation org-77',
    );
    expect(screen.getByTestId('print-report-organisation')).not.toHaveTextContent('LeadPilot');
  });

  it('ohne Sitzung (Vorschau) bleibt „LeadPilot GmbH“', () => {
    openAndPrint(() => ready(1));
    expect(screen.getByTestId('print-report-organisation')).toHaveTextContent('LeadPilot GmbH');
  });
});
