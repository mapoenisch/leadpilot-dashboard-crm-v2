// Executive Dashboard V2 (Auftrag 165 / P12):
// Hook zur Verwaltung des Import-Ablaufs (Datei lesen, Prüfen, Vorschau, Zielwahl, Speichern).

import { useState, useCallback, useRef } from 'react';
import type { DashboardConfigV2 } from '../../../model/dashboardConfigV2';
import {
  type ImportSessionContext,
  type ParseImportResult,
  parseDashboardImportV2,
} from '../../../model/dashboardExchangeV2';
import { createDashboardV2 } from '../../../services/dashboardStorageV2';
import { listDashboardTeamsV2 } from '../../../services/dashboardTeamsV2';
import {
  DASHBOARD_VERSION_MESSAGES,
  getDashboardVersionErrorMessage,
} from '../../../model/dashboardVersionMessages';
import type {
  DashboardTeamV2,
  StorageResult,
  SavedDashboardV2Result,
} from '../../../services/dashboardStorageV2Types';

export interface UseDashboardImportParams {
  userId: string;
  organizationId: string;
  teams?: DashboardTeamV2[];
  personalCount?: number;
  onOpenDashboard?: (id: string) => Promise<boolean>;
  onRefreshList?: () => Promise<void>;
  createDashboardFn?: (params: {
    title: string;
    config: DashboardConfigV2;
    scope?: 'personal' | 'team';
    teamId?: string;
  }) => Promise<StorageResult<SavedDashboardV2Result>>;
}

export function useDashboardImport({
  userId,
  organizationId,
  teams: providedTeams = [],
  personalCount = 0,
  onOpenDashboard,
  onRefreshList,
  createDashboardFn,
}: UseDashboardImportParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [teams, setTeams] = useState<DashboardTeamV2[]>(providedTeams);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseImportResult | null>(null);
  const [title, setTitle] = useState('');
  const [targetScope, setTargetScope] = useState<'personal' | 'team'>('personal');
  const [targetTeamId, setTargetTeamId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const openImport = useCallback(async () => {
    setIsOpen(true);
    setFile(null);
    setParseResult(null);
    setTitle('');
    setTargetScope('personal');
    setSubmitError(null);

    let activeTeams = providedTeams;
    if (activeTeams.length === 0) {
      const res = await listDashboardTeamsV2();
      if (res.ok) {
        activeTeams = res.value;
        setTeams(res.value);
      }
    } else {
      setTeams(activeTeams);
    }
    setTargetTeamId(activeTeams.find((t) => t.canWrite)?.id);
  }, [providedTeams]);

  const fileReadSeqRef = useRef(0);
  // Sperrt das Schließen, solange die Speicheranfrage läuft: Ein „Abbrechen“ während
  // der Übermittlung würde sonst den Dialog schließen, der anschließende automatische
  // Dashboard-Wechsel aber trotzdem ohne erneuten Entwurfsschutz ausgeführt.
  const isSubmittingRef = useRef(false);

  const resetImport = useCallback(() => {
    fileReadSeqRef.current += 1;
    setIsOpen(false);
    setFile(null);
    setParseResult(null);
    setSubmitError(null);
  }, []);

  const closeImport = useCallback(() => {
    if (isSubmittingRef.current) return;
    resetImport();
  }, [resetImport]);

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      const seq = ++fileReadSeqRef.current;
      setFile(selectedFile);
      setParseResult(null);
      setSubmitError(null);

      try {
        const text = await selectedFile.text();
        if (seq !== fileReadSeqRef.current) return;
        const session: ImportSessionContext = {
          ownerUserId: userId,
          organizationId,
          scope: targetScope,
          teamId: targetTeamId,
        };
        const result = parseDashboardImportV2(text, session);
        if (seq !== fileReadSeqRef.current) return;
        setParseResult(result);
        if (result.ok) {
          setTitle(result.config.title);
        }
      } catch {
        if (seq !== fileReadSeqRef.current) return;
        setParseResult({
          ok: false,
          grund: DASHBOARD_VERSION_MESSAGES.invalidJson,
        });
      }
    },
    [userId, organizationId, targetScope, targetTeamId],
  );

  const handleTargetScopeChange = useCallback(
    (scope: 'personal' | 'team', teamId?: string) => {
      setTargetScope(scope);
      setTargetTeamId(teamId);
      // Wenn bereits eine Datei geparst wurde, Kontext aktualisieren
      if (parseResult && parseResult.ok) {
        const updatedConfig: DashboardConfigV2 = {
          ...parseResult.config,
          scope,
          teamId: scope === 'team' ? teamId : undefined,
        };
        setParseResult({ ok: true, config: updatedConfig, warnungen: parseResult.warnungen });
      }
    },
    [parseResult],
  );

  const executeImport = useCallback(async (): Promise<boolean> => {
    if (!parseResult || !parseResult.ok) return false;
    if (isSubmittingRef.current) return false;

    // Obergrenze vor dem Senden prüfen
    if (targetScope === 'personal' && personalCount >= 20) {
      setSubmitError('Die Obergrenze von 20 persönlichen Dashboards wurde erreicht.');
      return false;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    const finalTitle = title.trim() || parseResult.config.title || 'Importiertes Dashboard';
    const finalConfig: DashboardConfigV2 = {
      ...parseResult.config,
      title: finalTitle.slice(0, 80),
      scope: targetScope,
      teamId: targetScope === 'team' ? targetTeamId : undefined,
    };

    const createFn = createDashboardFn ?? createDashboardV2;
    // Dialog und Übermittlungssperre bleiben bis zum abgeschlossenen Dashboard-Wechsel aktiv,
    // damit der Editor währenddessen nicht bedienbar ist (sonst verwirft der Wechsel neue Änderungen).
    try {
      const res = await createFn({
        title: finalConfig.title,
        config: finalConfig,
        scope: targetScope,
        teamId: targetScope === 'team' ? targetTeamId : undefined,
      });
      if (!res.ok) {
        setSubmitError(getDashboardVersionErrorMessage(res.error));
        return false;
      }
      if (onRefreshList) await onRefreshList();
      if (onOpenDashboard) await onOpenDashboard(res.value.dashboardId);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
    resetImport();
    return true;
  }, [
    parseResult,
    targetScope,
    personalCount,
    title,
    targetTeamId,
    createDashboardFn,
    resetImport,
    onRefreshList,
    onOpenDashboard,
  ]);

  return {
    isOpen,
    teams,
    file,
    parseResult,
    title,
    setTitle,
    targetScope,
    targetTeamId,
    setTargetScope: handleTargetScopeChange,
    isSubmitting,
    submitError,
    openImport,
    closeImport,
    handleFileSelect,
    executeImport,
  };
}
