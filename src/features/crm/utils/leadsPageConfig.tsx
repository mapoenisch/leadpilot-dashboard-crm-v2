import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CrmColumn } from '../components/CrmResponsiveList';
import { LeadScoreBadge } from '../components/LeadScoreBadge';
import { calculateLeadScore, type LeadQualityTier } from '../services/leadScoringService';

export const mkOpts = (csv: string) =>
  csv.split(',').map((p) => {
    const [value = '', label] = p.split(':');
    return { value, label: label || value };
  });

export const ORDER_OPTS = mkOpts('asc:Aufsteigend (A-Z),desc:Absteigend (Z-A)');

export const QUALITY_OPTS = mkOpts(
  'ALL:Alle Qualitäten,hot:🔥 Hot Leads (≥ 80%),warm:🟡 Warm (50–79%),cold:❄️ Cold (< 50%)',
);

export type R = Record<string, unknown>;

export const col = (
  key: string,
  label: string,
  render?: (r: R) => React.ReactNode,
): CrmColumn<R> => ({
  key,
  label,
  render,
});

export const bStrong = (v: unknown) => <strong className="text-text">{String(v ?? '')}</strong>;
export const bSpan = (v: unknown, cls: string) => <span className={cls}>{String(v ?? '')}</span>;
export const bBadge = (v: unknown, variant: 'cyan' | 'neutral' = 'cyan') => (
  <Badge variant={variant}>{String(v ?? '')}</Badge>
);

export function buildContactColumns(options: {
  onSelectLead: (lead: R) => void;
  onConvertLead: (lead: R) => void;
}): CrmColumn<R>[] {
  return [
    col('name', 'Name', (r) =>
      bStrong(`${String(r.firstName ?? '')} ${String(r.lastName ?? '')}`.trim()),
    ),
    col('email', 'E-Mail', (r) => bSpan(r.email, 'font-mono text-[12.5px] text-primary')),
    col('jobTitle', 'Jobbezeichnung', (r) => bBadge(r.jobTitle)),
    col('companyId', 'Company-ID', (r) =>
      bSpan(r.companyId, 'font-mono text-[11px] text-[var(--color-text-muted)]'),
    ),
    col('score', 'ICP-Score', (r) => (
      <LeadScoreBadge
        lead={{
          jobTitle: r.jobTitle as string,
          companyName: (r.companyName || r.companyId) as string,
          countryOrCity: (r.city || r.country) as string,
          employeeCount: r.employeeCount as number | string,
          industry: r.industry as string,
        }}
        onClick={() => options.onSelectLead(r)}
      />
    )),
    col('actions', 'Aktion', (r) => (
      <div className="flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          className="text-[11.5px] px-2 py-0.5 h-7"
          onClick={() => options.onSelectLead(r)}
          aria-label={`Lead ${String(r.firstName ?? '')} ${String(r.lastName ?? '')} qualifizieren`}
        >
          Qualifizieren
        </Button>
      </div>
    )),
  ];
}

export const COL_COMPANIES: CrmColumn<R>[] = [
  col('name', 'Unternehmensname', (r) => bStrong(r.name)),
  col('domain', 'Domain', (r) => bSpan(r.domain, 'font-mono text-[12.5px] text-primary')),
  col('industry', 'Branche', (r) => bBadge(r.industry)),
  col('city', 'Stadt'),
  col('employeeCount', 'Mitarbeiter', (r) => bBadge(`${r.employeeCount || 0} MA`, 'neutral')),
];

export const COL_DEALS: CrmColumn<R>[] = [
  col('dealName', 'Deal Name', (r) => bStrong(r.dealName)),
  col('stage', 'Vertriebsphase', (r) => {
    const s = String(r.stage ?? '');
    const v = s.includes('gewonnen') ? 'cyan' : s.includes('verloren') ? 'neutral' : 'orange';
    return <Badge variant={v}>{s}</Badge>;
  }),
  col('amount', 'Betrag (€)', (r) =>
    bSpan(`${Number(r.amount ?? 0).toLocaleString('de-DE')} €`, 'font-mono text-primary font-bold'),
  ),
  col('closeDate', 'Abschlussdatum'),
  col('pipeline', 'Pipeline', (r) => bBadge(r.pipeline, 'neutral')),
];

export function buildTabConfig(contactCols: CrmColumn<R>[]) {
  return {
    contacts: {
      resource: 'contacts' as const,
      label: 'Kontakte',
      sort: 'last_name',
      order: 'asc',
      fKey: 'job_title',
      fLabel: 'Jobtitel:',
      sorts: mkOpts(
        'last_name:Nachname,first_name:Vorname,email:E-Mail,job_title:Jobtitel,created_at:Erstelldatum',
      ),
      filters: mkOpts(
        'ALL:Alle Jobtitel,CEO:CEO,CTO:CTO,Head of Sales:Head of Sales,VP Marketing:VP Marketing',
      ),
      cols: contactCols,
    },
    companies: {
      resource: 'companies' as const,
      label: 'Unternehmen',
      sort: 'name',
      order: 'asc',
      fKey: 'industry',
      fLabel: 'Branche:',
      sorts: mkOpts(
        'name:Unternehmensname,city:Stadt,employee_count:Mitarbeiter,created_at:Erstelldatum',
      ),
      filters: mkOpts(
        'ALL:Alle Branchen,IT:IT,Maschinenbau:Maschinenbau,Automotive:Automotive,Finanzen:Finanzen',
      ),
      cols: COL_COMPANIES,
    },
    funnel_deals: {
      resource: 'deals' as const,
      label: 'Funnel Deals',
      sort: 'close_date',
      order: 'desc',
      fKey: 'stage',
      fLabel: 'Vertriebsphase:',
      sorts: mkOpts(
        'close_date:Abschlussdatum,amount:Betrag,deal_name:Deal Name,stage:Vertriebsphase',
      ),
      filters: mkOpts(
        'ALL:Alle Vertriebsphasen,Lead eingegangen,Erstgespräch geführt,Bedarfsanalyse,Angebot erstellt,Verhandlung,Deal gewonnen,Deal verloren',
      ),
      cols: COL_DEALS,
    },
  };
}

export const TAB_ITEMS = mkOpts(
  'contacts:Kontakte,companies:Unternehmen,funnel_deals:Funnel Deals,audit:Datenbank- und Import-Prüfung',
).map((o) => ({ id: o.value, label: o.label }));

export const AUDIT_NOTES: [string, string][] = [
  ['Mandantengebundene Abfragen', 'Kontakte, Unternehmen und Deals via `crm-query-export`.'],
  ['Paginierung', 'Serverseitig begrenzt (`pageSize: 1..100`). Keine Browser-Filterung.'],
  ['CSV-Export', 'Identische serverseitige Query mit Formel-Injection-Neutralisierung.'],
  ['Lead-Scoring', 'Regelbasierter ICP-Fit-Score (0–100%) mit BANT-Qualifizierungs-Cockpit.'],
];

export function filterLeadsByQuality(items: R[], qualityFilter: string): R[] {
  if (!qualityFilter || qualityFilter === 'ALL') return items;
  return items.filter((item) => {
    const res = calculateLeadScore({
      jobTitle: item.jobTitle as string,
      companyName: (item.companyName || item.companyId) as string,
      countryOrCity: (item.city || item.country) as string,
      employeeCount: item.employeeCount as number | string,
      industry: item.industry as string,
    });
    return res.tier === (qualityFilter as LeadQualityTier);
  });
}

export function getCrmListStateInfo(
  isLoading: boolean,
  isError: boolean,
  error: unknown,
  itemsLength: number,
) {
  if (isLoading && itemsLength === 0) {
    return { type: 'loading' as const, msg: 'Lade Daten aus CRM Repository...' };
  }
  if (isError) {
    return {
      type: 'error' as const,
      msg: `Fehler: ${error instanceof Error ? error.message : 'Fehler beim Laden der CRM-Daten'}`,
    };
  }
  if (itemsLength === 0) {
    return { type: 'empty' as const, msg: 'Keine CRM-Daten gefunden' };
  }
  return null;
}
