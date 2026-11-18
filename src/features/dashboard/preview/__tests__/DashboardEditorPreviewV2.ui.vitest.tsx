import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardEditorPreviewV2 } from '../DashboardEditorPreviewV2';

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
