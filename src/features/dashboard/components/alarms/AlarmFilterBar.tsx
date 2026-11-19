// Executive Dashboard V2 (Auftrag 168 / P13c §2.1 Nr. 3–4):
// Filterleiste für die Alarmliste mit Dashboard-Auswahl, Status-Filtern und "Alle als gelesen markieren".

import React from 'react';
import { CheckCheck, Filter } from 'lucide-react';

export interface AlarmFilterBarProps {
  nurUngelesen: boolean;
  onChangeNurUngelesen: (val: boolean) => void;
  nurWarnungKritisch: boolean;
  onChangeNurWarnungKritisch: (val: boolean) => void;
  selectedDashboardId: string;
  onChangeDashboardId: (id: string) => void;
  dashboardOptions: Array<{ id: string; title: string }>;
  onMarkAllRead: () => Promise<void>;
  isMarkingAllRead?: boolean;
}

export const AlarmFilterBar: React.FC<AlarmFilterBarProps> = ({
  nurUngelesen,
  onChangeNurUngelesen,
  nurWarnungKritisch,
  onChangeNurWarnungKritisch,
  selectedDashboardId,
  onChangeDashboardId,
  dashboardOptions,
  onMarkAllRead,
  isMarkingAllRead = false,
}) => {
  return (
    <div
      data-testid="alarm-filter-bar"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface/40 p-3 text-xs"
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5 text-[var(--color-text-muted)] font-medium">
          <Filter size={14} />
          <span>Filter:</span>
        </div>

        {/* Dashboard-Filter */}
        {dashboardOptions.length > 0 && (
          <select
            data-testid="alarm-filter-dashboard-select"
            value={selectedDashboardId}
            onChange={(e) => onChangeDashboardId(e.target.value)}
            className="rounded border border-border bg-surface px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Alle Dashboards</option>
            {dashboardOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        )}

        {/* Nur ungelesene */}
        <label className="flex items-center gap-1.5 cursor-pointer select-none text-[var(--color-text-soft)] hover:text-white">
          <input
            type="checkbox"
            data-testid="alarm-filter-unread-toggle"
            checked={nurUngelesen}
            onChange={(e) => onChangeNurUngelesen(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary"
          />
          <span>Nur ungelesene</span>
        </label>

        {/* Nur Warnung / Kritisch */}
        <label className="flex items-center gap-1.5 cursor-pointer select-none text-[var(--color-text-soft)] hover:text-white">
          <input
            type="checkbox"
            data-testid="alarm-filter-severity-toggle"
            checked={nurWarnungKritisch}
            onChange={(e) => onChangeNurWarnungKritisch(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary"
          />
          <span>Nur Warnung / Kritisch</span>
        </label>
      </div>

      <div>
        <button
          type="button"
          data-testid="mark-all-read-btn"
          disabled={isMarkingAllRead}
          onClick={onMarkAllRead}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface-raised/80 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
        >
          <CheckCheck size={14} className="text-primary" />
          <span>Alle als gelesen markieren</span>
        </button>
      </div>
    </div>
  );
};
