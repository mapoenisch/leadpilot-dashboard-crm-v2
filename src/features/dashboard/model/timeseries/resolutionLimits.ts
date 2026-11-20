// Auftrag 170 (P14b): Zulässige Zeitfenster-Auflösungen je Datenquelle.
// Regel gespiegelt zur Fenster-Auswahl (TimeWindowField): CRM-Ereignisse in
// Tag/Woche/Monat, Live-Messungen in Stunde/Tag. Der Join-Abruf übergibt
// Auflösung und Fenster der ersten Reihe; ein Kandidat ist nur zulässig,
// wenn seine Quelle diese Auflösung unterstützt.
import type { TimeSeriesResolution } from '../../data/dashboardData';

export type TimeSeriesLayer = 'crm' | 'live';

/** Maximale Abschnittszahl je Auflösung; `null` = Auflösung für die Quelle unzulässig. */
export function getMaxCountForResolution(
  layer: TimeSeriesLayer,
  resolution: TimeSeriesResolution,
): number | null {
  if (layer === 'crm') {
    if (resolution === 'stunde') return null; // unzulässig
    if (resolution === 'tag') return 366;
    if (resolution === 'woche') return 260;
    if (resolution === 'monat') return 120;
  } else {
    if (resolution === 'stunde') return 168;
    if (resolution === 'tag') return 90;
    return null; // woche/monat unzulässig
  }
  return null;
}

/** Unterstützt die Quelle die Auflösung (z. B. für Join-Kandidaten)? */
export function supportsResolution(
  layer: TimeSeriesLayer,
  resolution: string | undefined,
): boolean {
  if (!resolution) return false;
  return getMaxCountForResolution(layer, resolution as TimeSeriesResolution) !== null;
}
