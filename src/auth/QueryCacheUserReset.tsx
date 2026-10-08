import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';

// Auftrag 084 / Paket A: Query-Keys (z. B. CRM-Listen) enthalten weder Benutzer
// noch Organisation, und staleTime beträgt 60 s. Ohne Reset sähe ein neu
// angemeldeter Benutzer im selben Tab noch die zwischengespeicherten Daten des
// vorherigen. Bei Abmeldung oder Benutzerwechsel wird der Cache daher geleert.
export function QueryCacheUserReset() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const previousUserId = useRef<string | null>(userId);

  useEffect(() => {
    if (previousUserId.current !== null && previousUserId.current !== userId) {
      queryClient.clear();
    }
    previousUserId.current = userId;
  }, [queryClient, userId]);

  return null;
}
