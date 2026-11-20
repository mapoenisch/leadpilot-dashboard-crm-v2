import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InspectorTransformationSection } from '../components/editor/inspector/InspectorTransformationSection';
import type { DashboardTileConfigV2 } from '../model/dashboardConfigV2';
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { TileData } from '../data/dashboardData';

const mockTile: DashboardTileConfigV2 = {
  id: 't-1',
  catalogId: 'baseline.arr',
  title: 'ARR',
  presentation: 'zahl',
  layouts: {
    desktop: { x: 0, y: 0, w: 4, h: 4 },
    mobile: { x: 0, y: 0, w: 1, h: 2 },
  },
};

const mockCatalogEntrySingle: ActiveCatalogEntry = {
  id: 'baseline.arr',
  name: 'ARR',
  category: 'finanzen',
  kind: 'kpi',
  status: 'aktiv',
  source: { layer: 'baseline', module: 'execData.ts', exportName: 'ARR' },
  definition: 'Jährlicher Umsatz',
  unit: 'EUR',
  shape: 'einzelwert',
  aggregation: 'bestand',
  timeMode: 'aktuell',
  timeBasis: 'Stand 2025',
  views: ['zahl'],
  defaultView: 'zahl',
  minSize: 'klein',
  groupings: [],
  filters: [],
  history: { kind: 'fest', reconstructable: 'nein', note: 'Feste Referenzwerte' },
  detailRouteId: 'finanzen',
  access: 'Jeder',
};

const mockCatalogEntryTimeSeries: ActiveCatalogEntry = {
  id: 'crm.phaseneintritte_verlauf',
  name: 'Phaseneintritte je Woche',
  category: 'vertrieb_crm',
  kind: 'kpi',
  status: 'aktiv',
  source: { layer: 'crm', module: 'resolveTimeSeries.ts', exportName: 'fetchTimeSeries' },
  definition: 'Zählung aller Phaseneintritte je Kalenderwoche',
  unit: 'Eintritte',
  shape: 'zeitreihe',
  aggregation: 'fluss',
  timeMode: 'aktuell',
  timeBasis: 'Letzte 12 Wochen (wöchentlich)',
  views: ['linie', 'saeulen', 'tabelle'],
  defaultView: 'linie',
  minSize: 'mittel',
  groupings: [],
  filters: ['pipeline'],
  history: { kind: 'ereignisse', reconstructable: 'nur_fluesse', note: 'CRM Verlauf' },
  detailRouteId: 'vertrieb',
  access: 'Jeder',
};

const mockCurrentData: TileData = {
  catalogId: 'baseline.arr',
  state: 'bereit',
  value: 1234567,
  series: null,
  overview: null,
  unit: 'EUR',
  timeBasis: '31.12.2025',
  asOf: '2026-11-19T20:00:00Z',
  origin: { layer: 'baseline', module: 'test', exportName: 'test' },
  scope: 'organisation',
  effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
};

describe('InspectorTransformationSection (Auftrag 169 / P14a)', () => {
  it('rendert den Abschnitt „Umformen“ mit initialem Zustand', () => {
    const onChange = vi.fn();
    render(
      <InspectorTransformationSection
        selectedTile={mockTile}
        catalogEntry={mockCatalogEntrySingle}
        onChangeTransformations={onChange}
        currentData={mockCurrentData}
      />,
    );

    expect(screen.getByTestId('inspector-transformation-section')).toBeInTheDocument();
    expect(screen.getByText('Umformen')).toBeInTheDocument();
    expect(screen.getByTestId('add-transformation-btn')).toBeInTheDocument();
  });

  it('deaktiviert gleitenden Durchschnitt bei Einzelwert-Kennzahlen mit Grund', () => {
    const onChange = vi.fn();
    render(
      <InspectorTransformationSection
        selectedTile={mockTile}
        catalogEntry={mockCatalogEntrySingle}
        onChangeTransformations={onChange}
      />,
    );

    fireEvent.click(screen.getByTestId('add-transformation-btn'));
    const disabledReason = screen.getByTestId('transformation-disabled-durchschnitt');
    expect(disabledReason).toHaveTextContent('Gesperrt: Nur für Zeitreihen verfügbar.');
  });

  it('fügt Schritt „einheit_umrechnen“ hinzu und ruft onChange auf', () => {
    const onChange = vi.fn();
    render(
      <InspectorTransformationSection
        selectedTile={mockTile}
        catalogEntry={mockCatalogEntrySingle}
        onChangeTransformations={onChange}
      />,
    );

    fireEvent.click(screen.getByTestId('add-transformation-btn'));
    fireEvent.click(screen.getByRole('radio', { name: /Einheit umrechnen/i }));
    fireEvent.click(screen.getByTestId('confirm-add-transformation-btn'));

    expect(onChange).toHaveBeenCalledWith([
      { art: 'einheit_umrechnen', von: 'EUR', zu: 'Tsd. EUR' },
    ]);
  });

  it('zeigt „Alarm möglich“ für Einheit-Umrechnung und entfernt Schritt wieder', () => {
    const tileWithTransform: DashboardTileConfigV2 = {
      ...mockTile,
      query: {
        transformations: [{ art: 'einheit_umrechnen', von: 'EUR', zu: 'Tsd. EUR' }],
      },
    };
    const onChange = vi.fn();
    render(
      <InspectorTransformationSection
        selectedTile={tileWithTransform}
        catalogEntry={mockCatalogEntrySingle}
        onChangeTransformations={onChange}
        currentData={mockCurrentData}
      />,
    );

    const badge = screen.getByTestId('transformation-alarm-badge-0');
    expect(badge).toHaveTextContent('Alarm möglich');

    const preview = screen.getByTestId('transformation-preview');
    expect(preview).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('transformation-remove-0'));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('zeigt Warnung „Der Alarm dieser Kachel wird pausiert.“ wenn Kachel aktiven Alarm hat und gleitender Durchschnitt hinzugefügt wird', () => {
    const tileWithAlarm: DashboardTileConfigV2 = {
      ...mockTile,
      threshold: {
        formatVersion: 2,
        enabled: true,
        art: 'hoch_ist_schlecht',
        warnung: 100,
        kritisch: 200,
        einheit: 'EUR',
      },
      alarm: { status: 'aktiv' },
      query: {
        transformations: [{ art: 'gleitender_durchschnitt', fenster: 5 }],
      },
    };

    const onChange = vi.fn();
    render(
      <InspectorTransformationSection
        selectedTile={tileWithAlarm}
        catalogEntry={mockCatalogEntryTimeSeries}
        onChangeTransformations={onChange}
      />,
    );

    const warning = screen.getByTestId('transformation-alarm-warning');
    expect(warning).toHaveTextContent('Der Alarm dieser Kachel wird pausiert.');
  });
});
