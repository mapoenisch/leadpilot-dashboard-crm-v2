// Auftrag 171 (P15a): Kiosk-Vorschau ohne Anmeldung (`dashboard-vorschau.html?bereich=kiosk`).
// Gleiche Kiosk-Hülle wie die echte Seite, aber mit Beispieldaten. Szenario-Parameter:
//   ids=<id1>,<id2>   Rotationsliste (unbekannte IDs werden übersprungen, wie bei fehlenden Rechten)
//   intervall=<s>     Wechselintervall 30–600 s
//   ablauf=<s>        simuliert ein Token, das nach <s> Sekunden abläuft und nie erneuert wird
//   offline=1         schaltet nach dem ersten Laden offline (Screenshot); sonst gilt der Browser
//   theme=hell|dunkel
import { useCallback, useEffect, useMemo, useState } from 'react';
import { KioskShell, type KioskDashboardSource } from '../components/kiosk/KioskShell';
import { KioskExpiredNotice } from '../components/kiosk/KioskNotices';
import { useKioskTheme } from '../components/kiosk/useKioskTheme';
import type { TileDataHook } from '../components/LazyDashboardTile';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useSessionGuard, type SessionSource } from '../hooks/useSessionGuard';
import { parseKioskParams } from '../model/kioskParams';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import type {
  AccessibleDashboardListItemV2,
  StoredDashboardV2Row,
} from '../services/dashboardStorageV2Types';
import { useTimeControlledSource } from '../time/useTimeControlledData';
import { useEditorPreviewData } from './editorPreviewData';
import { createPreviewLiveStore } from './previewLiveStore';
import { initPreviewConfig } from './previewDashboardMutations';
import {
  createPreviewThresholdsConfig,
  createPreviewThresholdsListItem,
} from './previewThresholds';
import { INITIAL_PREVIEW_DASHBOARDS } from './previewTeamDashboards';

const usePreviewKioskData: TileDataHook = (tile, filters, options) =>
  useTimeControlledSource(useEditorPreviewData, tile, filters, options);

/** Lesbare Beispiel-Dashboards; alles andere gilt als nicht vorhanden bzw. nicht lesbar. */
function buildPreviewDashboards(): Map<string, StoredDashboardV2Row> {
  const entries: Array<[AccessibleDashboardListItemV2, DashboardConfigV2]> = [
    [createPreviewThresholdsListItem(false), createPreviewThresholdsConfig()],
    ...INITIAL_PREVIEW_DASHBOARDS.slice(0, 1).map(
      (item): [AccessibleDashboardListItemV2, DashboardConfigV2] => [
        item,
        initPreviewConfig(false, null),
      ],
    ),
  ];
  return new Map(
    entries.map(([item, config]) => [
      item.id,
      {
        id: item.id,
        title: item.title,
        scope: item.scope,
        revision: item.revision,
        config,
        updatedAt: item.updatedAt,
        teamId: item.teamId,
        teamName: item.teamName,
        canWrite: false,
      },
    ]),
  );
}

function previewSessionSource(expiresInSec: number): SessionSource | null {
  if (!(expiresInSec > 0)) return null;
  const expiresAt = Date.now() + expiresInSec * 1000;
  return { read: async () => expiresAt, subscribe: () => () => {} };
}

export function KioskPreview() {
  const search = typeof window === 'undefined' ? '' : window.location.search;
  const [params] = useState(() => parseKioskParams(search));
  const [scenario] = useState(() => {
    const sp = new URLSearchParams(search);
    return {
      expiresInSec: Number(sp.get('ablauf') ?? 0),
      forcedOffline: sp.get('offline') === '1',
    };
  });
  const [dashboards] = useState(buildPreviewDashboards);
  const [liveStore] = useState(() => createPreviewLiveStore('verbunden'));
  const [sessionSource] = useState(() => previewSessionSource(scenario.expiresInSec));
  const [forcedOfflineSince] = useState(() => new Date(Date.now() - 4 * 60 * 1000).toISOString());
  const [lastValidDataAt, setLastValidDataAt] = useState<string | null>(null);
  const theme = useKioskTheme(params.theme);
  const browserOnline = useOnlineStatus();
  // Erst nach dem ersten Laden offline schalten: der Kiosk zeigt dann den letzten Stand.
  const [offlineActive, setOfflineActive] = useState(false);
  useEffect(() => {
    if (!scenario.forcedOffline) return;
    const timer = setTimeout(() => setOfflineActive(true), 800);
    return () => clearTimeout(timer);
  }, [scenario.forcedOffline]);
  const online = offlineActive
    ? { online: false, offlineSince: forcedOfflineSince }
    : browserOnline;
  const guard = useSessionGuard({ source: sessionSource, isAuthenticated: true, graceMs: 0 });

  const source = useMemo<KioskDashboardSource>(
    () => ({
      list: async () => ({
        ok: true,
        value: Array.from(dashboards.values()).map((d) => ({
          id: d.id,
          title: d.title,
          scope: d.scope,
          revision: d.revision,
          tileCount: d.config.tiles.length,
          sectionCount: d.config.sections?.length ?? 0,
          updatedAt: d.updatedAt,
          teamId: d.teamId ?? null,
          teamName: d.teamName ?? null,
          canWrite: false,
        })),
      }),
      load: async (id) => {
        const found = dashboards.get(id);
        return found
          ? { ok: true, value: found }
          : { ok: false, error: { kind: 'nicht_gefunden' } };
      },
      activeId: () => null,
    }),
    [dashboards],
  );
  // Vorschau: „Kiosk beenden“ folgt dem Link zurück zum V2-Editor.
  const onExit = useCallback(() => {}, []);

  if (guard.status === 'abgelaufen') {
    return (
      <KioskExpiredNotice
        lastValidDataAt={lastValidDataAt}
        expiredAt={guard.expiredAt}
        onRelogin={() => window.location.reload()}
      />
    );
  }

  return (
    <KioskShell
      requestedIds={params.ids}
      intervalSec={params.intervalSec}
      source={source}
      useData={usePreviewKioskData}
      online={online}
      liveStore={liveStore}
      liveConfigured
      theme={theme.theme}
      onToggleTheme={theme.toggle}
      exitHref="?bereich=editor_v2"
      onExit={onExit}
      onDataAsOf={setLastValidDataAt}
    />
  );
}
