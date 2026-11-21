import { Database, Sparkles } from 'lucide-react';
import type { DashboardConfigV2 } from '../../../model/dashboardConfigV2';

export function InspectorEmptyState({ config }: { config: DashboardConfigV2 }) {
  return (
    <div data-testid="inspector-empty-state" className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="rounded-lg border border-[var(--color-border,#1b3d39)] bg-black/20 p-3.5 space-y-2.5">
        <h3 className="m-0 text-xs font-semibold text-white flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5 text-primary" />
          <span>Übersicht</span>
        </h3>
        <div className="space-y-1.5 text-xs text-[var(--color-text-soft,#e6f3f1)]">
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)]">Titel:</span>
            <span className="font-medium text-white">{config.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)]">Scope:</span>
            <span className="capitalize">{config.scope}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)]">Standard-Zeitraum:</span>
            <span>{config.globalTimeframe}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)]">Aktive Kacheln:</span>
            <span className="font-semibold text-primary">{config.tiles.length} / 24</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-white/5 bg-white/5 p-3.5 space-y-2">
        <h4 className="m-0 text-xs font-semibold text-[var(--color-text-muted)] flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Tipps & Tastaturkürzel</span>
        </h4>
        <ul className="m-0 list-disc pl-4 text-[11px] leading-relaxed text-[var(--color-text-muted)] space-y-1">
          <li>Klicke auf eine Kachel auf dem Canvas, um ihre Parameter hier zu bearbeiten.</li>
          <li>
            Drücke <kbd className="rounded bg-black/40 px-1 py-0.5 text-white">Esc</kbd>, um die
            Auswahl aufzuheben.
          </li>
          <li>
            Wähle <kbd className="rounded bg-black/40 px-1 py-0.5 text-white">Cmd+Z</kbd> /{' '}
            <kbd className="rounded bg-black/40 px-1 py-0.5 text-white">Ctrl+Z</kbd> für Undo.
          </li>
          <li>Nutze den Vorschau-Schalter oben rechts, um das fertige Dashboard zu prüfen.</li>
        </ul>
      </div>
    </div>
  );
}
