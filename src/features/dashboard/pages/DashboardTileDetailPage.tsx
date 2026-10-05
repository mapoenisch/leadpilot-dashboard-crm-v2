// Executive Dashboard, Teilauftrag 7 (Auftrag 077): Detailseite `/dashboard/tiles/:tileId`, eigene
// Lazy-Route. Die Kachel stammt aus der gespeicherten Konfiguration, nie aus der URL allein; die
// Werte aus derselben Datenauflösung wie die Kachel. Sitzungsfilter reisen im Verlaufseintrag mit.
import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { routeForViewId } from '@/app/routes';
import { activeEntryOf, tileTitle } from '../hooks/dashboardEditorReducer';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardNavigation, type SessionFilters } from '../hooks/useDashboardNavigation';
import { useDashboardPreferences } from '../hooks/useDashboardPreferences';
import type { DashboardConfig, DashboardTileConfig } from '../model/dashboardConfig';
import { TileDetailContent } from '../components/detail/TileDetailContent';
import { DASHBOARD_PATH } from '../model/dashboardRollout';
import { DetailMissingTile, DetailStatus } from '../components/detail/DetailNotices';

export const NO_DETAIL_PAGE_TEXT =
  'Für diese Kachel gibt es keine eigene Fachseite. Alle verfügbaren Angaben stehen auf dieser Seite.';

function DetailFooter(props: { tile: DashboardTileConfig; onBack: () => void }) {
  const routeId = activeEntryOf(props.tile)?.detailRouteId;
  const target = routeId ? routeForViewId[routeId] : undefined;
  return (
    <footer className="flex flex-wrap items-center gap-[10px]" data-testid="tile-detail-footer">
      <Button variant="secondary" size="sm" onClick={props.onBack}>
        Zurück zum Dashboard
      </Button>
      {target ? (
        <Link
          to={target.path}
          onClick={(event) => {
            // Live-KPIs haben das Dashboard selbst als Fachseite: Rückweg mit Filtern und Fokus.
            if (target.path !== DASHBOARD_PATH) return;
            event.preventDefault();
            props.onBack();
          }}
          data-testid="tile-detail-domain-link"
          className="text-[14px] font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          Zur Fachübersicht: {target.title}
        </Link>
      ) : (
        <p
          className="m-0 text-[13px] text-[var(--color-text-muted)]"
          data-testid="tile-detail-no-domain"
        >
          {NO_DETAIL_PAGE_TEXT}
        </p>
      )}
    </footer>
  );
}

function ResolvedDetail(props: {
  tile: DashboardTileConfig;
  config: DashboardConfig;
  session: SessionFilters;
  onBack: () => void;
}) {
  const filters = props.session ? props.session.value : props.config.filters;
  const data = useDashboardData(props.tile, filters);
  return (
    <>
      <TileDetailContent
        tile={props.tile}
        entry={activeEntryOf(props.tile)}
        data={data}
        title={tileTitle(props.tile)}
      />
      <DetailFooter tile={props.tile} onBack={props.onBack} />
    </>
  );
}

export function DashboardTileDetailPage() {
  const { tileId = '' } = useParams();
  const preferences = useDashboardPreferences();
  const nav = useDashboardNavigation();
  // Wie die Ansicht: der mitgereiste Kontext gilt für diesen Besuch der Seite.
  const arrival = useRef(nav.incoming);
  const session = arrival.current?.session ?? null;
  const config = preferences.state?.config ?? null;
  const tile = config?.tiles.find((candidate) => candidate.tileId === tileId);

  let body;
  if (preferences.status === 'keine_sitzung') {
    body = <DetailStatus kind="keine_sitzung" />;
  } else if (preferences.status === 'fehler' && !config) {
    body = <DetailStatus kind="fehler" onReload={() => window.location.reload()} />;
  } else if (!config) {
    body = <DetailStatus kind="laden" />;
  } else if (!tile) {
    // Die gesuchte ID reist als Fokusziel mit: die Ansicht findet sie nicht und fokussiert ihre
    // Überschrift samt Ansage (Lehre 2 im Auftrag).
    body = <DetailMissingTile onBack={() => nav.backToDashboard(tileId, session)} />;
  } else {
    body = (
      <ResolvedDetail
        tile={tile}
        config={config}
        session={session}
        onBack={() => nav.backToDashboard(tile.tileId, session)}
      />
    );
  }

  return (
    <div
      className="flex w-full min-w-0 flex-col gap-[var(--space-6,24px)]"
      data-testid="tile-detail-page"
    >
      {body}
    </div>
  );
}
