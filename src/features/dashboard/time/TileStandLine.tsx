// Auftrag 159 (P10a): kurze Datenstand-Zeile je Kachel.
// Liest den unsichtbaren Stand, den useTimeControlledData hinterlegt; ohne Stand (V1) rendert
// die Komponente nichts und das bisherige Verhalten bleibt unverändert.
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { ResolvedTileData, TileData, TileTimeSeriesData } from '../data/dashboardData';
import { readTileStand } from './useTimeControlledData';

const BERLIN_TZ = 'Europe/Berlin';

const timeFormat = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BERLIN_TZ,
});
const dateTimeFormat = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BERLIN_TZ,
});
const dayFormat = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: BERLIN_TZ,
});

function formatStand(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const sameDay = dayFormat.format(date) === dayFormat.format(new Date());
  return sameDay ? timeFormat.format(date) : dateTimeFormat.format(date);
}

function formatTimeSeriesWindowText(ts: TileTimeSeriesData): string {
  const count = ts.points.length;
  const res = ts.resolution;
  if (res === 'stunde')
    return count === 1 ? 'letzte Stunde, je Stunde' : `letzte ${count} Stunden, je Stunde`;
  if (res === 'tag') return count === 1 ? 'letzter Tag, je Tag' : `letzte ${count} Tage, je Tag`;
  if (res === 'woche')
    return count === 1 ? 'letzte Woche, je Woche' : `letzte ${count} Wochen, je Woche`;
  if (res === 'monat')
    return count === 1 ? 'letzter Monat, je Monat' : `letzte ${count} Monate, je Monat`;
  return `${count} Abschnitte`;
}

function baseText(data: ResolvedTileData, entry: ActiveCatalogEntry): string {
  const history = entry.history;
  if (data.timeSeries) {
    const stand = formatStand(
      data.timeSeries.generatedAt ?? data.asOf ?? readTileStand(data)?.observedAt ?? null,
    );
    const windowText = formatTimeSeriesWindowText(data.timeSeries);
    return stand ? `Verlauf ${windowText}, Stand ${stand}` : `Verlauf ${windowText}`;
  }
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
  } else if (stand.mode === 'zeitpunkt') {
    if (data.timeSeries) {
      const windowText = formatTimeSeriesWindowText(data.timeSeries);
      const until = formatStand(stand.analysisAt ?? data.timeSeries.to);
      text = until ? `Verlauf ${windowText} bis ${until}` : `Verlauf ${windowText}`;
    } else if (entry.history.kind === 'fest') {
      text = 'Referenzwert · zeitunabhängiger Wert';
    } else if (entry.history.kind === 'puffer' || entry.history.kind === 'keine') {
      const at = formatStand(stand.analysisAt);
      text = at ? `Für ${at} ist kein Stand gespeichert` : 'Kein Stand gespeichert';
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
