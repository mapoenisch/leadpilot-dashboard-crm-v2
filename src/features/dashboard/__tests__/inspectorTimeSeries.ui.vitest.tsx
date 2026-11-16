// @vitest-environment jsdom
// Auftrag 160 (P10b-1): Tests für Inspector & WidgetLibrary Zeitreihen-Texte (§2.4 Nr. 25, §2.2 Nr. 11).

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InspectorDataTab } from '../components/editor/inspector/InspectorDataTab';
import { WidgetLibraryV2 } from '../components/editor/WidgetLibraryV2';
import { getCatalogEntry, isActiveEntry } from '../model/dashboardCatalog';
import type { DashboardTileConfigV2 } from '../model/dashboardConfigV2';
import { useOrganization } from '@/auth/organizationContext';
import * as resolveTimeSeriesModule from '../data/resolveTimeSeries';

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: vi.fn(),
}));

const mockedUseOrganization = vi.mocked(useOrganization);

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 60_000,
        gcTime: 60_000,
      },
    },
  });
}

describe('Inspector & Bibliothek Zeitreihen-Texte (Auftrag 160 §2.4 Nr. 25)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseOrganization.mockReturnValue({
      session: {
        userId: 'u-1',
        organizationId: 'org-a',
        role: 'admin',
      },
    } as ReturnType<typeof useOrganization>);

    vi.spyOn(resolveTimeSeriesModule, 'fetchTimeSeries').mockResolvedValue({
      source: 'deal_stage_events',
      resolution: 'woche',
      from: '2026-08-24T00:00:00+02:00',
      to: '2026-11-16T00:00:00+01:00',
      historyStartAt: '2026-09-01T00:00:00+02:00',
      points: [],
      pipelineBasis: 'aktuelle_pipeline_des_deals',
      generatedAt: '2026-11-16T10:00:00+01:00',
    });
  });

  it('Inspector zeigt bei CRM-Verlaufskachel Auflösung, Zeitraum, Historienbeginn und Pipeline-Hinweis', async () => {
    const queryClient = createTestQueryClient();
    const rawEntry = getCatalogEntry('crm.phaseneintritte_verlauf');
    expect(rawEntry).toBeDefined();
    const entry = rawEntry && isActiveEntry(rawEntry) ? rawEntry : undefined;
    expect(entry).toBeDefined();

    const selectedTile: DashboardTileConfigV2 = {
      id: 'tile-crm-verlauf',
      catalogId: 'crm.phaseneintritte_verlauf',
      title: 'Phaseneintritte je Woche',
      presentation: 'linie',
      layouts: { desktop: { x: 0, y: 0, w: 6, h: 4 } },
      query: { pipelineId: 'vertrieb_q4' },
    };

    render(
      <QueryClientProvider client={queryClient}>
        <InspectorDataTab
          selectedTile={selectedTile}
          catalogEntry={entry}
          onTileOverrideChange={vi.fn()}
        />
      </QueryClientProvider>,
    );

    // Auflösung und Zeitraum
    expect(screen.getByTestId('inspector-resolution-text').textContent).toBe('je Woche');
    expect(screen.getByTestId('inspector-timeframe-text').textContent).toBe('Letzte 12 Wochen');

    // Pipeline-Hinweis (Auftrag 160 §2.2 Nr. 11)
    const pipelineHint = screen.getByTestId('inspector-pipeline-hint');
    expect(pipelineHint).toBeInTheDocument();
    expect(pipelineHint.textContent).toContain('aktuelle_pipeline_des_deals');
    expect(pipelineHint.textContent).toContain('ON DELETE CASCADE');
  });

  it('Inspector zeigt bei Live-Verlaufskachel 24h / je Stunde und KEINEN CRM-Pipeline-Hinweis', () => {
    const queryClient = createTestQueryClient();
    const rawEntry = getCatalogEntry('live.arr.verlauf');
    expect(rawEntry).toBeDefined();
    const entry = rawEntry && isActiveEntry(rawEntry) ? rawEntry : undefined;
    expect(entry).toBeDefined();

    const selectedTile: DashboardTileConfigV2 = {
      id: 'tile-live-verlauf',
      catalogId: 'live.arr.verlauf',
      title: 'Live ARR – Verlauf 24 h',
      presentation: 'linie',
      layouts: { desktop: { x: 0, y: 0, w: 6, h: 4 } },
    };

    render(
      <QueryClientProvider client={queryClient}>
        <InspectorDataTab
          selectedTile={selectedTile}
          catalogEntry={entry}
          onTileOverrideChange={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('inspector-resolution-text').textContent).toBe('je Stunde');
    expect(screen.getByTestId('inspector-timeframe-text').textContent).toBe('Letzte 24 Stunden');
    expect(screen.queryByTestId('inspector-pipeline-hint')).toBeNull();
  });

  it('Bibliothek zeigt bei Verlaufskacheln Auflösung und Zeitraum in der Historienzeile', () => {
    render(<WidgetLibraryV2 onAddTile={vi.fn()} tileCount={0} maxTiles={24} />);

    const crmHistory = screen.getByTestId('library-history-crm.phaseneintritte_verlauf');
    expect(crmHistory.textContent).toContain('je Woche');
    expect(crmHistory.textContent).toContain('Letzte 12 Wochen');

    const liveHistory = screen.getByTestId('library-history-live.arr.verlauf');
    expect(liveHistory.textContent).toContain('je Stunde');
    expect(liveHistory.textContent).toContain('Letzte 24 Stunden');
  });

  it('unterdrückt Zeitreihen-Abfragen im Inspector wenn die Kachel in einer eingeklappten Sektion liegt (Codex Review Finding)', () => {
    const queryClient = createTestQueryClient();
    const fetchSpy = vi.spyOn(resolveTimeSeriesModule, 'fetchTimeSeries');
    fetchSpy.mockClear();

    const rawEntry = getCatalogEntry('crm.phaseneintritte_verlauf');
    const entry = rawEntry && isActiveEntry(rawEntry) ? rawEntry : undefined;
    expect(entry).toBeDefined();

    const selectedTile: DashboardTileConfigV2 = {
      id: 'tile-crm-verlauf-collapsed',
      catalogId: 'crm.phaseneintritte_verlauf',
      title: 'Phaseneintritte je Woche',
      presentation: 'linie',
      layouts: { desktop: { x: 0, y: 0, w: 6, h: 4 } },
      query: { pipelineId: 'vertrieb_q4' },
    };

    render(
      <QueryClientProvider client={queryClient}>
        <InspectorDataTab
          selectedTile={selectedTile}
          catalogEntry={entry}
          onTileOverrideChange={vi.fn()}
          isCollapsed={true}
        />
      </QueryClientProvider>,
    );

    // Observer muss deaktiviert sein (enabled: false), kein fetchTimeSeries
    expect(fetchSpy).not.toHaveBeenCalled();
    // Dennoch Fallback-Label vorhanden
    expect(screen.getByTestId('inspector-history-label')).toBeInTheDocument();
  });
});
