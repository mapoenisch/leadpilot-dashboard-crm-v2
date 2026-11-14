// Executive Dashboard V2 (Auftrag 148 / P05):
// Vorschau-Komponente für den neuen visuellen Dashboard-Editor V2 ohne Anmeldung.
// Verwendet migrierte Testdaten aus DEFAULT_DASHBOARD_CONFIG und simuliert das Speichern im Speicher.

import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { DashboardEditorShellV2 } from '../components/editor/DashboardEditorShellV2';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';
import { migrateV1ToV2 } from '../model/dashboardMigrationV1V2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import { useEditorPreviewData } from './editorPreviewData';

export function DashboardEditorPreviewV2() {
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

    if ((scenario === 'sections' || scenario === 'confirm') && base.tiles.length >= 6) {
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

  const handleSave = useCallback(async (newConfig: DashboardConfigV2): Promise<boolean> => {
    // Simulierter Speichervorgang im Browser-Memory
    await new Promise((resolve) => setTimeout(resolve, 600));
    setConfig(newConfig);
    setSaveMessage('Dashboard-Entwurf erfolgreich im Speicher gesichert!');
    setTimeout(() => setSaveMessage(null), 3000);
    return true;
  }, []);

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
          <span>Dashboard-Editor V2 (P05) • Vorschau-Umgebung ohne Backend-Schreibzugriff</span>
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
        />
      </div>
    </div>
  );
}
