// Auftrag 070 (Dashboard Teilauftrag 1): Katalogregeln und Quellennachweis gegen die echten Module.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_ROUTES } from '@/app/routes';
import * as execData from '@/domain/execData';
import * as executiveCockpitData from '@/domain/executiveCockpitData';
import * as finanzenData from '@/domain/finanzenData';
import * as geschaeftsmodellData from '@/domain/geschaeftsmodellData';
import * as kundenData from '@/domain/kundenData';
import * as marktData from '@/domain/marktData';
import * as navData from '@/domain/navData';
import * as organisationData from '@/domain/organisationData';
import * as produktData from '@/domain/produktData';
import * as projektkontextData from '@/domain/projektkontextData';
import * as rechtData from '@/domain/rechtData';
import * as strategieData from '@/domain/strategieData';
import * as unternehmenData from '@/domain/unternehmenData';
import * as vertriebData from '@/domain/vertriebData';
import { LIVE_KPI_DEFINITIONS } from '@/services/liveKpi/liveKpiDefinitions';
import {
  DASHBOARD_CATALOG,
  PIE_VIEWS,
  getActiveEntries,
  getCatalogEntry,
} from '../model/dashboardCatalog';
import type { ActiveCatalogEntry, CatalogEntry } from '../model/dashboardCatalog';
import { validateCatalog } from '../model/dashboardValidation';

const DOMAIN_MODULES: Record<string, Record<string, unknown>> = {
  'src/domain/execData.ts': execData,
  'src/domain/executiveCockpitData.ts': executiveCockpitData,
  'src/domain/finanzenData.ts': finanzenData,
  'src/domain/geschaeftsmodellData.ts': geschaeftsmodellData,
  'src/domain/kundenData.ts': kundenData,
  'src/domain/marktData.ts': marktData,
  'src/domain/navData.ts': navData,
  'src/domain/organisationData.ts': organisationData,
  'src/domain/produktData.ts': produktData,
  'src/domain/projektkontextData.ts': projektkontextData,
  'src/domain/rechtData.ts': rechtData,
  'src/domain/strategieData.ts': strategieData,
  'src/domain/unternehmenData.ts': unternehmenData,
  'src/domain/vertriebData.ts': vertriebData,
};

const ROOT = path.resolve(__dirname, '../../../..');

function resolvePath(value: unknown, keys: readonly (string | number)[] = []): unknown {
  return keys.reduce<unknown>(
    (current, key) =>
      current !== null && typeof current === 'object'
        ? (current as Record<string | number, unknown>)[key]
        : undefined,
    value,
  );
}

/** Wie executiveCockpitData: „411.840 €“ → 411840, „−309.000 €“ → −309000. */
const parseDe = (text: string) => {
  const digits = Number(text.replace(/[^\d]/g, ''));
  return /[−-]/.test(text) ? -digits : digits;
};

/** Rohwerte laut docs/dashboard/KPI_CATALOG.md; jeder aktive Baseline-Wert wird hier belegt. */
const EXPECTED_RAW: Record<string, number | readonly number[]> = {
  'baseline.arr': 411840,
  'baseline.umsatz': 336000,
  'baseline.ebitda': -309000,
  'baseline.kunden_aktiv': 66,
  'baseline.arpa': 520,
  'baseline.marketing_cac': 862,
  'baseline.fully_loaded_cac': 4447,
  'baseline.headcount': 10,
  'baseline.arr_verlauf': [120000, 145000, 170000, 207792, 248472, 294588, 348840, 411840],
  'baseline.mrr_paketmix': [10045, 19580, 4695],
};

const active = getActiveEntries();
const byId = (id: string) => getCatalogEntry(id) as ActiveCatalogEntry;

describe('Dashboard-Katalog', () => {
  it('besteht die eigene Katalogprüfung ohne Befund', () => {
    expect(validateCatalog(DASHBOARD_CATALOG)).toEqual([]);
  });

  it('hat eindeutige IDs mit Ebenenpräfix', () => {
    const ids = DASHBOARD_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(byId('baseline.arr').source.layer).toBe('baseline');
    expect(byId('live.arr').source.layer).toBe('live');
  });

  it('aktiviert genau die erste Auswahl des Plans', () => {
    const count = (prefix: string) => active.filter((e) => e.id.startsWith(prefix)).length;
    expect(count('baseline.')).toBe(10);
    expect(count('crm.')).toBe(5);
    expect(count('live.')).toBe(12);
    expect(active.filter((e) => e.kind === 'uebersicht').map((e) => e.id)).toEqual([
      'uebersicht.team_hr',
      'uebersicht.roadmap',
      'uebersicht.live_aktivitaet',
    ]);
  });

  it('führt alle 12 Live-IDs und keine weiteren', () => {
    const liveIds = active.filter((e) => e.kind === 'kpi' && e.source.layer === 'live');
    expect(liveIds.map((e) => e.source.liveKpiId).sort()).toEqual(
      LIVE_KPI_DEFINITIONS.map((definition) => definition.id).sort(),
    );
  });

  it('führt Live-Kacheln auf den Store als Wertquelle, die Definitionen nur als Metadaten', () => {
    const live = active.filter((e) => e.kind === 'kpi' && e.source.layer === 'live');
    for (const entry of live) {
      expect(entry.source.module, entry.id).toBe('src/services/liveKpi/liveKpiStreamStore.ts');
      expect(entry.source.exportName, entry.id).toBe('liveKpiStreamStore');
      expect(entry.source.metadata?.exportName, entry.id).toBe('LIVE_KPI_DEFINITIONS');
      expect(entry.timeBasis, entry.id).toContain('30 Minuten');
    }
  });

  it('enthält keine Simulations-KPIs', () => {
    for (const entry of DASHBOARD_CATALOG) {
      expect(entry.source.module).not.toMatch(/simulation/i);
      expect(entry.id).not.toMatch(/simulation|szenario|monte/i);
    }
  });

  it('bietet Funnel-Stufen und negative Werte nie als Kreis oder Ring an', () => {
    const guarded = active.filter((e) => e.funnelStages || e.mayBeNegative);
    expect(guarded.map((e) => e.id)).toEqual(['baseline.ebitda', 'crm.pipeline_stufen']);
    for (const entry of guarded) expect(entry.views.some((v) => PIE_VIEWS.includes(v))).toBe(false);
  });

  it('bietet ARR als Einzelwert ohne erfundene Zeitreihe an', () => {
    const arr = byId('baseline.arr');
    expect(arr.shape).toBe('einzelwert');
    expect(arr.views).toEqual(['zahl', 'tabelle']);
    expect(byId('baseline.arr_verlauf').shape).toBe('zeitreihe');
  });

  it('verweist für jede aktive Kachel auf eine vorhandene Fachseite', () => {
    const routeIds = new Set(APP_ROUTES.map((route) => route.id));
    for (const entry of active) expect(routeIds, entry.id).toContain(entry.detailRouteId);
  });

  it('löst jeden aktiven Baseline-Wert aus der Quelle mit dem dokumentierten Rohwert auf', () => {
    const values = active.filter((e) => e.source.layer === 'baseline' && e.kind === 'kpi');
    expect(values.map((e) => e.id).sort()).toEqual(Object.keys(EXPECTED_RAW).sort());
    for (const entry of values) {
      const module = DOMAIN_MODULES[entry.source.module];
      const raw = resolvePath(module?.[entry.source.exportName], entry.source.path);
      const actual = typeof raw === 'string' ? parseDe(raw) : raw;
      expect(actual, entry.id).toEqual(EXPECTED_RAW[entry.id]);
    }
  });

  it('hält den MRR-Paketmix konsistent mit dem ARR (Summe × 12)', () => {
    const mix = EXPECTED_RAW['baseline.mrr_paketmix'] as readonly number[];
    expect(mix.reduce((sum, value) => sum + value, 0) * 12).toBe(EXPECTED_RAW['baseline.arr']);
  });

  it('liefert die CRM-Felder aus getPipelineOverview', async () => {
    const overview = await executiveCockpitData.getPipelineOverview({
      getImportedFunnelDeals: async () => [
        { id: 'd1', dealName: 'A', stage: 'Gewonnen', amount: 100, closeDate: '', pipeline: 'p' },
        { id: 'd2', dealName: 'B', stage: 'Angebot', amount: 50, closeDate: '', pipeline: 'p' },
      ],
    });
    for (const entry of active.filter((e) => e.source.layer === 'crm')) {
      expect(entry.source.exportName).toBe('getPipelineOverview');
      expect(resolvePath(overview, entry.source.path), entry.id).toBeDefined();
    }
    expect(overview.wonVolume).toBe(100);
    expect(overview.openVolume).toBe(50);
  });

  it('löst die Übersichtskacheln aus ihren Quellfunktionen auf', () => {
    expect(executiveCockpitData.getTeamHrSnapshot().structure.units.length).toBeGreaterThan(0);
    expect(executiveCockpitData.getRoadmapSnapshot().releases.length).toBeGreaterThan(0);
  });

  it('findet für jeden Eintrag Modul und Export im Repo', () => {
    for (const entry of DASHBOARD_CATALOG) {
      const file = path.join(ROOT, entry.source.module);
      expect(fs.existsSync(file), `${entry.id}: ${entry.source.module}`).toBe(true);
      const exportPattern = new RegExp(
        `export (async )?(const|function) ${entry.source.exportName}\\b`,
      );
      expect(fs.readFileSync(file, 'utf8'), entry.id).toMatch(exportPattern);
      const module = DOMAIN_MODULES[entry.source.module];
      // CRM-Pfade zeigen in das Funktionsergebnis; das prüft der CRM-Test.
      if (module && entry.source.path && entry.source.layer === 'baseline') {
        expect(
          resolvePath(module[entry.source.exportName], entry.source.path),
          entry.id,
        ).toBeDefined();
      }
    }
  });

  it('prüft die Gesellschafteranteile ohne Summenzeile auf exakt 100 %', () => {
    const rows = rechtData.GESELLSCHAFTER.rows.filter(([name]) => name !== 'Gesamt');
    expect(rows).toHaveLength(5);
    const tenths = rows.map(([, , share]) =>
      Math.round(Number(share?.replace(/[^\d,]/g, '').replace(',', '.')) * 10),
    );
    expect(tenths.reduce((sum, value) => sum + value, 0)).toBe(1000);
  });

  it('führt für aufzubereitende Kandidaten die belegten Metadaten', () => {
    const routeIds = new Set(APP_ROUTES.map((route) => route.id));
    const prepare = DASHBOARD_CATALOG.filter((e) => e.status === 'aufbereiten');
    expect(prepare).toHaveLength(28);
    for (const entry of prepare) {
      if (entry.status === 'aktiv') continue;
      expect(entry.unit, entry.id).toBeTruthy();
      expect(entry.access, entry.id).toBeTruthy();
      // Nennt der Grund eine Fachseite, steht sie auch als Ziel im Eintrag (und umgekehrt).
      const named = /Fachseite (s-[a-z0-9-]+)/.exec(entry.reason)?.[1];
      if (named) expect(entry.detailRouteId, entry.id).toBe(named);
      if (entry.detailRouteId) expect(routeIds, entry.id).toContain(entry.detailRouteId);
      if (/nicht geroutet/.test(entry.reason))
        expect(entry.detailRouteId, entry.id).toBeUndefined();
    }
  });

  it('begründet jeden nicht aktiven Eintrag', () => {
    const inactive = DASHBOARD_CATALOG.filter((e) => e.status !== 'aktiv');
    expect(inactive.length).toBeGreaterThan(30);
    for (const entry of inactive)
      expect('reason' in entry && entry.reason.length).toBeGreaterThan(15);
  });
});

describe('validateCatalog', () => {
  const pipelineStages = byId('crm.pipeline_stufen');

  it('meldet Kreis für Funnel-Stufen, doppelte IDs, Simulation und fehlende Gründe', () => {
    const broken: CatalogEntry[] = [
      { ...pipelineStages, views: ['kreis', 'tabelle'], defaultView: 'kreis' },
      { ...pipelineStages },
      {
        ...pipelineStages,
        id: 'crm.sim_wert',
        source: { ...pipelineStages.source, module: 'src/simulation/kpiRegistry.ts' },
      },
      {
        id: 'baseline.ohne_grund',
        name: 'x',
        category: 'finanzen',
        kind: 'kpi',
        status: 'nicht_geeignet',
        reason: 'kurz',
        source: { layer: 'baseline', module: 'src/domain/execData.ts', exportName: 'HERO' },
      },
    ];
    const codes = validateCatalog(broken).map((issue) => issue.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'kreis_gesperrt',
        'view_unzulaessig',
        'id_doppelt',
        'simulation',
        'grund',
      ]),
    );
  });

  it('verlangt Einheit und Berechtigung für aufzubereitende Einträge', () => {
    const prepare = DASHBOARD_CATALOG.find((e) => e.id === 'baseline.erloesmix');
    if (!prepare || prepare.status === 'aktiv') throw new Error('Eintrag fehlt');
    const codes = validateCatalog([{ ...prepare, unit: undefined }]).map((issue) => issue.code);
    expect(codes).toEqual(['metadaten']);
  });

  it('meldet Darstellungen, die nicht zur Datenform passen', () => {
    const arr = byId('baseline.arr');
    const issues = validateCatalog([{ ...arr, views: ['zahl', 'linie'] }]);
    expect(issues).toEqual([
      expect.objectContaining({ path: 'baseline.arr', code: 'view_unzulaessig' }),
    ]);
  });

  it('meldet einen falschen Zeitmodus und den Pipeline-Filter außerhalb des CRM', () => {
    const arr = byId('baseline.arr');
    const codes = validateCatalog([{ ...arr, timeMode: 'live', filters: ['pipeline'] }]).map(
      (i) => i.code,
    );
    expect(codes).toEqual(['zeitmodus', 'filter']);
  });
});
