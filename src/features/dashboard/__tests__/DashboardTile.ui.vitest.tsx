// Auftrag 073 (Dashboard Teilauftrag 4): Kachelrahmen, Zustände, Zeitbezug, Geltungsbereich, Details.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardTile } from '../components/DashboardTile';
import { getCatalogEntry, isActiveEntry, type ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import type { ResolvedTileData, TileData } from '../data/dashboardData';
import { DashboardPreviewPage, readViewFilter } from '../preview/DashboardPreviewPage';
import { GALLERY_TILES } from '../preview/tileGallerySampleData';

function active(id: string): ActiveCatalogEntry {
  const entry = getCatalogEntry(id);
  if (!entry || !isActiveEntry(entry)) throw new Error(`kein aktiver Eintrag ${id}`);
  return entry;
}

const ARR = active('baseline.arr');
const TILE: DashboardTileConfig = {
  tileId: 't1',
  catalogId: 'baseline.arr',
  view: 'zahl',
  size: 'klein',
  filterMode: 'fester_stand',
};

function resolved(overrides: Partial<ResolvedTileData> = {}): ResolvedTileData {
  return {
    catalogId: 'baseline.arr',
    state: 'bereit',
    value: 2_345_678,
    series: null,
    overview: null,
    unit: 'EUR',
    timeBasis: 'Stand 31.12.2025',
    asOf: null,
    origin: { layer: 'baseline', module: 'src/domain/execData.ts', exportName: 'EXEC_KPIS_1' },
    scope: 'stammdaten',
    effectiveFilter: { mode: 'fester_stand', period: null, pipeline: null },
    ...overrides,
  };
}

function renderTile(data: TileData, tile = TILE, entry: ActiveCatalogEntry | null = ARR) {
  const onShowDetails = vi.fn();
  render(
    <DashboardTile
      tile={tile}
      entry={entry ?? undefined}
      data={data}
      onShowDetails={onShowDetails}
    />,
  );
  return { onShowDetails };
}

describe('DashboardTile', () => {
  it('zeigt Kategorie, Titel, Zeitraum/Stand, Quelle und Wert', () => {
    renderTile(resolved());
    expect(screen.getByRole('heading', { name: ARR.name })).toBeInTheDocument();
    expect(screen.getByText('Finanzen')).toBeInTheDocument();
    expect(screen.getByTestId('tile-meta')).toHaveTextContent(
      'Stand 31.12.2025 · Quelle: Stammdaten',
    );
    expect(screen.getByTestId('tile-number')).toHaveTextContent('2,35 Mio. EUR');
    expect(screen.queryByTestId('tile-state-badge')).toBeNull();
  });

  it('bevorzugt den eigenen Titel', () => {
    renderTile(resolved(), { ...TILE, title: 'Mein ARR' });
    expect(screen.getByRole('heading', { name: 'Mein ARR' })).toBeInTheDocument();
  });

  it('nennt bei Live den Messzeitpunkt und die Quelle Live', () => {
    renderTile(
      resolved({
        origin: { layer: 'live', module: 'm', exportName: 'e', liveKpiId: 'arr' },
        scope: 'organisationsuebergreifend',
        timeBasis: 'Live',
        asOf: '2026-10-04T12:05:00Z',
      }),
    );
    expect(screen.getByTestId('tile-meta')).toHaveTextContent(
      'Live · Stand 04.10.2026, 14:05 · Quelle: Live',
    );
  });

  it.each([
    ['dashboard', 'Zeitbezug: Dashboard-Filter'],
    ['eigener_zeitraum', 'Zeitbezug: Eigener Zeitraum'],
    ['fester_stand', 'Zeitbezug: Fester historischer Stand'],
  ] as const)('zeigt den Zeitbezug %s', (mode, text) => {
    renderTile(resolved({ effectiveFilter: { mode, period: null, pipeline: null } }));
    expect(screen.getByTestId('tile-time-reference')).toHaveTextContent(text);
  });

  it('nennt wirksamen Zeitraum, Pipeline und Hinweise zu nicht wirkenden Filtern', () => {
    renderTile(
      resolved({
        effectiveFilter: {
          mode: 'eigener_zeitraum',
          period: { from: '2026-01-01', to: '2026-03-31' },
          pipeline: 'Direkt',
          periodReason: 'Die Quelle hat kein belegtes Datumsfeld.',
        },
      }),
    );
    const reference = screen.getByTestId('tile-time-reference');
    expect(reference).toHaveTextContent('01.01.2026 – 31.03.2026');
    expect(reference).toHaveTextContent('Pipeline: Direkt');
    expect(reference).toHaveTextContent('Die Quelle hat kein belegtes Datumsfeld.');
  });

  it('weist nur bei organisationsübergreifenden Live-Werten auf den Geltungsbereich hin', () => {
    renderTile(resolved({ scope: 'organisationsuebergreifend' }));
    expect(screen.getByTestId('tile-scope-notice')).toHaveTextContent(
      'Live-Feed, nicht nach Organisation getrennt',
    );
  });

  it.each(['stammdaten', 'organisation'] as const)(
    'zeigt bei %s keinen Geltungsbereichshinweis',
    (scope) => {
      renderTile(resolved({ scope }));
      expect(screen.queryByTestId('tile-scope-notice')).toBeNull();
    },
  );

  it('zeigt „Keine Daten“ statt 0', () => {
    renderTile(resolved({ state: 'keine_daten', value: null }));
    expect(screen.getByTestId('tile-no-data')).toHaveTextContent('Keine Daten');
    expect(screen.queryByText('0 EUR')).toBeNull();
  });

  it('zeigt beim Laden einen fokussierbaren Platzhalter', () => {
    renderTile(resolved({ state: 'laden', value: null }));
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('tabindex', '0');
    expect(status).toHaveAccessibleName(/wird geladen/);
  });

  it('reserviert beim Laden eines Diagramms die Endhöhe', () => {
    renderTile(resolved({ state: 'laden', value: null }), {
      ...TILE,
      view: 'linie',
      size: 'mittel',
    });
    expect(screen.getByTestId('chart-layout-reserve')).toBeInTheDocument();
  });

  it.each([
    ['fehler', 'Quelle nicht erreichbar.', 'Quelle nicht erreichbar.'],
    ['fehler', undefined, 'Die Daten konnten nicht geladen werden.'],
    ['nicht_konfiguriert', undefined, 'Datenquelle nicht eingerichtet.'],
  ] as const)('zeigt den Zustand %s verständlich', (state, message, text) => {
    renderTile(resolved({ state, value: null, message }));
    expect(screen.getByTestId('tile-blocked')).toHaveTextContent(text);
    expect(screen.getByTestId('tile-state-badge')).toBeInTheDocument();
  });

  it('zeigt bei veraltet den Wert weiter mit Zeitstempel', () => {
    renderTile(resolved({ state: 'veraltet', asOf: '2026-10-04T12:05:00Z' }));
    expect(screen.getByTestId('tile-notice')).toHaveTextContent(
      'Wert veraltet. Stand 04.10.2026, 14:05.',
    );
    expect(screen.getByTestId('tile-number')).toHaveTextContent('2,35 Mio. EUR');
  });

  it('zeigt offline ohne Wert (Vertrag Auftrag 071)', () => {
    renderTile(resolved({ state: 'offline', value: null }));
    expect(screen.getByTestId('tile-blocked')).toHaveTextContent('Live-Verbindung getrennt');
    expect(screen.queryByTestId('tile-number')).toBeNull();
    expect(screen.getByTestId('tile-state-badge')).toHaveTextContent('Offline');
  });

  it('nennt bei einem Fehler ohne Meldung einen verständlichen Text (resolveLive ohne message)', () => {
    renderTile(
      resolved({ state: 'fehler', value: null, message: undefined }),
      { ...TILE, catalogId: 'uebersicht.live_aktivitaet', view: 'uebersicht', size: 'mittel' },
      active('uebersicht.live_aktivitaet'),
    );
    expect(screen.getByTestId('tile-blocked')).toHaveTextContent(
      'Die Daten konnten nicht geladen werden.',
    );
  });

  it('weist auf eingeschränkte Datenqualität hin', () => {
    renderTile(resolved({ quality: 'degradiert' }));
    expect(screen.getByTestId('tile-notice')).toHaveTextContent('Eingeschränkte Datenqualität');
  });

  it('erfindet ohne Katalogeintrag keine Metadaten', () => {
    renderTile(
      {
        catalogId: 'baseline.alt',
        state: 'nicht_verfuegbar',
        reason: 'katalog_unbekannt',
        message: 'Katalogeintrag "baseline.alt" ist unbekannt.',
      },
      { ...TILE, catalogId: 'baseline.alt' },
      null,
    );
    expect(screen.getByRole('heading', { name: 'baseline.alt' })).toBeInTheDocument();
    expect(screen.queryByTestId('tile-meta')).toBeNull();
    expect(screen.queryByText('Finanzen')).toBeNull();
    expect(screen.getByTestId('tile-blocked')).toHaveTextContent('ist unbekannt');
    expect(screen.getByTestId('tile-time-reference')).toHaveTextContent(
      'Fester historischer Stand',
    );
  });

  it.each([
    ['bereit', resolved()],
    ['fehler', resolved({ state: 'fehler', value: null })],
  ] as const)('öffnet „Details“ per Klick und Tastatur (%s)', async (_state, data) => {
    const user = userEvent.setup();
    const { onShowDetails } = renderTile(data);
    const button = screen.getByRole('button', { name: `Details zu ${ARR.name}` });
    await user.click(button);
    button.focus();
    await user.keyboard('{Enter}');
    expect(onShowDetails).toHaveBeenCalledTimes(2);
    expect(onShowDetails).toHaveBeenCalledWith('t1');
  });
});

describe('Kachelgalerie (Vorschau)', () => {
  it('rendert jede Galeriekachel mit „Details“', () => {
    render(<DashboardPreviewPage search="" />);
    expect(screen.getAllByTestId('dashboard-tile')).toHaveLength(GALLERY_TILES.length);
    expect(screen.getAllByRole('button', { name: /^Details zu / })).toHaveLength(
      GALLERY_TILES.length,
    );
    expect(screen.getByTestId('dashboard-test-tile')).toBeInTheDocument();
  });

  it('blendet mit ?ansicht= die Testkachel aus und filtert die Galerie', () => {
    render(<DashboardPreviewPage search="?ansicht=zahl" />);
    expect(screen.queryByTestId('dashboard-test-tile')).toBeNull();
    const tiles = screen.getAllByTestId('dashboard-tile');
    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) expect(tile).toHaveAttribute('data-view', 'zahl');
  });

  it('ignoriert unbekannte Darstellungen', () => {
    expect(readViewFilter('?ansicht=ring')).toBe('ring');
    expect(readViewFilter('?ansicht=unbekannt')).toBeUndefined();
    expect(readViewFilter('')).toBeUndefined();
  });
});
