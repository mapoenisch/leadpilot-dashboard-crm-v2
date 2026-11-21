// Auftrag 171 (P15a): Adresse, Intervall und Rotationsliste des Kiosks.
import { describe, expect, it } from 'vitest';
import {
  buildKioskUrl,
  clampKioskInterval,
  KIOSK_INTERVAL_DEFAULT_S,
  parseKioskParams,
  resolveKioskRotation,
} from '../model/kioskParams';
import { markTileDataOffline, offlineMessage } from '../components/kiosk/kioskData';
import type { TileData } from '../data/dashboardData';
import { evaluateThresholdV2 } from '../model/thresholdRuleV2';
import { attachTileStand, readTileStand } from '../time/useTimeControlledData';

describe('parseKioskParams', () => {
  it('liest IDs in Reihenfolge, ohne Dubletten und ohne ungültige Zeichen', () => {
    const p = parseKioskParams('?ids=a1, b2,a1,<x>,c-3_d&intervall=90');
    expect(p.ids).toEqual(['a1', 'b2', 'c-3_d']);
    expect(p.intervalSec).toBe(90);
    expect(p.theme).toBeNull();
  });

  it('begrenzt das Intervall auf 30–600 s und nutzt sonst 60 s', () => {
    expect(parseKioskParams('?intervall=5').intervalSec).toBe(30);
    expect(parseKioskParams('?intervall=9999').intervalSec).toBe(600);
    expect(parseKioskParams('?intervall=abc').intervalSec).toBe(KIOSK_INTERVAL_DEFAULT_S);
    expect(parseKioskParams('').intervalSec).toBe(KIOSK_INTERVAL_DEFAULT_S);
    expect(clampKioskInterval(45.4)).toBe(45);
  });

  it('übersetzt das Theme aus der Adresse', () => {
    expect(parseKioskParams('?theme=hell').theme).toBe('light');
    expect(parseKioskParams('?theme=dunkel').theme).toBe('dark');
    expect(parseKioskParams('?theme=pink').theme).toBeNull();
  });

  it('baut eine Adresse ohne Token oder Zugangsdaten, die wieder gleich gelesen wird', () => {
    const url = buildKioskUrl({ ids: ['a1', 'b2'], intervalSec: 120, theme: 'light' });
    expect(url).toBe('/dashboard/kiosk?ids=a1,b2&intervall=120&theme=hell');
    expect(url).not.toMatch(/token|key|secret/i);
    const back = parseKioskParams(url.slice(url.indexOf('?')));
    expect(back).toEqual({ ids: ['a1', 'b2'], intervalSec: 120, theme: 'light' });
  });
});

describe('resolveKioskRotation', () => {
  const readable = [{ id: 'eigen' }, { id: 'team' }];

  it('überspringt fremde Dashboards und meldet sie', () => {
    expect(resolveKioskRotation(['fremd', 'team', 'eigen'], readable, null)).toEqual({
      ids: ['team', 'eigen'],
      skipped: ['fremd'],
    });
  });

  it('nimmt ohne IDs das aktive, sonst das erste lesbare Dashboard', () => {
    expect(resolveKioskRotation([], readable, 'team').ids).toEqual(['team']);
    expect(resolveKioskRotation([], readable, 'fremd').ids).toEqual(['eigen']);
    expect(resolveKioskRotation([], [], null).ids).toEqual([]);
  });
});

function liveData(overrides: Partial<Extract<TileData, { value: number | null }>> = {}): TileData {
  return {
    catalogId: 'live.angebote',
    state: 'bereit',
    value: 12,
    series: null,
    overview: null,
    unit: 'Anzahl',
    timeBasis: 'live',
    asOf: '2026-11-21T09:00:00.000Z',
    origin: { layer: 'live', module: 'm', exportName: 'e', liveKpiId: 'angebote' },
    scope: 'organisation',
    effectiveFilter: {} as never,
    ...overrides,
  };
}

describe('markTileDataOffline', () => {
  const since = '2026-11-21T09:30:00.000Z';

  it('kennzeichnet Live-/CRM-Werte als veraltet, behält Wert und Messzeitpunkt', () => {
    const source = liveData();
    attachTileStand(source, {
      mode: 'live',
      analysisAt: null,
      observedAt: '2026-11-21T09:00:00.000Z',
      loadedAfterPause: false,
    });
    const marked = markTileDataOffline(source, since);
    expect(marked.state).toBe('veraltet');
    expect(marked).toMatchObject({ value: 12, asOf: '2026-11-21T09:00:00.000Z' });
    expect(marked).toMatchObject({ message: offlineMessage(since) });
    expect(readTileStand(marked)).toEqual(readTileStand(source));
  });

  it('lässt Stammdaten, Ladezustand und nicht verfügbare Kacheln unverändert', () => {
    const baseline = liveData({ origin: { layer: 'baseline', module: 'm', exportName: 'e' } });
    expect(markTileDataOffline(baseline, since)).toBe(baseline);
    const loading = liveData({ state: 'laden' });
    expect(markTileDataOffline(loading, since)).toBe(loading);
    const unavailable: TileData = {
      catalogId: 'x',
      state: 'nicht_verfuegbar',
      reason: 'katalog_unbekannt',
      message: 'x',
    };
    expect(markTileDataOffline(unavailable, since)).toBe(unavailable);
  });

  it('Schwellenwerte bewerten offline gekennzeichnete Werte nicht (Regel aus 166)', () => {
    const marked = markTileDataOffline(liveData({ value: 999 }), since);
    const rule = {
      formatVersion: 2,
      enabled: true,
      art: 'hoch_ist_schlecht',
      einheit: 'Anzahl',
      warnung: 100,
    };
    const result = evaluateThresholdV2(rule, 999, marked.state, 'Anzahl');
    expect(result.stufe).toBe('nicht_bewertet');
  });
});
