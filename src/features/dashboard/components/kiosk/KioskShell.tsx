// Auftrag 171 (P15a): Kiosk-Hülle — lädt die lesbaren Dashboards, rotiert sie und zeigt sie
// ohne Menüs und ohne Bearbeitung. Quellen werden hineingereicht (echte App: Supabase/RLS;
// Vorschau: Beispieldaten), die Hülle selbst kennt weder Anmeldung noch Server.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { TileDataHook } from '../LazyDashboardTile';
import type {
  AccessibleDashboardListItemV2,
  StorageResult,
  StoredDashboardV2Row,
} from '../../services/dashboardStorageV2Types';
import type { LiveKpiStreamStore } from '@/services/liveKpi/liveKpiStreamStore';
import type { OnlineStatus } from '../../hooks/useOnlineStatus';
import { useKioskRotation } from '../../hooks/useKioskRotation';
import { TimeControlProvider } from '../../time/TimeControlProvider';
import { resolveKioskRotation, type KioskTheme } from '../../model/kioskParams';
import { createKioskDataHook, KioskConnectivityContext } from './kioskData';
import { KioskBody } from './KioskBody';
import './kiosk.css';

export interface KioskDashboardSource {
  list: () => Promise<StorageResult<AccessibleDashboardListItemV2[]>>;
  load: (id: string) => Promise<StorageResult<StoredDashboardV2Row>>;
  /** Zuletzt aktives Dashboard, wenn die Adresse keine IDs nennt. */
  activeId?: () => string | null;
}

export interface KioskShellProps {
  requestedIds: readonly string[];
  intervalSec: number;
  source: KioskDashboardSource;
  useData: TileDataHook;
  online: OnlineStatus;
  liveStore?: LiveKpiStreamStore;
  liveConfigured?: boolean;
  theme: KioskTheme;
  onToggleTheme: () => void;
  alarmSlot?: ReactNode;
  exitHref: string;
  onExit: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  /** Meldet den Datenstand nach außen (für den Ablaufhinweis). */
  onDataAsOf?: (iso: string | null) => void;
  /** Wird nach Wiederverbindung einmal aufgerufen (konsistenter Neuladestand). */
  onReconnect?: () => void;
}

type ListState =
  | { status: 'laden' }
  | { status: 'fehler' }
  | { status: 'bereit'; items: AccessibleDashboardListItemV2[] };

export function KioskShell(props: KioskShellProps) {
  const { requestedIds, intervalSec, source, online } = props;
  const [list, setList] = useState<ListState>({ status: 'laden' });
  const [listAttempt, setListAttempt] = useState(0);
  const [configs, setConfigs] = useState<ReadonlyMap<string, StoredDashboardV2Row>>(new Map());
  const [denied, setDenied] = useState<ReadonlySet<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  // Technischer Ladefehler der Konfiguration (kein Rechteproblem): Hinweis mit erneutem Versuch.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  // Referenzstabiler Datenhook: Kacheln dürfen beim Offline-Wechsel nicht neu montieren.
  const [kioskUseData] = useState(() => createKioskDataHook(props.useData));

  useEffect(() => {
    let cancelled = false;
    void source.list().then((res) => {
      if (cancelled) return;
      setList(res.ok ? { status: 'bereit', items: res.value } : { status: 'fehler' });
    });
    return () => {
      cancelled = true;
    };
  }, [source, listAttempt]);

  // Wiederverbindung: Liste erneut versuchen und Daten einmal neu laden.
  const [wasOnline, setWasOnline] = useState(online.online);
  const { onReconnect } = props;
  useEffect(() => {
    if (online.online === wasOnline) return;
    setWasOnline(online.online);
    if (online.online) {
      onReconnect?.();
      if (list.status === 'fehler') setListAttempt((n) => n + 1);
    }
  }, [online.online, wasOnline, list.status, onReconnect]);

  const rotation = useMemo(() => {
    if (list.status !== 'bereit') return { ids: [], skipped: [] };
    const resolved = resolveKioskRotation(requestedIds, list.items, source.activeId?.() ?? null);
    return {
      ids: resolved.ids.filter((id) => !denied.has(id)),
      skipped: [...resolved.skipped, ...resolved.ids.filter((id) => denied.has(id))],
    };
  }, [list, requestedIds, source, denied]);

  const rot = useKioskRotation({
    count: rotation.ids.length,
    intervalMs: intervalSec * 1000,
    loading: pendingId !== null,
    offline: !online.online,
  });
  const currentId = rotation.ids[rot.index] ?? rotation.ids[0] ?? null;

  // Konfiguration des aktuellen Dashboards bei jeder Aktivierung frisch laden (Änderungen über
  // viele Stunden); offline bleibt der zuletzt geladene Stand stehen.
  useEffect(() => {
    if (!currentId || !online.online) return;
    let cancelled = false;
    setPendingId(currentId);
    void source.load(currentId).then((res) => {
      if (cancelled) return;
      setPendingId(null);
      if (res.ok) {
        setLoadError(null);
        setConfigs((prev) => new Map(prev).set(currentId, res.value));
      } else if (res.error.kind === 'nicht_gefunden' || res.error.kind === 'nicht_berechtigt') {
        setLoadError(null);
        setDenied((prev) => new Set(prev).add(currentId));
      } else {
        setLoadError(currentId);
      }
    });
    return () => {
      cancelled = true;
      setPendingId(null);
    };
  }, [currentId, online.online, source, loadAttempt]);

  const current = currentId ? (configs.get(currentId) ?? null) : null;
  const connectivity = useMemo(() => ({ offlineSince: online.offlineSince }), [online]);

  return (
    <KioskConnectivityContext.Provider value={connectivity}>
      <TimeControlProvider>
        <KioskBody
          {...props}
          listStatus={list.status}
          onRetryList={() => {
            setList({ status: 'laden' });
            setListAttempt((n) => n + 1);
          }}
          loadFailed={loadError !== null && loadError === currentId && current === null}
          onRetryLoad={() => {
            setLoadError(null);
            setLoadAttempt((n) => n + 1);
          }}
          dashboard={current}
          isLoadingCurrent={pendingId !== null && current === null}
          position={rot.index + 1}
          total={rotation.ids.length}
          skippedCount={rotation.skipped.length}
          rotation={rot}
          useData={kioskUseData}
        />
      </TimeControlProvider>
    </KioskConnectivityContext.Provider>
  );
}
