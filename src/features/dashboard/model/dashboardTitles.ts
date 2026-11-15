// Auftrag 158 (P09b): Titelregeln und Ableitung von Dashboard-Titeln.
// Server- und Clientgrenze: 1-80 Zeichen.

export const MAX_DASHBOARD_TITLE_LENGTH = 80;
export const MAX_PERSONAL_DASHBOARDS = 20;

/**
 * Bildet einen abgeleiteten Dashboard-Titel (z.B. Kopie, Duplikat oder Zählsuffix),
 * der die 80-Zeichen-Grenze garantiert einhält.
 *
 * Regeln (Auftrag 158 §2.1 Nr. 6):
 * 1. Trimmt den Grundtitel.
 * 2. Zählt nach Unicode-Codepoints (Array.from), um Surrogate/Emojis nicht zu zerlegen.
 * 3. Kürzt den Grundtitel so, dass Grundtitel plus Suffix höchstens 80 Zeichen ergeben.
 * 4. Entfernt ein angeschnittenes Leerzeichen am Ende des gekürzten Grundtitels.
 */
export function buildDerivedDashboardTitle(base: string, suffix: string): string {
  const trimmedBase = base.trim();
  const baseChars = Array.from(trimmedBase);
  const suffixChars = Array.from(suffix);

  if (baseChars.length + suffixChars.length <= MAX_DASHBOARD_TITLE_LENGTH) {
    return trimmedBase + suffix;
  }

  const allowedBaseLength = Math.max(0, MAX_DASHBOARD_TITLE_LENGTH - suffixChars.length);
  const cutBaseChars = baseChars.slice(0, allowedBaseLength);
  const cutBaseString = cutBaseChars.join('').trimEnd();

  return cutBaseString + suffix;
}
