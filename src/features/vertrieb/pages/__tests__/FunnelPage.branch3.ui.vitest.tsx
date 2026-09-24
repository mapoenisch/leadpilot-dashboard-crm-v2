import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FunnelPage } from '../FunnelPage';
import { FUNNEL } from '@/domain/vertriebData';

const origHeaders = [...FUNNEL.headers];
const origRows = FUNNEL.rows.map((r) => [...r]);
const origLabels = [...FUNNEL.chart.labels];
const origDatasets = FUNNEL.chart.datasets.map((d) => ({ ...d, data: [...d.data] }));
const origNote = { ...FUNNEL.note, paragraphs: [...FUNNEL.note.paragraphs] };

afterEach(() => {
  FUNNEL.headers.splice(0, FUNNEL.headers.length, ...origHeaders);
  FUNNEL.rows.splice(0, FUNNEL.rows.length, ...origRows);
  FUNNEL.chart.labels.splice(0, FUNNEL.chart.labels.length, ...origLabels);
  FUNNEL.chart.datasets.splice(0, FUNNEL.chart.datasets.length, ...origDatasets);
  FUNNEL.note.paragraphs.splice(0, FUNNEL.note.paragraphs.length, ...origNote.paragraphs);
});

describe('FunnelPage (branch3)', () => {
  it('leere Funnel-Daten zeigen den Empty-Zustand', () => {
    FUNNEL.rows.splice(0, FUNNEL.rows.length);
    render(<FunnelPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Sales Funnel' })).toBeInTheDocument();
    expect(screen.getByText('Keine Funnel-Daten erfasst.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Trichtertabelle' })).not.toBeInTheDocument();
  });

  it('kurze Zeilen rendern, Summary nutzt leere FY-Fallbacks', () => {
    FUNNEL.rows.splice(0, FUNNEL.rows.length, ['Ministufe', '1', '2'] as unknown as string[]);
    render(<FunnelPage />);
    expect(screen.getByText('Ministufe')).toBeInTheDocument();
    expect(screen.getByText(/Aus.*Leads werden.*MQLs/)).toBeInTheDocument();
  });

  it('ohne Chart-Datasets entfallen die Quartals-Sektionen, Hinweis bleibt', () => {
    FUNNEL.chart.datasets.splice(0, FUNNEL.chart.datasets.length);
    render(<FunnelPage />);
    expect(screen.getByText('Quartalsverlauf je Stufe')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Leads' })).not.toBeInTheDocument();
    expect(screen.getByText(FUNNEL.note.title)).toBeInTheDocument();
  });

  it('leere Hinweis-Absätze rendern nur die Überschrift', () => {
    FUNNEL.note.paragraphs.splice(0, FUNNEL.note.paragraphs.length);
    render(<FunnelPage />);
    expect(screen.getByRole('heading', { level: 2, name: FUNNEL.note.title })).toBeInTheDocument();
    expect(screen.getByText(/Aus .* Leads werden/)).toBeInTheDocument();
  });

  it('kürzere Datenreihen fallen auf Nullwerte zurück', () => {
    FUNNEL.chart.datasets.splice(
      0,
      FUNNEL.chart.datasets.length,
      ...origDatasets.slice(0, 1).map((d) => ({ ...d, data: [7] })),
    );
    render(<FunnelPage />);
    expect(screen.getByRole('region', { name: 'Leads' })).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });

  it('fehlende Header nutzen Spalten-Fallbacks', () => {
    FUNNEL.headers.splice(0, FUNNEL.headers.length);
    const { container } = render(<FunnelPage />);
    const ths = Array.from(container.querySelectorAll('th')).map((t) => t.textContent);
    expect(ths).toEqual(['Stufe', 'Q1', 'Q2', 'Q3', 'Q4', 'FY', 'Schnitt', 'Conversion']);
  });
});
