import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { LeadsPage } from './pages/LeadsPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { DealsPage } from './pages/DealsPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { DataSourceStatus } from '@/components/data/DataSourceStatus';
import { deriveCrmProvenanceState } from '@/services/data/sourceFreshness';

const SUBVIEW_MAP: Record<string, React.ComponentType> = {
  's-leads': LeadsPage,
  's-companies': CompaniesPage,
  's-deals': DealsPage,
  's-activities': ActivitiesPage,
  's-crm': LeadsPage,
  crm: LeadsPage,
};

export interface CRMViewProps {
  activeSubView?: string;
}

export function CRMView({ activeSubView = 's-leads' }: CRMViewProps) {
  const Component = SUBVIEW_MAP[activeSubView] ?? LeadsPage;

  // 067O / G61 Nacharbeit (P1-1): Echte G60-Supabase-Query-Provenienz aus dem TanStack Query Cache
  const queryClient = useQueryClient();
  const crmQueries = queryClient.getQueryCache().findAll({ queryKey: ['crm'] });
  const errorQuery = crmQueries.find((q) => q.state.status === 'error');
  const latestUpdatedAt = Math.max(0, ...crmQueries.map((q) => q.state.dataUpdatedAt));

  const provenance = deriveCrmProvenanceState(
    errorQuery ? 'unavailable' : 'healthy',
    errorQuery?.state.error,
    latestUpdatedAt,
  );

  return (
    <div className="flex flex-col gap-[var(--space-4,16px)] w-full">
      {/* Auftrag 067O / Gate G61: Globale Provenienz- & Frische-Kopfzeile für CRM-Seiten */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-solid border-[var(--color-border-subtle)]">
        <span className="text-[12px] font-medium text-[var(--color-text-dim)]">
          CRM-Quellenwahrheit & Datenfrische
        </span>
        <DataSourceStatus variant="compact" provenance={provenance} />
      </div>
      <Component />
    </div>
  );
}
