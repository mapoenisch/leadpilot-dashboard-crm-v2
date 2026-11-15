import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BreakpointSelector } from '../components/editor/topbar/BreakpointSelector';
import { UndoRedoGroup } from '../components/editor/topbar/UndoRedoGroup';
import { DashboardDeletedDialogV2 } from '../components/editor/DashboardDeletedDialogV2';
import { DashboardConflictDialogV2 } from '../components/editor/DashboardConflictDialogV2';

describe('BreakpointSelector UI-Tests', () => {
  it('rendert alle drei Breakpoint-Schaltflächen und markiert die aktive', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <BreakpointSelector activeBreakpoint="desktop" onBreakpointChange={onChange} />,
    );

    const desktopBtn = screen.getByTestId('breakpoint-desktop');
    const tabletBtn = screen.getByTestId('breakpoint-tablet');
    const mobileBtn = screen.getByTestId('breakpoint-mobile');

    expect(desktopBtn).toHaveClass('text-primary');
    expect(tabletBtn).not.toHaveClass('text-primary');

    fireEvent.click(tabletBtn);
    expect(onChange).toHaveBeenCalledWith('tablet');

    fireEvent.click(mobileBtn);
    expect(onChange).toHaveBeenCalledWith('mobile');

    rerender(<BreakpointSelector activeBreakpoint="mobile" onBreakpointChange={onChange} />);
    expect(mobileBtn).toHaveClass('text-primary');

    fireEvent.click(desktopBtn);
    expect(onChange).toHaveBeenCalledWith('desktop');
  });
});

describe('UndoRedoGroup UI-Tests', () => {
  it('steuert Aktivierungszustände und Klick-Handler', () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();

    const { rerender } = render(
      <UndoRedoGroup canUndo={false} canRedo={false} onUndo={onUndo} onRedo={onRedo} />,
    );

    const undoBtn = screen.getByTestId('undo-button');
    const redoBtn = screen.getByTestId('redo-button');

    expect(undoBtn).toBeDisabled();
    expect(redoBtn).toBeDisabled();

    rerender(<UndoRedoGroup canUndo={true} canRedo={true} onUndo={onUndo} onRedo={onRedo} />);
    expect(undoBtn).not.toBeDisabled();
    expect(redoBtn).not.toBeDisabled();

    fireEvent.click(undoBtn);
    expect(onUndo).toHaveBeenCalledTimes(1);

    fireEvent.click(redoBtn);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });
});

describe('DashboardDeletedDialogV2 UI-Tests', () => {
  it('rendert Dialogoptionen und ruft Handler korrekt auf', () => {
    const onSaveAsNew = vi.fn();
    const onOpenOther = vi.fn();
    const onStay = vi.fn();

    const { rerender } = render(
      <DashboardDeletedDialogV2
        open={true}
        isSaving={false}
        onSaveAsNew={onSaveAsNew}
        onOpenOther={onOpenOther}
        onStay={onStay}
      />,
    );

    expect(screen.getByText('Dieses Dashboard wurde gelöscht.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Als neues Dashboard speichern' }));
    expect(onSaveAsNew).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Anderes Dashboard öffnen' }));
    expect(onOpenOther).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Im Entwurf bleiben' }));
    expect(onStay).toHaveBeenCalledTimes(1);

    rerender(
      <DashboardDeletedDialogV2
        open={true}
        isSaving={true}
        onSaveAsNew={onSaveAsNew}
        onOpenOther={onOpenOther}
        onStay={onStay}
      />,
    );

    expect(screen.getByRole('button', { name: 'Als neues Dashboard speichern' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anderes Dashboard öffnen' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Im Entwurf bleiben' })).toBeDisabled();
  });

  it('rendert Fehlermeldung wenn error uebergeben wird (Codex P2)', () => {
    render(
      <DashboardDeletedDialogV2
        open={true}
        isSaving={false}
        error="Maximale Anzahl von 20 Dashboards erreicht."
        onSaveAsNew={vi.fn()}
        onOpenOther={vi.fn()}
      />,
    );

    expect(screen.getByTestId('deleted-dialog-error')).toHaveTextContent(
      'Maximale Anzahl von 20 Dashboards erreicht.',
    );
  });
});

describe('DashboardConflictDialogV2 UI-Tests', () => {
  it('rendert Dialogoptionen und ruft Handler korrekt auf', () => {
    const onReload = vi.fn();
    const onSaveAsCopy = vi.fn();
    const onStay = vi.fn();

    const { rerender } = render(
      <DashboardConflictDialogV2
        open={true}
        isSaving={false}
        onReload={onReload}
        onSaveAsCopy={onSaveAsCopy}
        onStay={onStay}
      />,
    );

    expect(screen.getByText('Revisionskonflikt erkannt')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Als Kopie speichern' }));
    expect(onSaveAsCopy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Serverstand laden & verwerfen' }));
    expect(onReload).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Hier bleiben' }));
    expect(onStay).toHaveBeenCalledTimes(1);

    rerender(
      <DashboardConflictDialogV2
        open={true}
        isSaving={true}
        onReload={onReload}
        onSaveAsCopy={onSaveAsCopy}
        onStay={onStay}
      />,
    );

    expect(screen.getByRole('button', { name: 'Als Kopie speichern' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Serverstand laden & verwerfen' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hier bleiben' })).toBeDisabled();
  });

  it('rendert Fehlermeldung wenn error uebergeben wird (Codex P2)', () => {
    render(
      <DashboardConflictDialogV2
        open={true}
        isSaving={false}
        error="Maximale Anzahl von 20 Dashboards erreicht. Bitte lösche zunächst ein anderes Dashboard, um Platz für die Kopie zu schaffen."
        onReload={vi.fn()}
        onSaveAsCopy={vi.fn()}
        onStay={vi.fn()}
      />,
    );

    expect(screen.getByTestId('conflict-dialog-error')).toHaveTextContent(
      'Maximale Anzahl von 20 Dashboards erreicht. Bitte lösche zunächst ein anderes Dashboard, um Platz für die Kopie zu schaffen.',
    );
  });
});
