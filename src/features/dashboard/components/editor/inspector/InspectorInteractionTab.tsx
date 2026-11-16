// Executive Dashboard V2 (Auftrag 148 / P05):
// Interaktions-Tab des Kachel-Inspectors (Drilldown).

import type { ChangeEvent } from 'react';
import type { DashboardTileConfigV2 } from '../../../model/dashboardConfigV2';

export function InspectorInteractionTab({
  selectedTile,
  onTileDrilldownChange,
}: {
  selectedTile: DashboardTileConfigV2;
  onTileDrilldownChange?: (tileId: string, url: string | undefined) => void;
}) {
  return (
    <div data-testid="tab-content-interaktion" className="space-y-3">
      <label className="text-xs font-medium text-[var(--color-text-muted)]">
        Drilldown-Ziel bei Klick
      </label>
      <input
        data-testid="drilldown-url-input"
        type="text"
        placeholder="/crm/deals oder https://…"
        value={selectedTile.drilldownUrl ?? ''}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onTileDrilldownChange?.(selectedTile.id, e.target.value || undefined)
        }
        className="h-8 w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-2.5 text-xs text-white outline-none focus:border-primary"
      />
      <p className="m-0 text-[11px] text-[var(--color-text-muted)]">
        Wird beim Anklicken der Kachel im Lesemodus aufgerufen.
      </p>
    </div>
  );
}
