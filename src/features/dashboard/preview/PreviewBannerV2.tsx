// Executive Dashboard V2 (Auftrag 168 / P13c):
// Vorschau-Banner mit Szenarien-Umschaltung für Alarme, Admin und Editor.

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { AlarmBell } from '../components/alarms/AlarmBell';
import { AlarmWorkerBanner } from '../components/alarms/AlarmWorkerBanner';

export interface PreviewBannerV2Props {
  saveMessage: string | null;
  alarmeScenario: boolean;
  activeTab?: 'editor' | 'alarme' | 'admin';
  onTabChange?: (tab: 'editor' | 'alarme' | 'admin') => void;
}

export const PreviewBannerV2: React.FC<PreviewBannerV2Props> = ({
  saveMessage,
  alarmeScenario,
  activeTab = 'editor',
  onTabChange,
}) => {
  return (
    <div
      data-testid="editor-v2-preview-banner"
      role="region"
      aria-label="Hinweis zur Vorschau"
      className="flex min-h-7 flex-wrap items-center justify-between gap-2 border-b border-primary/20 bg-primary/10 px-4 py-1 text-[11px] text-primary select-none"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Badge
          variant="neutral"
          className="border-primary/40 bg-primary/20 text-primary text-[10px] uppercase shrink-0"
        >
          Beta-Vorschau
        </Badge>
        <span className="truncate max-w-[180px] sm:max-w-none">
          Dashboard-Editor V2 • Vorschau{' '}
          {alarmeScenario ? 'mit Alarmen & Schwellenwerten' : 'mit Vorlagen und Teams'}
        </span>
      </div>

      {alarmeScenario && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded border border-primary/30 bg-surface/50 p-0.5 text-xs">
            <button
              type="button"
              data-testid="preview-tab-kacheln"
              onClick={() => onTabChange?.('editor')}
              className={`rounded border-0 px-2 py-0.5 font-medium transition-colors ${
                activeTab === 'editor'
                  ? 'bg-primary text-text-inverse shadow-sm'
                  : 'bg-transparent text-primary hover:bg-primary/10'
              }`}
            >
              Kacheln
            </button>
            <button
              type="button"
              data-testid="preview-tab-alarme"
              onClick={() => onTabChange?.('alarme')}
              className={`rounded border-0 px-2 py-0.5 font-medium transition-colors ${
                activeTab === 'alarme'
                  ? 'bg-primary text-text-inverse shadow-sm'
                  : 'bg-transparent text-primary hover:bg-primary/10'
              }`}
            >
              Alarme
            </button>
            <button
              type="button"
              data-testid="preview-tab-admin"
              onClick={() => onTabChange?.('admin')}
              className={`rounded border-0 px-2 py-0.5 font-medium transition-colors ${
                activeTab === 'admin'
                  ? 'bg-primary text-text-inverse shadow-sm'
                  : 'bg-transparent text-primary hover:bg-primary/10'
              }`}
            >
              Admin
            </button>
          </div>
          <AlarmWorkerBanner isAdmin={true} className="flex py-0.5 px-2" />
          <AlarmBell
            onClick={(e) => {
              e.preventDefault();
              onTabChange?.('alarme');
            }}
          />
        </div>
      )}

      {saveMessage && (
        <span className="font-semibold text-emerald-400 animate-fade-in">{saveMessage}</span>
      )}
    </div>
  );
};
