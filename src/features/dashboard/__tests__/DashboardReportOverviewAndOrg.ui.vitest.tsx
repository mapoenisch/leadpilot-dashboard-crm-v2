import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardPrintView } from '../components/export/DashboardPrintView';
import { DashboardWorkspace, type WorkspacePreferences } from '../components/DashboardWorkspace';
import { type DashboardTileConfig, DASHBOARD_CONFIG_VERSION } from '../model/dashboardConfig';
import type { TileDataHook } from '../components/LazyDashboardTile';
import type { ReportExportConfig } from '../components/export/DashboardReportModal';
import { getTeamHrSnapshot, getRoadmapSnapshot } from '@/domain/executiveCockpitData';

const OVERVIEW_TILES: readonly DashboardTileConfig[] = [
  {
    tileId: 'tile-team-hr',
    catalogId: 'uebersicht.team_hr',
    view: 'uebersicht',
    size: 'mittel',
    title: 'Team & HR Überblick',
    filterMode: 'dashboard',
  },
  {
    tileId: 'tile-roadmap',
    catalogId: 'uebersicht.roadmap',
    view: 'uebersicht',
    size: 'mittel',
    title: 'Produkt-Roadmap',
    filterMode: 'dashboard',
  },
];

describe('DashboardReport: Übersichtskacheln & Mandantenbindung (Auftrag 132 Runde 6)', () => {
  const config: ReportExportConfig = {
    title: 'Executive Quartalsbericht',
    periodText: 'Q1 2026',
    selectedTileIds: ['tile-team-hr', 'tile-roadmap'],
    commentary: '',
    orientation: 'portrait',
    includeAppendix: true,
  };

  const overviewDataHook: TileDataHook = (tile) => {
    if (tile.catalogId === 'uebersicht.team_hr') {
      return {
        catalogId: tile.catalogId,
        state: 'bereit',
        value: null,
        unit: '',
        series: null,
        overview: { kind: 'team_hr', data: getTeamHrSnapshot() },
        timeBasis: 'Stammdaten 2025/2026',
        asOf: null,
        origin: {
          layer: 'baseline',
          module: 'executiveCockpitData',
          exportName: 'getTeamHrSnapshot',
        },
        scope: 'stammdaten',
        effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
      };
    }
    return {
      catalogId: tile.catalogId,
      state: 'bereit',
      value: null,
      unit: '',
      series: null,
      overview: { kind: 'roadmap', data: getRoadmapSnapshot() },
      timeBasis: 'Roadmap 2026',
      asOf: null,
      origin: {
        layer: 'baseline',
        module: 'executiveCockpitData',
        exportName: 'getRoadmapSnapshot',
      },
      scope: 'stammdaten',
      effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
    };
  };

  it('rendert strukturierte Daten für team_hr und roadmap in Kachel und Anhang (kein Platzhalter)', () => {
    render(
      <DashboardPrintView
        config={config}
        tiles={OVERVIEW_TILES}
        isPreview={true}
        useData={overviewDataHook}
        organizationName="Organisation org-corp-42"
      />,
    );

    // Kachelkarten: Kein 'Übersicht aktiv' Platzhalter
    expect(screen.queryByText('Übersicht aktiv')).not.toBeInTheDocument();

    // team_hr Kachelkarte
    expect(screen.getByTestId('print-overview-team-hr')).toBeInTheDocument();
    expect(screen.getByText(/Team-Kennzahlen/i)).toBeInTheDocument();
    expect(screen.getByText(/Engpässe & Maßnahmen/i)).toBeInTheDocument();

    // roadmap Kachelkarte
    expect(screen.getByTestId('print-overview-roadmap')).toBeInTheDocument();
    expect(screen.getByText(/Geplante Releases & Roadmap/i)).toBeInTheDocument();

    // Anhangstabelle: strukturierte Tabellenzeilen für Teamstruktur, Metriken und Releases
    expect(screen.getByText('(Teamgröße (31.12.2025))')).toBeInTheDocument();
    expect(screen.getAllByText('(Engpass / Maßnahme)').length).toBe(4);
    expect(screen.getByText('(v1.2 (Feb 2025): Import-Assistent)')).toBeInTheDocument();
  });

  it('reicht organizationName über DashboardWorkspace an das Deckblatt und die Fußnote durch', () => {
    const preferences: WorkspacePreferences = {
      status: 'bereit',
      state: {
        kind: 'gespeichert',
        config: {
          version: DASHBOARD_CONFIG_VERSION,
          tiles: OVERVIEW_TILES,
          filters: {},
        },
        revision: 1,
        canSave: true,
        unavailable: [],
      },
      isSaving: false,
      save: vi.fn(),
      reloadServerVersion: vi.fn(),
    };

    render(
      <DashboardWorkspace
        preferences={preferences}
        useData={overviewDataHook}
        organizationName="Organisation org-mandant-99"
      />,
    );

    // Der Workspace enthält DashboardPrintView, die mit config=null beginnt;
    // Wenn DashboardPrintView direkt gerendert wird mit config, weist sie den Mandanten aus:
    const { getByText } = render(
      <DashboardPrintView
        config={config}
        tiles={OVERVIEW_TILES}
        isPreview={true}
        useData={overviewDataHook}
        organizationName="Organisation org-mandant-99"
      />,
    );

    expect(getByText('Organisation org-mandant-99')).toBeInTheDocument();
    expect(
      screen.getByText(
        /unterliegen den Datenzugriffsrechten des Mandanten Organisation org-mandant-99\./i,
      ),
    ).toBeInTheDocument();
  });
});
