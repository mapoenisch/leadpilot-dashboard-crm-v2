// Auftrag 073 (Dashboard Teilauftrag 4): Übersichtskacheln vollständig und ohne interne Begriffe.
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { getRoadmapSnapshot, getTeamHrSnapshot } from '@/domain/executiveCockpitData';
import { TileOverview } from '../components/TileOverview';

describe('TileOverview', () => {
  const live = (i: number, extra: Record<string, unknown> = {}) => ({
    kpiId: i % 2 ? 'arr' : 'mrr',
    value: 10 + i,
    unit: 'EUR',
    occurredAt: `2026-10-04T12:0${i}:00Z`,
    qualityStatus: 'valid' as const,
    ...extra,
  });

  it('zeigt alle aufgelösten Live-Ereignisse, nicht nur sechs', () => {
    const items = Array.from({ length: 10 }, (_, i) => live(i));
    render(<TileOverview overview={{ kind: 'live_aktivitaet', data: items }} />);
    expect(within(screen.getByTestId('tile-overview')).getAllByRole('listitem')).toHaveLength(10);
  });

  it('kennzeichnet degradierte Ereignisse sichtbar und übersetzt count', () => {
    render(
      <TileOverview
        overview={{
          kind: 'live_aktivitaet',
          data: [
            live(1, { unit: 'count', value: 12, qualityStatus: 'degraded' }),
            live(2, { unit: 'count', value: 7 }),
          ],
        }}
      />,
    );
    const rows = within(screen.getByTestId('tile-overview')).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Eingeschränkt');
    expect(rows[1]).not.toHaveTextContent('Eingeschränkt');
    expect(rows[0]).toHaveTextContent('12');
    expect(screen.getByTestId('tile-overview')).not.toHaveTextContent('count');
  });

  it('zeigt in der Teamübersicht Kennzahlen, Struktur und Engpässe', () => {
    const data = getTeamHrSnapshot();
    render(<TileOverview overview={{ kind: 'team_hr', data }} />);
    expect(
      within(screen.getByTestId('tile-overview-metrics')).getAllByRole('listitem'),
    ).toHaveLength(data.metrics.length);
    const structure = screen.getByTestId('tile-overview-structure');
    expect(structure).toHaveTextContent(data.structure.root.role);
    expect(structure).toHaveTextContent(data.structure.total.role);
    expect(within(structure).getAllByRole('listitem')).toHaveLength(
      data.structure.units.length + 2,
    );
    expect(
      within(screen.getByTestId('tile-overview-bottlenecks')).getAllByRole('listitem'),
    ).toHaveLength(data.bottlenecks.length);
  });

  it('zeigt alle Roadmap-Releases', () => {
    const data = getRoadmapSnapshot();
    render(<TileOverview overview={{ kind: 'roadmap', data }} />);
    expect(within(screen.getByTestId('tile-overview')).getAllByRole('listitem')).toHaveLength(
      data.releases.length,
    );
  });
});
