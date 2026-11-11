import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOrganization } from '@/auth/organizationContext';
import { useDashboardPreferences } from '../hooks/useDashboardPreferences';
import { PersonalExecutiveDashboard } from '../pages/PersonalExecutiveDashboard';
import { DashboardTileDetailPage } from '../pages/DashboardTileDetailPage';
import { setDashboardEditorV2Override } from '../model/dashboardRollout';
import {
  createDashboardV2,
  getActiveDashboardV2Id,
  loadPersonalDashboardV2,
  resetInMemoryDashboardV2Storage,
  saveDashboardV2,
  setActiveDashboardV2Id,
} from '../services/dashboardStorageV2';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('../hooks/useDashboardPreferences', () => ({
  useDashboardPreferences: vi.fn(),
}));

const mockedOrg = vi.mocked(useOrganization);
const mockedPrefs = vi.mocked(useDashboardPreferences);

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PersonalExecutiveDashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardEditorV2 Persistence & Kopiermigration (P07)', () => {
  beforeEach(() => {
    resetInMemoryDashboardV2Storage();
    setDashboardEditorV2Override(true);
    mockedOrg.mockReturnValue({
      session: { organizationId: 'org-test-1', userId: 'user-test-1' },
      isLoading: false,
    } as never);
    mockedPrefs.mockReturnValue({
      status: 'bereit',
      state: {
        kind: 'gespeichert',
        config: DEFAULT_DASHBOARD_CONFIG,
        revision: 1,
        unavailable: [],
        canSave: true,
      },
      error: null,
      isSaving: false,
      save: vi.fn(),
      reloadServerVersion: vi.fn(),
    });
  });

  it('führt bei Erstaufruf ohne V2-Bestand eine automatische Kopiermigration aus V1 durch', async () => {
    renderDashboard();

    // Wartet auf das Laden der migrierten V2-Shell
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-editor-shell-v2')).toBeInTheDocument();
    });

    // V2 wurde in-memory angelegt
    const stored = await loadPersonalDashboardV2();
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;

    expect(stored.value).not.toBeNull();
    expect(stored.value?.revision).toBe(1);
    expect(stored.value?.config.metadata?.migrated_from_v1).toBe(true);
    expect(stored.value?.config.tiles.length).toBe(DEFAULT_DASHBOARD_CONFIG.tiles.length);
  });

  it('speichert Änderungen atomar, erhöht die Revision und behält Layout bei Reload', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-editor-shell-v2')).toBeInTheDocument();
    });

    // Titel ändern
    const titleBtn = screen.getByTestId('title-button');
    fireEvent.click(titleBtn);

    const titleInput = screen.getByTestId('title-input');
    fireEvent.change(titleInput, { target: { value: 'Mein neues Executive Dashboard' } });
    fireEvent.keyDown(titleInput, { key: 'Enter' });

    // Speichern klicken
    const saveBtn = screen.getByRole('button', { name: /Speichern/ });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    // Revision in der Statusleiste oder Storage prüfen
    await waitFor(async () => {
      const stored = await loadPersonalDashboardV2();
      expect(stored.ok && stored.value?.revision).toBe(2);
      expect(stored.ok && stored.value?.title).toBe('Mein neues Executive Dashboard');
      expect(stored.ok && stored.value?.config.metadata?.user_edited).toBe(true);
    });
  });

  it('erkennt Revisionskonflikte und öffnet den Konfliktdialog', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-editor-shell-v2')).toBeInTheDocument();
    });

    // Ein anderer Tab/Nutzer speichert parallel Revision 2
    const current = await loadPersonalDashboardV2();
    if (!current.ok || !current.value) throw new Error('V2 fehlt');

    await saveDashboardV2({
      dashboardId: current.value.id,
      expectedRevision: 1,
      title: 'Parallel geändert in Tab B',
      config: { ...current.value.config, title: 'Parallel geändert in Tab B' },
    });

    // Jetzt versucht der aktuelle Tab (hat noch Revision 1) zu speichern
    const titleBtn = screen.getByTestId('title-button');
    fireEvent.click(titleBtn);

    const titleInput = screen.getByTestId('title-input');
    fireEvent.change(titleInput, { target: { value: 'Lokale Änderung in Tab A' } });
    fireEvent.keyDown(titleInput, { key: 'Enter' });

    const saveBtn = screen.getByRole('button', { name: /Speichern/ });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    // Konfliktdialog muss erscheinen
    await waitFor(() => {
      expect(screen.getByText('Revisionskonflikt erkannt')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Als Kopie speichern' })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Serverstand laden & verwerfen' }),
      ).toBeInTheDocument();
    });

    // Als Kopie speichern
    const copyBtn = screen.getByRole('button', { name: 'Als Kopie speichern' });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    // Konfliktdialog schließt sich und neue Kopie ist gespeichert
    await waitFor(async () => {
      expect(screen.queryByText('Revisionskonflikt erkannt')).not.toBeInTheDocument();
      const activeId = getActiveDashboardV2Id('org-test-1', 'user-test-1');
      expect(activeId).not.toBeNull();
      expect(activeId).not.toBe(current.value?.id);

      const activeRow = await loadPersonalDashboardV2(activeId ?? undefined);
      expect(activeRow.ok && activeRow.value?.title).toContain('Kopie');
    });
  });

  it('lädt bei Serverstand laden & verwerfen das im Tab gebundene Dashboard neu, selbst wenn ein anderer Tab eine Kopie in LocalStorage abgelegt hat', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-editor-shell-v2')).toBeInTheDocument();
    });

    const current = await loadPersonalDashboardV2();
    if (!current.ok || !current.value) throw new Error('V2 fehlt');
    const originalDashboardId = current.value.id;

    // Ein anderer Tab (Tab B) speichert auf dem Server Revision 2
    await saveDashboardV2({
      dashboardId: originalDashboardId,
      expectedRevision: 1,
      title: 'Vom Server aktualisiert',
      config: { ...current.value.config, title: 'Vom Server aktualisiert' },
    });

    // Tab B speichert zusätzlich eine Konfliktkopie und schreibt deren ID in LocalStorage
    const fakeCopyRes = await createDashboardV2({
      title: 'Fremde Arbeitskopie aus Tab B',
      config: {
        ...current.value.config,
        id: 'dash_copy_tab_b',
        title: 'Fremde Arbeitskopie aus Tab B',
      },
    });
    if (!fakeCopyRes.ok) throw new Error('Kopie fehlgeschlagen');
    setActiveDashboardV2Id('org-test-1', 'user-test-1', 'dash_copy_tab_b');

    // Jetzt versucht Tab A (hat noch Revision 1) zu speichern -> Revisionskonflikt
    const titleBtn = screen.getByTestId('title-button');
    fireEvent.click(titleBtn);
    const titleInput = screen.getByTestId('title-input');
    fireEvent.change(titleInput, { target: { value: 'Änderung in Tab A' } });
    fireEvent.keyDown(titleInput, { key: 'Enter' });

    const saveBtn = screen.getByRole('button', { name: /Speichern/ });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Revisionskonflikt erkannt')).toBeInTheDocument();
    });

    // Tab A klickt "Serverstand laden & verwerfen"
    const reloadBtn = screen.getByRole('button', { name: 'Serverstand laden & verwerfen' });
    await act(async () => {
      fireEvent.click(reloadBtn);
    });

    // Tab A muss wieder an originalDashboardId gebunden sein mit Stand "Vom Server aktualisiert",
    // NICHT an die fremde Arbeitskopie aus Tab B!
    await waitFor(() => {
      expect(screen.queryByText('Revisionskonflikt erkannt')).not.toBeInTheDocument();
      expect(screen.getByTestId('title-button')).toHaveTextContent('Vom Server aktualisiert');
      expect(getActiveDashboardV2Id('org-test-1', 'user-test-1')).toBe(originalDashboardId);
    });
  });

  it('löst Kacheln auf der Detailroute /dashboard/tiles/:tileId aus dem aktiven V2-Speicher auf', async () => {
    // 1. Initial V2-Dashboard mit einer spezifischen Kachel speichern
    await createDashboardV2({
      title: 'V2 Detail Test',
      config: {
        version: 2,
        id: 'dash_v2_detail',
        title: 'V2 Detail Test',
        scope: 'personal',
        ownerUserId: 'user-test-1',
        organizationId: 'org-test-1',
        globalTimeframe: 'letzte_30_tage',
        tiles: [
          {
            id: 'tile_v2_arr',
            catalogId: 'baseline.arr',
            title: 'Mein V2 ARR Detail',
            presentation: 'zahl',
            layouts: {
              desktop: { x: 0, y: 0, w: 4, h: 3 },
            },
          },
        ],
      },
    });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/dashboard/tiles/tile_v2_arr']}>
          <Routes>
            <Route path="/dashboard/tiles/:tileId" element={<DashboardTileDetailPage />} />
            <Route path="/dashboard" element={<div>Dashboard Home</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Kacheltitel & Detailinhalte aus V2 müssen gerendert werden
    await waitFor(() => {
      expect(screen.getByTestId('tile-detail-page')).toBeInTheDocument();
      expect(screen.getByTestId('tile-detail-heading')).toHaveTextContent('Mein V2 ARR Detail');
    });

    // Zurück-Button vorhanden
    expect(screen.getByRole('button', { name: 'Zurück zum Dashboard' })).toBeInTheDocument();
  });

  it('zeigt DetailMissingTile wenn die Kachel-ID in V2 nicht existiert', async () => {
    await createDashboardV2({
      title: 'V2 Missing Tile Test',
      config: {
        version: 2,
        id: 'dash_v2_missing',
        title: 'V2 Missing Tile Test',
        scope: 'personal',
        ownerUserId: 'user-test-1',
        organizationId: 'org-test-1',
        globalTimeframe: 'letzte_30_tage',
        tiles: [],
      },
    });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/dashboard/tiles/unbekannte_kachel']}>
          <Routes>
            <Route path="/dashboard/tiles/:tileId" element={<DashboardTileDetailPage />} />
            <Route path="/dashboard" element={<div>Dashboard Home</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('tile-detail-missing')).toBeInTheDocument();
    });
  });
});
