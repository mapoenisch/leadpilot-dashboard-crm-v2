// Executive Dashboard V2 (Auftrag 168 / P13c, Entscheidung Marc 18.11.2026):
// Maximale Datenfrische für Live-Einzelwerte (24 Stunden).

export const MAX_ALARM_DATA_AGE_HOURS = 24;
export const MAX_ALARM_DATA_AGE_MS = MAX_ALARM_DATA_AGE_HOURS * 60 * 60 * 1000;

export function isDataOlderThanMaxAlarmAge(
  timestamp?: string | number | Date | null,
  now = Date.now(),
): boolean {
  if (!timestamp) return false;
  const time =
    typeof timestamp === 'string'
      ? new Date(timestamp).getTime()
      : timestamp instanceof Date
        ? timestamp.getTime()
        : timestamp;
  if (isNaN(time)) return false;
  return now - time > MAX_ALARM_DATA_AGE_MS;
}
