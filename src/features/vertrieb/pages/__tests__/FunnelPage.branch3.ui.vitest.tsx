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
    expect(
      screen.getByRole('heading', { level: 1, name: 'Sales Funnel 2025' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Keine Funnel-Daten erfasst.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Trichtertabelle' })).not.toBeInTheDocument();
  });

  it('kurze Zeilen rendern, Summary nutzt leere FY-Fallbacks', () => {
    FUNNEL.rows.splice(0, FUNNEL.rows.length, ['Ministufe', '1', '2'] as unknown as string[]);
    render(<FunnelPage />);
    expect(screen.getByText('Ministufe')).toBeInTheDocument();
    expect(screen.getByText(/Aus.*Leads werden.*MQLs/)).toBeInTheDocument();
  });

  it('ohne Chart-Datasets entfällt die Quartalslegende, Hinweis bleibt', () => {
    FUNNEL.chart.datasets.splice(0, FUNNEL.chart.datasets.length);
    const { container } = render(<FunnelPage />);
    expect(screen.getByRole('figure', { name: 'Quartalsverlauf je Stufe' })).toBeInTheDocument();
    expect(container.querySelectorAll('.pk-legend li')).toHaveLength(0);
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
    const { container } = render(<FunnelPage />);
    const quartale = screen.getByRole('figure', { name: 'Quartalsverlauf je Stufe' });
    // Eine Säule je Quartal, fehlende Werte als Nullhöhe (Mindesthöhe 2 px).
    expect(quartale.querySelectorAll('rect.pk-fill')).toHaveLength(FUNNEL.chart.labels.length);
    expect(container.querySelectorAll('.pk-legend li')).toHaveLength(0);
  });

  it('fehlende Header nutzen Spalten-Fallbacks', () => {
    FUNNEL.headers.splice(0, FUNNEL.headers.length);
    const { container } = render(<FunnelPage />);
    // Nur die sichtbare Trichtertabelle (das Diagramm trägt eine eigene sr-only-Tabelle).
    const ths = Array.from(container.querySelectorAll('.pk-table-wrap th')).map(
      (t) => t.textContent,
    );
    expect(ths).toEqual(['Stufe', 'Q1', 'Q2', 'Q3', 'Q4', 'FY', 'Schnitt', 'Conversion']);
  });
});

// Auftrag 085 / F08: Trichter, Tabelle und Textfassung zeigen dieselben belegten Werte.
describe('FunnelPage – fachliche Wahrheit (Auftrag 085)', () => {
  it('Angebote 56,3 % der SQL in Trichter und Tabelle, nirgends 65 %', () => {
    const { container } = render(<FunnelPage />);
    expect(screen.getAllByText(/56,3 % der SQL/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/37,2 % der MQL/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Win Rate 43,5 %/).length).toBeGreaterThanOrEqual(2);
    expect(container.textContent).not.toMatch(/65(,3)? ?%/);
    expect(container.textContent).not.toMatch(/38 % der MQL/);
  });

  it('jede Trichterstufe trägt ihre eigene Einheit', () => {
    render(<FunnelPage />);
    expect(screen.getByText('108 Angebote')).toBeInTheDocument();
    expect(screen.getByText('47 Neukunden')).toBeInTheDocument();
    expect(screen.queryByText('108 Leads')).toBeNull();
  });
});
