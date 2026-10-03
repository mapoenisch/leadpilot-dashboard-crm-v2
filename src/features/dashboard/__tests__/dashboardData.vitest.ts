import { describe, expect, it, vi } from 'vitest';
import {
  resolveUnavailableTile,
  type ResolvedTileData,
  type UnavailableTileData,
} from '../data/dashboardData';
import { parseFormattedBaselineNumber, resolveBaseline } from '../data/resolveBaseline';
import { resolveCrm } from '../data/resolveCrm';
import { resolveLive } from '../data/resolveLive';
import { getCatalogEntry, type ActiveCatalogEntry } from '../model/dashboardCatalog';
import { resolveEffectiveFilter } from '../model/dashboardFilters';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import {
  getRoadmapSnapshot,
  getTeamHrSnapshot,
  type FunnelDealSource,
} from '@/domain/executiveCockpitData';
import { CHART_ARR, CHART_MRR, EXEC_KPIS_1 } from '@/domain/execData';
import { createFakeAdapter, makeSnapshot } from '@/services/liveKpi/__tests__/fakes';
import { createLiveKpiStreamStore } from '@/services/liveKpi/liveKpiStreamStore';
import type { ImportedFunnelDeal } from '@/types/crm';

const { getMockOverrides, setMockOverrides } = vi.hoisted(() => {
  let chartArr: unknown = null;
  let execKpis1: unknown = null;
  return {
    getMockOverrides: () => ({ chartArr, execKpis1 }),
    setMockOverrides: (overrides: { chartArr?: unknown; execKpis1?: unknown }) => {
      chartArr = overrides.chartArr ?? null;
      execKpis1 = overrides.execKpis1 ?? null;
    },
  };
});

vi.mock('@/domain/execData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/domain/execData')>();
  return {
    ...actual,
    get CHART_ARR() {
      return (getMockOverrides().chartArr as typeof actual.CHART_ARR) ?? actual.CHART_ARR;
    },
    get EXEC_KPIS_1() {
      return (getMockOverrides().execKpis1 as typeof actual.EXEC_KPIS_1) ?? actual.EXEC_KPIS_1;
    },
  };
});

describe('dashboardData', () => {
  const dummyTile = (catalogId: string, pipeline?: string): DashboardTileConfig => ({
    tileId: 'tile-t',
    catalogId,
    view: 'zahl',
    size: 'klein',
    filterMode: 'dashboard',
    pipeline,
  });

  describe('Unbekannte und inaktive Katalog-IDs', () => {
    it('gibt UnavailableTileData für unbekannte IDs ohne Metadaten zurück', () => {
      const res: UnavailableTileData = resolveUnavailableTile('unbekannt.kpi');
      expect(res.state).toBe('nicht_verfuegbar');
      expect(res.reason).toBe('katalog_unbekannt');
      expect(res.catalogId).toBe('unbekannt.kpi');
      expect(res.message).toBeDefined();
      expect((res as unknown as ResolvedTileData).unit).toBeUndefined();
      expect((res as unknown as ResolvedTileData).timeBasis).toBeUndefined();
      expect((res as unknown as ResolvedTileData).origin).toBeUndefined();
    });

    it('gibt UnavailableTileData für inaktive IDs aus dem Inventar zurück', () => {
      const entry = getCatalogEntry('baseline.erloesmix');
      expect(entry).toBeDefined();
      const res = resolveUnavailableTile(entry!.id, entry);
      expect(res.state).toBe('nicht_verfuegbar');
      expect(res.reason).toBe('katalog_inaktiv');
      expect(res.catalogId).toBe(entry!.id);
      expect((res as unknown as ResolvedTileData).unit).toBeUndefined();
    });
  });

  describe('Baseline-Stammdaten (resolveBaseline)', () => {
    describe('parseFormattedBaselineNumber', () => {
      it('parst Tausenderpunkte, Dezimalkommas, Leerzeichen und Unicode-Minus exakt', () => {
        expect(parseFormattedBaselineNumber('411.840 €')).toBe(411840);
        expect(parseFormattedBaselineNumber('336.000 €')).toBe(336000);
        expect(parseFormattedBaselineNumber('−309.000 €')).toBe(-309000);
        expect(parseFormattedBaselineNumber('66')).toBe(66);
        expect(parseFormattedBaselineNumber('520 €')).toBe(520);
        expect(parseFormattedBaselineNumber('862 €')).toBe(862);
        expect(parseFormattedBaselineNumber('4.447 €')).toBe(4447);
        expect(parseFormattedBaselineNumber('10 FTE')).toBe(10);
        expect(parseFormattedBaselineNumber('-12,50 €')).toBe(-12.5);
      });

      it('liefert null bei ungültigen oder nicht endlichen Strings', () => {
        expect(parseFormattedBaselineNumber('ungültig')).toBeNull();
        expect(parseFormattedBaselineNumber('')).toBeNull();
        expect(parseFormattedBaselineNumber('12,34,56')).toBeNull();
      });
    });

    it('löst alle 8 formatierten Einzelwerte exakt wie spezifiziert auf', () => {
      const expected: Record<string, number> = {
        'baseline.arr': 411840,
        'baseline.umsatz': 336000,
        'baseline.ebitda': -309000,
        'baseline.kunden_aktiv': 66,
        'baseline.arpa': 520,
        'baseline.marketing_cac': 862,
        'baseline.fully_loaded_cac': 4447,
        'baseline.headcount': 10,
      };

      for (const [id, val] of Object.entries(expected)) {
        const entry = getCatalogEntry(id) as ActiveCatalogEntry;
        expect(entry).toBeDefined();
        const tile = dummyTile(id);
        const filter = resolveEffectiveFilter(tile, entry);
        const result = resolveBaseline(entry, filter);

        expect(result.state).toBe('bereit');
        expect(result.value).toBe(val);
        expect(result.series).toBeNull();
        expect(result.overview).toBeNull();
        expect(result.scope).toBe('stammdaten');
        expect(result.origin.layer).toBe('baseline');
      }
    });

    it('meldet Fehler bei unlesbarem Wertstring in Stammdaten', () => {
      const entry = getCatalogEntry('baseline.arr') as ActiveCatalogEntry;
      setMockOverrides({
        execKpis1: [{ label: 'ARR', value: 'nicht lesbar', note: '' }, ...EXEC_KPIS_1.slice(1)],
      });
      try {
        const res = resolveBaseline(entry, resolveEffectiveFilter(dummyTile(entry.id), entry));
        expect(res.state).toBe('fehler');
        expect(res.value).toBeNull();
        expect(res.message).toBe('Wert "nicht lesbar" konnte nicht als Zahl interpretiert werden');
      } finally {
        setMockOverrides({});
      }
    });

    it('löst baseline.arr_verlauf mit genau 8 Paaren aus CHART_ARR auf', () => {
      const entry = getCatalogEntry('baseline.arr_verlauf') as ActiveCatalogEntry;
      const res = resolveBaseline(entry, resolveEffectiveFilter(dummyTile(entry.id), entry));

      expect(res.state).toBe('bereit');
      expect(res.value).toBeNull();
      expect(res.series).toHaveLength(8);
      expect(res.series).toEqual(
        CHART_ARR.labels.map((label, i) => ({ label, value: CHART_ARR.datasets[0]!.data[i]! })),
      );
    });

    it('löst baseline.mrr_paketmix mit genau 3 Paaren aus CHART_MRR auf', () => {
      const entry = getCatalogEntry('baseline.mrr_paketmix') as ActiveCatalogEntry;
      const res = resolveBaseline(entry, resolveEffectiveFilter(dummyTile(entry.id), entry));

      expect(res.state).toBe('bereit');
      expect(res.value).toBeNull();
      expect(res.series).toHaveLength(3);
      expect(res.series).toEqual(
        CHART_MRR.labels.map((label, i) => ({ label, value: CHART_MRR.datasets[0]!.data[i]! })),
      );
    });

    it('löst uebersicht.team_hr und uebersicht.roadmap als typisierten Überblick auf', () => {
      const hrEntry = getCatalogEntry('uebersicht.team_hr') as ActiveCatalogEntry;
      const hrRes = resolveBaseline(
        hrEntry,
        resolveEffectiveFilter(dummyTile(hrEntry.id), hrEntry),
      );
      expect(hrRes.state).toBe('bereit');
      expect(hrRes.overview).toEqual({ kind: 'team_hr', data: getTeamHrSnapshot() });

      const roadEntry = getCatalogEntry('uebersicht.roadmap') as ActiveCatalogEntry;
      const roadRes = resolveBaseline(
        roadEntry,
        resolveEffectiveFilter(dummyTile(roadEntry.id), roadEntry),
      );
      expect(roadRes.state).toBe('bereit');
      expect(roadRes.overview).toEqual({ kind: 'roadmap', data: getRoadmapSnapshot() });
    });

    it('meldet fehler bei ungleichen Längen von Beschriftungen und Werten', () => {
      const entry = getCatalogEntry('baseline.arr_verlauf') as ActiveCatalogEntry;
      setMockOverrides({
        chartArr: {
          ...CHART_ARR,
          labels: ['Q1'],
          datasets: [{ ...CHART_ARR.datasets[0]!, data: [100, 200] }],
        },
      });
      try {
        const res = resolveBaseline(entry, resolveEffectiveFilter(dummyTile(entry.id), entry));
        expect(res.state).toBe('fehler');
        expect(res.series).toBeNull();
        expect(res.message).toBe('Beschriftungen und Datenpunkte stimmen nicht überein');
      } finally {
        setMockOverrides({});
      }
    });
  });

  describe('CRM-Auflösung (resolveCrm)', () => {
    const dealsEntry = getCatalogEntry('crm.pipeline_deals') as ActiveCatalogEntry;
    const volumeEntry = getCatalogEntry('crm.pipeline_volumen') as ActiveCatalogEntry;
    const stagesEntry = getCatalogEntry('crm.pipeline_stufen_volumen') as ActiveCatalogEntry;

    it('liefert keine_daten bei leerer Deal-Liste', async () => {
      const fakeSource: FunnelDealSource = { getImportedFunnelDeals: async () => [] };
      const res = await resolveCrm(
        fakeSource,
        dealsEntry,
        resolveEffectiveFilter(dummyTile(dealsEntry.id), dealsEntry),
      );

      expect(res.state).toBe('keine_daten');
      expect(res.value).toBeNull();
      expect(res.scope).toBe('organisation');
    });

    const makeDeal = (
      id: string,
      amount: number,
      pipeline = 'standard',
      stage = 'Lead',
    ): ImportedFunnelDeal => ({ id, dealName: id, stage, amount, closeDate: '', pipeline });

    it('erhält eine echte 0 als bereit mit value: 0', async () => {
      const fakeSource: FunnelDealSource = {
        getImportedFunnelDeals: async () => [makeDeal('d-1', 0)],
      };
      const res = await resolveCrm(
        fakeSource,
        volumeEntry,
        resolveEffectiveFilter(dummyTile(volumeEntry.id), volumeEntry),
      );

      expect(res.state).toBe('bereit');
      expect(res.value).toBe(0);
    });

    it('filtert Deals nach Pipeline über FilteredFunnelDealSource', async () => {
      const fakeSource: FunnelDealSource = {
        getImportedFunnelDeals: async () => [
          makeDeal('d-1', 1000, 'standard'),
          makeDeal('d-2', 5000, 'enterprise', 'Qualifiziert'),
        ],
      };
      const res = await resolveCrm(
        fakeSource,
        volumeEntry,
        resolveEffectiveFilter(dummyTile(volumeEntry.id, 'enterprise'), volumeEntry),
      );

      expect(res.state).toBe('bereit');
      expect(res.value).toBe(5000);
    });

    it('löst Pipeline-Stufen-Serien auf', async () => {
      const fakeSource: FunnelDealSource = {
        getImportedFunnelDeals: async () => [
          makeDeal('d-1', 3000, 'standard', 'Qualifiziert'),
          makeDeal('d-2', 1000, 'standard', 'Lead'),
        ],
      };
      const res = await resolveCrm(
        fakeSource,
        stagesEntry,
        resolveEffectiveFilter(dummyTile(stagesEntry.id), stagesEntry),
      );

      expect(res.state).toBe('bereit');
      expect(res.series).toHaveLength(2);
      expect(res.series?.[0]?.label).toBe('Qualifiziert');
      expect(res.series?.[0]?.value).toBe(3000);
    });

    it('fängt Exceptions aus der Quelle ab und liefert fehler', async () => {
      const fakeSource: FunnelDealSource = {
        getImportedFunnelDeals: async () => [makeDeal('bad', -500)],
      };

      const res = await resolveCrm(
        fakeSource,
        dealsEntry,
        resolveEffectiveFilter(dummyTile(dealsEntry.id), dealsEntry),
      );
      expect(res.state).toBe('fehler');
      expect(res.message).toBe('CRM-Daten konnten nicht geladen werden');
    });
  });

  describe('Live-Auflösung (resolveLive)', () => {
    const liveArrEntry = getCatalogEntry('live.arr') as ActiveCatalogEntry;
    const liveActivityEntry = getCatalogEntry('uebersicht.live_aktivitaet') as ActiveCatalogEntry;

    it('bildet alle Live-Statuslagen für Einzelkacheln ab', async () => {
      const { adapter, controls } = createFakeAdapter();
      const store = createLiveKpiStreamStore(adapter);
      const filter = resolveEffectiveFilter(dummyTile(liveArrEntry.id), liveArrEntry);

      // 1. Unconfigured
      controls.configured = false;
      expect(resolveLive(store, liveArrEntry, filter).state).toBe('nicht_konfiguriert');
      controls.configured = true;

      // 2. Loading ohne Snapshot
      store.acquire('arr');
      expect(resolveLive(store, liveArrEntry, filter).state).toBe('laden');

      // Feed aktivieren
      controls.feed?.onStatus('live');

      // 3. Live mit Snapshot
      const snap = makeSnapshot('arr', '2025-01-01T12:00:00.000Z', 500000);
      controls.feed?.onEvent(snap);
      const resLive = resolveLive(store, liveArrEntry, filter);
      expect(resLive.state).toBe('bereit');
      expect(resLive.value).toBe(500000);
      expect(resLive.asOf).toBe('2025-01-01T12:00:00.000Z');
      expect(resLive.scope).toBe('organisationsuebergreifend');

      // 4. Degradiert (mit neuerem Timestamp)
      const degSnap = makeSnapshot('arr', '2025-01-01T12:05:00.000Z', 500000);
      degSnap.qualityStatus = 'degraded';
      controls.feed?.onEvent(degSnap);
      const resDeg = resolveLive(store, liveArrEntry, filter);
      expect(resDeg.state).toBe('bereit');
      expect(resDeg.quality).toBe('degradiert');

      // 5. Offline mit Snapshot -> veraltet
      controls.feed?.onStatus('offline');
      const resVeraltet = resolveLive(store, liveArrEntry, filter);
      expect(resVeraltet.state).toBe('veraltet');
      expect(resVeraltet.value).toBe(500000);

      // 6. Error mit Snapshot -> veraltet
      controls.latestImpl = () => Promise.reject(new Error('Netzfehler'));
      await store.refresh('arr').catch(() => {});
      const resVeraltetError = resolveLive(store, liveArrEntry, filter);
      expect(resVeraltetError.state).toBe('veraltet');
    });

    it('liefert offline bzw. fehler ohne vorherigen Wert', async () => {
      const { adapter, controls } = createFakeAdapter();
      const store = createLiveKpiStreamStore(adapter);
      const filter = resolveEffectiveFilter(dummyTile(liveArrEntry.id), liveArrEntry);

      store.acquire('arr');
      controls.feed?.onStatus('offline');
      expect(resolveLive(store, liveArrEntry, filter).state).toBe('offline');

      controls.latestImpl = () => Promise.reject(new Error('Verbindungsfehler'));
      await store.refresh('arr').catch(() => {});
      expect(resolveLive(store, liveArrEntry, filter).state).toBe('fehler');
    });

    it('aggregiert Live-Aktivität für uebersicht.live_aktivitaet', () => {
      const { adapter, controls } = createFakeAdapter();
      const store = createLiveKpiStreamStore(adapter);
      const filter = resolveEffectiveFilter(dummyTile(liveActivityEntry.id), liveActivityEntry);

      // Vorab 0 Snapshots -> keine_daten wenn live
      store.acquire('arr');
      controls.feed?.onStatus('live');
      expect(resolveLive(store, liveActivityEntry, filter).state).toBe('keine_daten');

      // Snapshots für 2 KPIs
      store.acquire('mrr');
      controls.feed?.onEvent(makeSnapshot('arr', '2025-01-01T10:00:00.000Z', 100));
      controls.feed?.onEvent(makeSnapshot('mrr', '2025-01-01T11:00:00.000Z', 200));

      const resLive = resolveLive(store, liveActivityEntry, filter);
      expect(resLive.state).toBe('bereit');
      expect(resLive.overview?.kind).toBe('live_aktivitaet');
      if (resLive.overview?.kind === 'live_aktivitaet') {
        expect(resLive.overview.data).toHaveLength(2);
        expect(resLive.overview.data[0]?.kpiId).toBe('mrr');
        expect(resLive.overview.data[1]?.kpiId).toBe('arr');
      }
    });
  });
});
