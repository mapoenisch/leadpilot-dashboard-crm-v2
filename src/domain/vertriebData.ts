export const FUNNEL = {
  chart: {
    type: 'bar',
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      { label: 'Leads', data: [384, 432, 456, 504], color: '#A7B0BA' },
      { label: 'MQLs', data: [108, 126, 132, 150], color: '#7CEFE6' },
      { label: 'SQLs', data: [40, 47, 50, 55], color: '#00D9C6' },
      { label: 'Neukunden', data: [10, 11, 12, 14], color: '#FF7A3D' },
    ],
  },
  headers: ['Stufe', 'Q1', 'Q2', 'Q3', 'Q4', 'FY 2025', 'Ø/Mon.', 'Conversion'],
  rows: [
    ['Leads gesamt', '384', '432', '456', '504', '1.776', '148', '—'],
    ['Marketing Qualified Leads (MQL)', '108', '126', '132', '150', '516', '43', '29 % der Leads'],
    ['Sales Qualified Leads (SQL)', '40', '47', '50', '55', '192', '16', '38 % der MQL'],
    ['Testversionen gestartet', '57', '64', '68', '75', '264', '22', 'inkl. Self-Service'],
    ['Angebote', '23', '26', '28', '31', '108', '9', '56 % der SQL'],
    ['Neukunden', '10', '11', '12', '14', '47', '3,9', 'Win Rate 43 %'],
  ],
  note: {
    title: 'Trial-to-Paid Potenzial (+90.000 € ARR)',
    variant: 'warning',
    paragraphs: [
      'Bei 264 Testversionen im Jahr entsprechen 8 Prozentpunkte zusätzliche Trial-Conversion (von 18 % auf 26 %) rund 21 Neukunden (+90.000 € ARR).',
    ],
  },
};

export const SLA = {
  handoff: {
    title: 'Übergabepunkt Marketing ➔ Sales',
    headers: ['Merkmal', 'Angabe'],
    rows: [
      ['Status vor Übergabe', 'Marketing Qualified Lead (MQL)'],
      ['Übergabemoment', 'Lead erreicht im ICP-Scoring die Einstufung "heiß" (Score ≥ 80)'],
      ['Status nach Übergabe', 'Sales Qualified Lead (SQL), sobald Erstgespräch / Demo vereinbart ist'],
    ],
  },
  marketing: [
    'Lead-Zielmenge: ~43 qualifizierte MQLs pro Monat',
    'Qualitätskriterien: ICP-Fit UND Scoring-Status "heiß" (Score ≥ 80)',
    'Nurturing: Warme Leads bleiben im automatisieren Content-Plan',
  ],
  sales: [
    'Reaktionszeit: Erstkontakt innerhalb von 24 Stunden (werktags)',
    'Follow-up-Rhythmus: Mindestens 3 Kontaktversuche in der ersten Woche',
    'Rückmeldung: SQL markieren oder mit konkretem Grund disqualifizieren',
  ],
};

export const KANAELE = {
  chartKanal: {
    type: 'doughnut',
    labels: ['LinkedIn-Content', 'SEO/Content', 'Partner/Empfehlung', 'Webinare', 'Outbound-E-Mail'],
    datasets: [{ data: [38, 22, 18, 12, 10], colors: ['#00D9C6', '#7CEFE6', '#0B211F', '#FF9A66', '#FF7A3D'] }],
  },
  chartRoi: {
    type: 'bar',
    labels: ['Partner/Empfehlung', 'SEO/Content', 'Webinare', 'LinkedIn-Content', 'Outbound-E-Mail'],
    datasets: [{ label: 'Marketing-CAC (€)', data: [492, 656, 820, 984, 1476], colors: ['#00D9C6', '#00D9C6', '#7CEFE6', '#7CEFE6', '#FF7A3D'] }],
  },
  headers: ['Kanal', 'Anteil', 'Neukunden', 'CAC-Index', 'Marketing-CAC', 'Spend', 'Bewertung'],
  rows: [
    ['LinkedIn-Content', '38 %', '18', '1,2×', '984 €', '17.712 €', 'Volumenträger, aber teuer'],
    ['SEO / Content', '22 %', '10', '0,8×', '656 €', '6.560 €', 'Bestes Verhältnis aus Volumen und Kosten'],
    ['Partner / Empfehlung', '18 %', '8', '0,6×', '492 €', '3.936 €', 'Günstigster Kanal — massiv unterinvestiert'],
    ['Webinare', '12 %', '6', '1,0×', '820 €', '4.920 €', 'Solide, personalintensiv'],
    ['Outbound-E-Mail', '10 %', '5', '1,8×', '1.476 €', '7.380 €', 'Teuerster Kanal, Rückbau prüfen'],
    ['Gesamt', '100 %', '47', '—', '862 €', '40.500 €', 'Blended Marketing-CAC'],
  ],
};

export const MBUDGET = {
  chartSpend: {
    type: 'bar' as const,
    labels: ['LinkedIn', 'SEO', 'Webinare', 'Outbound', 'Partner'],
    datasets: [
      { label: 'Budget (€)', data: [16000, 8000, 5000, 5000, 5000], color: '#7CEFE6' },
      { label: 'Spend Ist (€)', data: [17712, 6560, 4920, 7380, 3936], color: '#FF7A3D' },
    ],
  },
  headers: ['Kanal', 'Budget 2025', 'Spend Ist', 'Abweichung', 'Neukunden', 'CAC', 'Bewertung'],
  rows: [
    ['LinkedIn-Content & Ads', '16.000 €', '17.712 €', '+11 %', '18', '984 €', '🟡 über Budget'],
    ['SEO / Content', '8.000 €', '6.560 €', '−18 %', '10', '656 €', '✅ effizient'],
    ['Partner / Empfehlung', '5.000 €', '3.936 €', '−21 %', '8', '492 €', '✅ unterinvestiert'],
    ['Webinare', '5.000 €', '4.920 €', '−2 %', '6', '820 €', '✅ im Plan'],
    ['Outbound-E-Mail', '5.000 €', '7.380 €', '+48 %', '5', '1.476 €', '🔴 ineffizient'],
    ['Gesamt', '39.000 €', '40.500 €', '+3,8 %', '47', '862 €', 'Blended Marketing-CAC'],
  ],
};

export const BRAND = {
  chart: {
    type: 'line' as const,
    labels: ['Q1 25', 'Q2 25', 'Q3 25', 'Q4 25'],
    datasets: [
      { label: 'Website-Besucher/Mon.', data: [1900, 2300, 2600, 2900], color: '#00D9C6', fill: true },
      { label: 'LinkedIn-Follower', data: [700, 900, 1150, 1400], color: '#7CEFE6' },
      { label: 'Newsletter-Abos', data: [280, 390, 510, 620], color: '#FF7A3D' },
    ],
  },
  metrics: [
    { label: 'Website Besucher Q4/2025', val: '2.900 / Monat' },
    { label: 'LinkedIn Follower Ende 2025', val: '1.400' },
    { label: 'Newsletter Abonnenten', val: '620' },
    { label: 'Domain Authority (DA)', val: '14' },
  ],
};

export const CONTENT = {
  title: 'Content-Strategie',
  focusAreas: [
    'LinkedIn Thought Leadership durch Gründer Marc Pönisch (CEO)',
    'Praxis-Guides: "Schluss mit Excel-Chaos im Vertrieb"',
    'Fallstudien mit Maschinenbau- und IT-Kunden',
  ],
};

export const TOOLS = {
  title: 'Digitale Tools im Vertrieb',
  stack: [
    { tool: 'LeadPilot Platform', usage: 'Lead-Scoring, Pipeline-Cockpit, Nurturing' },
    { tool: 'Calendly', usage: 'Terminbuchung für Demos' },
    { tool: 'M365 / Workspace', usage: 'E-Mail & Kalender-Integration' },
    { tool: 'Apollo.io', usage: 'Kontaktdaten-Anreicherung' },
  ],
};

export const PLANUNG = {
  title: 'Marketingplanung H2 2026',
  chartPlanbudget: {
    type: 'bar' as const,
    labels: ['Aug 26', 'Sep 26', 'Okt 26', 'Nov 26', 'Dez 26', 'Jan 27'],
    datasets: [{
      label: 'Monatsbudget (€)',
      data: [2500, 3375, 3375, 3375, 2500, 4250],
      color: '#00D9C6',
    }],
  },
  chartPlankpi: {
    type: 'bar' as const,
    labels: ['Neukunden/Mon.', 'Marketing-CAC (€/10)', 'Trial-to-Paid (%)', 'Churn/Mon. (%)', 'KI-Scoring (%)'],
    datasets: [
      { label: 'Basis (2025)', data: [4, 86.2, 18, 2.8, 47], color: '#7CEFE6' },
      { label: 'Ziel Jan 2027', data: [8, 72.0, 24, 2.2, 65], color: '#00D9C6' },
    ],
  },
  initiatives: [
    { name: 'Partner-Netzwerk Ausbau', budget: '12.000 €', target: '+15 Neukunden via Empfehlungen' },
    { name: 'Guided Onboarding Campaign', budget: '8.000 €', target: 'Trial-to-Paid auf 25% steigern' },
    { name: 'SEO Content Expansion', budget: '10.000 €', target: 'Verdopplung organischer Traffic' },
  ],
};

export const KAMPAGNE = {
  title: 'Kampagne: LeadPilot Connect',
  summary: 'Multichannel Outbound Kampagne zur Vermarktung der Nurturing-Sequenzen.',
  chartKampbudget: {
    type: 'doughnut' as const,
    labels: ['Paid Social (Retargeting)', 'Content-Produktion', 'Sonstiges / Freelance', 'Kontingenz'],
    datasets: [{
      data: [1000, 875, 375, 250],
      colors: ['#00D9C6', '#7CEFE6', '#FF9A66', '#FF7A3D'],
    }],
  },
  kpis: [
    { label: 'Erreichte B2B Entscheider', val: '1.250' },
    { label: 'Demo-Anfragen', val: '48' },
    { label: 'Abgeschlossene Deals', val: '12' },
  ],
};
