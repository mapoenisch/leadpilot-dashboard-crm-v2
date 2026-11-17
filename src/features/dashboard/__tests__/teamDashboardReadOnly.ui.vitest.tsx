import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditorTopBarV2 } from '../components/editor/EditorTopBarV2';
import { ReadOnlyNoticeV2 } from '../components/editor/ReadOnlyNoticeV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';

describe('Auftrag 163 - Leseansicht (P11b / T5)', () => {
  const mockConfig: DashboardConfigV2 = {
    version: 2,
    id: 'dash-team-readonly',
    title: 'Vertrieb Team Dashboard',
    scope: 'team',
    ownerUserId: 'user-manager',
    organizationId: 'org-1',
    globalTimeframe: 'aktuell',
    sections: [],
    tiles: [],
    metadata: {},
  };

  it('blendet Speichern-Button und Undo/Redo im Lese-Modus aus (Rot-Nachweis b)', () => {
    render(
      <EditorTopBarV2
        config={mockConfig}
        isDirty={false}
        activeBreakpoint="desktop"
        onBreakpointChange={vi.fn()}
        onTitleChange={vi.fn()}
        onGlobalFilterChange={vi.fn()}
        isLivePaused={false}
        onToggleLivePause={vi.fn()}
        isPreviewMode={false}
        onTogglePreviewMode={vi.fn()}
        canUndo={false}
        canRedo={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
        onCancel={vi.fn()}
        readOnly={true}
      />,
    );

    // Im Lese-Modus darf der Speichern-Button nicht sichtbar/vorhanden sein
    expect(screen.queryByTestId('save-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('toggle-library-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('title-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('title-display')).toHaveTextContent('Vertrieb Team Dashboard');
  });

  it('rendert ReadOnlyNoticeV2 mit Teamname und Button zur persönlichen Kopie', () => {
    const onCopy = vi.fn();
    render(<ReadOnlyNoticeV2 teamName="Vertrieb DACH" onSaveAsPersonalCopy={onCopy} />);

    expect(screen.getByTestId('readonly-notice-banner')).toBeInTheDocument();
    expect(screen.getByText(/Nur Lesen – Team-Dashboard ‚Vertrieb DACH‘/i)).toBeInTheDocument();

    const copyBtn = screen.getByTestId('copy-as-personal-button');
    fireEvent.click(copyBtn);
    expect(onCopy).toHaveBeenCalledTimes(1);
  });
});
