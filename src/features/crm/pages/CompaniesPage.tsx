import { useCrmCompanies } from '@/hooks/queries/useCrmQueries';
import { ManagementChartState } from '@/components/ui/charts/ManagementChartState';
import { CompaniesView } from '../components/CompaniesView';

export function CompaniesPage() {
  const { data: companies = [], isLoading, isError, error } = useCrmCompanies();

  if (isLoading) {
    return (
      <ManagementChartState
        type="loading"
        message="Lade Unternehmen aus CRM Repository..."
        sourceLabel="Ebene A CRM Accounts"
        height={220}
      />
    );
  }

  if (isError) {
    return (
      <ManagementChartState
        type="error"
        message={`Integritätsfehler: ${error instanceof Error ? error.message : 'Fehler beim Laden der Unternehmen'}`}
        sourceLabel="Ebene A CRM Accounts"
        height={220}
      />
    );
  }

  if (companies.length === 0) {
    return (
      <ManagementChartState
        type="empty"
        message="Keine Unternehmen (Accounts) erfasst"
        sourceLabel="Ebene A CRM Accounts"
        height={220}
      />
    );
  }

  return <CompaniesView companies={companies} />;
}
