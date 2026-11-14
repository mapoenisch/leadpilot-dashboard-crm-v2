// Executive Dashboard V2 (Auftrag 148 & 158 / P05 & P09b):
// Vorschau-Komponente für den visuellen Dashboard-Editor V2 ohne Anmeldung.
// Unterstützt Vorlagen, Sektionen und Dashboard-Auswahl mit drei Dashboards für den Screenshot-Harness.

import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { DashboardEditorShellV2 } from '../components/editor/DashboardEditorShellV2';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';
import { migrateV1ToV2 } from '../model/dashboardMigrationV1V2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import type {
  PersonalDashboardListItemV2,
  StoredDashboardV2Row,
} from '../services/dashboardStorageV2Types';
import { useEditorPreviewData } from './editorPreviewData';
import { buildDerivedDashboardTitle } from '../model/dashboardTitles';

const INITIAL_PREVIEW_DASHBOARDS: PersonalDashboardListItemV2[] = [
  {
    id: 'preview_v2_dashboard',
    title: 'Executive Dashboard (V2 Beta)',
    scope: 'personal',
    revision: 3,
    tileCount: 9,
    sectionCount: 0,
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'preview_sales_dashboard',
    title: 'Vertrieb & Pipeline',
    scope: 'personal',
    revision: 1,
    tileCount: 9,
    sectionCount: 2,
    updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'preview_finance_dashboard',
    title: 'Finanzen & Unit Economics',
    scope: 'personal',
    revision: 2,
    tileCount: 10,
    sectionCount: 2,
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function DashboardEditorPreviewV2() {
  const [dashboards, setDashboards] = useState<PersonalDashboardListItemV2[]>(
    INITIAL_PREVIEW_DASHBOARDS,
  );
  const [activeDashboardId, setActiveDashboardId] = useState<string>(
    'preview_v2_dashboard',
  );

  const [config, setConfig] = useState<DashboardConfigV2>(() => {
    const base = migrateV1ToV2(DEFAULT_DASHBOARD_CONFIG, {
      id: 'preview_v2_dashboard',
      title: 'Executive Dashboard (V2 Beta)',
      ownerUserId: 'demo-user-preview',
      organizationId: 'demo-org-preview',
    });

    const scenario =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('scenario')
        : null;

    if (
      (scenario === 'sections' || scenario === 'confirm') &&
      base.tiles.length >= 6
    ) {
      const sec1Tiles = base.tiles.slice(0, 3).map((t) => t.id);
      const sec2Tiles = base.tiles.slice(3, 6).map((t) => t.id);
      return {
        ...base,
        sections: [
          {
            id: 'sec_finanzen',
            title: 'Finanzen & Ertrag',
            collapsed: false,
            tileIds: sec1Tiles,
          },
          {
            id: 'sec_pipeline',
            title: 'Pipeline & Vertrieb',
            collapsed: true,
            tileIds: sec2Tiles,
          },
        ],
      };
    }

    return base;
  });

  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSave = useCallback(
    async (newConfig: DashboardConfigV2): Promise<boolean> => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setConfig(newConfig);
      setDashboards((prev) =>
        prev.map((d) =>
          d.id === activeDashboardId
            ? {
                ...d,
                title: newConfig.title,
                tileCount: newConfig.tiles.length,
                sectionCount: newConfig.sections?.length ?? 0,
                updatedAt: new Date().toISOString(),
              }
            : d,
        ),
      );
      setSaveMessage('Dashboard-Entwurf erfolgreich im Speicher gesichert!');
      setTimeout(() => setSaveMessage(null), 3000);
      return true;
    },
    [activeDashboardId],
  );

  const handleOpenDashboard = useCallback(
    async (id: string): Promise<boolean> => {
      setActiveDashboardId(id);
      const target = dashboards.find((d) => d.id === id);
      if (target) {
        setConfig((prev) => ({
          ...prev,
          id,
          title: target.title,
        }));
      }
      return true;
    },
    [dashboards],
  );

  const handleCreateFromTemplate = useCallback(
    async (templateId: string, title?: string) => {
      const { getDashboardTemplateV2ById } = await import(
        '../model/dashboardTemplatesV2'
      );
      const template = getDashboardTemplateV2ById(templateId);
      const newTitle = title?.trim() || template?.name || 'Neues Dashboard';
      const newId = 'preview_' + Math.random().toString(36).slice(2, 8);
      const now = new Date().toISOString();

      const newListItem: PersonalDashboardListItemV2 = {
        id: newId,
        title: newTitle,
        scope: 'personal',
        revision: 1,
        tileCount: template?.tileCount ?? 0,
        sectionCount: template?.sectionCount ?? 0,
        updatedAt: now,
      };

      setDashboards((prev) => [newListItem, ...prev]);
      setActiveDashboardId(newId);
      if (template) {
        const built = template.build({
          id: newId,
          title: newTitle,
          ownerUserId: 'demo-user-preview',
          organizationId: 'demo-org-preview',
        });
        setConfig(built);
      }
      return { ok: true, value: { dashboardId: newId, revision: 1, updatedAt: now } };
    },
    [],
  );

  const handleDuplicateCurrent = useCallback(async (title?: string) => {
    const targetTitle =
      title?.trim() || buildDerivedDashboardTitle(config.title, ' (Kopie)');
    const newId = 'preview_' + Math.random().toString(36).slice(2, 8);
    const now = new Date().toISOString();

    const newListItem: PersonalDashboardListItemV2 = {
      id: newId,
      title: targetTitle,
      scope: 'personal',
      revision: 1,
      tileCount: config.tiles.length,
      sectionCount: config.sections?.length ?? 0,
      updatedAt: now,
    };

    setDashboards((prev) => [newListItem, ...prev]);
    setActiveDashboardId(newId);
    setConfig((prev) => ({
      ...prev,
      id: newId,
      title: targetTitle,
    }));
    return { ok: true, value: { dashboardId: newId, revision: 1, updatedAt: now } };
  }, [config]);

  const handleDeleteDashboard = useCallback(
    async (id: string) => {
      const remaining = dashboards.filter((d) => d.id !== id);
      setDashboards(remaining);
      const next = remaining[0];
      if (next) {
        setActiveDashboardId(next.id);
        setConfig((prev) => ({ ...prev, id: next.id, title: next.title }));
      }
      return { ok: true as const, nextDashboardId: next?.id ?? null };
    },
    [dashboards],
  );

  const currentStored: StoredDashboardV2Row = {
    id: activeDashboardId,
    title: config.title,
    scope: 'personal',
    revision: 1,
    config,
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="relative flex h-screen w-full flex-col bg-[var(--color-bg-deep,#030c0b)]">
      {/* Vorschau-Banner */}
      <div
        data-testid="editor-v2-preview-banner"
        className="flex h-7 items-center justify-between border-b border-primary/20 bg-primary/10 px-4 text-[11px] text-primary select-none"
      >
        <div className="flex items-center gap-2">
          <Badge
            variant="neutral"
            className="border-primary/40 bg-primary/20 text-primary text-[10px] uppercase"
          >
            Beta-Vorschau
          </Badge>
          <span>Dashboard-Editor V2 (P09b) • Vorschau mit 3 Dashboards und Vorlagenauswahl</span>
        </div>
        {saveMessage && (
          <span className="font-semibold text-emerald-400 animate-fade-in">{saveMessage}</span>
        )}
      </div>

      {/* Die 4-Zonen-Shell */}
      <div className="flex-1 overflow-hidden">
        <DashboardEditorShellV2
          initialConfig={config}
          useData={useEditorPreviewData}
          onSave={handleSave}
          onCancel={() => {
            if (typeof window !== 'undefined') {
              window.location.search = '';
            }
          }}
          connectionStatus="connected"
          dashboards={dashboards}
          currentStoredDashboard={currentStored}
          onOpenDashboard={handleOpenDashboard}
          onCreateFromTemplate={handleCreateFromTemplate}
          onDuplicateCurrent={handleDuplicateCurrent}
          onDeleteDashboard={handleDeleteDashboard}
        />
      </div>
    </div>
  );
}
