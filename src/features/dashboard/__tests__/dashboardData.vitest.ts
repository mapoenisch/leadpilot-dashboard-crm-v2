import { describe, expect, it, vi } from 'vitest';
import { resolveUnavailableTile, type UnavailableTileData } from '../data/dashboardData';
import { parseFormattedBaselineNumber, resolveBaseline } from '../data/resolveBaseline';
import { resolveCrm } from '../data/resolveCrm';
import { resolveLive } from '../data/resolveLive';
import { getCatalogEntry, type ActiveCatalogEntry } from '../model/dashboardCatalog';
import { resolveEffectiveFilter } from '../model/dashboardFilters';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import { getRoadmapSnapshot, getTeamHrSnapshot } from '@/domain/executiveCockpitData';
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
    });

    it('gibt UnavailableTileData für inaktive IDs aus dem Inventar zurück', () => {
      const entry = getCatalogEntry('baseline.kuendigungsgruende');
      expect(entry).toBeDefined();
      const res = resolveUnavailableTile(entry!.id, entry);
      expect(res.state).toBe('nicht_verfuegbar');
      expect(res.reason).toBe('katalog_inaktiv');
      expect(res.catalogId).toBe(entry!.id);
    });
  });

  describe('Baseline-Stammdaten (resolveBaseline)', () => {
    describe('parseFormattedBaselineNumber', () => {
      it('parst Tausenderpunkte, Dezimalkommas, Leerzeichen und Unicode-Minus exakt', () => {
        const cases: [string, number][] = [
          ['411.840 €', 411840],
          ['336.000 €', 336000],
          ['−309.000 €', -309000],
          ['66', 66],
          ['520 €', 520],
          ['862 €', 862],
          ['4.447 €', 4447],
          ['10 FTE', 10],
          ['-12,50 €', -12.5],
        ];
        cases.forEach(([raw, exp]) => expect(parseFormattedBaselineNumber(raw)).toBe(exp));
      });

      it('liefert null bei ungültigen oder nicht endlichen Strings', () => {
        ['ungültig', '', '.', '€', '12,34,56'].forEach((s) =>
          expect(parseFormattedBaselineNumber(s)).toBeNull(),
        );
      });
    });

    it('löst alle 8 formatierten Einzelwerte exakt wie spezifiziert auf', () => {
      const expected: [string, number][] = [
        ['baseline.arr', 411840],
        ['baseline.umsatz', 336000],
        ['baseline.ebitda', -309000],
        ['baseline.kunden_aktiv', 66],
        ['baseline.arpa', 520],
        ['baseline.marketing_cac', 862],
        ['baseline.fully_loaded_cac', 4447],
        ['baseline.headcount', 10],
      ];

      for (const [id, val] of expected) {
        const entry = getCatalogEntry(id) as ActiveCatalogEntry;
        const result = resolveBaseline(entry, resolveEffectiveFilter(dummyTile(id), entry));
        expect(result.state).toBe('bereit');
        expect(result.value).toBe(val);
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

    it('löst baseline.arr_verlauf und baseline.mrr_paketmix auf', () => {
      const arrEntry = getCatalogEntry('baseline.arr_verlauf') as ActiveCatalogEntry;
      const arrRes = resolveBaseline(
        arrEntry,
        resolveEffectiveFilter(dummyTile(arrEntry.id), arrEntry),
      );
      expect(arrRes.state).toBe('bereit');
      expect(arrRes.series).toEqual(
        CHART_ARR.labels.map((label, i) => ({ label, value: CHART_ARR.datasets[0]!.data[i]! })),
      );

      const mrrEntry = getCatalogEntry('baseline.mrr_paketmix') as ActiveCatalogEntry;
      const mrrRes = resolveBaseline(
        mrrEntry,
        resolveEffectiveFilter(dummyTile(mrrEntry.id), mrrEntry),
      );
      expect(mrrRes.state).toBe('bereit');
      expect(mrrRes.series).toEqual(
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

    it('meldet fehler bei nicht endlichen Zahlen in Datasets', () => {
      const entry = getCatalogEntry('baseline.arr_verlauf') as ActiveCatalogEntry;
      setMockOverrides({
        chartArr: {
          ...CHART_ARR,
          datasets: [{ ...CHART_ARR.datasets[0]!, data: [1, 2, 3, 4, 5, 6, 7, NaN] }],
        },
      });
      try {
        const res = resolveBaseline(entry, resolveEffectiveFilter(dummyTile(entry.id), entry));
        expect(res.state).toBe('fehler');
        expect(res.series).toBeNull();
        expect(res.message).toBe('Werte enthalten keine gültige endliche Zahl');
      } finally {
        setMockOverrides({});
      }
    });
  });

  describe('CRM-Auflösung (resolveCrm)', () => {
    const dealsEntry = getCatalogEntry('crm.pipeline_deals') as ActiveCatalogEntry;
    const volumeEntry = getCatalogEntry('crm.pipeline_volumen') as ActiveCatalogEntry;
    const stagesEntry = getCatalogEntry('crm.pipeline_stufen_volumen') as ActiveCatalogEntry;

    const makeDeal = (
      id: string,
      amount: number,
      pipeline = 'standard',
      stage = 'Lead',
    ): ImportedFunnelDeal => ({ id, dealName: id, stage, amount, closeDate: '', pipeline });

    const runCrm = (
      deals: ImportedFunnelDeal[],
      entry: ActiveCatalogEntry = volumeEntry,
      p?: string,
    ) =>
      resolveCrm(
        { getImportedFunnelDeals: async () => deals },
        entry,
        resolveEffectiveFilter(dummyTile(entry.id, p), entry),
      );

    it('liefert keine_daten bei leerer Deal-Liste', async () => {
      const res = await runCrm([], dealsEntry);
      expect(res.state).toBe('keine_daten');
      expect(res.value).toBeNull();
      expect(res.scope).toBe('organisation');
    });

    it('erhält eine echte 0 als bereit mit value: 0', async () => {
      const res = await runCrm([makeDeal('d-1', 0)]);
      expect(res.state).toBe('bereit');
      expect(res.value).toBe(0);
    });

    it('filtert Deals nach Pipeline über FilteredFunnelDealSource', async () => {
      const res = await runCrm(
        [makeDeal('d-1', 1000, 'standard'), makeDeal('d-2', 5000, 'enterprise', 'Qualifiziert')],
        volumeEntry,
        'enterprise',
      );
      expect(res.state).toBe('bereit');
      expect(res.value).toBe(5000);
    });

    it('löst Pipeline-Stufen-Serien auf', async () => {
      const res = await runCrm(
        [
          makeDeal('d-1', 3000, 'standard', 'Qualifiziert'),
          makeDeal('d-2', 1000, 'standard', 'Lead'),
        ],
        stagesEntry,
      );
      expect(res.state).toBe('bereit');
      expect(res.series).toHaveLength(2);
      expect(res.series?.[0]?.label).toBe('Qualifiziert');
      expect(res.series?.[0]?.value).toBe(3000);
    });

    it('fängt Exceptions aus der Quelle ab und liefert fehler', async () => {
      const res = await runCrm([makeDeal('bad', -500)], dealsEntry);
      expect(res.state).toBe('fehler');
      expect(res.message).toBe('CRM-Daten konnten nicht geladen werden');
    });

    it('lehnt Stufenwerte mit nicht endlichen Zahlen ab', async () => {
      const res = await runCrm([makeDeal('d-inf', Infinity)], stagesEntry);
      expect(res.state).toBe('fehler');
      expect(res.message).toBe('Stufenwerte enthalten keine gültige endliche Zahl');
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

      // Offline & Fehler ohne Snapshot
      controls.feed?.onStatus('offline');
      expect(resolveLive(store, liveArrEntry, filter).state).toBe('offline');
      controls.latestImpl = () => Promise.reject(new Error('Fehler'));
      await store.refresh('arr').catch(() => {});
      expect(resolveLive(store, liveArrEntry, filter).state).toBe('fehler');

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

    it('lehnt nicht endliche Live-Werte ab und liefert fehler', () => {
      const { adapter, controls } = createFakeAdapter();
      const store = createLiveKpiStreamStore(adapter);
      const filter = resolveEffectiveFilter(dummyTile(liveArrEntry.id), liveArrEntry);
      store.acquire('arr');
      controls.feed?.onStatus('live');
      controls.feed?.onEvent(makeSnapshot('arr', '2025-01-01T12:00:00.000Z', Infinity));

      const res = resolveLive(store, liveArrEntry, filter);
      expect(res.state).toBe('fehler');
      expect(res.value).toBeNull();
      expect(res.message).toBe('Wert ist keine endliche Zahl');
    });

    it('aggregiert Live-Aktivität für uebersicht.live_aktivitaet', () => {
      const { adapter, controls } = createFakeAdapter();
      const store = createLiveKpiStreamStore(adapter);
      const filter = resolveEffectiveFilter(dummyTile(liveActivityEntry.id), liveActivityEntry);

      store.acquire('arr');
      controls.feed?.onStatus('live');
      expect(resolveLive(store, liveActivityEntry, filter).state).toBe('keine_daten');

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

    it('lehnt nicht endliche Werte in Live-Aktivität ab und liefert fehler', () => {
      const { adapter, controls } = createFakeAdapter();
      const store = createLiveKpiStreamStore(adapter);
      const filter = resolveEffectiveFilter(dummyTile(liveActivityEntry.id), liveActivityEntry);
      store.acquire('arr');
      controls.feed?.onStatus('live');
      controls.feed?.onEvent(makeSnapshot('arr', '2025-01-01T10:00:00.000Z', NaN));
      const res = resolveLive(store, liveActivityEntry, filter);
      expect(res.state).toBe('fehler');
      expect(res.overview).toBeNull();
      expect(res.message).toBe('Aktivitätswerte enthalten keine gültige endliche Zahl');
    });
  });
});
