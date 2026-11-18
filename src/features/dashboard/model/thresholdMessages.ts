export const THRESHOLD_MESSAGES = {
  normal: 'Im Normalbereich',
  keineDaten: 'Keine Daten vorhanden',
  nichtBewertetFehler: 'Kachel im Fehlerzustand',
  nichtBewertetVeraltet: 'Kachel veraltet',
  nichtBewertetOffline: 'Kachel offline',
  nichtBewertetUngueltig: 'Nicht bewertbar (ungültiger Messwert)',
  inaktiv: 'Schwellenwert-Regel inaktiv',
  einheitenWechsel: (katalog: string, regel: string) =>
    `Katalogeinheit (${katalog}) stimmt nicht mit Regeleinheit (${regel}) überein.`,
  altGleichUngueltig: "Der Operator 'Gleich' wird nicht mehr unterstützt.",
  altZwischenUngueltig:
    "Der Operator 'Zwischen' aus Version 1 kann nicht eindeutig übersetzt werden.",
  altFehlendeGrenze: 'Alte Regel enthält keine gültigen Grenzwerte.',
  altReihenfolgeUngueltig: 'Warnwert und kritischer Wert widersprechen der Richtung.',
  altUebernommen: 'Diese Regel stammt aus einer älteren Version und wurde übernommen.',
  pruefenBadge: 'Schwellenwert prüfen',
  nurEinzelwert: 'Schwellenwerte gibt es nur für Kacheln mit einem einzelnen Wert.',
  browserHinweis: 'Benachrichtigungen bei geschlossenem Browser folgen in einer späteren Version.',
  warnungTitel: 'Warnung',
  kritischTitel: 'Kritisch',
} as const;
