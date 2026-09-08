export const GUV = {
  headers: ['Position (€)', 'FY 2024', 'FY 2025', 'Plan 2026'],
  rows: [
    ['Abo-Umsatz (wiederkehrend)', '149.000 €', '307.600 €', '620.000 €'],
    ['Onboarding & Setup Erlöse', '12.000 €', '23.000 €', '35.000 €'],
    ['Sonstige Erlöse', '3.000 €', '5.400 €', '8.000 €'],
    ['Umsatzerlöse (Gesamtumsatz)', '164.000 €', '336.000 €', '663.000 €'],
    ['Umsatzkosten (Hosting, Support, Payment)', '−64.000 €', '−121.000 €', '−192.000 €'],
    ['Bruttogewinn', '100.000 €', '215.000 €', '471.000 €'],
    ['Sales & Marketing', '−141.000 €', '−209.000 €', '−260.000 €'],
    ['Forschung & Entwicklung', '−164.000 €', '−208.000 €', '−240.000 €'],
    ['General & Administrative', '−83.000 €', '−107.000 €', '−120.000 €'],
    ['EBITDA', '−288.000 €', '−309.000 €', '−149.000 €'],
    ['Abschreibungen (AfA)', '−14.000 €', '−18.000 €', '−22.000 €'],
    ['EBIT', '−302.000 €', '−327.000 €', '−171.000 €'],
    ['Finanzergebnis', '−4.000 €', '−5.500 €', '−5.000 €'],
    ['Ergebnis vor Steuern (EBT)', '−306.000 €', '−332.500 €', '−176.000 €'],
    ['Sonstige Steuern', '−1.000 €', '−1.500 €', '−2.000 €'],
    ['Jahresfehlbetrag', '−307.000 €', '−334.000 €', '−178.000 €'],
  ],
};

export const BILANZ = {
  aktiva: [
    ['A. Anlagevermögen (Lizenzen, Sachanlagen)', '60.000 €'],
    ['  I. Immaterielle Vermögensgegenstände', '22.000 €'],
    ['  II. Sachanlagen (Hardware, BGA)', '38.000 €'],
    ['B. Umlaufvermögen', '411.000 €'],
    ['  I. Forderungen aus Lieferungen & Leistungen', '34.000 €'],
    ['  II. Sonstige Vermögensgegenstände (USt, Kaution 8,5k€)', '14.000 €'],
    ['  III. Kassenbestand & Bankguthaben', '363.000 €'],
    ['C. Rechnungsabgrenzungsposten (RAP)', '8.000 €'],
    ['Gesamtaktiva (Bilanzsumme)', '479.000 €'],
  ],
  passiva: [
    ['A. Eigenkapital', '344.000 €'],
    ['  I. Gezeichnetes Stammkapital', '31.250 €'],
    ['  II. Kapitalrücklage', '1.193.750 €'],
    ['  III. Verlustvortrag', '−547.000 €'],
    ['  IV. Jahresfehlbetrag 2025', '−334.000 €'],
    ['B. Rückstellungen (Urlaub, Abschluss)', '30.000 €'],
    ['C. Verbindlichkeiten', '67.000 €'],
    ['  SAB-Innovationsdarlehen', '18.000 €'],
    ['  Aus Lieferungen & Leistungen', '21.000 €'],
    ['  Sonstige (Steuern, Sozialvers.)', '28.000 €'],
    ['D. Rechnungsabgrenzungsposten (Vorauszahlungen)', '38.000 €'],
    ['Gesamtpassiva (Bilanzsumme)', '479.000 €'],
  ],
};

export const UNIT = {
  title: 'Unit Economics & SaaS-Kernmetriken 2025',
  metrics: [
    { label: 'Marketing-CAC', val: '862 €' },
    { label: 'Fully-Loaded CAC', val: '4.447 €' },
    { label: 'Deckungsbeitrag je Kunde/Monat', val: '333 €' },
    { label: 'LTV (Lifetime Value)', val: '11.893 €' },
    { label: 'LTV / CAC Ratio', val: '2,7 : 1 (Ziel: ≥ 3,0 : 1)' },
    { label: 'CAC-Payback (Fully Loaded)', val: '13 Monate' },
    { label: 'Bruttomarge', val: '64,0 %' },
    { label: 'Net Retention Rate (NRR)', val: '101 %' },
    { label: 'Gross Retention Rate (GRR)', val: '88 %' },
  ],
};

export const BUDGET = {
  title: 'Kostenstruktur nach Kostenart GJ 2025',
  allocations: [
    { area: 'Personalaufwand gesamt (Ø 9 FTE, Ø 54.400 €/FTE)', budget: '490.000 €', share: '76 %' },
    { area: 'Hosting, KI-API, Zahlungsabwicklung', budget: '39.000 €', share: '6 %' },
    { area: 'Marketing-Media-Spend', budget: '40.500 €', share: '6 %' },
    { area: 'Miete (Augustusplatz 9), Recht, StB, Vers.', budget: '52.000 €', share: '8 %' },
    { area: 'Software, Tools, Lizenzen', budget: '23.500 €', share: '4 %' },
  ],
};

export const CHART_ERLOESE = {
  type: 'doughnut' as const,
  labels: ['Abo-Umsatz', 'Onboarding & Setup', 'Sonstige Erlöse'],
  datasets: [{
    data: [307600, 23000, 5400],
    colors: ['#00D9C6', '#FF7A3D', '#7CEFE6'],
  }],
};

export const CHART_KOSTEN = {
  type: 'bar' as const,
  labels: ['Umsatz', 'Umsatzkosten', 'Sales & Mkt.', 'F&E', 'G&A', 'EBITDA'],
  datasets: [
    { label: 'FY 2024 (k€)', data: [164, 64, 141, 164, 83, -288], color: '#7CEFE6' },
    { label: 'FY 2025 (k€)', data: [336, 121, 209, 208, 107, -309], color: '#00D9C6' },
  ],
};

export const CHART_MRR26 = {
  type: 'line' as const,
  labels: ['Jan 26', 'Mär 26', 'Jun 26', 'Sep 26', 'Dez 26'],
  datasets: [
    { label: 'Gesamt-MRR (€)', data: [34320, 38000, 42500, 47000, 51667], color: '#00D9C6', fill: true },
    { label: 'Neu-MRR (€)', data: [3200, 3500, 3800, 4000, 4200], color: '#7CEFE6' },
    { label: 'Churn-MRR (€)', data: [960, 900, 850, 800, 750], color: '#FF7A3D' },
  ],
};

export const CHART_CHURN26 = {
  type: 'line' as const,
  labels: ['Q1 26', 'Q2 26', 'Q3 26', 'Q4 26'],
  datasets: [
    { label: 'Account-Churn (%)', data: [2.6, 2.3, 2.0, 1.8], color: '#FF7A3D' },
    { label: 'Trial-to-Paid (%)', data: [20, 22, 24, 26], color: '#00D9C6', fill: true },
  ],
};

export const CHART_BUDGET = {
  type: 'doughnut' as const,
  labels: ['Personal', 'Cloud & KI-API', 'Marketing & Ads', 'Strategische Initiativen', 'Tools & Lizenzen', 'Büro & Verwaltung', 'Recht & Security'],
  datasets: [{
    data: [600000, 60000, 55000, 44000, 28000, 25000, 18000],
    colors: ['#00D9C6', '#7CEFE6', '#FF7A3D', '#FF9A66', '#A7B0BA', '#3DDC97', '#FFD1B8'],
  }],
};
