import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChannelsPage } from '../ChannelsPage';
import { FunnelPage } from '../FunnelPage';
import { KANAELE, FUNNEL } from '@/domain/vertriebData';

describe('Vertriebs-Pages (branch2)', () => {
  it('ChannelsPage: h1, Kanalzeilen und CAC-Zusammenfassung', () => {
    render(<ChannelsPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Kanalperformance & CAC-Index' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Kanalvergleich' })).toBeInTheDocument();
    for (const row of KANAELE.rows) {
      expect(screen.getAllByText(row[0] ?? '').length).toBeGreaterThanOrEqual(1);
    }
    // Summary nennt günstigsten und teuersten Kanal
    expect(screen.getByText(/Günstigster Kanal ist/)).toBeInTheDocument();
    expect(screen.getByText(/teuerster ist/)).toBeInTheDocument();
    expect(
      screen.getByRole('figure', { name: KANAELE.chartRoi.datasets[0]?.label ?? 'Kanalvergleich' }),
    ).toBeInTheDocument();
  });

  it('FunnelPage: h1, Trichtertabelle, Quartalsreihen und Hinweis', () => {
    render(<FunnelPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Sales Funnel 2025' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Trichtertabelle' })).toBeInTheDocument();
    for (const row of FUNNEL.rows) {
      expect(screen.getAllByText(row[0] ?? '').length).toBeGreaterThanOrEqual(1);
    }
    expect(screen.getByRole('figure', { name: 'Quartalsverlauf je Stufe' })).toBeInTheDocument();
    for (const ds of FUNNEL.chart.datasets) {
      expect(screen.getAllByText(ds.label).length).toBeGreaterThanOrEqual(1);
    }
    expect(screen.getByText(/Aus .* Leads werden/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: FUNNEL.note.title })).toBeInTheDocument();
    for (const absatz of FUNNEL.note.paragraphs) {
      expect(screen.getByText(absatz)).toBeInTheDocument();
    }
  });
});
