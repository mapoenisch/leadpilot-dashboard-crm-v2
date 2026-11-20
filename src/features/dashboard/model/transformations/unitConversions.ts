/**
 * Feste Positivliste erlaubter Einheitenumrechnungen (Auftrag 169 / P14a).
 * Jedes Paar ist begründet und hat Server-Parität via SQL-Tabelle `dashboard_unit_conversions`.
 */

export interface UnitConversionDefinition {
  id: string;
  von: string;
  zu: string;
  faktor: number;
  operation: 'divide' | 'multiply';
  operand: number;
  zielFormat: string;
  begruendung: string;
}

export const UNIT_CONVERSIONS: readonly UnitConversionDefinition[] = [
  {
    id: 'eur_in_tsdeur',
    von: 'EUR',
    zu: 'Tsd. EUR',
    faktor: 0.001,
    operation: 'divide',
    operand: 1000,
    zielFormat: 'eur_tsd',
    begruendung: 'Übersichtlichere Darstellung hoher Euro-Beträge in Tausend Euro.',
  },
  {
    id: 'eur_in_mioeur',
    von: 'EUR',
    zu: 'Mio. EUR',
    faktor: 0.000001,
    operation: 'divide',
    operand: 1000000,
    zielFormat: 'eur_mio',
    begruendung: 'Übersichtlichere Darstellung großer Euro-Beträge in Millionen Euro.',
  },
  {
    id: 'anzahl_in_tsd',
    von: 'Anzahl',
    zu: 'Tsd.',
    faktor: 0.001,
    operation: 'divide',
    operand: 1000,
    zielFormat: 'anzahl_tsd',
    begruendung: 'Kompakte Darstellung großer Stückzahlen in Tausend.',
  },
  {
    id: 'anteil_in_prozent',
    von: 'Anteil 0–1',
    zu: '%',
    faktor: 100,
    operation: 'multiply',
    operand: 100,
    zielFormat: 'prozent',
    begruendung: 'Umrechnung von Dezimalanteilen (0.0 bis 1.0) in lesbare Prozentwerte.',
  },
] as const;

export function getUnitConversion(von: string, zu: string): UnitConversionDefinition | undefined {
  return UNIT_CONVERSIONS.find((c) => c.von === von && c.zu === zu);
}

export function getAllowedConversionsForUnit(unit: string): UnitConversionDefinition[] {
  return UNIT_CONVERSIONS.filter((c) => c.von === unit);
}
