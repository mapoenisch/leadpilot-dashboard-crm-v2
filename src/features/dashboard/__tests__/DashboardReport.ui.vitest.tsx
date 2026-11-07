import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DashboardReportModal,
  type ReportExportConfig,
} from '../components/export/DashboardReportModal';
import { DashboardPrintView } from '../components/export/DashboardPrintView';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import type { TileDataHook } from '../components/LazyDashboardTile';

const MOCK_TILES: readonly DashboardTileConfig[] = [
  {
    tileId: 'tile-arr',
    catalogId: 'baseline.arr',
    view: 'zahl',
    size: 'klein',
    title: 'Jährlich wiederkehrender Umsatz',
    filterMode: 'dashboard',
  },
  {
    tileId: 'tile-mrr',
    catalogId: 'baseline.mrr',
    view: 'zahl',
    size: 'klein',
    title: 'Monatlicher Umsatz (MRR)',
    filterMode: 'dashboard',
  },
  {
    tileId: 'tile-kunden',
    catalogId: 'baseline.kunden',
    view: 'zahl',
    size: 'klein',
    title: 'Aktive Kunden',
    filterMode: 'dashboard',
  },
];

describe('DashboardReportModal', () => {
  it('rendert den Konfigurationsdialog mit Standardwerten und allen Kacheln', () => {
    const onClose = vi.fn();
    const onConfirmPrint = vi.fn();

    render(
      <DashboardReportModal
        open={true}
        onClose={onClose}
        tiles={MOCK_TILES}
        onConfirmPrint={onConfirmPrint}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Bericht exportieren & drucken')).toBeInTheDocument();
    expect(screen.getByTestId('report-title-input')).toHaveValue(
      'LeadPilot Executive Management Briefing',
    );
    expect(screen.getByText(/3 von 3 Kacheln ausgewählt/i)).toBeInTheDocument();
    expect(screen.getByTestId('print-submit-btn')).toBeEnabled();
  });

  it('erlaubt das Anpassen von Titel, Kommentar und Seitenformat', async () => {
    const user = userEvent.setup();
    const onConfirmPrint = vi.fn();

    render(
      <DashboardReportModal
        open={true}
        onClose={vi.fn()}
        tiles={MOCK_TILES}
        onConfirmPrint={onConfirmPrint}
      />,
    );

    const titleInput = screen.getByTestId('report-title-input');
    fireEvent.change(titleInput, { target: { value: 'Vorstands-Update Q4' } });

    const commentInput = screen.getByTestId('report-commentary-input');
    fireEvent.change(commentInput, {
      target: { value: 'Solides ARR-Wachstum im vierten Quartal.' },
    });

    const landscapeRadio = screen.getByRole('radio', { name: /Querformat/i });
    await user.click(landscapeRadio);

    await user.click(screen.getByTestId('print-submit-btn'));

    expect(onConfirmPrint).toHaveBeenCalledTimes(1);
    const payload: ReportExportConfig = onConfirmPrint.mock.calls[0]![0];
    expect(payload.title).toBe('Vorstands-Update Q4');
    expect(payload.commentary).toBe('Solides ARR-Wachstum im vierten Quartal.');
    expect(payload.orientation).toBe('landscape');
    expect(payload.includeAppendix).toBe(true);
    expect(payload.selectedTileIds).toEqual(['tile-arr', 'tile-mrr', 'tile-kunden']);
  });

  it('unterstützt Kachelabwahl und deaktiviert Drucken bei 0 gewählten Kacheln', async () => {
    const user = userEvent.setup();
    const onConfirmPrint = vi.fn();

    render(
      <DashboardReportModal
        open={true}
        onClose={vi.fn()}
        tiles={MOCK_TILES}
        onConfirmPrint={onConfirmPrint}
      />,
    );

    const deselectAllBtn = screen.getByRole('button', { name: /Alle abwählen/i });
    await user.click(deselectAllBtn);

    expect(screen.getByText(/0 von 3 Kacheln ausgewählt/i)).toBeInTheDocument();
    expect(screen.getByTestId('print-submit-btn')).toBeDisabled();

    const selectAllBtn = screen.getByRole('button', { name: /Alle wählen/i });
    await user.click(selectAllBtn);

    expect(screen.getByText(/3 von 3 Kacheln ausgewählt/i)).toBeInTheDocument();
    expect(screen.getByTestId('print-submit-btn')).toBeEnabled();
  });

  it('synchronisiert die Auswahl beim Öffnen anhand der aktuellen Kacheln', () => {
    const { rerender } = render(
      <DashboardReportModal
        open={false}
        onClose={vi.fn()}
        tiles={MOCK_TILES.slice(0, 2)}
        onConfirmPrint={vi.fn()}
      />,
    );

    rerender(
      <DashboardReportModal
        open={true}
        onClose={vi.fn()}
        tiles={MOCK_TILES}
        onConfirmPrint={vi.fn()}
      />,
    );
    expect(screen.getByText(/3 von 3 Kacheln ausgewählt/i)).toBeInTheDocument();
  });
});

describe('DashboardPrintView', () => {
  const sampleConfig: ReportExportConfig = {
    title: 'LeadPilot Executive Briefing',
    periodText: 'FY 2025',
    selectedTileIds: ['tile-arr', 'tile-mrr'],
    commentary: 'Einschätzung: Hervorragender Quartalsabschluss.',
    orientation: 'portrait',
    includeAppendix: true,
  };

  it('rendert Deckblatt mit Metadaten, Executive KPIs und Kommentar', () => {
    render(
      <DashboardPrintView
        config={sampleConfig}
        tiles={MOCK_TILES}
        organizationName="Acme Enterprise GmbH"
        isPreview={true}
      />,
    );

    const printView = screen.getByTestId('dashboard-print-view');
    expect(printView).toBeInTheDocument();
    expect(printView).toHaveAttribute('data-preview', 'true');
    expect(printView).toHaveAttribute('data-orientation', 'portrait');

    expect(screen.getByText('LeadPilot Executive Briefing')).toBeInTheDocument();
    expect(screen.getByText('Acme Enterprise GmbH')).toBeInTheDocument();
    expect(screen.getAllByText('FY 2025').length).toBeGreaterThan(0);
    expect(screen.getByText(/Hervorragender Quartalsabschluss/i)).toBeInTheDocument();

    // 4 Executive Summary KPIs
    expect(screen.getByText('ARR (Annual Recurrent Revenue)')).toBeInTheDocument();
    expect(screen.getAllByText('411.840 €').length).toBeGreaterThan(0);
  });

  it('rendert nur die ausgewählten Kacheln und den Tabellen-Anhang', () => {
    render(<DashboardPrintView config={sampleConfig} tiles={MOCK_TILES} isPreview={true} />);

    // Kacheln
    expect(screen.getByTestId('print-tile-tile-arr')).toBeInTheDocument();
    expect(screen.getByTestId('print-tile-tile-mrr')).toBeInTheDocument();
    // Nicht ausgewählte Kachel (tile-kunden) darf nicht in den gedruckten Kacheln erscheinen
    expect(screen.queryByTestId('print-tile-tile-kunden')).not.toBeInTheDocument();

    // Wertetabellen-Anhang
    expect(screen.getByText(/Daten-Anhang \(Detaillierte Wertetabellen\)/i)).toBeInTheDocument();
  });

  it('unterdrückt den Anhang, wenn includeAppendix false ist', () => {
    render(
      <DashboardPrintView
        config={{ ...sampleConfig, includeAppendix: false }}
        tiles={MOCK_TILES}
        isPreview={true}
      />,
    );

    expect(screen.queryByText(/Daten-Anhang/i)).not.toBeInTheDocument();
  });

  it('nutzt dynamische useData-Werte und rendert Zeitreihen im Anhang', () => {
    const mockUseData: TileDataHook = (tile) => {
      if (tile.tileId === 'tile-arr') {
        return {
          catalogId: tile.catalogId,
          state: 'bereit',
          value: 750000,
          unit: '€',
          series: [
            { label: 'Q1', value: 180000 },
            { label: 'Q2', value: 190000 },
          ],
          overview: null,
          timeBasis: 'Aktueller Stand',
          asOf: null,
          origin: { layer: 'crm', module: 'src/domain/x.ts', exportName: 'X' },
          scope: 'organisation',
          effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
        };
      }
      return {
        catalogId: tile.catalogId,
        state: 'bereit',
        value: 42,
        unit: 'Kunden',
        series: null,
        overview: null,
        timeBasis: 'Aktueller Stand',
        asOf: null,
        origin: { layer: 'crm', module: 'src/domain/x.ts', exportName: 'X' },
        scope: 'organisation',
        effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
      };
    };

    render(
      <DashboardPrintView
        config={sampleConfig}
        tiles={MOCK_TILES}
        isPreview={true}
        useData={mockUseData}
      />,
    );

    // Kachelkarte formatiert mit exaktem Wert
    expect(screen.getByText('750.000 €')).toBeInTheDocument();
    // Appendix enthält Zeitreihenpunkte
    expect(screen.getByText(/Q1/i)).toBeInTheDocument();
    expect(screen.getByText('180.000 €')).toBeInTheDocument();
  });
});
