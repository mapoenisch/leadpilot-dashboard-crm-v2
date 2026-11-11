import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOrganization } from '@/auth/organizationContext';
import { useDashboardPreferences } from '../hooks/useDashboardPreferences';
import { PersonalExecutiveDashboard } from '../pages/PersonalExecutiveDashboard';
import { setDashboardEditorV2Override } from '../model/dashboardRollout';
import {
  loadPersonalDashboardV2,
  resetInMemoryDashboardV2Storage,
  saveDashboardV2,
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
    await waitFor(() => {
      expect(screen.queryByText('Revisionskonflikt erkannt')).not.toBeInTheDocument();
    });
  });
});
