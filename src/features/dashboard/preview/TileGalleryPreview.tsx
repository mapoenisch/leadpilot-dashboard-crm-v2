// Kachelgalerie (Auftrag 073, Dashboard Teilauftrag 4): alle Darstellungen, Größen und Zustände
// des Kachelrahmens auf festen Testdaten. Keine Abfragen, keine Speicherung, keine Navigation.
// Das Raster folgt dem Plan (12/6/1 Spalten); das bedienbare Raster baut Teilauftrag 5.
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { DashboardView, TileSize } from '../model/dashboardCatalog';
import { DashboardTile } from '../components/DashboardTile';
import { GALLERY_NOTICE, GALLERY_TILES } from './tileGallerySampleData';

const SPAN: Record<TileSize, string> = {
  klein: 'md:col-span-3 xl:col-span-3',
  mittel: 'md:col-span-6 xl:col-span-6',
  gross: 'md:col-span-6 xl:col-span-9',
  voll: 'md:col-span-6 xl:col-span-12',
};

export function TileGalleryPreview({ onlyView }: { onlyView?: DashboardView }) {
  const [detailsFor, setDetailsFor] = useState<string | null>(null);
  const tiles = onlyView
    ? GALLERY_TILES.filter((entry) => entry.tile.view === onlyView)
    : GALLERY_TILES;
  return (
    <section aria-labelledby="kachelgalerie" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="kachelgalerie" className="m-0 text-[20px] font-semibold">
          Kachelgalerie
        </h2>
        <Badge variant="mint" size="sm">
          {GALLERY_NOTICE}
        </Badge>
      </header>
      <p role="status" className="m-0 min-h-[20px] text-[13px] text-[var(--color-text-muted)]">
        {detailsFor
          ? `„Details“ gewählt (${detailsFor}). Die Detailseite folgt mit Teilauftrag 7.`
          : ''}
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12">
        {tiles.map((entry) => (
          <DashboardTile
            key={entry.tile.tileId}
            tile={entry.tile}
            entry={entry.entry}
            data={entry.data}
            onShowDetails={setDetailsFor}
            className={cn('col-span-1', SPAN[entry.tile.size])}
          />
        ))}
      </div>
    </section>
  );
}
