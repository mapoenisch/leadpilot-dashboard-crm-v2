import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardPrintView } from '../components/export/DashboardPrintView';
import { DashboardReportModal } from '../components/export/DashboardReportModal';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import type { TileDataHook } from '../components/LazyDashboardTile';
import type { ReportExportConfig } from '../components/export/DashboardReportModal';

const TILES: readonly DashboardTileConfig[] = [
  {
    tileId: 'tile-live-mrr',
    catalogId: 'live.mrr',
    view: 'zahl',
    size: 'klein',
    title: 'Live MRR',
    filterMode: 'dashboard',
  },
];

describe('DashboardReport Veraltete Live-Werte & Auswahl-Sync (Auftrag 132 Runde 4)', () => {
  const config: ReportExportConfig = {
    title: 'Executive Briefing',
    periodText: 'FY 2025',
    selectedTileIds: ['tile-live-mrr'],
    commentary: '',
    orientation: 'portrait',
    includeAppendix: true,
  };

  it('kennzeichnet veraltete Live-Werte samt ursprünglichem Messzeitpunkt auf Kachel und im Anhang', () => {
    const mockVeraltetHook: TileDataHook = (tile) => ({
      catalogId: tile.catalogId,
      state: 'veraltet',
      value: 196400,
      unit: 'EUR',
      series: null,
      overview: null,
      timeBasis: 'Operative Live-Pipeline',
      asOf: '2026-10-04T12:05:00Z',
      origin: { layer: 'live', module: 'src/hooks/useLiveKpis.ts', exportName: 'useLiveKpis' },
      scope: 'organisation',
      effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
    });

    render(
      <DashboardPrintView
        config={config}
        tiles={TILES}
        isPreview={true}
        useData={mockVeraltetHook}
      />,
    );

    // Kachelkarte: Veraltet-Badge und Messzeitpunkt-Hinweis
    expect(screen.getByTestId('print-tile-veraltet-tile-live-mrr')).toHaveTextContent('Veraltet');
    expect(screen.getByText(/Wert veraltet\. Stand 04\.10\.2026, 14:05\./i)).toBeInTheDocument();
    expect(screen.getAllByText(/196\.400 EUR/).length).toBe(2);

    // Tabellen-Anhang: Spalte Zeitbasis enthält Veraltet und den ursprünglichen Stand
    const veraltetElements = screen.getAllByText(/Veraltet \(Stand 04\.10\.2026, 14:05\)/i);
    expect(veraltetElements.length).toBeGreaterThanOrEqual(1);
    expect(veraltetElements[0]).toHaveClass('text-amber-800');

    // Tabellen-Anhang: Fußnote verweist auf gesondert gekennzeichnete veraltete Live-Stände
    expect(
      screen.getByText(/Live-Werte mit Verbindungsabbruch sind gesondert als veraltet/i),
    ).toBeInTheDocument();
  });

  it('synchronisiert die Modal-Auswahl beim Eintreffen einer persönlichen Kachelkonfiguration', () => {
    const initialDefaultTiles: readonly DashboardTileConfig[] = [
      {
        tileId: 'default-1',
        catalogId: 'baseline.arr',
        view: 'zahl',
        size: 'klein',
        title: 'Default ARR',
        filterMode: 'dashboard',
      },
    ];

    const personalTiles: readonly DashboardTileConfig[] = [
      {
        tileId: 'custom-1',
        catalogId: 'crm.pipeline',
        view: 'zahl',
        size: 'klein',
        title: 'Custom Pipeline',
        filterMode: 'dashboard',
      },
      {
        tileId: 'custom-2',
        catalogId: 'live.mrr',
        view: 'zahl',
        size: 'klein',
        title: 'Custom Live',
        filterMode: 'dashboard',
      },
    ];

    const { rerender } = render(
      <DashboardReportModal
        open={true}
        onClose={vi.fn()}
        tiles={initialDefaultTiles}
        onConfirmPrint={vi.fn()}
      />,
    );

    expect(screen.getByText(/1 von 1 Kacheln ausgewählt/i)).toBeInTheDocument();

    // Geladene persönliche Ansicht ersetzt Default-Kacheln
    rerender(
      <DashboardReportModal
        open={true}
        onClose={vi.fn()}
        tiles={personalTiles}
        onConfirmPrint={vi.fn()}
      />,
    );

    // Auswahl wurde auf die neuen gültigen Kacheln synchronisiert
    expect(screen.getByText(/2 von 2 Kacheln ausgewählt/i)).toBeInTheDocument();
    expect(screen.getByTestId('print-submit-btn')).toBeEnabled();
  });

  it('weist abgelehnte Pipeline-Filter bei Nicht-CRM-Kacheln als unwirksam aus', () => {
    const baselineTile: DashboardTileConfig = {
      tileId: 'tile-arr',
      catalogId: 'baseline.arr',
      view: 'zahl',
      size: 'klein',
      title: 'ARR Baseline',
      filterMode: 'dashboard',
    };

    const mockHook: TileDataHook = (tile) => ({
      catalogId: tile.catalogId,
      state: 'bereit',
      value: 411840,
      unit: '€',
      series: null,
      overview: null,
      timeBasis: 'FY 2025',
      asOf: null,
      origin: { layer: 'baseline', module: 'src/domain/x.ts', exportName: 'X' },
      scope: 'stammdaten',
      effectiveFilter: {
        mode: 'dashboard',
        period: null,
        pipeline: null,
        pipelineReason: 'Nur CRM-Quellen unterstützen den Pipeline-Filter',
      },
    });

    render(
      <DashboardPrintView
        config={{
          ...config,
          selectedTileIds: ['tile-arr'],
        }}
        tiles={[baselineTile]}
        filters={{ pipeline: 'Enterprise' }}
        isPreview={true}
        useData={mockHook}
      />,
    );

    // Kachel: Unwirksamkeit wird explizit ausgewiesen
    expect(screen.getByTestId('print-tile-filter-tile-arr')).toHaveTextContent(
      'Filter: Zentral · Pipeline: Unwirksam (nur CRM)',
    );
    // Anhang: Spalte Pipeline weist "Unwirksam (nur CRM)" aus statt des Filters
    expect(screen.getByText('Unwirksam (nur CRM)')).toBeInTheDocument();
  });

  it('kennzeichnet eingeschränkte Datenqualität (quality: degradiert) auf Kachel und im Anhang', () => {
    const mockDegradedHook: TileDataHook = (tile) => ({
      catalogId: tile.catalogId,
      state: 'bereit',
      value: 3.24,
      unit: 'count',
      series: null,
      overview: null,
      timeBasis: 'Live-Stream',
      asOf: '2026-10-04T12:05:00Z',
      origin: { layer: 'live', module: 'src/hooks/useLiveKpis.ts', exportName: 'useLiveKpis' },
      scope: 'organisationsuebergreifend',
      quality: 'degradiert',
      effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
    });

    render(
      <DashboardPrintView
        config={config}
        tiles={TILES}
        isPreview={true}
        useData={mockDegradedHook}
      />,
    );

    // Kachel: Eingeschränkt-Badge und Hinweis
    expect(screen.getByTestId('print-tile-degradiert-tile-live-mrr')).toHaveTextContent(
      'Eingeschränkt',
    );
    expect(screen.getByText(/Eingeschränkte Datenqualität laut Quelle\./i)).toBeInTheDocument();
    // Anhang: Vermerk
    expect(screen.getByText('Eingeschränkte Qualität')).toBeInTheDocument();
  });

  it('kennzeichnet organisationsübergreifende Live-Kacheln auf Deckblatt, Kachel und im Anhang', () => {
    const mockLiveHook: TileDataHook = (tile) => ({
      catalogId: tile.catalogId,
      state: 'bereit',
      value: 125,
      unit: 'count',
      series: null,
      overview: null,
      timeBasis: 'Live-Stream',
      asOf: null,
      origin: { layer: 'live', module: 'src/hooks/useLiveKpis.ts', exportName: 'useLiveKpis' },
      scope: 'organisationsuebergreifend',
      effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
    });

    render(
      <DashboardPrintView
        config={config}
        tiles={TILES}
        organizationName="Musterfirma AG"
        isPreview={true}
        useData={mockLiveHook}
      />,
    );

    // Deckblatt: Mandant mit Hinweis auf organisationsweite Feeds
    expect(screen.getByTestId('print-cover-scope-note')).toHaveTextContent(
      '(inkl. organisationsweiter Live-Feeds)',
    );
    // Kachel: Scope-Badge und erklärender Text
    expect(screen.getByTestId('print-tile-scope-tile-live-mrr')).toHaveTextContent(
      'Organisationsweit',
    );
    expect(
      screen.getByText(
        /Live-Feed: Gilt für alle Organisationen \(nicht nach Mandant getrennt\)\./i,
      ),
    ).toBeInTheDocument();
    // Anhang & Kachel: Vermerk in Kachel-Badge und in Spalte Datenquelle
    expect(screen.getAllByText('Organisationsweit').length).toBe(2);
  });
});
