import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CheckCircle2 } from 'lucide-react';
import { CrmColumn } from '../components/CrmResponsiveList';
import { LeadScoreBadge } from '../components/LeadScoreBadge';
import { calculateLeadScore, type LeadQualityTier } from '../services/leadScoringService';
import { serializeCsv, triggerBlobDownload } from './crmCsvHelper';

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

export function enrichContactWithCompany(contact: R, company?: R, isQualified?: boolean): R {
  const companyName = String(
    contact.companyName ?? company?.name ?? contact.companyId ?? 'Unbekanntes Unternehmen',
  );
  const industry = String(contact.industry ?? company?.industry ?? '');
  const city = String(contact.city ?? company?.city ?? '');
  const country = String(contact.country ?? (city ? 'Deutschland' : ''));
  const employeeCount = contact.employeeCount ?? company?.employeeCount ?? '';

  return {
    ...contact,
    companyName,
    industry,
    city,
    country,
    employeeCount,
    isQualified: Boolean(isQualified || contact.isQualified),
  };
}

export function buildContactColumns(options: {
  onSelectLead: (lead: R) => void;
  onConvertLead: (lead: R) => void;
}): CrmColumn<R>[] {
  return [
    col('name', 'Name', (r) => (
      <div className="flex flex-col gap-0.5">
        <strong className="text-text">
          {`${String(r.firstName ?? '')} ${String(r.lastName ?? '')}`.trim()}
        </strong>
        {Boolean(r.isQualified) && (
          <span className="inline-flex items-center gap-1 text-[11px] text-success font-medium">
            <CheckCircle2 size={12} /> Qualifiziert
          </span>
        )}
      </div>
    )),
    col('email', 'E-Mail', (r) => bSpan(r.email, 'font-mono text-[12.5px] text-primary')),
    col('jobTitle', 'Jobbezeichnung', (r) => bBadge(r.jobTitle)),
    col('companyId', 'Unternehmen', (r) => (
      <div className="flex flex-col gap-0.5">
        <span className="text-[12.5px] font-medium text-text">
          {String(r.companyName ?? r.companyId ?? '')}
        </span>
        {Boolean(r.industry) && (
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {String(r.industry)} · {String(r.city || 'DACH')}
          </span>
        )}
      </div>
    )),
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
          className={`text-[11.5px] px-2 py-0.5 h-7 ${
            r.isQualified ? 'border-success text-success' : ''
          }`}
          onClick={() => options.onSelectLead(r)}
          aria-label={`Lead ${String(r.firstName ?? '')} ${String(r.lastName ?? '')} qualifizieren`}
        >
          {r.isQualified ? 'Qualifiziert' : 'Qualifizieren'}
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
  col('dealName', 'Deal Name', (r) => (
    <div className="flex flex-col gap-0.5">
      <strong className="text-text">{String(r.dealName ?? '')}</strong>
      {Boolean(r.isConverted) && (
        <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium">
          Neu aus Lead konvertiert
        </span>
      )}
    </div>
  )),
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

export function exportFilteredContactsCsv(items: R[], qualityFilter: string): void {
  const header = [
    'ID',
    'Company ID',
    'E-Mail',
    'Vorname',
    'Nachname',
    'Jobbezeichnung',
    'Unternehmen',
    'Branche',
    'Stadt',
    'Mitarbeiter',
    'ICP-Score',
    'Qualitätsstufe',
    'Status',
  ];

  const rows = items.map((r) => {
    const res = calculateLeadScore({
      jobTitle: r.jobTitle as string,
      companyName: (r.companyName || r.companyId) as string,
      countryOrCity: (r.city || r.country) as string,
      employeeCount: r.employeeCount as number | string,
      industry: r.industry as string,
    });
    return [
      String(r.id ?? ''),
      String(r.companyId ?? ''),
      String(r.email ?? ''),
      String(r.firstName ?? ''),
      String(r.lastName ?? ''),
      String(r.jobTitle ?? ''),
      String(r.companyName ?? ''),
      String(r.industry ?? ''),
      String(r.city ?? ''),
      String(r.employeeCount ?? ''),
      `${res.totalScore} %`,
      res.tierLabel,
      r.isQualified ? 'Qualifiziert' : 'Offen',
    ];
  });

  const csv = serializeCsv([header, ...rows]);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(blob, `contacts-export-${qualityFilter}.csv`);
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
