// Aufträge 077/079/141: Adressen der Detailroute, Seitenmetadaten und Chunk-Fehlerbehandlung.
// Auftrag 141: Der Rollout-Schalter und die bisherige Ansicht sind entfernt;
// die persönliche Ansicht ist die einzige `/dashboard`-Ansicht.
import { describe, expect, it } from 'vitest';
import { routeForPathname } from '@/app/routes';
import {
  getDashboardEditorVersion,
  isDashboardEditorV2Enabled,
  setDashboardEditorV2Override,
  tileDetailPath,
  tileIdFromPath,
} from '../model/dashboardRollout';
import { loadPersonalWithFallback, withChunkFallback } from '../pages/executiveDashboardEntry';
import { DashboardChunkError, DetailChunkError } from '../pages/DetailChunkError';

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
  it('gehört zum Executive Dashboard und heißt „Kachel-Details“', () => {
    const meta = routeForPathname('/dashboard/tiles/a');
    expect(meta).toMatchObject({
      id: 's-exec',
      title: 'Kachel-Details',
      categoryLabel: 'Übersicht',
    });
    expect(routeForPathname('/dashboard').title).toBe('Executive Dashboard');
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

  it('sichert die persönliche Ansicht ab, mit eigener Ersatzseite (Codex PR #61)', async () => {
    const failing = withChunkFallback(
      () => Promise.reject(new Error('Chunk fehlt')),
      DashboardChunkError,
    );
    expect((await failing()).default).toBe(DashboardChunkError);
    // Der Standard-Loader der Dashboard-Route bleibt die abgesicherte Variante.
    expect(loadPersonalWithFallback).toBeDefined();
  });

  it('lässt ein erfolgreiches Nachladen unverändert durch', async () => {
    const Page = () => null;
    const module = await withChunkFallback(() => Promise.resolve({ default: Page }))();
    expect(module.default).toBe(Page);
  });
});

describe('Dashboard-Editor V2 Rollout-Schalter (P04)', () => {
  it('ist standardmäßig deaktiviert (V1 aktiv)', () => {
    setDashboardEditorV2Override(null);
    expect(isDashboardEditorV2Enabled()).toBe(false);
    expect(getDashboardEditorVersion()).toBe(1);
  });

  it('lässt sich per Override für Pilot-Tests aktivieren und zurücksetzen', () => {
    setDashboardEditorV2Override(true);
    expect(isDashboardEditorV2Enabled()).toBe(true);
    expect(getDashboardEditorVersion()).toBe(2);

    setDashboardEditorV2Override(false);
    expect(isDashboardEditorV2Enabled()).toBe(false);
    expect(getDashboardEditorVersion()).toBe(1);

    setDashboardEditorV2Override(null);
    expect(isDashboardEditorV2Enabled()).toBe(false);
  });
});
