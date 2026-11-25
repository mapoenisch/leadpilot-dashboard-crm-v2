// Auftrag 159 (P10a): Tests für die Kachelstand-Zeile (TileStandLine).
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TileStandLine } from '../time/TileStandLine';
import { attachTileStand, type TileStand } from '../time/useTimeControlledData';
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { ResolvedTileData, TileData } from '../data/dashboardData';

function makeEntry(kind: 'fest' | 'puffer' | 'keine' | 'ereignisse'): ActiveCatalogEntry {
  return {
    id: 'test.metric',
    name: 'Test-Metrik',
    category: 'vertrieb_crm',
    kind: 'kpi',
    status: 'aktiv',
    definition: 'Beschreibung',
    unit: 'anzahl',
    shape: 'einzelwert',
    aggregation: 'bestand',
    timeMode: kind === 'fest' ? 'fest' : kind === 'puffer' ? 'live' : 'aktuell',
    timeBasis: 'Q3 2026',
    views: ['zahl'],
    defaultView: 'zahl',
    minSize: 'klein',
    groupings: [],
    filters: [],
    detailRouteId: 'cockpit',
    access: 'alle',
    source: { layer: 'baseline', module: 'test', exportName: 'test' },
    history: {
      kind,
      reconstructable: 'nein',
      note: 'Test-Hinweis',
    },
  };
}

function makeData(
  state: ResolvedTileData['state'] | 'nicht_verfuegbar' = 'bereit',
  stand?: TileStand,
  asOf: string | null = null,
): TileData {
  if (state === 'nicht_verfuegbar') {
    const unavail = {
      catalogId: 'test.metric',
      state: 'nicht_verfuegbar' as const,
      reason: 'katalog_unbekannt' as const,
      message: 'nicht verfügbar',
    };
    return stand ? attachTileStand(unavail, stand) : unavail;
  }
  const base: ResolvedTileData = {
    catalogId: 'test.metric',
    state,
    value: 42,
    unit: 'anzahl',
    timeBasis: 'Q3 2026',
    asOf,
    series: null,
    overview: null,
    origin: { layer: 'baseline', module: 'test', exportName: 'test' },
    scope: 'stammdaten',
    effectiveFilter: {
      mode: 'dashboard',
      period: null,
      pipeline: null,
    },
  };
  return stand ? attachTileStand(base, stand) : base;
}

describe('TileStandLine', () => {
  it('rendert nichts, wenn stand oder entry fehlt oder state noch lädt', () => {
    const entry = makeEntry('fest');
    const stand: TileStand = {
      mode: 'live',
      analysisAt: null,
      observedAt: '2026-11-15T14:30:00.000Z',
      loadedAfterPause: false,
    };

    // Ohne Stand (z. B. V1)
    const { container: c1 } = render(<TileStandLine data={makeData('bereit')} entry={entry} />);
    expect(c1.firstChild).toBeNull();

    // Ohne Entry
    const { container: c2 } = render(<TileStandLine data={makeData('bereit', stand)} />);
    expect(c2.firstChild).toBeNull();

    // State = laden
    const { container: c3 } = render(
      <TileStandLine data={makeData('laden', stand)} entry={entry} />,
    );
    expect(c3.firstChild).toBeNull();

    // State = nicht_verfuegbar
    const { container: c4 } = render(
      <TileStandLine data={makeData('nicht_verfuegbar', stand)} entry={entry} />,
    );
    expect(c4.firstChild).toBeNull();
  });

  it('zeigt feste Referenzwerte und Datumsstempel an', () => {
    const entry = makeEntry('fest');
    const stand: TileStand = {
      mode: 'live',
      analysisAt: null,
      observedAt: '2026-11-15T14:30:00.000Z',
      loadedAfterPause: false,
    };

    render(<TileStandLine data={makeData('bereit', stand)} entry={entry} />);
    const line = screen.getByTestId('tile-stand-line');
    expect(line.textContent).toBe('Referenzwert, Stand Q3 2026');
    expect(line.getAttribute('title')).toBe('Test-Hinweis');
  });

  it('wiederholt „Stand“ nicht, wenn der Zeitbezug schon damit beginnt (Auftrag 174b, K4)', () => {
    const data = makeData('bereit', {
      mode: 'live',
      analysisAt: null,
      observedAt: '2026-11-15T14:30:00.000Z',
      loadedAfterPause: false,
    }) as ResolvedTileData;
    data.timeBasis = 'Stand 31.12.2025';
    render(<TileStandLine data={data} entry={makeEntry('fest')} />);
    expect(screen.getByTestId('tile-stand-line').textContent).toBe(
      'Referenzwert, Stand 31.12.2025',
    );
  });

  it('unterscheidet Puffer-Stände mit und ohne Live-Daten', () => {
    const entry = makeEntry('puffer');
    const stand: TileStand = {
      mode: 'live',
      analysisAt: null,
      observedAt: '2026-11-15T14:30:00.000Z',
      loadedAfterPause: false,
    };

    // Mit asOf (heutiges Datum)
    const nowIso = new Date().toISOString();
    const { rerender } = render(
      <TileStandLine data={makeData('bereit', stand, nowIso)} entry={entry} />,
    );
    expect(screen.getByTestId('tile-stand-line').textContent).toMatch(
      /^Live, zuletzt \d{2}:\d{2}$/,
    );

    // Mit asOf aus der Vergangenheit (anderer Tag)
    rerender(
      <TileStandLine data={makeData('bereit', stand, '2026-01-01T10:00:00.000Z')} entry={entry} />,
    );
    expect(screen.getByTestId('tile-stand-line').textContent).toContain('Live, zuletzt');

    // Ohne asOf
    rerender(<TileStandLine data={makeData('bereit', stand, null)} entry={entry} />);
    expect(screen.getByTestId('tile-stand-line').textContent).toBe('noch keine Live-Daten');
  });

  it('behandelt CRM-Kennzahlen und Ereignis-Typen', () => {
    const crmEntry = makeEntry('keine');
    const standWithTime: TileStand = {
      mode: 'live',
      analysisAt: null,
      observedAt: new Date().toISOString(),
      loadedAfterPause: false,
    };

    const { rerender } = render(
      <TileStandLine data={makeData('bereit', standWithTime)} entry={crmEntry} />,
    );
    expect(screen.getByTestId('tile-stand-line').textContent).toMatch(
      /^Aktueller Stand, abgerufen \d{2}:\d{2}$/,
    );

    // Stand mit ungültigem observedAt
    const standInvalid: TileStand = {
      mode: 'live',
      analysisAt: null,
      observedAt: 'ungueltiges-datum',
      loadedAfterPause: false,
    };
    rerender(<TileStandLine data={makeData('bereit', standInvalid)} entry={crmEntry} />);
    expect(screen.getByTestId('tile-stand-line').textContent).toBe('Aktueller Stand');

    // Ereignisse-Typ
    const eventsEntry = makeEntry('ereignisse');
    rerender(<TileStandLine data={makeData('bereit', standWithTime)} entry={eventsEntry} />);
    expect(screen.getByTestId('tile-stand-line').textContent).toBe(
      'Ereignisse ab Aufzeichnungsbeginn',
    );
  });

  it('kennzeichnet Pausenzustände und nach Pausenbeginn geladene Kacheln', () => {
    const entry = makeEntry('fest');

    // Normal pausiert mit gültiger Zeit
    const pausedStand: TileStand = {
      mode: 'pausiert',
      analysisAt: new Date().toISOString(),
      observedAt: new Date().toISOString(),
      loadedAfterPause: false,
    };
    const { rerender } = render(
      <TileStandLine data={makeData('bereit', pausedStand)} entry={entry} />,
    );
    expect(screen.getByTestId('tile-stand-line').textContent).toContain('Angehalten seit');

    // Pausiert mit ungültiger Zeit
    const pausedInvalidStand: TileStand = {
      mode: 'pausiert',
      analysisAt: 'ungueltig',
      observedAt: new Date().toISOString(),
      loadedAfterPause: false,
    };
    rerender(<TileStandLine data={makeData('bereit', pausedInvalidStand)} entry={entry} />);
    expect(screen.getByTestId('tile-stand-line').textContent).toContain(
      'Angehalten · Referenzwert',
    );

    // Nach Pausenbeginn geladen mit gültiger Zeit
    const loadedAfterStand: TileStand = {
      mode: 'pausiert',
      analysisAt: new Date().toISOString(),
      observedAt: new Date().toISOString(),
      loadedAfterPause: true,
    };
    rerender(<TileStandLine data={makeData('bereit', loadedAfterStand)} entry={entry} />);
    expect(screen.getByTestId('tile-stand-line').textContent).toContain(
      '(nach Pausenbeginn geladen)',
    );

    // Nach Pausenbeginn geladen ohne gültige Zeit
    const loadedAfterInvalid: TileStand = {
      mode: 'pausiert',
      analysisAt: new Date().toISOString(),
      observedAt: 'ungueltig',
      loadedAfterPause: true,
    };
    rerender(<TileStandLine data={makeData('bereit', loadedAfterInvalid)} entry={entry} />);
    expect(screen.getByTestId('tile-stand-line').textContent).toBe(
      'Stand nach Pausenbeginn geladen',
    );
  });

  it('formatiert historischen Standzeilen-Zeitpunkt in Berliner Zeit (Europe/Berlin)', () => {
    const entry = makeEntry('puffer');
    // 2026-10-31T23:00:00Z entspricht in Berlin (UTC+1) 01.11.2026 00:00
    const stand: TileStand = {
      mode: 'zeitpunkt',
      analysisAt: '2026-10-31T23:00:00.000Z',
      observedAt: '2026-10-31T23:00:00.000Z',
      loadedAfterPause: false,
    };
    render(<TileStandLine data={makeData('bereit', stand)} entry={entry} />);
    const line = screen.getByTestId('tile-stand-line');
    expect(line.textContent).toContain('01.11., 00:00');
  });
});
