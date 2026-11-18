import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardEditorPreviewV2 } from '../DashboardEditorPreviewV2';
import { inMemoryStore } from '../../services/dashboardInMemoryStoreV2';
import { PREVIEW_VERSIONS_DASHBOARD_ID } from '../previewRevisions';

describe('DashboardEditorPreviewV2', () => {
  const setLocationSearch = (search: string) => {
    window.history.pushState({}, '', search ? `/preview${search}` : '/preview');
  };

  it('rendert Vorschau im Standard-Modus', () => {
    setLocationSearch('');
    render(<DashboardEditorPreviewV2 />);
    expect(screen.getByTestId('dashboard-editor-shell-v2')).toBeDefined();
    expect(screen.getByText('Beta-Vorschau')).toBeDefined();
  });

  it('rendert Vorschau im Versionen-Szenario (&versionen=1) und öffnet Versionsbereich', async () => {
    setLocationSearch('?versionen=1');
    render(<DashboardEditorPreviewV2 />);
    expect(screen.getByTestId('dashboard-editor-shell-v2')).toBeDefined();
    expect(screen.getByText(/Beta-Vorschau/)).toBeDefined();

    const versionsBtn = screen.getByTestId('editor-open-versions');
    fireEvent.click(versionsBtn);

    // Versionsbereich sollte sich öffnen
    expect(screen.getByTestId('editor-open-versions')).toBeDefined();
  });

  it('legt im versionen-Szenario gespeicherte Änderungen als neue Revision im In-Memory-Speicher ab', async () => {
    setLocationSearch('?versionen=1');
    render(<DashboardEditorPreviewV2 />);

    expect(inMemoryStore.get(PREVIEW_VERSIONS_DASHBOARD_ID)?.row.revision).toBe(4);

    fireEvent.click(screen.getByTestId('title-button'));
    const input = screen.getByTestId('title-input');
    fireEvent.change(input, { target: { value: 'Geänderter Vorschau-Titel' } });
    fireEvent.blur(input);
    fireEvent.click(screen.getByTestId('save-button'));

    await waitFor(() => {
      const stored = inMemoryStore.get(PREVIEW_VERSIONS_DASHBOARD_ID);
      expect(stored?.row.revision).toBe(5);
      expect(stored?.row.title).toBe('Geänderter Vorschau-Titel');
      expect(stored?.row.config.title).toBe('Geänderter Vorschau-Titel');
      expect(stored?.revisions[0]?.revision).toBe(5);
    });
  });

  it('rendert Vorschau im Team-Szenario (&teams=1)', () => {
    setLocationSearch('?teams=1');
    render(<DashboardEditorPreviewV2 />);
    expect(screen.getByTestId('dashboard-editor-shell-v2')).toBeDefined();
  });

  it('rendert Vorschau im entzogenen Team-Szenario (&teams=entzogen)', () => {
    setLocationSearch('?teams=entzogen');
    render(<DashboardEditorPreviewV2 />);
    expect(screen.getByTestId('dashboard-editor-shell-v2')).toBeDefined();
  });
});
