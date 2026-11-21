// Auftrag 171 (P15a): Kiosk-Seite unter `/dashboard/kiosk` (lazy, eigener Chunk).
// Kiosk ist eine Ansicht, kein Zugang: es gilt die normale Anmeldung samt RLS. Die Route liegt
// außerhalb des Layouts (keine Kopf-/Seitenleisten) und prüft die Anmeldung selbst: Wer beim Öffnen
// nicht angemeldet ist, landet auf /login. Läuft die Sitzung später ab, erscheint statt einer
// stillen Umleitung der Vollbildhinweis — Kacheln werden ausgehängt, Abfragen abgebrochen und
// aus dem Cache entfernt, Live-Abos beendet.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { useOrganization } from '@/auth/organizationContext';
import { liveKpiStreamStore } from '@/services/liveKpi/liveKpiStreamStore';
import { dashboardQueryKeys } from '../data/dashboardQueryKeys';
import { fetchAccessibleDashboards, fetchDashboardById } from '../hooks/dashboardV2Access';
import { getActiveDashboardV2Id } from '../services/dashboardStorageV2';
import { useTimeControlledData } from '../time/useTimeControlledData';
import { useSessionGuard } from '../hooks/useSessionGuard';
import { createSupabaseSessionSource } from '../hooks/supabaseSessionSource';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { parseKioskParams } from '../model/kioskParams';
import { KioskShell, type KioskDashboardSource } from '../components/kiosk/KioskShell';
import { KioskExpiredNotice } from '../components/kiosk/KioskNotices';
import { KioskAlarmIndicator } from '../components/kiosk/KioskAlarmIndicator';
import { useKioskTheme } from '../components/kiosk/useKioskTheme';

export function DashboardKioskPage() {
  const { user, isAuthenticated, isHydrated, logout } = useAuth();
  const { session, isLoading: isOrgLoading } = useOrganization();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useState(() => parseKioskParams(location.search));
  const theme = useKioskTheme(params.theme);
  const online = useOnlineStatus();
  const [source] = useState(createSupabaseSessionSource);
  const [lastValidDataAt, setLastValidDataAt] = useState<string | null>(null);
  // Einmal angemeldet geöffnet: ab dann entscheidet der Sitzungswächter, nicht die Umleitung.
  const startedRef = useRef(false);
  if (isHydrated && !isOrgLoading && isAuthenticated && session) startedRef.current = true;

  const handleExpired = useCallback(() => {
    // Sofort: laufende Abrufe abbrechen. Cache und Live-Feed werden erst geleert, wenn die Kacheln
    // ausgehängt sind (Effekt unten) — sonst startet reset() für noch gehaltene Abos neue Abrufe.
    void queryClient.cancelQueries();
  }, [queryClient]);

  const guard = useSessionGuard({
    source,
    isAuthenticated,
    onExpired: handleExpired,
  });

  const isExpired = startedRef.current && (guard.status === 'abgelaufen' || !session);
  useEffect(() => {
    if (!isExpired) return;
    // Läuft nach dem Aushängen der Kiosk-Hülle (Passive-Cleanup der Kacheln kommt zuerst).
    void queryClient.cancelQueries();
    queryClient.removeQueries();
    liveKpiStreamStore.reset();
  }, [isExpired, queryClient]);

  const organizationId = session?.organizationId ?? null;
  const userId = session?.userId ?? null;
  const dashboardSource = useMemo<KioskDashboardSource>(
    () => ({
      list: fetchAccessibleDashboards,
      load: fetchDashboardById,
      activeId: () =>
        organizationId && userId ? getActiveDashboardV2Id(organizationId, userId) : null,
    }),
    [organizationId, userId],
  );

  const handleReconnect = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
  }, [queryClient]);

  useEffect(() => {
    document.title = 'Kiosk – LeadPilot';
  }, []);

  const loginState = { from: { pathname: `${location.pathname}${location.search}` } };

  if (!startedRef.current) {
    if (!isHydrated || isOrgLoading) return null;
    return <Navigate to="/login" replace state={loginState} />;
  }

  if (guard.status === 'abgelaufen' || !session) {
    return (
      <KioskExpiredNotice
        lastValidDataAt={lastValidDataAt}
        expiredAt={guard.expiredAt}
        onRelogin={() => {
          void logout()
            .catch(() => {})
            .finally(() => navigate('/login', { replace: true, state: loginState }));
        }}
      />
    );
  }

  // Benutzerwechsel ohne Abmeldung: Hülle ausblenden, bis der Organisationskontext zur aktuellen
  // Auth-Identität gehört; der Schlüssel verwirft danach lokalen Zustand (Liste, Konfigurationen).
  // Eine reine Token-Erneuerung erzeugt zwar ein neues User-Objekt und lässt `isOrgLoading`
  // vorübergehend true werden, die Identität bleibt aber gleich: Dann bleibt die Hülle montiert,
  // damit Rotation und manuelle Pause nicht neu starten (Codex PR #212).
  if (!user || session.userId !== user.id) return null;

  return (
    <KioskShell
      key={`${session.organizationId}:${session.userId}`}
      requestedIds={params.ids}
      intervalSec={params.intervalSec}
      source={dashboardSource}
      useData={useTimeControlledData}
      online={online}
      theme={theme.theme}
      onToggleTheme={theme.toggle}
      alarmSlot={<KioskAlarmIndicator />}
      exitHref="/dashboard"
      onExit={(event) => {
        event.preventDefault();
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        navigate('/dashboard');
      }}
      onDataAsOf={setLastValidDataAt}
      onReconnect={handleReconnect}
    />
  );
}
