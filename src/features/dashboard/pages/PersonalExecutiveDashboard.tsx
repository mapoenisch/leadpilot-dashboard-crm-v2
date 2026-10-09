// Executive Dashboard, Teilauftrag 7 (Auftrag 077): persönliche Ansicht unter `/dashboard` (nur mit
// eingeschaltetem Rollout-Schalter). Verbindet Speicherung, Datenauflösung und Arbeitsbereich mit
// dem Router: „Details“ öffnet die Detailseite, die Rückkehr bringt Sitzungsfilter und Fokus mit.
import { useRef, useState } from 'react';
import { DashboardWorkspace } from '../components/DashboardWorkspace';
import { useBrowserBackGuard } from '../hooks/useBrowserBackGuard';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardNavigation } from '../hooks/useDashboardNavigation';
import { useDashboardPreferences } from '../hooks/useDashboardPreferences';

export const RETURN_ANNOUNCEMENT = 'Zurück im Dashboard. Die Filter deiner Sitzung gelten weiter.';
export const RETURN_MISSING_ANNOUNCEMENT =
  'Zurück im Dashboard. Die zuvor geöffnete Kachel gibt es nicht mehr.';

export function PersonalExecutiveDashboard() {
  const preferences = useDashboardPreferences();
  const nav = useDashboardNavigation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Der mitgereiste Kontext gilt nur beim Öffnen der Seite; spätere Ersetzungen des Eintrags
  // (beim Öffnen der Details) dürfen den Arbeitsbereich nicht erneut steuern.
  const [arrival] = useState(nav.incoming);
  const [announcement, setAnnouncement] = useState('');

  return (
    <div className="flex w-full flex-col gap-[var(--space-4,16px)]">
      {/* Auftrag 089 (Paket E): Die Kopfzeile nennt Bereich und Seite bereits – hier nur noch eine
          kompakte Zeile statt Bereichszeile, großer Überschrift und Einleitung. */}
      <header className="flex flex-wrap items-baseline gap-x-[12px] gap-y-[4px]">
        <h2
          ref={headingRef}
          tabIndex={-1}
          data-testid="dashboard-heading"
          className="m-0 text-[18px] font-semibold text-[var(--color-text-primary,#fff)] outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
