export const OKR = {
  title: 'Ziele & Strategische OKRs 2026',
  objectives: [
    {
      title: 'O1: Umsatzwachstum & Skalierung der Kundenbasis',
      krs: [
        'KR 1: Steigerung des ARR von 411.840 € auf 620.000 € (+50,5 % Wachstum)',
        'KR 2: Ausbau der aktiven Kundenbasis von 66 auf 95 B2B-Kunden (+46 Neukunden bei 17 Kündigungen)',
        'KR 3: Steigerung der Trial-to-Paid Rate von 18 % auf ≥ 26 %',
      ],
    },
    {
      title: 'O2: Effizienzsteigerung & Churn-Reduktion im Kundensegmet',
      krs: [
        'KR 1: Senkung des monatlichen Account-Churns von 2,8 % auf < 1,8 %',
        'KR 2: Verringerung der Time-to-Value von 11 Tagen auf < 7 Tage',
        'KR 3: Verbesserung des LTV:CAC Ratios von 2,7 : 1 auf ≥ 3,5 : 1',
        'KR 4: Reduzierung der monatlichen Burn Rate von 25.750 € auf < 23.000 €',
      ],
    },
  ],
};

export const BSC = {
  title: 'Balanced Scorecard (BSC) GJ 2025',
  perspectives: [
    { name: 'Finanzen', kpis: 'ARR: 411.840 €, EBITDA: −309.000 €, Bruttomarge: 64,0 %' },
    {
      name: 'Kunden',
      kpis: 'NPS: 34, Account-Churn: 2,8 %, Mktg-CAC: 862 €, Fully-Loaded CAC: 4.447 €',
    },
    {
      name: 'Interne Prozesse',
      kpis: 'Trial-to-Paid: 18 %, Time-to-Value: 11 Tage, Uptime: 99,7 %',
    },
    {
      name: 'Lernen & Entwicklung',
      kpis: 'Headcount: 10 FTE (Ziel: 12 FTE), Fluktuation: 22 %, 60 % Remote',
    },
  ],
};

export const MASSNAHMEN = {
  title: 'Maßnahmenportfolio 2026',
  items: [
    {
      name: 'Guided Trial Onboarding Flow (v2.0)',
      prio: 'P1 (Kritisch)',
      owner: 'Tobias Heine (CTO)',
    },
    { name: 'Partner & Empfehlungskanal Relaunch', prio: 'P1 (Hoch)', owner: 'Marc Pönisch (CEO)' },
    { name: 'Zapier / Make Connector (v2.1)', prio: 'P2 (Mittel)', owner: 'Engineering Team' },
    {
      name: 'ICP-Qualifizierung in Inbound-Prozessen',
      prio: 'P1 (Hoch)',
      owner: 'Sales & Marketing',
    },
  ],
};

export const TREIBER = {
  title: 'Wachstumstreiber 2026+',
  drivers: [
    'Hebel 1: Ausbau des Partner- und Empfehlungskanals (günstigster CAC mit 492 €).',
    'Hebel 2: Erhöhung der Trial-to-Paid Rate (18 % → 26 %) über geführten Produkt-Onboarding-Flow.',
    'Hebel 3: Vermeidung von Kleinstkunden-Churn (Negative-Fit) durch strikte ICP-Qualifizierung im Erstkontakt.',
  ],
};

export const CHART_OKR = {
  type: 'bar' as const,
  labels: [
    'ARR (T€/10)',
    'Kunden',
    'Trial-to-Paid (%)',
    'Churn (%)',
    'KI-Scoring (%)',
    'Headcount',
    'LTV:CAC (x10)',
    'Burn (T€/M)',
  ],
  datasets: [
    { label: 'Basiswert 2025', data: [41.2, 66, 18, 2.8, 47, 10, 27, 25.75], color: '#7CEFE6' },
    { label: 'Zielwert 2026', data: [62.0, 95, 26, 1.8, 65, 12, 35, 23.0], color: '#00D9C6' },
  ],
};

export const CHART_TREIBER = {
  type: 'bar' as const,
  labels: [
    'Trial-to-Paid 18→26%',
    'Churn 2,8→1,8%',
    'Partnerprogramm',
    'ICP-Schärfung (ARPA)',
    'Upsell Starter→Growth',
  ],
  datasets: [
    {
      label: 'ARR-Wachstumseffekt (€)',
      data: [72000, 58000, 34000, 26000, 18000],
      colors: ['#00D9C6', '#00D9C6', '#7CEFE6', '#7CEFE6', '#FF9A66'],
    },
  ],
};

export const RISIKO = {
  headers: ['Risiko', 'Wahrscheinlichkeit', 'Auswirkung', 'Minderungsmaßnahme'],
  rows: [
    [
      'Trial-Conversion stagniert bei 18 %',
      'Mittel',
      'Hoch',
      'Einführung des Guided Onboarding Wizards (v2.0) in Q1/2026',
    ],
    [
      'Runway von 14 Monaten schrumpft durch Burn Rate',
      'Mittel',
      'Hoch',
      'Senkung der Burn Rate auf < 23.000 € / Monat',
    ],
    [
      'Single Point of Failure beim CTO für KI-Engine',
      'Hoch',
      'Kritisch',
      'Dokumentation & Recruiting zweier Senior Frontend/Fullstack Devs',
    ],
    [
      'Account-Churn im Kleinstkundensegment bleibt hoch',
      'Mittel',
      'Mittel',
      'Strikterer ICP-Filter im Vertrieb (kein Negative-Fit)',
    ],
  ],
};
