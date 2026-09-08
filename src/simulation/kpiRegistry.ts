import { KPIDefinition } from '../types/kpi';

/**
 * Central KPI Registry (Auftrag 014).
 * Single source of truth for KPI directionality, units, and categories.
 */
export class KPIRegistry {
  private static readonly DEFINITIONS: Record<string, KPIDefinition> = {
    liveARR: {
      id: 'liveARR',
      label: 'ARR (Jährlich wiederkehrender Umsatz)',
      unit: '€',
      category: 'OPERATIVE',
      direction: 'HIGHER_IS_BETTER',
      description: 'Annual Run Rate aller aktiven Kundenverträge',
    },
    liveMRR: {
      id: 'liveMRR',
      label: 'MRR (Monatlich wiederkehrender Umsatz)',
      unit: '€',
      category: 'OPERATIVE',
      direction: 'HIGHER_IS_BETTER',
      description: 'Monatlicher wiederkehrender Umsatz aus aktiven Abonnements',
    },
    liveCustomers: {
      id: 'liveCustomers',
      label: 'Aktive Kunden',
      unit: 'Kunden',
      category: 'OPERATIVE',
      direction: 'HIGHER_IS_BETTER',
      description: 'Gesamtzahl zahlender aktiver Kunden im CRM',
    },
    liveWonDeals: {
      id: 'liveWonDeals',
      label: 'Gewonnene Deals',
      unit: 'Deals',
      category: 'OPERATIVE',
      direction: 'HIGHER_IS_BETTER',
      description: 'Anzahl erfolgreich geschlossener Neukundenabschlüsse',
    },
    conversionRate: {
      id: 'conversionRate',
      label: 'Konvertierungsrate',
      unit: '%',
      category: 'OPERATIVE',
      direction: 'HIGHER_IS_BETTER',
      description: 'Verhältnis von gewonnenen Deals zu Gesamtabschlüssen',
    },
    ebitda: {
      id: 'ebitda',
      label: 'EBITDA',
      unit: '€',
      category: 'FINANCIAL',
      direction: 'HIGHER_IS_BETTER',
      description: 'Operatives Ergebnis vor Zinsen, Steuern und Abschreibungen',
    },
    netRevenue: {
      id: 'netRevenue',
      label: 'Nettoumsatz',
      unit: '€',
      category: 'FINANCIAL',
      direction: 'HIGHER_IS_BETTER',
      description: 'Nettoumsatz nach Abzug von Churn Loss',
    },
    grossRevenue: {
      id: 'grossRevenue',
      label: 'Bruttoumsatz',
      unit: '€',
      category: 'FINANCIAL',
      direction: 'HIGHER_IS_BETTER',
      description: 'Bruttoumsatz aus vertraglicher ARR-Basis',
    },
    grossProfit: {
      id: 'grossProfit',
      label: 'Bruttoergebnis',
      unit: '€',
      category: 'FINANCIAL',
      direction: 'HIGHER_IS_BETTER',
      description: 'Ertrag vor operativen Aufwendungen',
    },
    contributionMargin: {
      id: 'contributionMargin',
      label: 'Deckungsbeitrag',
      unit: '€',
      category: 'FINANCIAL',
      direction: 'HIGHER_IS_BETTER',
      description: 'Deckungsbeitrag nach variablen Vertriebskosten',
    },
    netCashFlow: {
      id: 'netCashFlow',
      label: 'Netto-Cashflow',
      unit: '€',
      category: 'FINANCIAL',
      direction: 'HIGHER_IS_BETTER',
      description: 'Operativer Netto-Zahlungsstrom der Periode',
    },
    operatingMargin: {
      id: 'operatingMargin',
      label: 'Operative Marge',
      unit: '%',
      category: 'FINANCIAL',
      direction: 'HIGHER_IS_BETTER',
      description: 'Prozentuales Verhältnis von EBITDA zu Nettoumsatz',
    },
    cac: {
      id: 'cac',
      label: 'CAC (Customer Acquisition Cost)',
      unit: '€',
      category: 'FINANCIAL',
      direction: 'LOWER_IS_BETTER',
      description: 'Durchschnittliche Akquisitionskosten je gewonnenem Neukunden',
    },
    totalOpex: {
      id: 'totalOpex',
      label: 'Gesamt OPEX',
      unit: '€',
      category: 'FINANCIAL',
      direction: 'LOWER_IS_BETTER',
      description: 'Gesamte operative Betriebsausgaben (Headcount + Marketing + Other)',
    },
    churnLoss: {
      id: 'churnLoss',
      label: 'Churn Loss',
      unit: '€',
      category: 'FINANCIAL',
      direction: 'LOWER_IS_BETTER',
      description: 'Umsatzverlust durch Vertragskündigungen',
    },
    salesQueueTime: {
      id: 'salesQueueTime',
      label: 'Sales Queue Time',
      unit: 'Ticks',
      category: 'CAPACITY',
      direction: 'LOWER_IS_BETTER',
      description: 'Durchschnittliche Wartezeit von Vorgängen in der Sales Queue',
    },
    csQueueTime: {
      id: 'csQueueTime',
      label: 'CS Queue Time',
      unit: 'Ticks',
      category: 'CAPACITY',
      direction: 'LOWER_IS_BETTER',
      description: 'Durchschnittliche Wartezeit von Kunden in der CS Queue',
    },
  };

  /**
   * Retrieves KPI definition by ID.
   */
  public static getKPI(kpiId: string): KPIDefinition {
    const found = this.DEFINITIONS[kpiId];
    if (found) return found;

    // Fallback default definition for custom/unknown KPIs
    return {
      id: kpiId,
      label: kpiId,
      unit: '',
      category: 'OPERATIVE',
      direction: 'HIGHER_IS_BETTER',
      description: `KPI ${kpiId}`,
    };
  }

  /**
   * Returns all registered KPI definitions.
   */
  public static getAllKPIs(): KPIDefinition[] {
    return Object.values(this.DEFINITIONS);
  }
}
