// Executive Dashboard V2 (Auftrag 168 / P13c):
// Inspector-Abschnitt für Server-Alarme (Tab Schwellenwerte).
// Erlaubt das Einschalten, Konfigurieren von Mindestdauer/Abklingzeit, Pausieren und Löschen.

import React, { useState } from 'react';
import { Bell, Trash2, Pause, Play, AlertCircle } from 'lucide-react';
import { useOrganization } from '@/auth/organizationContext';
import { checkAlarmTogglePermitted } from '../../../../model/dashboardAlarmPermitted';
import { getAlarmCapability } from '../../../../model/alarmCapability';
import { useDashboardAlarms } from '../../../../hooks/useDashboardAlarms';
import type { DashboardTileConfigV2 } from '../../../../model/dashboardConfigV2';
import type { ActiveCatalogEntry, CatalogEntry } from '../../../../model/dashboardCatalog';

export interface AlarmSectionProps {
  selectedTile: DashboardTileConfigV2;
  dashboardId?: string;
  catalogEntry?: ActiveCatalogEntry | CatalogEntry;
  hasValidRule?: boolean;
  isDirty?: boolean;
  canWrite?: boolean;
}

const MINDESTDAUER_OPTIONS = [
  { label: '0 Minuten (sofort beim 1. Lauf)', laeufe: 1 },
  { label: '5 Minuten (1 Lauf)', laeufe: 1 },
  { label: '10 Minuten (2 Läufe, Standard)', laeufe: 2 },
  { label: '15 Minuten (3 Läufe)', laeufe: 3 },
  { label: '30 Minuten (6 Läufe)', laeufe: 6 },
  { label: '60 Minuten (12 Läufe)', laeufe: 12 },
  { label: '120 Minuten (24 Läufe)', laeufe: 24 },
];

const ABKLINGZEIT_OPTIONS = [
  { label: '0 Minuten (sofort)', sekunden: 0 },
  { label: '15 Minuten', sekunden: 900 },
  { label: '60 Minuten (1 Stunde, Standard)', sekunden: 3600 },
  { label: '240 Minuten (4 Stunden)', sekunden: 14400 },
  { label: '1440 Minuten (24 Stunden)', sekunden: 86400 },
];

export const AlarmSection: React.FC<AlarmSectionProps> = ({
  selectedTile,
  dashboardId,
  catalogEntry,
  hasValidRule = true,
  isDirty = false,
  canWrite = true,
}) => {
  const { session } = useOrganization();
  const userRole = session?.role ?? 'viewer';

  const { rules, createRule, updateRule, pauseRule, resumeRule, deleteRule } = useDashboardAlarms({
    dashboardId,
  });

  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const existingRule = rules.find((r) => r.tileId === selectedTile.id);
  const isAlarmEnabled = Boolean(existingRule);

  const catalogId = (catalogEntry as ActiveCatalogEntry)?.id ?? selectedTile.catalogId ?? '';
  const capability = getAlarmCapability(catalogId);
  const isAlarmCapable = capability?.status === 'alarmfaehig';

  const permCheck = checkAlarmTogglePermitted({
    userRole,
    canWriteDashboard: canWrite,
    isDashboardSaved: !isDirty && Boolean(dashboardId),
    isTileDraft: isDirty,
    hasValidV2Rule: hasValidRule,
    isAlarmCapable,
    hasSupportedFiltersOnly: true,
  });

  const handleToggleAlarm = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      if (!dashboardId || !selectedTile.threshold) return;
      await createRule({
        dashboardId,
        tileId: selectedTile.id,
        catalogId,
        ruleConfig: selectedTile.threshold as unknown as Record<string, unknown>,
        mindestdauerLaeufe: 2,
        abklingzeitSekunden: 3600,
      });
    } else {
      if (existingRule) {
        setConfirmDelete(true);
      }
    }
  };

  const handleChangeMindestdauer = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!existingRule) return;
    const laeufe = parseInt(e.target.value, 10);
    await updateRule({
      ruleId: existingRule.id,
      ruleConfig: existingRule.ruleConfig,
      mindestdauerLaeufe: laeufe,
      abklingzeitSekunden: existingRule.abklingzeitSekunden,
    });
  };

  const handleChangeAbklingzeit = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!existingRule) return;
    const sek = parseInt(e.target.value, 10);
    await updateRule({
      ruleId: existingRule.id,
      ruleConfig: existingRule.ruleConfig,
      mindestdauerLaeufe: existingRule.mindestdauerLaeufe,
      abklingzeitSekunden: sek,
    });
  };

  const handlePauseResume = async () => {
    if (!existingRule) return;
    if (existingRule.status === 'aktiv') {
      await pauseRule(existingRule.id);
    } else {
      await resumeRule(existingRule.id);
    }
  };

  const handleDelete = async () => {
    if (!existingRule) return;
    setIsDeleting(true);
    await deleteRule(existingRule.id);
    setIsDeleting(false);
    setConfirmDelete(false);
  };

  return (
    <div
      data-testid="alarm-section"
      className="mt-4 border-t border-[var(--color-border,#1b3d39)] pt-3 text-xs"
    >
      <div className="flex items-start justify-between gap-2">
        <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-white">
          <input
            type="checkbox"
            data-testid="alarm-toggle-checkbox"
            checked={isAlarmEnabled}
            disabled={!permCheck.permitted && !isAlarmEnabled}
            onChange={handleToggleAlarm}
            className="rounded border-[var(--color-border,#1b3d39)]"
          />
          <span className="flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5 text-primary" />
            Server-Alarm bei Schwellenwert-Überschreitung
          </span>
        </label>
      </div>

      {!permCheck.permitted && !isAlarmEnabled && (
        <div
          data-testid="alarm-disabled-reason"
          className="mt-2 flex items-center gap-1.5 rounded bg-amber-500/10 p-2 text-[11px] text-amber-300 border border-amber-500/20"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{permCheck.reason}</span>
        </div>
      )}

      {isAlarmEnabled && existingRule && (
        <div className="mt-3 space-y-3 rounded-lg border border-white/10 bg-black/40 p-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--color-text-muted)]">Status:</span>
            <span
              data-testid="alarm-status-badge"
              className={`font-semibold ${
                existingRule.status === 'aktiv'
                  ? 'text-emerald-400'
                  : existingRule.status === 'pausiert'
                    ? 'text-amber-400'
                    : 'text-rose-400'
              }`}
            >
              {existingRule.status === 'aktiv'
                ? 'Aktiv (Prüfung alle 5 Min.)'
                : existingRule.status === 'pausiert'
                  ? 'Pausiert'
                  : existingRule.status}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-white mb-1">Mindestdauer:</label>
            <select
              data-testid="alarm-mindestdauer-select"
              value={existingRule.mindestdauerLaeufe}
              onChange={handleChangeMindestdauer}
              className="w-full rounded bg-surface border border-white/10 px-2 py-1 text-xs text-white"
            >
              {MINDESTDAUER_OPTIONS.map((opt) => (
                <option key={opt.laeufe} value={opt.laeufe}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
              Anzahl aufeinanderfolgender Prüfungen (je 5 Min.), bevor ein Alarm ausgelöst wird.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-white mb-1">Abklingzeit:</label>
            <select
              data-testid="alarm-abklingzeit-select"
              value={existingRule.abklingzeitSekunden}
              onChange={handleChangeAbklingzeit}
              className="w-full rounded bg-surface border border-white/10 px-2 py-1 text-xs text-white"
            >
              {ABKLINGZEIT_OPTIONS.map((opt) => (
                <option key={opt.sekunden} value={opt.sekunden}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
              Mindestwartezeit zwischen zwei wiederholten Benachrichtigungen bei anhaltender
              Überschreitung.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              data-testid="alarm-pause-btn"
              onClick={handlePauseResume}
              className="flex-1 flex items-center justify-center gap-1.5 rounded bg-white/10 px-2 py-1.5 text-xs text-white hover:bg-white/20"
            >
              {existingRule.status === 'aktiv' ? (
                <>
                  <Pause className="h-3.5 w-3.5" /> Pausieren
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" /> Fortsetzen
                </>
              )}
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                data-testid="alarm-delete-init-btn"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center justify-center gap-1 rounded bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20"
                title="Alarm löschen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-testid="alarm-delete-confirm-btn"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="rounded bg-rose-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-700"
                >
                  Löschen bestätigen
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded bg-white/10 px-2 py-1.5 text-[11px] text-white hover:bg-white/20"
                >
                  Abbrechen
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
