// Auftrag 077: Rollout-Schalter, Adressen der Detailroute und Seitenmetadaten.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeForPathname } from '@/app/routes';
import {
  isPersonalDashboardEnabled,
  tileDetailPath,
  tileIdFromPath,
} from '../model/dashboardRollout';
import {
  executiveDashboardLoader,
  loadLegacyExecutiveDashboard,
  loadPersonalExecutiveDashboard,
  withChunkFallback,
} from '../pages/executiveDashboardEntry';
import { DetailChunkError } from '../pages/DetailChunkError';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Rollout-Schalter (Entscheidung E1)', () => {
  it('ist nur mit genau „true“ eingeschaltet', () => {
    expect(isPersonalDashboardEnabled({})).toBe(false);
    expect(isPersonalDashboardEnabled({ VITE_EXECUTIVE_DASHBOARD_V2: '' })).toBe(false);
    expect(isPersonalDashboardEnabled({ VITE_EXECUTIVE_DASHBOARD_V2: 'false' })).toBe(false);
    expect(isPersonalDashboardEnabled({ VITE_EXECUTIVE_DASHBOARD_V2: '1' })).toBe(false);
    expect(isPersonalDashboardEnabled({ VITE_EXECUTIVE_DASHBOARD_V2: 'TRUE' })).toBe(false);
    expect(isPersonalDashboardEnabled({ VITE_EXECUTIVE_DASHBOARD_V2: 'true' })).toBe(true);
  });

  it('ist ohne Eintrag in der Umgebung aus (Standard)', () => {
    vi.stubEnv('VITE_EXECUTIVE_DASHBOARD_V2', '');
    expect(isPersonalDashboardEnabled()).toBe(false);
  });

  it('wählt ohne Schalter die bisherige, mit Schalter die persönliche Ansicht', () => {
    expect(executiveDashboardLoader(false)).toBe(loadLegacyExecutiveDashboard);
    expect(executiveDashboardLoader(true)).toBe(loadPersonalExecutiveDashboard);
    vi.stubEnv('VITE_EXECUTIVE_DASHBOARD_V2', '');
    expect(executiveDashboardLoader()).toBe(loadLegacyExecutiveDashboard);
  });
});

describe('Adressen der Detailroute', () => {
  it('kodiert die Kachel-ID und liest sie wieder', () => {
    const path = tileDetailPath('kachel/mit leer');
    expect(path).toBe('/dashboard/tiles/kachel%2Fmit%20leer');
    expect(tileIdFromPath(path)).toBe('kachel/mit leer');
    expect(tileIdFromPath('/dashboard/tiles/abc/')).toBe('abc');
  });

  it('erkennt keine leeren, tieferen oder fremden Pfade', () => {
    expect(tileIdFromPath('/dashboard/tiles/')).toBeNull();
    expect(tileIdFromPath('/dashboard/tiles/a/b')).toBeNull();
    expect(tileIdFromPath('/dashboard')).toBeNull();
    expect(tileIdFromPath('/dashboard/tiles/%E0%A4%A')).toBeNull();
  });
});

describe('Seitenmetadaten der Detailroute', () => {
  it('bleibt ohne Schalter eine unbekannte Seite (404)', () => {
    vi.stubEnv('VITE_EXECUTIVE_DASHBOARD_V2', '');
    expect(routeForPathname('/dashboard/tiles/a').id).toBe('not-found');
    expect(routeForPathname('/dashboard').title).toBe('Executive Dashboard');
  });

  it('gehört mit Schalter zum Executive Dashboard und heißt „Kachel-Details“', () => {
    vi.stubEnv('VITE_EXECUTIVE_DASHBOARD_V2', 'true');
    const meta = routeForPathname('/dashboard/tiles/a');
    expect(meta).toMatchObject({
      id: 's-exec',
      title: 'Kachel-Details',
      categoryLabel: 'Übersicht',
    });
    expect(routeForPathname('/dashboard/tiles/').id).toBe('not-found');
    expect(routeForPathname('/dashboard/tiles/a/b').id).toBe('not-found');
  });
});

describe('Nachladefehler der Detailseite', () => {
  it('liefert statt eines festhängenden Fehlers die Ersatzseite mit „Erneut laden“', async () => {
    const failing = withChunkFallback(() => Promise.reject(new Error('Chunk fehlt')));
    const module = await failing();
    expect(module.default).toBe(DetailChunkError);
  });

  it('lässt ein erfolgreiches Nachladen unverändert durch', async () => {
    const Page = () => null;
    const module = await withChunkFallback(() => Promise.resolve({ default: Page }))();
    expect(module.default).toBe(Page);
  });
});
