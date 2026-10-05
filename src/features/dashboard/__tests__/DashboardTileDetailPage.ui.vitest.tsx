// Auftrag 077: Detailseite `/dashboard/tiles/:tileId` (Plan Teilauftrag 7).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useOrganization } from '@/auth/organizationContext';
import { routeForViewId } from '@/app/routes';
import { useDashboardPreferences } from '../hooks/useDashboardPreferences';
import { buildDashboardNavState, readDashboardNavState } from '../hooks/useDashboardNavigation';
import { useDashboardData } from '../hooks/useDashboardData';
import { DashboardTile } from '../components/DashboardTile';
import { detailChartView, TileDetailContent } from '../components/detail/TileDetailContent';
import { MISSING_TILE_TEXT } from '../components/detail/DetailNotices';
import { NO_DETAIL_PAGE_TEXT } from '../pages/DashboardTileDetailPage';
import { DETAIL_CHUNK_ERROR_TEXT, DetailChunkError } from '../pages/DetailChunkError';
import { activeEntryOf } from '../hooks/dashboardEditorReducer';
import type { ResolvedTileData } from '../data/dashboardData';
import {
  DETAIL_CONFIG,
  IDENTITY,
  SESSION,
  lastSeen,
  preferencesFor,
  renderRoutes,
} from './detailRouterHarness';

vi.mock('@/auth/organizationContext', () => ({ useOrganization: vi.fn() }));
vi.mock('../hooks/useDashboardPreferences', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useDashboardPreferences')>()),
  useDashboardPreferences: vi.fn(),
}));

const mockedPrefs = vi.mocked(useDashboardPreferences);
const mockedOrg = vi.mocked(useOrganization);

beforeEach(() => {
  mockedOrg.mockReturnValue({ session: SESSION, isLoading: false } as never);
  mockedPrefs.mockReturnValue(preferencesFor());
});

const tileOf = (id: string) => DETAIL_CONFIG.tiles.find((tile) => tile.tileId === id)!;

describe('Detailseite: Kennzahl', () => {
  it('zeigt Titel, Definition, Wert, Zeitraum, Quelle, Aktualität und Tabelle', () => {
    renderRoutes({ pathname: '/dashboard/tiles/umsatz' });
    const entry = activeEntryOf(tileOf('umsatz'))!;
    const heading = screen.getByTestId('tile-detail-heading');
    expect(heading).toHaveTextContent(entry.name);
    expect(heading).toHaveFocus();
    expect(screen.getByTestId('tile-detail-definition')).toHaveTextContent(entry.definition);
    const facts = within(screen.getByTestId('tile-detail-facts'));
    expect(facts.getByText('Wert')).toBeInTheDocument();
    expect(screen.getByTestId('tile-detail-value').textContent).toMatch(/EUR$/);
    expect(facts.getByText('Zeitraum').nextSibling).toHaveTextContent(entry.timeBasis);
    expect(facts.getByText('Quelle').nextSibling).toHaveTextContent('Stammdaten');
    expect(facts.getByText('Aktualität').nextSibling).toHaveTextContent('Fester Stand');
    expect(facts.getByText('Datenzustand').nextSibling).toHaveTextContent('Aktuell');
    const table = within(screen.getByTestId('tile-detail-table')).getByRole('table');
    expect(table.querySelector('caption')).toHaveTextContent(entry.name);
  });

  it('führt zur Fachübersicht aus dem Katalog', () => {
    renderRoutes({ pathname: '/dashboard/tiles/umsatz' });
    const target = routeForViewId[activeEntryOf(tileOf('umsatz'))!.detailRouteId]!;
    const link = screen.getByTestId('tile-detail-domain-link');
    expect(link).toHaveAttribute('href', target.path);
    expect(link).toHaveTextContent(target.title);
    fireEvent.click(link);
    expect(screen.getByText('Fachseite GuV')).toBeInTheDocument();
  });
});

describe('Detailseite: Kombination', () => {
  it('erklärt Formel und beide Operanden', () => {
    renderRoutes({ pathname: '/dashboard/tiles/marge' });
    const section = within(screen.getByTestId('detail-combination'));
    expect(section.getByText(/^Formel:/)).toBeInTheDocument();
    const rows = within(screen.getByTestId('detail-operands')).getAllByRole('row');
    // Kopfzeile, zwei Operanden, Ergebnis.
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent('EBITDA');
    expect(rows[2]).toHaveTextContent('Umsatz');
  });

  it('zeigt bei gleichem Datenstand denselben Wert wie die Kachel', () => {
    renderRoutes({ pathname: '/dashboard/tiles/marge' });
    const detailValue = screen.getByTestId('tile-detail-value').textContent;
    const detailResult = screen.getByTestId('detail-combination-result').textContent;
    expect(detailResult).toBe(detailValue);

    function TileProbe() {
      const tile = tileOf('marge');
      const data = useDashboardData(tile, undefined);
      return (
        <DashboardTile
          tile={tile}
          entry={activeEntryOf(tile)}
          data={data}
          onShowDetails={() => {}}
        />
      );
    }
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <TileProbe />
      </QueryClientProvider>,
    );
    const tileNumber = screen.getByTestId('tile-number');
    expect(
      within(tileNumber).getByText(detailValue!, { selector: '.sr-only' }),
    ).toBeInTheDocument();
  });

  it('nennt bei „nicht berechenbar“ den Grund und keinen Wert', () => {
    const tile = tileOf('marge');
    const data: ResolvedTileData = {
      catalogId: tile.catalogId,
      state: 'nicht_berechenbar',
      value: null,
      series: null,
      overview: null,
      unit: '%',
      timeBasis: 'Geschäftsjahr 2025',
      asOf: null,
      origin: { layer: 'kombination', module: 'm', exportName: 'e' },
      scope: 'stammdaten',
      effectiveFilter: { mode: 'fester_stand', period: null, pipeline: null },
      message: 'Der Umsatz ist 0; durch 0 wird nicht geteilt.',
      combination: {
        formula: 'EBITDA ÷ Umsatzerlöse',
        operands: [
          { label: 'EBITDA', value: 10, unit: 'EUR', timeBasis: 'Geschäftsjahr 2025' },
          { label: 'Umsatzerlöse', value: 0, unit: 'EUR', timeBasis: 'Geschäftsjahr 2025' },
        ],
      },
    };
    render(<TileDetailContent tile={tile} entry={activeEntryOf(tile)} data={data} title="Marge" />);
    expect(screen.getByTestId('tile-detail-blocked')).toHaveTextContent(
      'durch 0 wird nicht geteilt',
    );
    expect(screen.getByTestId('tile-detail-value')).toHaveTextContent('Nicht berechenbar');
    expect(screen.getByTestId('detail-combination-result')).toHaveTextContent('Nicht berechenbar');
    expect(screen.queryByTestId('tile-detail-table')).not.toBeInTheDocument();
  });
});

describe('Detailseite: Übersicht', () => {
  it('zeigt Übersichtsdetails statt Definition und Wert', () => {
    renderRoutes({ pathname: '/dashboard/tiles/roadmap' });
    expect(screen.queryByTestId('tile-detail-definition')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tile-detail-value')).not.toBeInTheDocument();
    expect(screen.getByTestId('tile-overview')).toBeInTheDocument();
    expect(screen.getByTestId('tile-detail-domain-link')).toHaveAttribute(
      'href',
      '/product/roadmap',
    );
  });
});

describe('Detailseite: Sonderfälle', () => {
  it('führt bei unbekannter Kachel verständlich zurück', () => {
    renderRoutes({ pathname: '/dashboard/tiles/gibt-es-nicht' });
    expect(screen.getByText(MISSING_TILE_TEXT, { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Kachel nicht gefunden' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Zurück zum Dashboard' }));
    expect(lastSeen().pathname).toBe('/dashboard');
    expect(readDashboardNavState(lastSeen().state, IDENTITY)?.returnFocus).toBe('gibt-es-nicht');
  });

  it('nennt eine nicht verfügbare Kachel ohne technische ID und ohne toten Link', () => {
    renderRoutes({ pathname: '/dashboard/tiles/weg' });
    expect(screen.getByTestId('tile-detail-blocked')).toHaveTextContent('nicht verfügbar');
    expect(screen.queryByText(/gibt_es_nicht/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('tile-detail-domain-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('tile-detail-no-domain')).toHaveTextContent(NO_DETAIL_PAGE_TEXT);
  });

  it('zeigt Laden, fehlende Anmeldung und Ladefehler mit „Erneut laden“', () => {
    mockedPrefs.mockReturnValue(preferencesFor(undefined, { status: 'laden', state: null }));
    const { unmount } = renderRoutes({ pathname: '/dashboard/tiles/umsatz' });
    expect(screen.getByTestId('tile-detail-laden')).toHaveTextContent('Details werden geladen');
    unmount();
    mockedPrefs.mockReturnValue(
      preferencesFor(undefined, { status: 'keine_sitzung', state: null }),
    );
    const second = renderRoutes({ pathname: '/dashboard/tiles/umsatz' });
    expect(screen.getByTestId('tile-detail-keine_sitzung')).toBeInTheDocument();
    second.unmount();
    mockedPrefs.mockReturnValue(preferencesFor(undefined, { status: 'fehler', state: null }));
    renderRoutes({ pathname: '/dashboard/tiles/umsatz' });
    expect(screen.getByRole('button', { name: 'Erneut laden' })).toBeInTheDocument();
  });

  it('gibt Sitzungsfilter und Kachel beim Zurück an die Ansicht weiter', async () => {
    const session = { value: { pipeline: 'p-1' } };
    renderRoutes({
      pathname: '/dashboard/tiles/umsatz',
      state: buildDashboardNavState(IDENTITY, session),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Zurück zum Dashboard' }));
    await waitFor(() => expect(lastSeen().pathname).toBe('/dashboard'));
    expect(readDashboardNavState(lastSeen().state, IDENTITY)).toEqual({
      session,
      returnFocus: 'umsatz',
    });
  });
});

describe('Detailseite: Nachladefehler', () => {
  it('bietet „Erneut laden“ und den Weg zurück an', () => {
    const onReload = vi.fn();
    render(
      <MemoryRouter>
        <DetailChunkError onReload={onReload} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(DETAIL_CHUNK_ERROR_TEXT);
    fireEvent.click(screen.getByRole('button', { name: 'Erneut laden' }));
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Zurück zum Dashboard' })).toBeInTheDocument();
  });
});

describe('Detailseite: Nacharbeit Codex PR #61', () => {
  it('zeigt bei einer als Tabelle gespeicherten Reihe trotzdem die Aufteilung', () => {
    const tile = {
      tileId: 'mix',
      catalogId: 'baseline.mrr_paketmix',
      view: 'tabelle',
      size: 'mittel',
      filterMode: 'fester_stand',
    } as const;
    expect(detailChartView(tile, activeEntryOf(tile))).not.toBeNull();
    mockedPrefs.mockReturnValue(preferencesFor({ version: 1, tiles: [tile] }));
    renderRoutes({ pathname: '/dashboard/tiles/mix' });
    expect(screen.getByRole('heading', { name: 'Aufteilung' })).toBeInTheDocument();
    expect(within(screen.getByTestId('tile-detail-table')).getByRole('table')).toBeInTheDocument();
  });

  it('wählt ohne Diagrammdarstellung im Katalog kein Diagramm', () => {
    const tile = tileOf('umsatz');
    expect(detailChartView(tile, activeEntryOf(tile))).toBeNull();
  });

  it('nennt den angewendeten Pipeline-Filter', () => {
    const tile = {
      tileId: 'stufen',
      catalogId: 'crm.pipeline_stufen_volumen',
      view: 'balken',
      size: 'mittel',
      filterMode: 'dashboard',
    } as const;
    mockedPrefs.mockReturnValue(preferencesFor({ version: 1, tiles: [tile] }));
    renderRoutes({
      pathname: '/dashboard/tiles/stufen',
      state: buildDashboardNavState(IDENTITY, { value: { pipeline: 'p-1' } }),
    });
    const facts = within(screen.getByTestId('tile-detail-facts'));
    expect(facts.getByText('Filter').nextSibling).toHaveTextContent('Pipeline p-1');
  });

  it('führt bei einer Live-Kennzahl über „Zur Fachübersicht“ mit Filtern und Fokus zurück', async () => {
    const tile = {
      tileId: 'live',
      catalogId: 'live.arr',
      view: 'zahl',
      size: 'klein',
      filterMode: 'dashboard',
    } as const;
    mockedPrefs.mockReturnValue(preferencesFor({ version: 1, tiles: [tile] }));
    const session = { value: { pipeline: 'p-1' } };
    renderRoutes({
      pathname: '/dashboard/tiles/live',
      state: buildDashboardNavState(IDENTITY, session),
    });
    const link = screen.getByTestId('tile-detail-domain-link');
    expect(link).toHaveAttribute('href', '/dashboard');
    fireEvent.click(link);
    await waitFor(() => expect(lastSeen().pathname).toBe('/dashboard'));
    expect(readDashboardNavState(lastSeen().state, IDENTITY)).toEqual({
      session,
      returnFocus: 'live',
    });
  });

  it('führt beim Nachladefehler zum Eintrag der Ansicht zurück, der Filter und Fokus trägt', async () => {
    const state = buildDashboardNavState(IDENTITY, { value: { pipeline: 'p-1' } }, 'umsatz');
    let current: { pathname: string; state: unknown } | null = null;
    function Probe() {
      const location = useLocation();
      current = { pathname: location.pathname, state: location.state };
      return null;
    }
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/dashboard', state },
          { pathname: '/dashboard/tiles/umsatz' },
        ]}
        initialIndex={1}
      >
        <Probe />
        <DetailChunkError onReload={() => {}} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Zurück zum Dashboard' }));
    await waitFor(() => expect(current?.pathname).toBe('/dashboard'));
    expect(readDashboardNavState(current!.state, IDENTITY)?.returnFocus).toBe('umsatz');
  });
});
