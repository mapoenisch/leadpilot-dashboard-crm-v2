export const MARKT = {
  title: 'Marktlage & Cloud-CRM DACH',
  overview: [
    ['Europa Cloud-CRM-Markt (2026)', '14,23 Mrd. USD (CAGR 5,23 %, Prognose 18,36 Mrd. USD bis 2031)'],
    ['Deutschland Einzelmarkt', 'Größter CRM-Einzelmarkt Europas mit 24,4 % Marktanteil (2025)'],
    ['LeadPilot Marktanteil', '< 0,1 % (Fokus auf Nische B2B-Mittelstand)'],
    ['Digitale Reichweite 2025', '1.400 LinkedIn-Follower · 620 Newsletter-Abos · 2.900 Web-Besucher/Monat · DA 14'],
  ],
};

export const WETTBEWERB = {
  title: 'Wettbewerbslandschaft & Marktanteile Europa/DACH',
  headers: ['Anbieter', 'Marktanteil', 'Fokus', 'Schwachstelle aus LeadPilot-Sicht', 'Differenzierung LeadPilot'],
  rows: [
    ['Brevo', '29,4 %', 'E-Mail-Marketing-CRM', 'Kein B2B-Pipeline-Fokus', 'LeadPilot bietet fokussiertes B2B Lead-Management'],
    ['Zendesk', '23,5 %', 'Support / Service', 'Kein Sales-Automation-Fokus', 'LeadPilot fokussiert rein auf Neukundengewinnung'],
    ['HubSpot', '11,3 %', 'All-in-One, Marketing', 'Zu komplex & teuer für reinen B2B-Vertrieb', 'LeadPilot ist in < 30 Min startklar zum Festpreis'],
    ['Salesforce', '8,5 %', 'Enterprise-Standard', 'Zu teuer und komplex für KMU', 'LeadPilot erfordert keine IT-Abteilung'],
    ['Pipedrive', '1,6 %', 'Pipeline-Management B2B', 'Kein natives KI-Scoring als Kernfunktion', 'LeadPilot bietet integriertes KI-ICP-Scoring'],
    ['LeadPilot', '< 0,1 %', 'KI-Scoring + Schnelligkeit', 'Geringe Markenbekanntheit', 'Schnellste Time-to-Value & 100% DSGVO-konform'],
  ],
};

export const CHART_WETTBEWERB = {
  type: 'bar' as const,
  labels: ['Brevo', 'Zendesk', 'HubSpot', 'Salesforce', 'Pipedrive', 'LeadPilot'],
  datasets: [{
    label: 'Marktanteil Europa/DACH (%)',
    data: [29.4, 23.5, 11.3, 8.5, 1.6, 0.1],
    colors: ['#A7B0BA', '#A7B0BA', '#A7B0BA', '#A7B0BA', '#7CEFE6', '#00D9C6'],
  }],
};

export const SWOT = {
  title: 'SWOT-Analyse der LeadPilot GmbH (GJ 2025)',
  strengths: [
    'Schnellste Time-to-Value am Markt (< 30 Minuten Setup)',
    '100% Fokus auf den B2B-Mittelstand im DACH-Raum (Maschinenbau, IT, Großhandel)',
    '100% DSGVO-konform mit Hosting in Frankfurt am Main & EU-KI-Modellen',
    'Hohe Kundenzufriedenheit im Kernsegment (ARPA 520 €)',
  ],
  weaknesses: [
    'Account-Churn 2,8 % pro Monat bei Kleinstkunden (ICP-Mismatch)',
    'Monatliche Burn Rate von 25.750 € führt zu Runway von 14 Monaten',
    'Geringe Markenbekanntheit (< 0,1 % Marktanteil) gegenüber HubSpot/Salesforce',
    'CTO als Single Point of Failure für die KI-Scoring Engine',
  ],
  opportunities: [
    'Großer Nachholbedarf bei der B2B-Vertriebsdigitalisierung im Mittelstand',
    'Steigende Nachfrage nach DSGVO-konformer Software ohne US-Direct-Access',
    'Skalierung des Partner- und Empfehlungskanals (günstigster CAC mit 492 €)',
    'Einführung des Guided Trial Onboarding Flows zur Erhöhung der Trial-to-Paid Rate (18 % → 25 %)',
  ],
  threats: [
    'Eintritt US-amerikanischer Anbieter mit großem Marketingbudget',
    'Verschärfter Preiskampf im B2B SaaS Einstiegssegment',
    'Mögliche Verschlechterung der Gesamtwirtschaftslage im Maschinenbau',
  ],
};
