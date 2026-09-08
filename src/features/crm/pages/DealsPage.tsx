import React from 'react';
import { CRMRepository } from '@/services/db/crmRepository';
import { ImportedFunnelDeal } from '@/types/crm';
import { DealsView } from '../components/DealsView';

export function DealsPage() {
  const [deals, setDeals] = React.useState<ImportedFunnelDeal[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    setLoading(true);
    CRMRepository.getImportedFunnelDeals()
      .then((data) => {
        if (isMounted) {
          setDeals(data);
        }
      })
      .catch((err) => {
        console.error('Error loading deals:', err);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return <DealsView deals={deals} loading={loading} />;
}
