import React from 'react';
import { logger } from '@/services/logger';
import { CRMRepository } from '@/services/db/crmRepository';
import { Company } from '@/types/crm';
import { CompaniesView } from '../components/CompaniesView';

export function CompaniesPage() {
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    setLoading(true);
    CRMRepository.getCompanies()
      .then((comps) => {
        if (isMounted) {
          setCompanies(comps);
        }
      })
      .catch((err) => {
        logger.error('Error loading companies:', err);
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

  return <CompaniesView companies={companies} loading={loading} />;
}
