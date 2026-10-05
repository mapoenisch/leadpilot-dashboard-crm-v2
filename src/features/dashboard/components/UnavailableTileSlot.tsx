// Executive Dashboard, Teilauftrag 5 (Auftrag 074): Platzhalter für eine gespeicherte Kachel, deren
// Kennzahl unbekannt oder nicht freigegeben ist. Die Kachel bleibt in der Konfiguration erhalten;
// hier steht nur ein verständlicher Hinweis, keine technische ID.
import { Card } from '@/components/ui/Card';
import { getCatalogEntry } from '../model/dashboardCatalog';
import type { DashboardTileConfig } from '../model/dashboardConfig';

export function UnavailableTileSlot({ tile }: { tile: DashboardTileConfig }) {
  const known = getCatalogEntry(tile.catalogId) !== undefined;
  return (
    <Card
      variant="glass"
      data-testid="unavailable-slot"
      className="flex min-h-[160px] flex-col justify-center gap-2 [overflow-wrap:anywhere]"
    >
      {tile.title ? (
        <p className="text-sm font-semibold text-[var(--color-text)]">{tile.title}</p>
      ) : null}
      <p className="text-sm font-semibold text-[var(--color-text)]">Kachel nicht verfügbar</p>
      <p className="text-sm text-[var(--color-text-muted)]">
        {known
          ? 'Diese Kennzahl ist in dieser Version noch nicht freigegeben.'
          : 'Diese Kennzahl ist in dieser Version nicht bekannt.'}{' '}
        Die Kachel bleibt in deiner Ansicht gespeichert.
      </p>
    </Card>
  );
}
