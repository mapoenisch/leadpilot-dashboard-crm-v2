export const HEADCOUNT = {
  chart: {
    type: 'line',
    labels: ['Q1 24', 'Q2 24', 'Q3 24', 'Q4 24', 'Q1 25', 'Q2 25', 'Q3 25', 'Q4 25'],
    datasets: [
      {
        label: 'FTE (Full-Time Equivalent)',
        data: [4.0, 5.0, 6.0, 8.0, 8.5, 9.0, 9.5, 10.0],
        color: '#00D9C6',
      },
    ],
  },
  rows: [
    ['CEO / Ops', '1,0 FTE', 'Marc Pönisch (Gründer & CEO)'],
    [
      'Engineering / Product',
      '4,0 FTE',
      'Tobias Heine (CTO) & 3 Devs (2 Stellen offen — kritisch)',
    ],
    ['Sales', '2,0 FTE', 'B2B Account Executive & Outbound Sales (Kapazität ausgereizt)'],
    ['Customer Success', '2,0 FTE', 'Onboarding & Support (Onboarding-Lücke)'],
    ['Marketing', '1,0 FTE', 'Inbound & LinkedIn Content (Zu wenig für Wachstumsziele)'],
    ['Gesamtbestand 31.12.2025', '10,0 FTE', 'Ziel 2026: 12,0 FTE'],
  ],
};

export const HR = {
  metrics: [
    { label: 'Headcount (31.12.2025)', val: '10 FTE (2024: 8 FTE)' },
    { label: 'Ø Personalbestand 2025', val: '9 FTE' },
    { label: 'Fluktuation 2025', val: '22 % (4 Zugänge, 2 Abgänge · Benchmark < 10%)' },
    { label: 'Ø AG-Gesamtkosten je FTE', val: '54.400 € / Jahr' },
    { label: 'Personalaufwand gesamt 2025', val: '490.000 € (76 % vom Gesamtaufwand)' },
    { label: 'Remote-Anteil', val: '60 %' },
  ],
};

export const TEAM = {
  title: 'Teamstruktur & Engpässe (31.12.2025)',
  bottlenecks: [
    'Engpass 1: Engineering — Zwei offene Stellen im Entwicklerteam (kritisch).',
    'Engpass 2: Sales — Kapazitäten für Inbound-Demos voll ausgereizt.',
    'Engpass 3: Single Point of Failure — CTO Tobias Heine ist einziger Wissensträger für die KI-Scoring-Engine.',
    'Maßnahme: Geplante Einstellung von 2 FTE in 2026 (Ziel: 12 FTE).',
  ],
};

export interface OrganisationUnit {
  role: string;
  fte: string;
  staffing: string;
  isRoot?: boolean;
}

/**
 * Leitet die Organigramm-Einheiten typsicher und ohne Duplikation direkt aus HEADCOUNT.rows ab.
 */
export function getOrganisationStructure(): {
  root: OrganisationUnit;
  units: OrganisationUnit[];
  total: OrganisationUnit;
} {
  const [ceo, eng, sales, cs, marketing, total] = HEADCOUNT.rows;
  return {
    root: { role: ceo[0], fte: ceo[1], staffing: ceo[2], isRoot: true },
    units: [
      { role: eng[0], fte: eng[1], staffing: eng[2] },
      { role: sales[0], fte: sales[1], staffing: sales[2] },
      { role: cs[0], fte: cs[1], staffing: cs[2] },
      { role: marketing[0], fte: marketing[1], staffing: marketing[2] },
    ],
    total: { role: total[0], fte: total[1], staffing: total[2] },
  };
}
