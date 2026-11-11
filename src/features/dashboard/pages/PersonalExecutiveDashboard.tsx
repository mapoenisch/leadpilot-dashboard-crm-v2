// Executive Dashboard, Teilauftrag 7 (Auftrag 077): persönliche Ansicht unter `/dashboard` (nur mit
// eingeschaltetem Rollout-Schalter). Verbindet Speicherung, Datenauflösung und Arbeitsbereich mit
// dem Router: „Details“ öffnet die Detailseite, die Rückkehr bringt Sitzungsfilter und Fokus mit.
import { useRef, useState } from 'react';
import { useOrganization } from '@/auth/organizationContext';
import { DashboardWorkspace } from '../components/DashboardWorkspace';
import { DashboardEditorShellV2 } from '../components/editor/DashboardEditorShellV2';
import { convertV2TileToV1 } from '../components/editor/EditorCanvasV2';
import { useBrowserBackGuard } from '../hooks/useBrowserBackGuard';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';
import { useDashboardPreferences } from '../hooks/useDashboardPreferences';
import type { DashboardConfig } from '../model/dashboardConfig';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';
import { migrateV1ToV2 } from '../model/dashboardMigrationV1V2';
import {
  isDashboardEditorV2Enabled,
  setDashboardEditorV2Override,
} from '../model/dashboardRollout';

export const RETURN_ANNOUNCEMENT = 'Zurück im Dashboard. Die Filter deiner Sitzung gelten weiter.';
export const RETURN_MISSING_ANNOUNCEMENT =
  'Zurück im Dashboard. Die zuvor geöffnete Kachel gibt es nicht mehr.';

function v2ConfigToV1(v2: DashboardConfigV2): DashboardConfig {
  const period = v2.globalTimeframe.includes('/')
    ? { from: v2.globalTimeframe.split('/')[0]!, to: v2.globalTimeframe.split('/')[1]! }
    : undefined;

  return {
    version: 1,
    filters: {
      pipeline: v2.globalPipeline,
      period,
    },
    tiles: v2.tiles.map((t) => convertV2TileToV1(t, v2.globalTimeframe, v2.globalPipeline)),
  };
}

export function PersonalExecutiveDashboard() {
  const preferences = useDashboardPreferences();
  const nav = useDashboardNavigation();
  const { session } = useOrganization();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Der mitgereiste Kontext gilt nur beim Öffnen der Seite; spätere Ersetzungen des Eintrags
  // (beim Öffnen der Details) dürfen den Arbeitsbereich nicht erneut steuern.
  const [arrival] = useState(nav.incoming);
  const [announcement, setAnnouncement] = useState('');

  // Auftrag 148 / P05: Neuer V2-Editor hinter Rollout-Schalter
  if (isDashboardEditorV2Enabled()) {
    const rawV1 = preferences.state?.config ?? DEFAULT_DASHBOARD_CONFIG;
    const initialConfigV2 = migrateV1ToV2(rawV1, {
      id: 'personal_dashboard',
      title: 'Executive Dashboard',
      ownerUserId: session?.organizationId ? `usr-${session.organizationId}` : 'personal-user',
      organizationId: session?.organizationId ? `org-${session.organizationId}` : 'personal-org',
    });

    const handleSaveV2 = async (cfg: DashboardConfigV2): Promise<boolean> => {
      const v1 = v2ConfigToV1(cfg);
      const res = await preferences.save(v1);
      return res.ok;
    };

    return (
      <DashboardEditorShellV2
        initialConfig={initialConfigV2}
        useData={useDashboardData}
        onSave={handleSaveV2}
        onCancel={() => {
          setDashboardEditorV2Override(false);
          window.location.reload();
        }}
        onShowDetails={(tileId) => nav.openDetails(tileId, null)}
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-[var(--space-4,16px)]">
      {/* Auftrag 089 (Paket E): Die Kopfzeile nennt Bereich und Seite bereits – hier nur noch eine
          kompakte Zeile statt Bereichszeile, großer Überschrift und Einleitung. */}
      <header className="flex flex-wrap items-baseline gap-x-[12px] gap-y-[4px]">
        <h2
          ref={headingRef}
          tabIndex={-1}
          data-testid="dashboard-heading"
          className="m-0 text-[18px] font-semibold text-[var(--color-text-primary,#fff)] outline-none focus:ring-2 focus:ring-primary"
        >
          Executive Dashboard
        </h2>
        <p className="m-0 text-[13px] text-[var(--color-text-muted)]">
          „Details“ zeigt Herkunft, Zeitraum und Werte jeder Kachel.
        </p>
      </header>
      <p role="status" className="sr-only" data-testid="dashboard-nav-status">
        {announcement}
      </p>
      <DashboardWorkspace
        preferences={preferences}
        useData={useDashboardData}
        organizationName={
          session?.organizationId ? `Organisation ${session.organizationId}` : undefined
        }
        initialSession={arrival?.session ?? null}
        returnFocusTileId={arrival?.returnFocus ?? null}
        onReturnFocus={(found) => {
          setAnnouncement(found ? RETURN_ANNOUNCEMENT : RETURN_MISSING_ANNOUNCEMENT);
          if (!found) headingRef.current?.focus();
        }}
        onShowDetails={nav.openDetails}
        navigate={nav.goTo}
        useBackGuard={useBrowserBackGuard}
      />
    </div>
  );
}
