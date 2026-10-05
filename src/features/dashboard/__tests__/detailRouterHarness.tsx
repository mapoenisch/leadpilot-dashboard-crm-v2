// Auftrag 077: gemeinsamer Aufbau für Seiten-Tests mit Router (Ansicht ↔ Details ↔ Fachseite).
// Speicherung und Sitzung werden ersetzt; Datenauflösung, Katalog und Router laufen echt.
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import type { UseDashboardPreferencesResult } from '../hooks/useDashboardPreferences';
import type { DashboardConfig } from '../model/dashboardConfig';
import { DashboardTileDetailPage } from '../pages/DashboardTileDetailPage';
import { PersonalExecutiveDashboard } from '../pages/PersonalExecutiveDashboard';

export const SESSION = { userId: 'u-1', organizationId: 'org-1', role: 'admin' as const };
export const IDENTITY = 'org-1|u-1';

export const DETAIL_CONFIG: DashboardConfig = {
  version: 1,
  tiles: [
    {
      tileId: 'umsatz',
      catalogId: 'baseline.umsatz',
      view: 'zahl',
      size: 'klein',
      filterMode: 'fester_stand',
    },
    {
      tileId: 'marge',
      catalogId: 'kombination.ebitda_marge',
      view: 'zahl',
      size: 'klein',
      filterMode: 'fester_stand',
    },
    {
      tileId: 'roadmap',
      catalogId: 'uebersicht.roadmap',
      view: 'uebersicht',
      size: 'mittel',
      filterMode: 'fester_stand',
    },
    {
      tileId: 'weg',
      catalogId: 'baseline.gibt_es_nicht',
      view: 'zahl',
      size: 'klein',
      filterMode: 'fester_stand',
    },
  ],
};

export function preferencesFor(
  config: DashboardConfig = DETAIL_CONFIG,
  extra: Partial<UseDashboardPreferencesResult> = {},
): UseDashboardPreferencesResult {
  return {
    status: 'bereit',
    state: { kind: 'gespeichert', config, revision: 2, unavailable: [], canSave: true },
    error: null,
    isSaving: false,
    save: async () => ({ ok: true, revision: 3 }),
    reloadServerVersion: async () => {},
    ...extra,
  };
}

/** Letzter Ort samt Zustand, für Prüfungen nach einer Navigation. */
export const seen: { pathname: string; state: unknown }[] = [];

function LocationProbe() {
  const location = useLocation();
  seen.push({ pathname: location.pathname, state: location.state });
  return null;
}

function BackButton() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      Browser zurück
    </button>
  );
}

export function renderRoutes(initial: { pathname: string; state?: unknown }) {
  seen.length = 0;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initial]}>
        <LocationProbe />
        <BackButton />
        <Routes>
          <Route path="/dashboard" element={<PersonalExecutiveDashboard />} />
          <Route path="/dashboard/tiles/:tileId" element={<DashboardTileDetailPage />} />
          <Route path="/finance/p-and-l" element={<p>Fachseite GuV</p>} />
          <Route path="/product/roadmap" element={<p>Fachseite Roadmap</p>} />
          <Route path="*" element={<p>Andere Seite</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

export const lastSeen = () => seen[seen.length - 1]!;
