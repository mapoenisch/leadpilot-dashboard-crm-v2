import { ResourceCategory, ResourceMetadata, ResourceType } from '../types/resource';

export const RESOURCE_REGISTRY: Record<string, ResourceMetadata> = {
  'res-roadmap-h2-2026': {
    id: 'res-roadmap-h2-2026',
    title: 'Marketingplanung H2-2026 – Roadmap',
    subtitle: 'Operative 6-Monats-Marketing-Roadmap (Aug 2026 – Jan 2027)',
    description: 'Detaillierte Planung aller Marketinginitiativen, Budgetallokationen und Meilensteine für das 2. Halbjahr 2026.',
    category: 'MARKETING',
    type: 'DOCUMENT',
    pageCount: 4,
    assetPaths: [
      '/resources/documents/roadmap/page-1.jpg',
      '/resources/documents/roadmap/page-2.jpg',
      '/resources/documents/roadmap/page-3.jpg',
      '/resources/documents/roadmap/page-4.jpg',
    ],
    thumbnailPath: '/resources/documents/roadmap/page-1.jpg',
    historicalId: 's-int-roadmap',
    originalSource: 'LeadPilot - Marketingplanung H2-2026(Roadmap).pdf',
    tags: ['Marketing', 'Roadmap', 'H2-2026', 'Budget'],
  },

  'res-praesentation-h2-2026': {
    id: 'res-praesentation-h2-2026',
    title: 'Marketingplanung H2-2026 – Präsentation',
    subtitle: 'Strategisches Pitch- & Planungsdeck für H2-2026',
    description: 'Vollständige interne Präsentation zur Marketingstrategie, Kanalgewichtung und Wachstumszielen für das zweite Halbjahr.',
    category: 'MARKETING',
    type: 'SLIDE_DECK',
    pageCount: 11,
    assetPaths: [
      '/resources/slides/praesentation-h2/slide-1.jpg',
      '/resources/slides/praesentation-h2/slide-2.jpg',
      '/resources/slides/praesentation-h2/slide-3.jpg',
      '/resources/slides/praesentation-h2/slide-4.jpg',
      '/resources/slides/praesentation-h2/slide-5.jpg',
      '/resources/slides/praesentation-h2/slide-6.jpg',
      '/resources/slides/praesentation-h2/slide-7.jpg',
      '/resources/slides/praesentation-h2/slide-8.jpg',
      '/resources/slides/praesentation-h2/slide-9.jpg',
      '/resources/slides/praesentation-h2/slide-10.jpg',
      '/resources/slides/praesentation-h2/slide-11.jpg',
    ],
    thumbnailPath: '/resources/slides/praesentation-h2/slide-1.jpg',
    historicalId: 's-int-praesentation-h2',
    originalSource: 'LeadPilot - Marketingplanung H2-2026(Präsentation).pptx',
    tags: ['Marketing', 'Präsentation', 'Slide Deck', 'Strategie'],
  },

  'res-kampagnenbrief-connect': {
    id: 'res-kampagnenbrief-connect',
    title: 'LeadPilot Connect – Kampagnenbrief',
    subtitle: 'Strategisches Kampagnen-Briefing für Reaktivierung & Outbound',
    description: 'Umfassendes Briefing zur Einführungskampagne "LeadPilot Connect" mit Zielgruppen-Targeting, Messaging und Asset-Plan.',
    category: 'MARKETING',
    type: 'DOCUMENT',
    pageCount: 3,
    assetPaths: [
      '/resources/documents/kampagnenbrief/page-1.jpg',
      '/resources/documents/kampagnenbrief/page-2.jpg',
      '/resources/documents/kampagnenbrief/page-3.jpg',
    ],
    thumbnailPath: '/resources/documents/kampagnenbrief/page-1.jpg',
    historicalId: 's-int-kampagnenbrief',
    originalSource: 'LeadPilot - Connect Kampagnenbrief.pdf',
    tags: ['Kampagne', 'Connect', 'Outbound', 'Briefing'],
  },

  'res-leitfaden-lead-nachverfolgung': {
    id: 'res-leitfaden-lead-nachverfolgung',
    title: 'Leitfaden Lead-Nachverfolgung',
    subtitle: 'Operatives Playbook für systematischen B2B-Vertrieb',
    description: 'Standardisierter Leitfaden zur schnellen Qualifizierung und Nachverfolgung von eingehenden Inbound- und Outbound-Leads.',
    category: 'SALES',
    type: 'DOCUMENT',
    pageCount: 4,
    assetPaths: [
      '/resources/documents/leitfaden/page-1.jpg',
      '/resources/documents/leitfaden/page-2.jpg',
      '/resources/documents/leitfaden/page-3.jpg',
      '/resources/documents/leitfaden/page-4.jpg',
    ],
    thumbnailPath: '/resources/documents/leitfaden/page-1.jpg',
    historicalId: 's-int-leitfaden',
    originalSource: 'LeadPilot - Leitfaden Lead-Nachverfolgung.pdf',
    tags: ['Sales', 'Playbook', 'Lead-Management', 'SLA'],
  },

  'res-landingpage-live': {
    id: 'res-landingpage-live',
    title: 'LeadPilot Landingpage',
    subtitle: 'Interaktiver Web-Auftritt mit Live-Demo & ROI-Rechner',
    description: 'Vollständige interaktive Landingpage der LeadPilot GmbH mit animiertem Hero, Live-Funktionsrechnern und FAQ-Akkordeon.',
    category: 'MARKETING',
    type: 'INTERACTIVE_HTML',
    pageCount: 1,
    assetPaths: ['/resources/landingpage/index.html'],
    thumbnailPath: '/resources/slides/praesentation-h2/slide-1.jpg',
    historicalId: 's-int-landingpage',
    originalSource: 'LeadPilot - Landingpage.html',
    tags: ['Website', 'Landingpage', 'Live Demo', 'Interactive'],
    isInteractive: true,
  },

  'res-pitch-autec': {
    id: 'res-pitch-autec',
    title: 'Personalisierte Präsentation AUTEC',
    subtitle: 'Maßgeschneidertes B2B-Pitch-Deck für Sondermaschinenbau',
    description: 'Kundenindividuelles Sales-Deck für die AUTEC Sondermaschinenbau GmbH mit branchenspezifischer Value Proposition.',
    category: 'SALES',
    type: 'SLIDE_DECK',
    pageCount: 6,
    assetPaths: [
      '/resources/slides/autec/slide-1.jpg',
      '/resources/slides/autec/slide-2.jpg',
      '/resources/slides/autec/slide-3.jpg',
      '/resources/slides/autec/slide-4.jpg',
      '/resources/slides/autec/slide-5.jpg',
      '/resources/slides/autec/slide-6.jpg',
    ],
    thumbnailPath: '/resources/slides/autec/slide-1.jpg',
    historicalId: 's-int-autec',
    originalSource: 'LeadPilot - Personalisierte Präsentation für AUTEC.pptx',
    tags: ['Pitch Deck', 'AUTEC', 'Maschinenbau', 'Sales'],
  },

  'res-pitch-deubner': {
    id: 'res-pitch-deubner',
    title: 'Präsentation Deubner',
    subtitle: 'B2B-Vertriebspräsentation für Baumaschinenhandel',
    description: 'Kundenindividuelle Präsentation zur LeadPilot-Einführung bei Deubner Baumaschinen zur Digitalisierung des Lead-Routings.',
    category: 'SALES',
    type: 'SLIDE_DECK',
    pageCount: 5,
    assetPaths: [
      '/resources/slides/deubner/slide-1.jpg',
      '/resources/slides/deubner/slide-2.jpg',
      '/resources/slides/deubner/slide-3.jpg',
      '/resources/slides/deubner/slide-4.jpg',
      '/resources/slides/deubner/slide-5.jpg',
    ],
    thumbnailPath: '/resources/slides/deubner/slide-1.jpg',
    historicalId: 's-int-deubner',
    originalSource: 'LeadPilot - Präsentation Deubner.pptx',
    tags: ['Pitch Deck', 'Deubner', 'Handel', 'Sales'],
  },

  'res-sla-lead-matrix': {
    id: 'res-sla-lead-matrix',
    title: 'Lead-Qualifizierungs-Matrix (SLA)',
    subtitle: 'Visuelles Scoring nach ICP-Fit & Kaufsignal',
    description: 'Kanonische Matrix zur Einstufung von Leads in Kalt, Warm und Heiß zur optimalen Übergabe zwischen Marketing und Vertrieb.',
    category: 'OPERATIONS',
    type: 'GRAPHIC',
    pageCount: 1,
    assetPaths: ['/resources/graphics/sla-matrix.png'],
    thumbnailPath: '/resources/graphics/sla-matrix.png',
    historicalId: 's-sla-matrix',
    originalSource: 'LeadPilot - Leadqualifizierung.png',
    tags: ['SLA', 'Qualifizierung', 'Scoring', 'Matrix'],
  },

  'res-leadpilot-werbespot': {
    id: 'res-leadpilot-werbespot',
    title: 'LeadPilot Werbespot',
    subtitle: 'Offizieller Produkt- & Markenvideospot',
    description: 'Offizieller Werbespot der LeadPilot GmbH zur B2B-Plattform und Lead-Generierung.',
    category: 'MARKETING',
    type: 'VIDEO',
    pageCount: 1,
    assetPaths: ['/resources/videos/leadpilot-werbespot.webm'],
    thumbnailPath: '/resources/videos/leadpilot-werbespot-poster.png',
    historicalId: 's-int-werbespot',
    originalSource: 'LeadPilot - Werbespot.webm',
    tags: ['Marketing', 'Werbespot', 'Video'],
  },
};

const HISTORICAL_RESOURCE_IDS = new Set([
  'res-roadmap-h2-2026',
  'res-praesentation-h2-2026',
  'res-kampagnenbrief-connect',
  'res-leitfaden-lead-nachverfolgung',
  'res-landingpage-live',
  'res-pitch-autec',
  'res-pitch-deubner',
  'res-sla-lead-matrix',
]);

export class ResourceRegistry {
  /**
   * Kanonischer Baseline-Vertrag (Auftrag 015 / 016 Regressionsschutz):
   * Liefert exakt die 8 historischen Primärressourcen.
   */
  public static getAllResources(): ResourceMetadata[] {
    return Object.values(RESOURCE_REGISTRY).filter((r) => HISTORICAL_RESOURCE_IDS.has(r.id));
  }

  /**
   * Vollständige aktuelle Dashboard-Bibliothek inklusive des Werbespots (Auftrag 033 / Gate G17).
   */
  public static getAllDashboardResources(): ResourceMetadata[] {
    return Object.values(RESOURCE_REGISTRY);
  }

  public static getResourceById(id: string): ResourceMetadata | undefined {
    return RESOURCE_REGISTRY[id];
  }

  public static getResourcesByCategory(category: ResourceCategory): ResourceMetadata[] {
    return this.getAllResources().filter((r) => r.category === category);
  }

  public static getResourcesByType(type: ResourceType): ResourceMetadata[] {
    return this.getAllResources().filter((r) => r.type === type);
  }
}
