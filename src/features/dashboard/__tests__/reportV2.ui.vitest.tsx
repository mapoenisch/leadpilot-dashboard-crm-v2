// Auftrag 172 (P15b §2.3): Reportexport V2 – Status als Text, Kopf/Fuß, nur berechtigte Inhalte.
// Kiosk-Drucksperre: KioskBodyStatus.ui.vitest.tsx.

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import type { ResolvedTileData, TileData } from '../data/dashboardData';
import type { TileDataHook } from '../components/LazyDashboardTile';
import {
  reportAlarmNote,
  reportCompareNote,
  reportDataStandBySource,
  reportThresholdStatus,
} from '../model/reportTileStatus';
import {
  DashboardPrintViewV2,
  REPORT_CONFIDENTIAL_NOTE,
} from '../components/export/DashboardPrintViewV2';
import { PrintTileCard } from '../components/export/PrintTileCard';

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

const WARN_RULE = {
  formatVersion: 2,
  enabled: true,
  art: 'hoch_ist_schlecht',
  einheit: 'EUR',
  warnung: 200,
  kritisch: 500,
} as const;

describe('reportThresholdStatus (§2.3 Nr. 7)', () => {
  it('liefert „Warnung: ab 200 EUR“ als Text statt nur Farbe', () => {
    const s = reportThresholdStatus('baseline.arr', WARN_RULE, ready(250));
    expect(s?.stufe).toBe('warnung');
    expect(s?.text).toMatch(/^Warnung: ab 200\sEUR$/);
  });

  it('kritisch, normal und nicht bewertet erscheinen jeweils als Text', () => {
    expect(reportThresholdStatus('baseline.arr', WARN_RULE, ready(900))?.text).toMatch(
      /^Kritisch: ab 500\sEUR$/,
    );
    expect(reportThresholdStatus('baseline.arr', WARN_RULE, ready(10))?.text).toBe(
      'Schwellenwert: im Normalbereich',
    );
    expect(
      reportThresholdStatus('baseline.arr', WARN_RULE, ready(900, { state: 'veraltet' }))?.text,
    ).toBe('Nicht bewertet: Kachel veraltet');
  });

  it('Werte älter als 24 Stunden werden wie in der Ansicht nicht bewertet', () => {
    const old = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
    expect(reportThresholdStatus('baseline.arr', WARN_RULE, ready(900, { asOf: old }))?.text).toBe(
      'Nicht bewertet: Letzter Wert älter als 24 Stunden',
    );
  });

  it('ohne Regel, mit inaktiver Regel oder bei Zeitreihen kein Status', () => {
    expect(reportThresholdStatus('baseline.arr', undefined, ready(1))).toBeNull();
    expect(
      reportThresholdStatus('baseline.arr', { ...WARN_RULE, enabled: false }, ready(900)),
    ).toBeNull();
    expect(reportThresholdStatus('crm.gewonnen_verlauf', WARN_RULE, ready(900))).toBeNull();
  });
});

describe('Alarm-, Vergleichs- und Datenstandsvermerke (§2.3 Nr. 7–8)', () => {
  it('Alarmvermerk nur bei Alarmregel', () => {
    expect(reportAlarmNote('aktiv')).toBe('Alarm aktiv');
    expect(reportAlarmNote('pausiert')).toBe('Alarm pausiert');
    expect(reportAlarmNote(undefined)).toBeNull();
  });

  it('Vergleich, Verknüpfung und Erwartungsband als Fußnote', () => {
    expect(reportCompareNote({ compare: 'vorjahr' })).toBe('Vergleich mit dem Vorjahr');
    expect(
      reportCompareNote({
        compare: 'vorperiode',
        bands: { type: 'percentile_10_90', periodCount: 8 },
      }),
    ).toBe(
      'Vergleich mit der Vorperiode · Erwartungsband 10.–90. Perzentil aus 8 Vergleichsperioden',
    );
    expect(reportCompareNote({})).toBeNull();
  });

  it('Datenstand je Quelle aus den geladenen Kacheldaten', () => {
    const live = ready(1, {
      origin: { layer: 'live', module: 'm', exportName: 'e' },
      asOf: '2026-11-21T10:00:00.000Z',
    });
    const rows = reportDataStandBySource([ready(1), live]);
    expect(rows.map((r) => r.label)).toEqual(['Stammdaten', 'Live-Kennzahlen']);
    expect(rows[0]!.stand).toBe('Stand 31.12.2025');
    expect(rows[1]!.stand).toMatch(/^Stand /);
  });
});

function reportConfig(): DashboardConfigV2 {
  return {
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
        threshold: WARN_RULE,
        query: { metricId: 'baseline.arr', compare: 'vorjahr' },
      },
      {
        id: 't_plain',
        catalogId: 'baseline.mrr',
        title: 'MRR',
        presentation: 'zahl',
        layouts: { desktop: { x: 6, y: 0, w: 6, h: 4 } },
      },
    ],
  } as DashboardConfigV2;
}

describe('DashboardPrintViewV2 (§2.3 Nr. 7–9)', () => {
  function renderReport(useData: TileDataHook) {
    render(
      <DashboardPrintViewV2
        dashboard={reportConfig()}
        report={{
          title: 'Monatsreport',
          periodText: 'November 2026',
          selectedTileIds: [],
          commentary: '',
          orientation: 'portrait',
          includeAppendix: false,
        }}
        useData={useData}
        organizationName="LeadPilot GmbH"
        createdBy="pruefer@example.test"
        alarmStatusByTile={{ t_warn: 'aktiv' }}
        isPreview
      />,
    );
  }

  it('zeigt Status, Alarm und Vergleich je Kachel als Text', () => {
    renderReport((tile) => ready(tile.catalogId === 'baseline.arr' ? 250 : 5));
    expect(screen.getByTestId('print-tile-threshold-t_warn').textContent).toMatch(
      /^Warnung: ab 200\sEUR$/,
    );
    expect(screen.getByTestId('print-tile-alarm-t_warn')).toHaveTextContent('Alarm aktiv');
    expect(screen.getByTestId('print-tile-compare-t_warn')).toHaveTextContent(
      'Vergleich mit dem Vorjahr',
    );
    expect(screen.queryByTestId('print-tile-status-t_plain')).not.toBeInTheDocument();
  });

  it('Kopf nennt Dashboard, Organisation, Analysezeitpunkt, Datenstand und Ersteller; Fuß ist vertraulich', () => {
    renderReport(() => ready(1));
    expect(screen.getByTestId('print-report-dashboard')).toHaveTextContent('Vorstandsbericht');
    expect(screen.getByTestId('print-report-organisation')).toHaveTextContent('LeadPilot GmbH');
    expect(screen.getByTestId('print-report-analysed-at').textContent).toMatch(
      /\d{2}\.\d{2}\.\d{4}/,
    );
    expect(screen.getByTestId('print-report-creator')).toHaveTextContent('pruefer@example.test');
    expect(screen.getByTestId('print-report-stand')).toHaveTextContent(
      'Stammdaten: Stand 31.12.2025',
    );
    expect(screen.getByTestId('print-report-footer')).toHaveTextContent(REPORT_CONFIDENTIAL_NOTE);
  });

  it('fragt nur die Kacheln der Ansicht über den Daten-Hook der Ansicht ab', () => {
    const useData = vi.fn<TileDataHook>(() => ready(1));
    renderReport(useData);
    const ids = new Set(useData.mock.calls.map(([tile]) => tile.catalogId));
    expect([...ids].sort()).toEqual(['baseline.arr', 'baseline.mrr']);
  });
});

describe('V1-Druck unverändert', () => {
  it('PrintTileCard ohne V2-Angaben zeigt keine Status-/Alarmzeile', () => {
    render(
      <PrintTileCard
        tile={{
          tileId: 'v1',
          catalogId: 'baseline.arr',
          view: 'zahl',
          size: 'mittel',
          filterMode: 'dashboard',
        }}
        useData={() => ready(900) as TileData}
      />,
    );
    expect(screen.queryByTestId('print-tile-status-v1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('print-tile-compare-v1')).not.toBeInTheDocument();
  });
});
