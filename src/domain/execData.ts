export const HERO = {
  eyebrow: 'Executive Dashboard — LeadPilot GmbH',
  title: 'LeadPilot auf einen Blick',
  subtitle:
    'Konsolidierte Übersicht der operativen, finanziellen und strategischen Entwicklung für das Geschäftsjahr 2025/2026 (Faktenblatt v1.1).',
};

export const EXEC_KPIS_1 = [
  {
    label: 'ARR (Annual Recurrent Revenue)',
    value: '411.840 €',
    note: 'Software-Subskriptionen (34.320 € MRR × 12), Stand 31.12.2025',
    highlight: true,
  },
  {
    label: 'Umsatzerlöse gesamt 2025',
    value: '336.000 €',
    note: 'davon 307,6k € Abo-Umsatz, 23k € Setup, 5,4k € Sonstiges',
  },
  { label: 'EBITDA 2025', value: '−309.000 €', note: 'Jahresfehlbetrag: −334.000 €' },
  { label: 'Aktive Kunden', value: '66', note: 'Zahlende B2B-Accounts (31.12.2025)' },
];

export const EXEC_KPIS_2 = [
  {
    label: 'ARPA (Ø MRR/Kunde)',
    value: '520 €',
    note: 'Blended über 66 Kunden (Starter 245€, Growth 890€, Pro 1.565€)',
  },
  { label: 'Marketing-CAC', value: '862 €', note: 'Media-Spend 40.500 € ÷ 47 Neukunden' },
  {
    label: 'Fully-Loaded CAC',
    value: '4.447 €',
    note: 'Gesamtkosten Vertrieb & Mktg. 209k € ÷ 47 Neukunden',
  },
  { label: 'Headcount', value: '10 FTE', note: 'Stand 31.12.2025 (Ziel 2026: 12 FTE)' },
];

export const CHART_ARR = {
  type: 'line',
  labels: ['Q1 24', 'Q2 24', 'Q3 24', 'Q4 24', 'Q1 25', 'Q2 25', 'Q3 25', 'Q4 25'],
  datasets: [
    {
      label: 'ARR (€)',
      data: [120000, 145000, 170000, 207792, 248472, 294588, 348840, 411840],
      color: '#00D9C6',
      fill: true,
    },
  ],
};

export const CHART_MRR = {
  type: 'bar',
  labels: ['Starter (49€)', 'Growth (89€)', 'Pro (Individuell / Ref. 80€)'],
  datasets: [
    {
      label: 'MRR-Anteil (€)',
      data: [10045, 19580, 4695],
      color: '#FF7A3D',
    },
  ],
};

export const CHART_QUARTAL = {
  type: 'bar',
  labels: ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'],
  datasets: [
    { label: 'Neukunden', data: [10, 11, 12, 14], color: '#00D9C6' },
    { label: 'Vertriebskosten (€k)', data: [47.5, 50.5, 53.5, 57.5], color: '#7CEFE6' },
  ],
};

export const CHART_TIER = {
  type: 'doughnut',
  labels: ['Maschinenbau / Industrie', 'IT / Software', 'Großhandel', 'Agenturen'],
  datasets: [
    {
      data: [36, 27, 21, 15],
      colors: ['#00D9C6', '#7CEFE6', '#FF7A3D', '#FF9A66'],
    },
  ],
};

export const NOTE_EXEC = {
  title: 'Executive Summary 2025',
  variant: 'info',
  paragraphs: [
    'Die LeadPilot GmbH schließt das Geschäftsjahr 2025 mit einem ARR von 411.840 € (MRR 34.320 €) und einem Jahresfehlbetrag von −334.000 € (EBITDA −309.000 €) ab.',
    'Das stärkste Wachstum resultiert aus dem Growth-Paket (89 €/Nutzer/Monat) im B2B-Mittelstand der Branchen Maschinenbau und IT/Software.',
    'Der Churn von 2,8 %/Monat betrifft fast durchgängig Kleinstkunden (Negative-Fit) — 2026 liegt der Fokus auf ICP-Qualifizierung und Trial-Conversion.',
  ],
};

export const PROFILE_ROWS = [
  ['Firmenname', 'LeadPilot GmbH'],
  ['Rechtsform', 'Gesellschaft mit beschränkter Haftung (GmbH), Amtsgericht Leipzig'],
  ['Sitz & Adresse', 'Augustusplatz 9, 04109 Leipzig (angemietete Büroflächen)'],
  ['Handelsregister', 'Amtsgericht Leipzig, HRB 40912'],
  ['Gründungsdatum', '21. Juli 2022 (Beurkundung Gesellschaftsvertrag)'],
  ['Stammkapital', '31.250 € (ursprünglich 25.000 €, Kapitalerhöhung Q1 2024)'],
  [
    'Gesellschafter',
    'Marc Pönisch (40,0%), Tobias Heine (40,0%), TGFS (12,5%), HTGF (5,0%), Business Angels (2,5%)',
  ],
  ['Geschäftsführung', 'Marc Pönisch (CEO), Tobias Heine (CTO)'],
  [
    'Gegenstand des Unternehmens',
    'B2B SaaS — KI-gestütztes Lead-Management & Vertriebsautomatisierung.',
  ],
];

export const NOTE_PROFIL = {
  title: 'Unternehmensstruktur & Fokus',
  variant: 'info',
  paragraphs: [
    'LeadPilot operiert als fokussierter SaaS-Anbieter für B2B-KMU im DACH-Raum mit eigener Produktentwicklung in Leipzig.',
  ],
};

export const HIGHLIGHTS_GOOD_ROWS = [
  ['ARR-Wachstum', '+98 % ARR-Steigerung von 207.792 € auf 411.840 € in FY 2025'],
  ['Kundenbasis', 'Ausbau auf 66 aktive B2B-Kunden (+47 Neukunden im Jahr 2025)'],
  ['ARPA-Steigerung', 'Steigerung der Ø ARPA von 481 € auf 520 € MRR je Kunde'],
  ['Plattform Uptime', 'Hohe Systemstabilität mit 99,7 % Uptime im Jahr 2025'],
];

export const HIGHLIGHTS_BAD_ROWS = [
  [
    'Jahresfehlbetrag',
    'Jahresfehlbetrag von −334.000 € (EBITDA −309.000 €) bei monatlicher Burn Rate von 25.750 €',
  ],
  [
    'Account-Churn',
    'Monatlicher Account-Churn von 2,8 % über Zielvorgabe von < 2,0 % (ICP-Problem bei Kleinstkunden)',
  ],
  ['Trial Conversion', 'Trial-to-Paid Quote mit 18 % unter der Zielvorgabe von 25 %'],
  ['CAC Payback', 'Fully-Loaded CAC Payback von 13 Monaten verfehlt Zielwert von 10 Monaten'],
];

export const NOTE_HIGHLIGHTS = {
  title: 'Jahres-Fazit 2025',
  variant: 'warning',
  paragraphs: [
    'Trotz starkem Umsatzwachstum auf 336.000 € erfordert die Runway von 14 Monaten eine Reduzierung der Burn Rate und Erhöhung der Trial-to-Paid Quote in 2026.',
  ],
};

export const BRIDGES_ROWS = [
  ['Datenbank / CRM', 'PostgreSQL Data Repository (20 Accounts, 100 Kontakte, 40 Funnel Deals)'],
  ['Finanzbuchhaltung', 'GuV und Bilanz aus Faktenblatt v1.1 (Single Source of Truth)'],
  ['Analytics', 'Aggregierte Nutzungsdaten aus der LeadPilot SaaS-Plattform'],
];

export const SOURCES_ROWS = [
  ['Faktenblatt v1.1', 'Verbindliche Stammdaten (Single Source of Truth)'],
  ['Jahresabschluss 2025', 'Finanzkennzahlen, GuV & Bilanzdaten'],
  ['CRM-Export FY25', 'Pipeline-, Lead- & Kanalperformance-Daten'],
];

export const NOTE_DATEN = {
  title: 'Datenkonsistenz & Methodik',
  variant: 'info',
  paragraphs: [
    'Alle Daten im LeadPilot Dashboard sind über die Fachmodule hinweg voll konsistent und basieren auf dem verbindlichen Faktenblatt v1.1.',
  ],
};
