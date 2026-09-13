export const PROJEKT = {
  title: 'Projektkontext & Dokumentation',
  summary: 'Übersicht der operativen Meilensteine und Dokumente der LeadPilot GmbH.',
  tasks: [
    {
      id: 'SOT-1.1',
      title: 'LeadPilot Faktenblatt v1.1 (Single Source of Truth)',
      status: 'Verbindlich',
      date: 'Juli 2026',
    },
    {
      id: 'TS-1.1',
      title: 'Marktanalyse B2B SaaS DACH',
      status: 'Abgeschlossen',
      date: 'Jan 2025',
    },
    {
      id: 'TS-2.1',
      title: 'Entwicklung ICP & Buyer Persona Volker',
      status: 'Abgeschlossen',
      date: 'Feb 2025',
    },
    {
      id: 'TS-3.2',
      title: 'Funnel-Analyse & SLA Marketing/Sales',
      status: 'Abgeschlossen',
      date: 'Mai 2025',
    },
    {
      id: 'TS-4.1',
      title: 'Jahresabschluss 2025 & GuV-Prüfung',
      status: 'Abgeschlossen',
      date: 'Jan 2026',
    },
  ],
};

export const QUELLEN = {
  title: 'Verbindliches Referenzmaterial',
  sources: [
    {
      name: 'docs/LeadPilot_Faktenblatt_v1.1.md',
      desc: 'Verbindliches Faktenblatt v1.1 (Single Source of Truth)',
    },
    { name: 'Jahresabschluss 2025', desc: 'Geprüfter Jahresabschluss 2025 (GuV & Bilanz)' },
    {
      name: 'Gewerberaummietvertrag v. 15.08.2022',
      desc: 'Mietvertrag Augustusplatz 9, Leipzig (Laufzeit bis 31.08.2027)',
    },
    { name: 'PostgreSQL CRM Repository', desc: '20 Companies, 100 Contacts, 40 Funnel Deals' },
  ],
};
