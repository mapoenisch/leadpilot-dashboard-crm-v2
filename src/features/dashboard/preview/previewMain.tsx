// Designprobe Dashboard-Testkachel (Teilauftrag 0): eigener Einstieg für dashboard-vorschau.html.
// Lädt nur die Vorschauseite und die globalen Styles, nicht die Produktiv-App: keine Anmeldung,
// keine Organisation, kein Supabase-Client, kein Workspace (Trennung auf Modulebene).
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/styles/global.css';
import { DashboardPreviewPage } from './DashboardPreviewPage';

const previewQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <QueryClientProvider client={previewQueryClient}>
        <DashboardPreviewPage />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
