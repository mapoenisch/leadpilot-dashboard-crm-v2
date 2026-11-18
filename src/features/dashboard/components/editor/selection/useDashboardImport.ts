// Executive Dashboard V2 (Auftrag 165 / P12):
// Hook zur Verwaltung des Import-Ablaufs (Datei lesen, Prüfen, Vorschau, Zielwahl, Speichern).

import { useState, useCallback } from 'react';
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

  const closeImport = useCallback(() => {
    setIsOpen(false);
    setFile(null);
    setParseResult(null);
    setSubmitError(null);
  }, []);

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      setSubmitError(null);

      try {
        const text = await selectedFile.text();
        const session: ImportSessionContext = {
          ownerUserId: userId,
          organizationId,
          scope: targetScope,
          teamId: targetTeamId,
        };
        const result = parseDashboardImportV2(text, session);
        setParseResult(result);
        if (result.ok) {
          setTitle(result.config.title);
        }
      } catch {
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

    // Obergrenze vor dem Senden prüfen
    if (targetScope === 'personal' && personalCount >= 20) {
      setSubmitError('Die Obergrenze von 20 persönlichen Dashboards wurde erreicht.');
      return false;
    }

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
    const res = await createFn({
      title: finalConfig.title,
      config: finalConfig,
      scope: targetScope,
      teamId: targetScope === 'team' ? targetTeamId : undefined,
    });

    setIsSubmitting(false);

    if (res.ok) {
      closeImport();
      if (onRefreshList) await onRefreshList();
      if (onOpenDashboard) await onOpenDashboard(res.value.dashboardId);
      return true;
    } else {
      setSubmitError(getDashboardVersionErrorMessage(res.error));
      return false;
    }
  }, [
    parseResult,
    targetScope,
    personalCount,
    title,
    targetTeamId,
    createDashboardFn,
    closeImport,
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
