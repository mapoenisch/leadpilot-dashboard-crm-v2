import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrganisationScaffold } from '../OrganisationScaffold';
import { HEADCOUNT } from '@/domain/organisationData';

const origLabels = [...(HEADCOUNT.chart?.labels ?? [])];
const origData = [...((HEADCOUNT.chart?.datasets?.[0]?.data as number[]) ?? [])];
const origRows = HEADCOUNT.rows.map((r) => [...r]);

function setChart(labels: string[], data: number[]) {
  HEADCOUNT.chart.labels.splice(0, HEADCOUNT.chart.labels.length, ...labels);
  const ds = HEADCOUNT.chart.datasets?.[0];
  if (ds) (ds.data as number[]).splice(0, (ds.data as number[]).length, ...data);
}

function setRows(rows: string[][]) {
  HEADCOUNT.rows.splice(0, HEADCOUNT.rows.length, ...rows);
}

afterEach(() => {
  setChart(origLabels, origData);
  setRows(origRows);
});

describe('OrganisationScaffold (branch3)', () => {
  it('leere Zeitreihe zeigt Strich-Platzhalter ohne Pfade', () => {
    setChart([], []);
    const { container } = render(<OrganisationScaffold />);
    expect(screen.getByText(/—: — ➔ —: —/)).toBeInTheDocument();
    expect(
      container.querySelector('svg[aria-label="Diagramm: Quartalsweise FTE-Entwicklung"]'),
    ).not.toBeNull();
    expect(container.querySelectorAll('svg path')).toHaveLength(0);
    expect(
      screen.getByText('FUNKTIONALE KAPAZITÄTSBAUSTEINE (FTE ZUM STICHTAG)'),
    ).toBeInTheDocument();
  });

  it('einzelne Funktionszeile blendet den Gesamtbestand aus', () => {
    setRows([['Solo-Team', '2,0 FTE', 'Stabil besetzt']]);
    const { container } = render(<OrganisationScaffold />);
    expect(screen.getByText('Solo-Team')).toBeInTheDocument();
    const region = container.querySelector('[aria-label="Funktionale FTE-Bausteine"]');
    expect(region?.querySelectorAll('article')).toHaveLength(1);
    expect(screen.queryByText(/Gesamtbestand/)).not.toBeInTheDocument();
  });

  it('fehlende und ungültige FTE-Angaben fallen auf Null mit Mindesthöhe zurück', () => {
    setRows([
      ['Leere Rolle', '', 'Noch unbesetzt'],
      ['Komische Rolle', 'n/a', 'Unklare Angabe'],
      ['Volle Rolle', '2,0 FTE', 'Stabil besetzt'],
      ['Gesamtbestand', '4,0 FTE', 'Summe'],
    ]);
    const { container } = render(<OrganisationScaffold />);
    expect(screen.getByText('Leere Rolle')).toBeInTheDocument();
    expect(screen.getByText('Komische Rolle')).toBeInTheDocument();
    const articles = Array.from(
      container.querySelectorAll('[aria-label="Funktionale FTE-Bausteine"] article'),
    );
    expect(articles).toHaveLength(3);
    expect((articles[0] as HTMLElement).style.minHeight).toBe('70px');
    expect((articles[1] as HTMLElement).style.minHeight).toBe('70px');
  });

  it('kritische und normale Bausteine tragen unterschiedliche Hervorhebungen', () => {
    const { container } = render(<OrganisationScaffold />);
    const articles = Array.from(
      container.querySelectorAll('[aria-label="Funktionale FTE-Bausteine"] article'),
    );
    expect(articles.length).toBeGreaterThan(0);
    const highlighted = articles.filter((a) => (a as HTMLElement).className.includes('255,122,61'));
    const normal = articles.filter((a) => !(a as HTMLElement).className.includes('255,122,61'));
    expect(highlighted.length).toBeGreaterThanOrEqual(1);
    expect(normal.length).toBeGreaterThanOrEqual(1);
    const fteSpans = container.querySelectorAll('.font-mono.text-\\[13px\\]');
    expect(fteSpans.length).toBeGreaterThanOrEqual(articles.length);
  });

  it('einzelner Zeitreihenpunkt rendert mit Skalen-Fallback', () => {
    setChart(['Q1 25'], [5.0]);
    render(<OrganisationScaffold />);
    expect(screen.getAllByText('5,0').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Q1 25: 5,0 FTE ➔ Q1 25: 5,0 FTE/)).toBeInTheDocument();
  });
});
