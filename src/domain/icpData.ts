export const ICP_SPECS = {
  title: 'Ideal Customer Profile (ICP) - LeadPilot GmbH',
  firmografie: [
    { key: 'Branche', value: 'Maschinenbau, IT & Software, Großhandel, Agenturen' },
    { key: 'Unternehmensgröße', value: '0–200 Mitarbeitende (Sweet Spot: 20–100)' },
    { key: 'Jahresumsatz', value: '2–30 Mio. € (Sweet Spot: 5–20 Mio. €)' },
    { key: 'Vertriebsteam', value: '2–20 Vertriebsmitarbeitende' },
    {
      key: 'Region',
      value:
        'DACH-Raum; aktueller Kundenbestand: Deutschland 61, Österreich 3, Schweiz 2. Erste B2B-Kunden in Österreich und der Schweiz.',
    },
  ],
  triggers: [
    'Kein CRM im Einsatz oder reine Verwaltung in Excel-Listen',
    'Vertriebsleitung berichtet von verlorenen Leads',
    'Lead-Quellen: Messen, Website, LinkedIn, Empfehlungen',
  ],
  exclusion: [
    'Großkonzerne > 200 MA mit komplexer Enterprise-IT',
    'Reine B2C-Unternehmen ohne mehrstufigen Vertrieb',
    'Unternehmen ohne laufendes Software-Budget',
  ],
};
