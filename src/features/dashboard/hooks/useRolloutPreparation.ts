// Executive Dashboard V2 (Auftrag 173 / P16a §2.1 Nr. 3):
// Zustand der Admin-Ansicht „Umstellung vorbereiten“: Laden, Entscheiden, Übernehmen.
// Nach jeder Aktion (auch bei veraltetem Stand) wird die Liste neu geladen, damit die
// Anzeige immer den Serverstand zeigt.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  translateV1ForRow,
  type RolloutDecision,
  type RolloutReconciliationRow,
} from '../model/dashboardRolloutReconciliation';
import {
  ROLLOUT_ERROR_MESSAGE,
  type RolloutError,
  type RolloutPrepService,
} from '../services/dashboardRolloutService';

export interface RolloutPreparationState {
  status: 'laden' | 'bereit' | 'fehler';
  rows: RolloutReconciliationRow[];
  loadError: RolloutError | null;
  actionError: { userId: string; message: string } | null;
  busyUserId: string | null;
  announcement: string;
  reload: () => Promise<void>;
  decide: (
    row: RolloutReconciliationRow,
    decision: Exclude<RolloutDecision, 'v1_uebernehmen'>,
  ) => Promise<boolean>;
  adopt: (row: RolloutReconciliationRow) => Promise<boolean>;
}

export function useRolloutPreparation(
  service: RolloutPrepService,
  enabled = true,
): RolloutPreparationState {
  const [status, setStatus] = useState<'laden' | 'bereit' | 'fehler'>('laden');
  const [rows, setRows] = useState<RolloutReconciliationRow[]>([]);
  const [loadError, setLoadError] = useState<RolloutError | null>(null);
  const [actionError, setActionError] = useState<RolloutPreparationState['actionError']>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    const res = await service.list();
    if (!mounted.current) return;
    if (res.ok) {
      setRows(res.value);
      setLoadError(null);
      setStatus('bereit');
    } else {
      setLoadError(res.error);
      setStatus('fehler');
    }
  }, [service]);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  const finish = useCallback(
    async (row: RolloutReconciliationRow, error: RolloutError | null, success: string) => {
      if (error) {
        setActionError({ userId: row.userId, message: ROLLOUT_ERROR_MESSAGE[error] });
        setAnnouncement(ROLLOUT_ERROR_MESSAGE[error]);
      } else {
        setActionError(null);
        setAnnouncement(success);
      }
      await reload();
      if (mounted.current) setBusyUserId(null);
      return error === null;
    },
    [reload],
  );

  const decide = useCallback<RolloutPreparationState['decide']>(
    async (row, decision) => {
      setBusyUserId(row.userId);
      const res = await service.decide(row, decision);
      const who = row.email ?? 'den Nutzer';
      const text =
        decision === 'v2_behalten'
          ? `Für ${who} bleibt der Pilot-Stand. Gespeichert.`
          : `Entscheidung für ${who} zurückgestellt.`;
      return finish(row, res.ok ? null : res.error, text);
    },
    [finish, service],
  );

  const adopt = useCallback<RolloutPreparationState['adopt']>(
    async (row) => {
      setBusyUserId(row.userId);
      const translated = translateV1ForRow(row);
      if (!translated.ok) return finish(row, 'ungueltig', '');
      const res = await service.adoptV1(row, translated.config);
      const who = row.email ?? 'den Nutzer';
      return finish(
        row,
        res.ok ? null : res.error,
        res.ok ? `Alter Stand für ${who} als Pilot-Revision ${res.value.revision} übernommen.` : '',
      );
    },
    [finish, service],
  );

  return { status, rows, loadError, actionError, busyUserId, announcement, reload, decide, adopt };
}
