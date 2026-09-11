import { useCrmDeals } from '@/hooks/queries/useCrmQueries';
import { ManagementChartState } from '@/components/ui/charts/ManagementChartState';
import { DealsView } from '../components/DealsView';

export function DealsPage() {
  const { data: deals = [], isLoading, isError, error } = useCrmDeals();

  if (isLoading) {
    return (
      <ManagementChartState
        type="loading"
        message="Lade Deals aus CRM Repository..."
        sourceLabel="Ebene A CRM Funnel Deals"
        height={220}
      />
    );
  }

  if (isError) {
    return (
      <ManagementChartState
        type="error"
        message={`Integritätsfehler: ${error instanceof Error ? error.message : 'Fehler beim Laden der CRM-Deals'}`}
        sourceLabel="Ebene A CRM Funnel Deals"
        height={220}
      />
    );
  }

  if (deals.length === 0) {
    return (
      <ManagementChartState
        type="empty"
        message="Keine Deals im CRM-Funnel erfasst"
        sourceLabel="Ebene A CRM Funnel Deals"
        height={220}
      />
    );
  }

  return <DealsView deals={deals} />;
}
