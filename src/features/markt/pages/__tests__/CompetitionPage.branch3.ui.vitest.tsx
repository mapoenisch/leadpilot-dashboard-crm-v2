import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompetitionPage } from '../CompetitionPage';
import { WETTBEWERB, CHART_WETTBEWERB } from '@/domain/marktData';

const origWettHeaders = [...WETTBEWERB.headers];
const origWettRows = WETTBEWERB.rows.map((r) => [...r]);
const origChartLabels = [...CHART_WETTBEWERB.labels];
const origChartDatasets = CHART_WETTBEWERB.datasets.map((d) => ({ ...d, data: [...d.data] }));

afterEach(() => {
  WETTBEWERB.headers.splice(0, WETTBEWERB.headers.length, ...origWettHeaders);
  WETTBEWERB.rows.splice(0, WETTBEWERB.rows.length, ...origWettRows);
  CHART_WETTBEWERB.labels.splice(0, CHART_WETTBEWERB.labels.length, ...origChartLabels);
  CHART_WETTBEWERB.datasets.splice(0, CHART_WETTBEWERB.datasets.length, ...origChartDatasets);
});

describe('CompetitionPage (branch3)', () => {
  it('rendert h1, Anbietervergleich und Marktanteile', () => {
    render(<CompetitionPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Wettbewerbslandschaft' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Anbietervergleich' })).toBeInTheDocument();
    expect(screen.getByText(/führt mit/)).toBeInTheDocument();
  });

  it('leere Wettbewerbsdaten zeigen den Empty-Zustand', () => {
    WETTBEWERB.rows.splice(0, WETTBEWERB.rows.length);
    render(<CompetitionPage />);
    expect(screen.getByText('Keine Wettbewerbsdaten erfasst.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Anbietervergleich' })).not.toBeInTheDocument();
  });

  it('fehlendes Marktanteil-Dataset nutzt Fallback-Titel und Nullwerte', () => {
    CHART_WETTBEWERB.datasets.splice(0, CHART_WETTBEWERB.datasets.length);
    render(<CompetitionPage />);
    expect(screen.getAllByText('Marktanteil').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('0 %').length).toBeGreaterThanOrEqual(1);
  });

  it('kurze Zeilen rendern mit leeren Zellen', () => {
    WETTBEWERB.rows.splice(0, WETTBEWERB.rows.length, ['Solo-Anbieter'] as unknown as string[]);
    render(<CompetitionPage />);
    expect(screen.getByText('Solo-Anbieter')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Anbietervergleich' })).toBeInTheDocument();
  });

  it('fehlende Header nutzen Spalten-Fallbacks', () => {
    WETTBEWERB.headers.splice(0, WETTBEWERB.headers.length);
    render(<CompetitionPage />);
    expect(screen.getByText('Anbieter')).toBeInTheDocument();
    expect(screen.getByText('Marktanteil')).toBeInTheDocument();
    expect(screen.getByText('Fokus')).toBeInTheDocument();
    expect(screen.getByText('Schwachstelle')).toBeInTheDocument();
    expect(screen.getByText('Differenzierung')).toBeInTheDocument();
  });
});
