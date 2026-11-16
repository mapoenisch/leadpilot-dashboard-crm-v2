// Executive Dashboard V2 (Auftrag 148 / P05):
// Schwellenwerte-Tab des Kachel-Inspectors.

import type { DashboardTileConfigV2, TileThresholdRule } from '../../../model/dashboardConfigV2';

export function InspectorThresholdTab({
  selectedTile,
  onTileThresholdChange,
}: {
  selectedTile: DashboardTileConfigV2;
  onTileThresholdChange: (tileId: string, rule: TileThresholdRule | undefined) => void;
}) {
  return (
    <div data-testid="tab-content-schwellenwerte" className="space-y-4">
      <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
        <input
          type="checkbox"
          data-testid="threshold-enable-toggle"
          checked={selectedTile.threshold?.enabled ?? false}
          onChange={(e) =>
            onTileThresholdChange(
              selectedTile.id,
              e.target.checked
                ? {
                    enabled: true,
                    operator: selectedTile.threshold?.operator ?? 'gt',
                    warningValue: selectedTile.threshold?.warningValue ?? 100,
                    criticalValue: selectedTile.threshold?.criticalValue ?? 200,
                  }
                : undefined,
            )
          }
          className="rounded border-[var(--color-border,#1b3d39)]"
        />
        <span className="font-medium">Schwellenwert-Überwachung aktivieren</span>
      </label>

      {selectedTile.threshold?.enabled && (
        <div className="space-y-3 rounded border border-white/10 bg-black/30 p-3">
          <div className="space-y-1">
            <label className="text-[11px] text-[var(--color-text-muted)]">Operator</label>
            <select
              data-testid="threshold-operator-select"
              value={selectedTile.threshold.operator}
              onChange={(e) =>
                onTileThresholdChange(selectedTile.id, {
                  ...selectedTile.threshold!,
                  operator: e.target.value as TileThresholdRule['operator'],
                })
              }
              className="h-7 w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-2 text-xs text-white outline-none"
            >
              <option value="gt">Größer als (&gt;)</option>
              <option value="lt">Kleiner als (&lt;)</option>
              <option value="gte">Größer gleich (&gt;=)</option>
              <option value="lte">Kleiner gleich (&lt;=)</option>
              <option value="between">Zwischen Bereich</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] text-amber-300">Warn-Grenze</label>
              <input
                data-testid="threshold-warning-input"
                type="number"
                value={selectedTile.threshold.warningValue ?? ''}
                onChange={(e) =>
                  onTileThresholdChange(selectedTile.id, {
                    ...selectedTile.threshold!,
                    warningValue: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="h-7 w-full rounded border border-amber-500/40 bg-black/40 px-2 text-xs text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-rose-300">Kritisch-Grenze</label>
              <input
                data-testid="threshold-critical-input"
                type="number"
                value={selectedTile.threshold.criticalValue ?? ''}
                onChange={(e) =>
                  onTileThresholdChange(selectedTile.id, {
                    ...selectedTile.threshold!,
                    criticalValue: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="h-7 w-full rounded border border-rose-500/40 bg-black/40 px-2 text-xs text-white outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
