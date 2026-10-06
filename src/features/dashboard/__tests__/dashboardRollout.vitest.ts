// Aufträge 077/079: Rollout-Schalter, Adressen der Detailroute und Seitenmetadaten.
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
  loadPersonalWithFallback,
  withChunkFallback,
} from '../pages/executiveDashboardEntry';
import { DashboardChunkError, DetailChunkError } from '../pages/DetailChunkError';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Rollout-Schalter (Entscheidung E2, Auftrag 079)', () => {
  it('ist standardmäßig an; nur genau „false“ schaltet zurück auf die bisherige Ansicht', () => {
    expect(isPersonalDashboardEnabled({})).toBe(true);
    expect(isPersonalDashboardEnabled({ VITE_EXECUTIVE_DASHBOARD_V2: '' })).toBe(true);
    expect(isPersonalDashboardEnabled({ VITE_EXECUTIVE_DASHBOARD_V2: 'true' })).toBe(true);
    expect(isPersonalDashboardEnabled({ VITE_EXECUTIVE_DASHBOARD_V2: 'false' })).toBe(false);
  });

  it('ist ohne Eintrag in der Umgebung an (Standard nach dem Rollout)', () => {
    vi.stubEnv('VITE_EXECUTIVE_DASHBOARD_V2', '');
    expect(isPersonalDashboardEnabled()).toBe(true);
  });

  it('wählt mit Rückschaltung die bisherige, sonst die persönliche Ansicht', () => {
    expect(executiveDashboardLoader(false)).toBe(loadLegacyExecutiveDashboard);
    expect(executiveDashboardLoader(true)).toBe(loadPersonalWithFallback);
    vi.stubEnv('VITE_EXECUTIVE_DASHBOARD_V2', '');
    expect(executiveDashboardLoader()).toBe(loadPersonalWithFallback);
    vi.stubEnv('VITE_EXECUTIVE_DASHBOARD_V2', 'false');
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
  it('bleibt bei Rückschaltung eine unbekannte Seite (404)', () => {
    vi.stubEnv('VITE_EXECUTIVE_DASHBOARD_V2', 'false');
    expect(routeForPathname('/dashboard/tiles/a').id).toBe('not-found');
    expect(routeForPathname('/dashboard').title).toBe('Executive Dashboard');
  });

  it('gehört standardmäßig zum Executive Dashboard und heißt „Kachel-Details“', () => {
    vi.stubEnv('VITE_EXECUTIVE_DASHBOARD_V2', '');
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

  it('sichert auch die persönliche Ansicht ab, mit eigener Ersatzseite (Codex PR #61)', async () => {
    const failing = withChunkFallback(
      () => Promise.reject(new Error('Chunk fehlt')),
      DashboardChunkError,
    );
    expect((await failing()).default).toBe(DashboardChunkError);
  });

  it('lässt ein erfolgreiches Nachladen unverändert durch', async () => {
    const Page = () => null;
    const module = await withChunkFallback(() => Promise.resolve({ default: Page }))();
    expect(module.default).toBe(Page);
  });
});
