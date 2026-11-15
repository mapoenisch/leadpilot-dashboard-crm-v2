// Auftrag 159 (P10a): kurze Datenstand-Zeile je Kachel.
// Liest den unsichtbaren Stand, den useTimeControlledData hinterlegt; ohne Stand (V1) rendert
// die Komponente nichts und das bisherige Verhalten bleibt unverändert.
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { ResolvedTileData, TileData } from '../data/dashboardData';
import { readTileStand } from './useTimeControlledData';

const timeFormat = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
});
const dateTimeFormat = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function formatStand(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay ? timeFormat.format(date) : dateTimeFormat.format(date);
}

function baseText(data: ResolvedTileData, entry: ActiveCatalogEntry): string {
  const history = entry.history;
  if (history.kind === 'fest') return `Referenzwert, Stand ${data.timeBasis}`;
  if (history.kind === 'puffer') {
    const stand = formatStand(data.asOf);
    return stand ? `Live, zuletzt ${stand}` : 'noch keine Live-Daten';
  }
  if (history.kind === 'ereignisse') return 'Ereignisse ab Aufzeichnungsbeginn';
  const fetched = formatStand(readTileStand(data)?.observedAt ?? null);
  return fetched ? `Aktueller Stand, abgerufen ${fetched}` : 'Aktueller Stand';
}

export function TileStandLine({ data, entry }: { data: TileData; entry?: ActiveCatalogEntry }) {
  const stand = readTileStand(data);
  if (!stand || !entry || data.state === 'laden' || data.state === 'nicht_verfuegbar') {
    return null;
  }

  let text = baseText(data, entry);
  if (stand.mode === 'pausiert') {
    if (stand.loadedAfterPause) {
      const loaded = formatStand(stand.observedAt);
      text = loaded
        ? `Stand ${loaded} (nach Pausenbeginn geladen)`
        : 'Stand nach Pausenbeginn geladen';
    } else {
      const paused = formatStand(stand.analysisAt);
      text = paused ? `Angehalten seit ${paused} · ${text}` : `Angehalten · ${text}`;
    }
  }

  return (
    <p
      data-testid="tile-stand-line"
      title={entry.history.note}
      className="m-0 mt-[2px] min-w-0 truncate text-[10.5px] leading-tight text-[var(--color-text-muted)]"
    >
      {text}
    </p>
  );
}
