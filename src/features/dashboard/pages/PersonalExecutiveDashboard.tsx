// Executive Dashboard, Teilauftrag 7 (Auftrag 077) & Auftrag 150 (P07): persönliche Ansicht unter `/dashboard`.
// V2 nutzt den persistenten Speicheradapter useDashboardV2Storage mit Revisionshistorie,
// optimistischer Konflikterkennung und deterministischer V1->V2-Kopiermigration.
import { useRef, useState } from 'react';
import { useOrganization } from '@/auth/organizationContext';
import { DashboardWorkspace } from '../components/DashboardWorkspace';
import { DashboardEditorShellV2 } from '../components/editor/DashboardEditorShellV2';
import { DashboardConflictDialogV2 } from '../components/editor/DashboardConflictDialogV2';
import { useBrowserBackGuard } from '../hooks/useBrowserBackGuard';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';
import { useDashboardPreferences } from '../hooks/useDashboardPreferences';
import { useDashboardV2Storage } from '../hooks/useDashboardV2Storage';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import {
  isDashboardEditorV2Enabled,
  setDashboardEditorV2Override,
} from '../model/dashboardRollout';

export const RETURN_ANNOUNCEMENT = 'Zurück im Dashboard. Die Filter deiner Sitzung gelten weiter.';
export const RETURN_MISSING_ANNOUNCEMENT =
  'Zurück im Dashboard. Die zuvor geöffnete Kachel gibt es nicht mehr.';

function PersonalExecutiveDashboardV2Container({
  onShowDetails,
}: {
  onShowDetails: (tileId: string) => void;
}) {
  const v2Storage = useDashboardV2Storage();
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictDraft, setConflictDraft] = useState<DashboardConfigV2 | null>(null);

  if (v2Storage.status === 'laden' || !v2Storage.dashboard) {
    return (
      <div
        data-testid="dashboard-v2-loading"
        className="flex h-screen w-full items-center justify-center bg-[var(--color-bg-deep,#030c0b)] text-[var(--color-text-soft,#e6f3f1)]"
      >
        <p className="text-sm text-muted-foreground animate-pulse">Lade Dashboard...</p>
      </div>
    );
  }

  const handleSave = async (cfg: DashboardConfigV2): Promise<boolean> => {
    const res = await v2Storage.save(cfg);
    if (!res.ok) {
      if (res.error.kind === 'konflikt') {
        setConflictDraft(cfg);
        setShowConflictDialog(true);
      }
      return false;
    }
    return true;
  };

  const handleReloadConflict = async () => {
    setShowConflictDialog(false);
    setConflictDraft(null);
    await v2Storage.reload();
  };

  const handleSaveAsCopyConflict = async () => {
    if (!conflictDraft) return;
    const res = await v2Storage.saveAsNewPersonalCopy(conflictDraft);
    if (res.ok) {
      setShowConflictDialog(false);
      setConflictDraft(null);
    }
  };

  return (
    <>
      <DashboardEditorShellV2
        key={`${v2Storage.dashboard.id}_${v2Storage.dashboard.revision}`}
        initialConfig={v2Storage.dashboard.config}
        useData={useDashboardData}
        onSave={handleSave}
        onCancel={() => {
          setDashboardEditorV2Override(false);
          window.location.reload();
        }}
        onShowDetails={onShowDetails}
      />
      <DashboardConflictDialogV2
        open={showConflictDialog}
        isSaving={v2Storage.isSaving}
        onReload={handleReloadConflict}
        onSaveAsCopy={handleSaveAsCopyConflict}
        onStay={() => setShowConflictDialog(false)}
      />
    </>
  );
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

  // Auftrag 150 / P07: Neuer persistenter V2-Editor hinter Rollout-Schalter
  if (isDashboardEditorV2Enabled()) {
    return (
      <PersonalExecutiveDashboardV2Container
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
