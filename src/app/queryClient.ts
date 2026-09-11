import { QueryClient } from '@tanstack/react-query';

// Gate G36 (Auftrag 051): ein QueryClient für HTTP-Server-State (CRM-Reads,
// Pipeline-Overview, Sync-Status). defaultOptions-Begründung:
// - staleTime 60s: CRM-Basisdaten ändern sich nur per Seed (in-app, danach
//   explizites invalidateQueries) oder extern; 60s vermeiden Re-Fetch-Flackern
//   bei Routenwechseln, ohne externe Änderungen lange zu cachen.
// - retry 1: ein Wiederholungsversuch fängt Netzwerk-Jitter ab; danach sofort
//   Fehler-UI (ManagementChartState) statt langem Hängen (Default wären 3).
// - refetchOnWindowFocus/gcTime: Defaults (stale-gesteuert bzw. 5min).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});
