// Executive Dashboard V2 (Auftrag 168 / P13c §2.1 Nr. 8):
// Neue Ansicht "Alarme" im Admin-Bereich (nur Admin).
// Zeigt alle Regeln der Organisation und ermöglicht die Übernahme verwaister Regeln (verantwortlicher_ohne_rechte).

import { useState } from 'react';
import { Bell, ShieldAlert, CheckCircle, Trash2, ArrowRightCircle, Loader2 } from 'lucide-react';
import { useOrganization } from '@/auth/organizationContext';
import { ForbiddenView } from '../components/InvitationForm';
import { useDashboardAlarms } from '@/features/dashboard/hooks/useDashboardAlarms';
import { AlarmWorkerBanner } from '@/features/dashboard/components/alarms/AlarmWorkerBanner';
import { useModalA11y } from '@/features/dashboard/components/editor/versions/useModalA11y';
import type { OrganizationAlarmRuleItem } from '@/features/dashboard/services/dashboardAlarmService';

export function AdminAlarmsPage() {
  const { session, isLoading: isOrgLoading } = useOrganization();
  const isAdmin = session?.role === 'admin';

  const {
    orgRules,
    isOrgRulesLoading,
    isOrgRulesError,
    takeoverRule,
    deleteRule,
    refetchOrgRules,
  } = useDashboardAlarms({
    loadOrgRules: true,
  });

  const [operatingRuleId, setOperatingRuleId] = useState<string | null>(null);
  const [deleteTargetRule, setDeleteTargetRule] = useState<OrganizationAlarmRuleItem | null>(null);

  const isDeleting = operatingRuleId !== null && operatingRuleId === deleteTargetRule?.id;
  const deleteModalRef = useModalA11y<HTMLDivElement>({
    isOpen: Boolean(deleteTargetRule),
    onClose: () => {
      if (!isDeleting) setDeleteTargetRule(null);
    },
    closeOnEscape: !isDeleting,
  });

  const isPreview = typeof window !== 'undefined' && window.location.pathname.includes('vorschau');

  if (isOrgLoading && !isPreview) {
    return (
      <div className="flex items-center justify-center py-16 text-text">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-xs">Lade Administrationsbereich…</span>
      </div>
    );
  }

  if (!isAdmin && !isPreview) {
    return <ForbiddenView />;
  }

  const handleTakeover = async (ruleId: string) => {
    setOperatingRuleId(ruleId);
    try {
      await takeoverRule(ruleId);
      await refetchOrgRules();
    } finally {
      setOperatingRuleId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetRule) return;
    setOperatingRuleId(deleteTargetRule.id);
    try {
      await deleteRule(deleteTargetRule.id);
      await refetchOrgRules();
      setDeleteTargetRule(null);
    } finally {
      setOperatingRuleId(null);
    }
  };

  return (
    <div data-testid="admin-alarms-page" className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="m-0 text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Alarm-Verwaltung (Organisation)
          </h2>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Übersicht aller aktiven und pausierten Alarmregeln der Organisation sowie Übernahme
            verwaister Regeln.
          </p>
        </div>
      </div>

      {/* Ausfallhinweis */}
      <AlarmWorkerBanner />

      {isOrgRulesLoading ? (
        <div className="flex items-center justify-center py-16 text-text">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-xs">Lade Alarmregeln…</span>
        </div>
      ) : isOrgRulesError && orgRules.length === 0 ? (
        <div
          data-testid="admin-alarms-error"
          role="alert"
          className="flex flex-col items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/5 py-12 px-4 text-center text-text"
        >
          <ShieldAlert className="h-8 w-8 text-rose-400 mb-2" />
          <h4 className="m-0 text-sm font-semibold text-white">
            Alarmregeln konnten nicht geladen werden
          </h4>
          <p className="mt-1 text-xs text-[var(--color-text-muted)] max-w-sm">
            Die Liste ist deshalb unvollständig. Bitte erneut versuchen.
          </p>
          <button
            type="button"
            data-testid="admin-alarms-retry"
            onClick={() => void refetchOrgRules()}
            className="mt-3 rounded bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
          >
            Erneut laden
          </button>
        </div>
      ) : orgRules.length === 0 ? (
        <div
          data-testid="admin-alarms-empty"
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 px-4 text-center text-text"
        >
          <Bell className="h-10 w-10 text-[var(--color-text-muted)] opacity-50 mb-2" />
          <h4 className="m-0 text-sm font-semibold text-white">Keine Alarmregeln vorhanden</h4>
          <p className="mt-1 text-xs text-[var(--color-text-muted)] max-w-sm">
            In dieser Organisation sind aktuell keine Kachel-Alarme eingerichtet.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface/40 overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs text-text border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-raised text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="px-4 py-3">Dashboard & Kachel</th>
                <th className="px-4 py-3">Kennzahl</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Verantwortlich</th>
                <th className="px-4 py-3">Letzter Wert</th>
                <th className="px-4 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {orgRules.map((rule) => {
                const isOrphaned = rule.status === 'verantwortlicher_ohne_rechte';
                const isOperating = operatingRuleId === rule.id;

                return (
                  <tr
                    key={rule.id}
                    data-testid={`admin-alarm-row-${rule.id}`}
                    data-rule-id={rule.id}
                    data-status={rule.status}
                    className={`hover:bg-white/[0.02] transition-colors ${
                      isOrphaned ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{rule.dashboardTitle}</div>
                      <div className="font-mono text-[11px] text-[var(--color-text-muted)]">
                        {rule.tileId}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[var(--color-text-soft)]">
                      {rule.catalogId}
                    </td>
                    <td className="px-4 py-3">
                      {isOrphaned ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          <ShieldAlert size={11} />
                          Rechte verloren
                        </span>
                      ) : rule.status === 'aktiv' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          <CheckCircle size={11} />
                          Aktiv
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-500/20 px-2 py-0.5 text-[10px] font-semibold text-neutral-300">
                          Pausiert
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white font-medium">{rule.responsibleEmail}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[var(--color-text-muted)]">
                      {rule.letzterMesswert !== null && rule.letzterMesswert !== undefined ? (
                        <span>
                          {rule.letzterMesswert} ({rule.bestaetigteStufe ?? 'normal'})
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isOrphaned && (
                          <button
                            type="button"
                            data-testid={`admin-alarm-takeover-btn-${rule.id}`}
                            disabled={isOperating}
                            onClick={() => handleTakeover(rule.id)}
                            className="flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-[11px] font-semibold text-black hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <ArrowRightCircle size={13} />
                            <span>Übernehmen & fortsetzen</span>
                          </button>
                        )}
                        <button
                          type="button"
                          data-testid="delete-org-alarm-rule-btn"
                          disabled={isOperating}
                          onClick={() => setDeleteTargetRule(rule)}
                          className="rounded p-1 text-[var(--color-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Regel löschen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bestätigungs-Dialog zum Löschen */}
      {deleteTargetRule && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div
            ref={deleteModalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="w-full max-w-sm rounded-xl border border-border bg-[var(--color-bg-deep,#041110)] p-5 shadow-2xl text-xs space-y-3 outline-none"
          >
            <h3 id="delete-dialog-title" className="m-0 text-sm font-semibold text-white">
              Alarmregel löschen?
            </h3>
            <p className="text-[var(--color-text-muted)]">
              Möchtest du die Alarmregel für Kachel{' '}
              <strong className="text-white">{deleteTargetRule.tileId}</strong> auf Dashboard{' '}
              <strong className="text-white">{deleteTargetRule.dashboardTitle}</strong> wirklich
              löschen?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-soft">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTargetRule(null)}
                className="rounded-md border border-border bg-transparent px-3 py-1.5 text-xs text-text hover:bg-surface-raised cursor-pointer disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={isDeleting}
                data-testid="confirm-delete-org-alarm-btn"
                onClick={handleDelete}
                className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Endgültig löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAlarmsPage;
