import { ActivitiesView } from '../components/ActivitiesView';
import { DataSourceStatus } from '@/components/data/DataSourceStatus';
import { useCrmProvenance } from '../hooks/useCrmProvenance';

export function ActivitiesPage() {
  const { provenance, isLoading } = useCrmProvenance('activities');
  return (
    <ActivitiesView
      extraHeader={
        <DataSourceStatus variant="compact" provenance={provenance} isLoading={isLoading} />
      }
    />
  );
}
