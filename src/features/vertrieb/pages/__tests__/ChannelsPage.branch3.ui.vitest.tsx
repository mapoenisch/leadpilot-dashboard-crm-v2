import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChannelsPage } from '../ChannelsPage';
import { KANAELE } from '@/domain/vertriebData';

const origHeaders = [...KANAELE.headers];
const origRows = KANAELE.rows.map((r) => [...r]);
const origLabels = [...KANAELE.chartRoi.labels];
const origDatasets = KANAELE.chartRoi.datasets.map((d) => ({ ...d, data: [...d.data] }));

afterEach(() => {
  KANAELE.headers.splice(0, KANAELE.headers.length, ...origHeaders);
  KANAELE.rows.splice(0, KANAELE.rows.length, ...origRows);
  KANAELE.chartRoi.labels.splice(0, KANAELE.chartRoi.labels.length, ...origLabels);
  KANAELE.chartRoi.datasets.splice(0, KANAELE.chartRoi.datasets.length, ...origDatasets);
});

describe('ChannelsPage (branch3)', () => {
  it('leere Kanaldaten zeigen den Empty-Zustand', () => {
    KANAELE.rows.splice(0, KANAELE.rows.length);
    render(<ChannelsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Kanalperformance' })).toBeInTheDocument();
    expect(screen.getByText('Keine Kanaldaten erfasst.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Kanalvergleich' })).not.toBeInTheDocument();
  });

  it('fehlendes CAC-Dataset nutzt Fallback-Label und Nullwerte', () => {
    KANAELE.chartRoi.datasets.splice(0, KANAELE.chartRoi.datasets.length);
    render(<ChannelsPage />);
    expect(screen.getByText(/mit Anteil, Neukunden und marketing-cac\./)).toBeInTheDocument();
    expect(screen.getByText('Kanalvergleich')).toBeInTheDocument();
    expect(screen.getByText(/Günstigster Kanal ist .* mit 0 Euro/)).toBeInTheDocument();
  });

  it('kurze Zeilen rendern mit leeren Zellen', () => {
    KANAELE.rows.splice(0, KANAELE.rows.length, ['NurKanal'] as unknown as string[]);
    render(<ChannelsPage />);
    expect(screen.getByText('NurKanal')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Kanalvergleich' })).toBeInTheDocument();
  });

  it('fehlende Header nutzen Spalten-Fallbacks', () => {
    KANAELE.headers.splice(0, KANAELE.headers.length);
    render(<ChannelsPage />);
    expect(screen.getByText('Kanal')).toBeInTheDocument();
    expect(screen.getByText('Anteil')).toBeInTheDocument();
    expect(screen.getByText('Neukunden')).toBeInTheDocument();
    expect(screen.getByText('CAC')).toBeInTheDocument();
    expect(screen.getByText('Bewertung')).toBeInTheDocument();
  });

  it('einzelner Kanal ist zugleich günstigster und teuerster', () => {
    const soloRow: string[] = ['Solo', '100 %', '10', '100', '500 €', '5.000 €', 'Top'];
    KANAELE.rows.splice(0, KANAELE.rows.length, soloRow);
    KANAELE.chartRoi.labels.splice(0, KANAELE.chartRoi.labels.length, 'Solo');
    KANAELE.chartRoi.datasets.splice(0, KANAELE.chartRoi.datasets.length, {
      label: 'Marketing-CAC (€)',
      data: [500],
    } as never);
    render(<ChannelsPage />);
    expect(screen.getByText(/Günstigster Kanal ist Solo mit 500 Euro/)).toBeInTheDocument();
    expect(screen.getByText(/teuerster ist Solo mit 500 Euro/)).toBeInTheDocument();
  });
});
