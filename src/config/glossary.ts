// Auftrag 117 (Paket H): Fachkürzel bleiben sichtbar, bekommen aber eine verständliche Erklärung.
export const GLOSSARY: Readonly<Record<string, string>> = {
  ARR: 'ARR – Annual Recurring Revenue: jährlich wiederkehrender Umsatz aus Abos',
  MRR: 'MRR – Monthly Recurring Revenue: monatlich wiederkehrender Umsatz aus Abos',
  EBITDA: 'EBITDA – Ergebnis vor Zinsen, Steuern und Abschreibungen',
  CAC: 'CAC – Customer Acquisition Cost: Gesamtkosten pro Neukunde',
  LTV: 'LTV – Lifetime Value: Umsatz, den ein Kunde über die gesamte Laufzeit bringt',
  NRR: 'NRR – Net Revenue Retention: Umsatz der Bestandskunden im Vergleich zum Vorjahr',
};

const TERM_PATTERN = new RegExp(`\\b(${Object.keys(GLOSSARY).join('|')})\\b`, 'g');

export type TextPart = { text: string; term?: string };

/** Zerlegt einen Text so, dass Glossarbegriffe als eigene Teile mit `term` erscheinen. */
export function splitGlossaryTerms(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(TERM_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: text.slice(last, index) });
    parts.push({ text: match[0], term: match[0] });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
