// Executive Dashboard, Teilauftrag 7 (Auftrag 077): persönliche Ansicht unter `/dashboard` (nur mit
// eingeschaltetem Rollout-Schalter). Verbindet Speicherung, Datenauflösung und Arbeitsbereich mit
// dem Router: „Details“ öffnet die Detailseite, die Rückkehr bringt Sitzungsfilter und Fokus mit.
import { useRef, useState } from 'react';
import { DashboardWorkspace } from '../components/DashboardWorkspace';
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
    <div className="flex w-full flex-col gap-[var(--space-6,24px)]">
      <header className="flex flex-col gap-[6px]">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          Übersicht
        </p>
        <h2
          ref={headingRef}
          tabIndex={-1}
          data-testid="dashboard-heading"
          className="m-0 text-[24px] font-semibold text-[var(--color-text-primary,#fff)] outline-none"
        >
          Executive Dashboard
        </h2>
        <p className="m-0 text-[14px] text-[var(--color-text-muted)]">
          Deine persönliche Auswahl an Kennzahlen und Übersichten. „Details“ zeigt Herkunft,
          Zeitraum und Werte jeder Kachel.
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
      />
    </div>
  );
}
