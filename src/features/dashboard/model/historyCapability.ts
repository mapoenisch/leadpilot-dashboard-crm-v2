// Auftrag 159 (P10a): maschinenlesbare Historienmatrix je Katalogeintrag.
// Die Aussage „welche Historie ist belegt“ steht damit im Code, nicht nur als Freitext in
// docs/dashboard/KPI_FAEHIGKEITEN_144.md. Es wird keine Historie erfunden: Bestände aus heutigen
// Datensätzen sind nie rekonstruierbar, flüchtige Live-Puffer sind keine dauerhafte Historie.

export type HistoryKind =
  | 'keine' // nur aktueller Stand, keine Historie gespeichert
  | 'fest' // feste Referenzreihe im Bundle (Stammdaten), kein Zeitwechsel möglich
  | 'puffer' // flüchtiger Live-Puffer im Browser (max. 30 Punkte), keine dauerhafte Historie
  | 'ereignisse'; // dauerhafte, belegte Ereignisse auf dem Server (Auswertung folgt in P10b)

export type HistorySource = 'deal_stage_events' | 'live_kpi_events';

export interface TimeSeriesWindowDef {
  resolution: 'stunde' | 'tag' | 'woche' | 'monat';
  count: number;
}

export interface HistoryCapability {
  kind: HistoryKind;
  /** Nur bei `ereignisse`: die Tabelle, aus der die Belege stammen. */
  source?: HistorySource;
  /** Bestände aus heutigen Datensätzen sind nie rekonstruierbar. */
  reconstructable: 'nein' | 'nur_fluesse';
  /** Kurzer Satz für Inspector und Bibliothek. */
  note: string;
  /** Auftrag 160: Standardfenster und Auflösung für Verlaufseinträge. */
  defaultWindow?: TimeSeriesWindowDef;
}

/** Feste Referenzreihe aus den Stammdaten (Ebene A). */
export const HISTORY_FEST: HistoryCapability = {
  kind: 'fest',
  reconstructable: 'nein',
  note: 'Feste Referenzwerte im App-Bundle; kein Zeitwechsel möglich.',
};

/** Nur der aktuelle Stand; keine Historie gespeichert. */
export const HISTORY_KEINE: HistoryCapability = {
  kind: 'keine',
  reconstructable: 'nein',
  note: 'Nur der aktuelle Stand; keine Historie gespeichert.',
};

/** Flüchtiger Live-Puffer im Browser (FIFO, höchstens 30 Punkte). */
export const HISTORY_PUFFER: HistoryCapability = {
  kind: 'puffer',
  reconstructable: 'nein',
  note: 'Flüchtiger Live-Puffer im Browser (höchstens 30 Punkte); keine dauerhafte Historie.',
};

/** Sichtbarer Text je Art; eine Zeile, ohne Farbe als einziges Merkmal. */
export const HISTORY_KIND_TEXT: Readonly<Record<HistoryKind, string>> = {
  keine: 'Historie: nur aktueller Stand',
  fest: 'Historie: feste Referenzwerte',
  puffer: 'Historie: flüchtig im Browser, letzte 30 Punkte',
  ereignisse: 'Historie: Ereignisse ab Aufzeichnungsbeginn',
};

export function historyText(history: HistoryCapability): string {
  return HISTORY_KIND_TEXT[history.kind];
}

export function formatResolutionText(resolution?: 'stunde' | 'tag' | 'woche' | 'monat'): string {
  switch (resolution) {
    case 'stunde':
      return 'je Stunde';
    case 'tag':
      return 'je Tag';
    case 'woche':
      return 'je Woche';
    case 'monat':
      return 'je Monat';
    default:
      return '';
  }
}

export function formatTimeframeText(window?: TimeSeriesWindowDef): string {
  if (!window) return '';
  switch (window.resolution) {
    case 'woche':
      return `Letzte ${window.count} Wochen`;
    case 'stunde':
      return `Letzte ${window.count} Stunden`;
    case 'tag':
      return `Letzte ${window.count} Tage`;
    case 'monat':
      return `Letzte ${window.count} Monate`;
    default:
      return '';
  }
}

export function formatHistoryLabel(
  history: HistoryCapability,
  historyStartAt?: string | null,
): string {
  if (history.kind !== 'ereignisse') {
    return HISTORY_KIND_TEXT[history.kind];
  }
  if (historyStartAt === null) {
    return 'Historie: Noch keine Historie aufgezeichnet';
  }
  if (historyStartAt) {
    try {
      const d = new Date(historyStartAt);
      const formattedDate = new Intl.DateTimeFormat('de-DE', {
        timeZone: 'Europe/Berlin',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);
      return `Historie: Ereignisse ab ${formattedDate}`;
    } catch {
      return `Historie: Ereignisse ab ${historyStartAt}`;
    }
  }
  return 'Historie: Ereignisse ab Aufzeichnungsbeginn';
}

/**
 * Kombinationen sind nur dann fest, wenn alle Bestandteile fest sind. Es gibt bewusst keine
 * Rangfolge der Arten (z. B. „puffer schlägt fest“): alles andere ist „keine“.
 */
export function deriveCombinationHistory(parts: readonly HistoryCapability[]): HistoryCapability {
  if (parts.length > 0 && parts.every((part) => part.kind === 'fest')) {
    return {
      kind: 'fest',
      reconstructable: 'nein',
      note: 'Abgeleitet aus festen Referenzwerten; kein Zeitwechsel möglich.',
    };
  }
  return {
    kind: 'keine',
    reconstructable: 'nein',
    note: 'Mindestens ein Operand ohne feste Historie; keine Zeitreihe.',
  };
}
