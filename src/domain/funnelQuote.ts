// Auftrag 085 / F08: Eine Quote = Zähler / Nenner, einheitlich auf eine
// Nachkommastelle gerundet (Entscheidung Marc 09.10.2026). Ohne gültigen
// Nenner gibt es keine Zahl, sondern „Nicht berechenbar“ (kein ∞/NaN).
export const NICHT_BERECHENBAR = 'Nicht berechenbar';

const zahlFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const quoteFormat = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function berechneQuote(
  zaehler: number | null | undefined,
  nenner: number | null | undefined,
): number | null {
  if (zaehler == null || nenner == null) return null;
  if (!Number.isFinite(zaehler) || !Number.isFinite(nenner) || nenner === 0) return null;
  return (zaehler / nenner) * 100;
}

export function formatQuote(
  zaehler: number | null | undefined,
  nenner: number | null | undefined,
): string {
  const quote = berechneQuote(zaehler, nenner);
  return quote === null ? NICHT_BERECHENBAR : `${quoteFormat.format(quote)} %`;
}

export function formatAnzahl(wert: number): string {
  return zahlFormat.format(wert);
}
