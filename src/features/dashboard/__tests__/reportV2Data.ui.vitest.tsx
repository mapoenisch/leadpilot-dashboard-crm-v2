// Auftrag 172 (Codex-Befunde PR #213): Der V2-Report übernimmt den angezeigten (ggf. eingefrorenen)
// Datenstand der Ansicht (nur bei passendem Kontext), wartet auf Alarmregeln und nennt die Organisation der Sitzung statt fest „LeadPilot GmbH“.

import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import type { ResolvedTileData, TileData } from '../data/dashboardData';
import type { TileDataHook } from '../components/LazyDashboardTile';
import { TimeControlProvider, useTimeControl } from '../time/TimeControlProvider';
import type { TimeControlState } from '../time/timeControl';
import {
  createReportTileDataHook,
  matchesReportContext,
} from '../components/export/reportTileData';
import { attachTileStand } from '../time/useTimeControlledData';
import { DashboardReportV2 } from '../components/export/DashboardReportV2';
import { reportPeriodText, reportTilePeriod } from '../model/reportTileStatus';

const orgState = vi.hoisted(() => ({
  session: null as null | { userId: string; organizationId: string; role: string },
}));
vi.mock('@/auth/organizationContext', () => ({
  useOrganization: () => ({ session: orgState.session, isLoading: false }),
}));
const alarmState = vi.hoisted(() => ({ isRulesLoading: false, isRulesError: false }));
vi.mock('../hooks/useDashboardAlarms', () => ({
  useDashboardAlarms: () => ({ rules: [], ...alarmState }),
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

function Wrapper({
  children,
  shown,
  time,
}: {
  children: ReactNode;
  shown?: TileData;
  time?: TimeControlState;
}) {
  return (
    <TimeControlProvider initialState={time}>
      {shown && <ShownTile id="t_warn" data={shown} />}
      {children}
    </TimeControlProvider>
  );
}

function openAndPrint(useData: TileDataHook, shown?: TileData, time?: TimeControlState) {
  render(
    <Wrapper shown={shown} time={time}>
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

describe('V2-Report: Analysezeitpunkt aus der Zeitsteuerung', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-22T09:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('historischer Zeitpunkt: Kopf nennt den gewählten Zeitpunkt, Erstellung separat', () => {
    openAndPrint(() => ready(1), undefined, {
      mode: 'zeitpunkt',
      analysisAt: '2026-03-15T10:30:00Z',
      resumeToken: 0,
    });
    const at = screen.getByTestId('print-report-analysed-at').textContent ?? '';
    expect(at).toMatch(/^15\.03\.2026.*\(historischer Zeitpunkt\)$/);
    expect(screen.getByTestId('print-report-created-at').textContent).toMatch(/^22\.11\.2026/);
  });

  it('pausiert: Kopf nennt den Pausenbeginn', () => {
    openAndPrint(() => ready(1), undefined, {
      mode: 'pausiert',
      analysisAt: '2026-11-21T18:00:00Z',
      resumeToken: 0,
    });
    expect(screen.getByTestId('print-report-analysed-at').textContent).toMatch(
      /^21\.11\.2026.*\(pausierter Stand\)$/,
    );
  });

  it('live: Analysezeitpunkt ist die Erstellung', () => {
    openAndPrint(() => ready(1));
    expect(screen.getByTestId('print-report-analysed-at').textContent).toBe(
      screen.getByTestId('print-report-created-at').textContent,
    );
  });
});

describe('V2-Report: gespeicherter Stand nur bei passendem Kontext', () => {
  const live = { mode: 'live', analysisAt: null, resumeToken: 0 } as TimeControlState;
  const filter = (pipeline: string | null) =>
    ({ pipeline }) as unknown as ResolvedTileData['effectiveFilter'];

  it('andere Pipeline (z. B. eingeklappte Sektion vor dem Filterwechsel): Quelle gilt', () => {
    const shown = ready(250, { effectiveFilter: filter('standard') });
    const fresh = ready(900, { effectiveFilter: filter('enterprise') });
    expect(matchesReportContext(shown, fresh, live)).toBe(false);
    expect(
      matchesReportContext(shown, ready(900, { effectiveFilter: filter('standard') }), live),
    ).toBe(true);
  });

  it('anderer Zeitkontext (live geladen, jetzt historischer Zeitpunkt): Quelle gilt', () => {
    const shown = attachTileStand(ready(250), {
      mode: 'live',
      analysisAt: null,
      observedAt: null,
      loadedAfterPause: false,
    });
    const zeitpunkt = { mode: 'zeitpunkt', analysisAt: '2026-03-15T10:30:00Z', resumeToken: 0 };
    expect(matchesReportContext(shown, ready(900), zeitpunkt as TimeControlState)).toBe(false);
    expect(matchesReportContext(shown, ready(900), live)).toBe(true);
  });

  it('anderer Analysezeitpunkt: Quelle gilt', () => {
    const shown = attachTileStand(ready(250), {
      mode: 'zeitpunkt',
      analysisAt: '2026-03-01T00:00:00Z',
      observedAt: null,
      loadedAfterPause: false,
    });
    const control = { mode: 'zeitpunkt', analysisAt: '2026-03-15T10:30:00Z', resumeToken: 0 };
    expect(matchesReportContext(shown, ready(900), control as TimeControlState)).toBe(false);
  });
});

describe('V2-Report: Druck wartet auf die Alarmregeln', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    alarmState.isRulesLoading = false;
    alarmState.isRulesError = false;
  });

  it('während die Alarmregeln laden, startet kein Druck; danach schon', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    alarmState.isRulesLoading = true;
    openAndPrint(() => ready(1));
    act(() => vi.advanceTimersByTime(1000));
    expect(print).not.toHaveBeenCalled();
    expect(screen.getByTestId('print-report-alarms-note')).toHaveTextContent('noch nicht geladen');
    print.mockRestore();
  });

  it('ohne laufende Abfrage druckt der Report sofort, ohne Alarmhinweis', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    openAndPrint(() => ready(1));
    act(() => vi.advanceTimersByTime(1000));
    expect(print).toHaveBeenCalled();
    expect(screen.queryByTestId('print-report-alarms-note')).not.toBeInTheDocument();
    print.mockRestore();
  });

  it('fehlgeschlagener Abruf wird im Kopf ausdrücklich vermerkt', () => {
    alarmState.isRulesError = true;
    openAndPrint(() => ready(1));
    expect(screen.getByTestId('print-report-alarms-note')).toHaveTextContent(
      'konnten nicht geladen werden',
    );
  });
});

describe('V2-Report: Berichtszeitraum aus den Kachelabfragen', () => {
  const series = (from: string, to: string) =>
    ready(1, {
      timeSeries: {
        source: 'live_kpi_events',
        resolution: 'tag',
        from,
        to,
        historyStartAt: null,
        points: [],
      },
    });

  it('Zeitreihe: Fenster der Abfrage statt „FY 2025“', () => {
    expect(reportTilePeriod(series('2026-10-23T00:00:00Z', '2026-11-22T00:00:00Z'))).toBe(
      '23.10.2026 – 22.11.2026',
    );
  });

  it('gleicher Zeitraum aller Kacheln: eine Angabe; verschiedene: ausdrücklich je Kachel', () => {
    const a = series('2026-10-23T00:00:00Z', '2026-11-22T00:00:00Z');
    expect(reportPeriodText([a, a])).toBe('23.10.2026 – 22.11.2026');
    expect(reportPeriodText([a, ready(1)])).toBe(
      'Je Kachel verschieden: 23.10.2026 – 22.11.2026; Stand 31.12.2025',
    );
  });

  it('Kopf des Reports übernimmt nicht den V1-Standardtext', () => {
    vi.useFakeTimers();
    openAndPrint(() => series('2026-10-23T00:00:00Z', '2026-11-22T00:00:00Z'));
    const period = screen.getByTestId('print-report-period');
    expect(period).toHaveTextContent('23.10.2026 – 22.11.2026');
    expect(period).not.toHaveTextContent('FY 2025');
    vi.useRealTimers();
  });
});
