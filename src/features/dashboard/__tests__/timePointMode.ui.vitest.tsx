// Auftrag 161 (P10b-2): Kachelanzeige im Modus zeitpunkt.
// puffer/keine-Kacheln zeigen keinen Wert, sondern den Hinweis;
// fest-Kacheln zeigen ihren Wert unverändert mit dem Hinweis 'zeitunabhängiger Wert'.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import type { ResolvedTileData } from '../data/dashboardData';
import { attachTileStand } from '../time/useTimeControlledData';
import { DashboardTile } from '../components/DashboardTile';

const pufferEntry: ActiveCatalogEntry = {
  id: 'live.deal_groesse',
  name: 'Durchschnittliche Deal-Größe',
  category: 'live',
  kind: 'kpi',
  status: 'aktiv',
  definition: 'Durchschnittliches Volumen offener Deals',
  unit: '€',
  shape: 'einzelwert',
  aggregation: 'bestand',
  timeMode: 'live',
  timeBasis: 'Live-Messwert',
  views: ['zahl'],
  defaultView: 'zahl',
  minSize: 'klein',
  groupings: [],
  filters: ['pipeline'],
  detailRouteId: '',
  access: 'alle',
  history: {
    kind: 'puffer',
    reconstructable: 'nein',
    note: 'Nur flüchtiger Ringpuffer im Browser',
  },
  source: { layer: 'live', module: 'live', exportName: 'kpis' },
};

const tileConfig: DashboardTileConfig = {
  tileId: 't-puffer',
  catalogId: 'live.deal_groesse',
  view: 'zahl',
  size: 'klein',
  filterMode: 'fester_stand',
};

describe('Modus zeitpunkt Kachelanzeige (Auftrag 161)', () => {
  it('zeigt für puffer-Kacheln im Modus zeitpunkt keinen Wert, sondern den Hinweis', () => {
    const rawData: ResolvedTileData = {
      catalogId: 'live.deal_groesse',
      state: 'bereit',
      value: 12500,
      series: null,
      overview: null,
      unit: '€',
      timeBasis: 'Live-Messwert',
      asOf: '2026-11-16T14:00:00.000Z',
      origin: { layer: 'live', module: 'live', exportName: 'kpis' },
      scope: 'organisation',
      effectiveFilter: { mode: 'fester_stand', period: null, pipeline: null },
    };

    // Datenstand im Modus zeitpunkt angehängt
    const dataWithStand = attachTileStand(rawData, {
      mode: 'zeitpunkt',
      analysisAt: '2026-10-31T23:00:00.000Z',
      observedAt: '2026-11-16T14:00:00.000Z',
      loadedAfterPause: false,
    });

    render(
      <DashboardTile
        tile={tileConfig}
        entry={pufferEntry}
        data={dataWithStand}
        onShowDetails={() => {}}
      />,
    );

    // Kachel darf keinen heutigen Wert zeigen (2.1 Nr. 2)
    expect(screen.queryAllByText(/12\.500/)).toHaveLength(0);
    // Sondern den Hinweis: Für <Zeitpunkt> ist kein Stand gespeichert
    expect(screen.getByTestId('tile-no-data')).toHaveTextContent(/kein Stand gespeichert/i);
  });

  it('zeigt für fest-Kacheln im Modus zeitpunkt ihren Wert unverändert mit Hinweis zeitunabhängiger Wert', () => {
    const festEntry: ActiveCatalogEntry = {
      ...pufferEntry,
      id: 'finanzen.plan_umsatz',
      name: 'Plan-Umsatz',
      history: {
        kind: 'fest',
        reconstructable: 'nein',
        note: 'Stammdatenwert',
      },
      source: { layer: 'baseline', module: 'finanzen', exportName: 'planUmsatz' },
    };

    const rawData: ResolvedTileData = {
      catalogId: 'finanzen.plan_umsatz',
      state: 'bereit',
      value: 500000,
      series: null,
      overview: null,
      unit: 'EUR',
      timeBasis: 'Jahr 2026',
      asOf: null,
      origin: { layer: 'baseline', module: 'finanzen', exportName: 'planUmsatz' },
      scope: 'stammdaten',
      effectiveFilter: { mode: 'fester_stand', period: null, pipeline: null },
    };

    const dataWithStand = attachTileStand(rawData, {
      mode: 'zeitpunkt',
      analysisAt: '2026-10-31T23:00:00.000Z',
      observedAt: '2026-11-16T14:00:00.000Z',
      loadedAfterPause: false,
    });

    render(
      <DashboardTile
        tile={{
          tileId: 't-fest',
          catalogId: 'finanzen.plan_umsatz',
          view: 'zahl',
          size: 'klein',
          filterMode: 'fester_stand',
        }}
        entry={festEntry}
        data={dataWithStand}
        onShowDetails={() => {}}
      />,
    );

    // Wert bleibt unverändert sichtbar
    expect(screen.getAllByText(/500\.000/)[0]).toBeInTheDocument();
    // Hinweis 'zeitunabhängiger Wert' in Standzeile
    expect(screen.getByTestId('tile-stand-line')).toHaveTextContent(/zeitunabhängiger Wert/i);
  });
});
