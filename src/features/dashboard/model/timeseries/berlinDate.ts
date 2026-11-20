// Auftrag 170 (P14b): Kalenderrechnung in Europe/Berlin, unabhängig von der Zeitzone des Rechners.
const BERLIN_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const dayKeyCache = new Map<string, string>();

/** Berliner Kalendertag eines Zeitpunkts als `YYYY-MM-DD`. */
export function berlinDayKey(at: string): string {
  const cached = dayKeyCache.get(at);
  if (cached !== undefined) return cached;
  const ms = Date.parse(at);
  const key = Number.isNaN(ms) ? at.slice(0, 10) : BERLIN_DAY.format(new Date(ms));
  if (dayKeyCache.size > 5000) dayKeyCache.clear();
  dayKeyCache.set(at, key);
  return key;
}

/** Tage seit 1970-01-01 für einen Kalendertag `YYYY-MM-DD` (reine Kalenderrechnung). */
export function dayNumber(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number);
  return Math.round(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}

/** Kalendertag `YYYY-MM-DD` zu einer Tagesnummer. */
export function dayKeyFromNumber(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

/** Wochentag 0 = Montag … 6 = Sonntag. */
export function weekdayIndex(day: number): number {
  return (((day + 3) % 7) + 7) % 7;
}

/** ISO-Kalenderwoche eines Tages. */
export function isoWeek(day: number): number {
  const thursday = day - weekdayIndex(day) + 3;
  const year = new Date(thursday * 86_400_000).getUTCFullYear();
  const jan1 = Math.round(Date.UTC(year, 0, 1) / 86_400_000);
  return Math.floor((thursday - jan1) / 7) + 1;
}

/** `TT.MM.JJJJ` des Berliner Kalendertags. */
export function formatBerlinDate(at: string): string {
  const [y, m, d] = berlinDayKey(at).split('-');
  return `${d}.${m}.${y}`;
}
