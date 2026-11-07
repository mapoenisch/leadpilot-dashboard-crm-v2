import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorToolbar, type EditorToolbarProps } from '../components/EditorToolbar';

function defaultProps(overrides: Partial<EditorToolbarProps> = {}): EditorToolbarProps {
  return {
    editing: true,
    canStart: true,
    dirty: false,
    locked: false,
    atMax: false,
    saveStatus: { kind: 'idle' },
    conflict: false,
    serverLoaded: false,
    announcement: { text: '', seq: 0 },
    canUndo: true,
    canRedo: false,
    onStart: vi.fn(),
    onCancel: vi.fn(),
    onSave: vi.fn(),
    onAdd: vi.fn(),
    onReset: vi.fn(),
    onLoadServer: vi.fn(),
    onTakeServer: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onApplyPreset: vi.fn(),
    ...overrides,
  };
}

describe('EditorToolbar', () => {
  it('rendert Toolbar im Bearbeitungsmodus mit Aktionen', () => {
    const props = defaultProps();
    render(<EditorToolbar {...props} />);

    expect(screen.getByRole('region', { name: 'Dashboard bearbeiten' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kachel hinzufügen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vorlagen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auf Standard zurücksetzen' })).toBeInTheDocument();
  });

  it('öffnet das Vorlagenmenü beim Klick und wendet Vorlage an', async () => {
    const user = userEvent.setup();
    const onApplyPreset = vi.fn();
    const props = defaultProps({ onApplyPreset });
    render(<EditorToolbar {...props} />);

    const vorlagenBtn = screen.getByRole('button', { name: 'Vorlagen' });
    expect(vorlagenBtn).toHaveAttribute('aria-expanded', 'false');

    await user.click(vorlagenBtn);
    expect(vorlagenBtn).toHaveAttribute('aria-expanded', 'true');

    const menu = screen.getByRole('menu', { name: 'Dashboard-Vorlagen' });
    expect(menu).toBeInTheDocument();

    const salesPreset = screen.getByRole('menuitem', { name: /Vertrieb & Pipeline/i });
    await user.click(salesPreset);

    expect(onApplyPreset).toHaveBeenCalledWith('sales');
    expect(screen.queryByRole('menu', { name: 'Dashboard-Vorlagen' })).not.toBeInTheDocument();
  });

  it('schließt das Vorlagenmenü bei Druck auf Escape', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    render(<EditorToolbar {...props} />);

    await user.click(screen.getByRole('button', { name: 'Vorlagen' }));
    expect(screen.getByRole('menu', { name: 'Dashboard-Vorlagen' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: 'Dashboard-Vorlagen' })).not.toBeInTheDocument();
  });

  it('schließt das Vorlagenmenü bei Klick außerhalb', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    render(
      <div>
        <div data-testid="outside">Außen</div>
        <EditorToolbar {...props} />
      </div>,
    );

    await user.click(screen.getByRole('button', { name: 'Vorlagen' }));
    expect(screen.getByRole('menu', { name: 'Dashboard-Vorlagen' })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu', { name: 'Dashboard-Vorlagen' })).not.toBeInTheDocument();
  });

  it('erlaubt einen flexiblen Umbruch der Toolbar-Aktionen auf schmalen Ansichten', () => {
    const props = defaultProps({ dirty: true });
    render(<EditorToolbar {...props} />);

    const toolbar = screen.getByRole('region', { name: 'Dashboard bearbeiten' });
    const firstRow = toolbar.firstElementChild?.nextElementSibling;
    expect(firstRow?.className).toContain('flex-wrap');
  });

  it('rendert den Button "Bericht exportieren" im Ansichtsmodus und ruft onExportReport auf', async () => {
    const user = userEvent.setup();
    const onExportReport = vi.fn();
    const props = defaultProps({ editing: false, onExportReport });
    render(<EditorToolbar {...props} />);

    const exportBtn = screen.getByTestId('export-report-btn');
    expect(exportBtn).toBeInTheDocument();
    expect(exportBtn).toHaveTextContent('Bericht exportieren');

    await user.click(exportBtn);
    expect(onExportReport).toHaveBeenCalledTimes(1);
  });
});
