// Auftrag 077 (Nacharbeit Codex PR #61): Angaben „Filter“ und „Aktualität“ der Kachel-Details.
import { describe, expect, it } from 'vitest';
import type { ResolvedTileData } from '../data/dashboardData';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import { filterText, freshness } from '../components/detail/TileDetailContent';
import { formatPeriod } from '../components/tileFormat';

const PERIOD = { from: '2026-01-01', to: '2026-03-31' };
const REASON = 'Quelle hat kein belegtes Datumsfeld';

const tile = (extra: Partial<DashboardTileConfig> = {}): DashboardTileConfig => ({
  tileId: 'stufen',
  catalogId: 'crm.pipeline_stufen_volumen',
  view: 'balken',
  size: 'mittel',
  filterMode: 'dashboard',
  ...extra,
});

const data = (extra: Partial<ResolvedTileData> = {}): ResolvedTileData =>
  ({
    effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
    origin: { layer: 'crm', module: 'crm', exportName: 'x' },
    asOf: null,
    timeBasis: 'Aktueller Stand der importierten Deals',
    ...extra,
  }) as ResolvedTileData;

describe('filterText', () => {
  it('nennt einen gewählten, aber abgelehnten Zeitraum samt Grund statt „Kein Filter“', () => {
    const resolved = data({
      effectiveFilter: { mode: 'dashboard', period: null, pipeline: null, periodReason: REASON },
    });
    expect(filterText(tile(), resolved, { period: PERIOD })).toBe(
      `Zeitraum ${formatPeriod(PERIOD)} gewählt, nicht angewendet: ${REASON}`,
    );
  });

  it('nennt den eigenen Zeitraum der Kachel und die wirksame Pipeline', () => {
    const resolved = data({
      effectiveFilter: {
        mode: 'eigener_zeitraum',
        period: null,
        pipeline: 'p-1',
        periodReason: REASON,
      },
    });
    expect(filterText(tile({ filterMode: 'eigener_zeitraum', period: PERIOD }), resolved)).toBe(
      `Zeitraum ${formatPeriod(PERIOD)} gewählt, nicht angewendet: ${REASON} · Pipeline p-1`,
    );
  });

  it('bleibt bei festem Stand ohne Auswahl bei „Kein Filter“', () => {
    const resolved = data({
      effectiveFilter: {
        mode: 'fester_stand',
        period: null,
        pipeline: null,
        periodReason: 'Historischer Stand ist fest',
      },
    });
    expect(filterText(tile({ filterMode: 'fester_stand' }), resolved, {})).toBe('Kein Filter');
  });
});

describe('freshness', () => {
  it('nennt für CRM keinen erfundenen festen Stand', () => {
    expect(freshness(data())).toBe('Bei jedem Aufruf aus den importierten CRM-Daten');
    expect(
      freshness(data({ origin: { layer: 'baseline', module: 'm', exportName: 'e' } })),
    ).toMatch(/^Fester Stand der Quelle/);
  });
});
