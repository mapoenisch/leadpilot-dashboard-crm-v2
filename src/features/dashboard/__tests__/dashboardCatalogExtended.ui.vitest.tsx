// Auftrag 078 (Dashboard Teilauftrag 8a): Jede neue Kachel rendert über die echte Kachel mit den
// aufgelösten Stammdaten. Diagramme laden lazy; die Tabelle ist die zugängliche Gegenprobe.
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { DashboardTile } from '../components/DashboardTile';
import { formatTileValue } from '../components/tileFormat';
import { resolveBaseline } from '../data/resolveBaseline';
import { EXTENDED_ENTRIES } from '../model/catalog/extendedEntries';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import { resolveEffectiveFilter } from '../model/dashboardFilters';

const noop = () => {};

describe('Katalogausbau in der Kachel (Auftrag 078)', () => {
  for (const entry of EXTENDED_ENTRIES) {
    const view = entry.kind === 'uebersicht' ? 'uebersicht' : 'tabelle';
    it(`${entry.id} zeigt alle Werte als ${view}`, () => {
      const tile: DashboardTileConfig = {
        tileId: entry.id.replace(/\./g, '_'),
        catalogId: entry.id,
        view,
        size: 'mittel',
        filterMode: 'fester_stand',
      };
      const data = resolveBaseline(entry, resolveEffectiveFilter(tile, entry));
      render(<DashboardTile tile={tile} entry={entry} data={data} onShowDetails={noop} />);
      expect(screen.getByRole('heading', { name: entry.name })).toBeInTheDocument();
      expect(screen.queryByTestId('tile-state-badge')).toBeNull();
      if (view === 'uebersicht') {
        expect(screen.getByTestId('tile-overview')).toBeInTheDocument();
        return;
      }
      const series = data.series ?? [];
      const rows = within(screen.getByTestId('tile-table')).getAllByRole('row').slice(1);
      expect(rows).toHaveLength(series.length);
      expect(rows[0]).toHaveTextContent(series[0]!.label);
      expect(rows[0]).toHaveTextContent(formatTileValue(series[0]!.value, entry.unit, 'exakt'));
    });
  }
});
