import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RestoreRevisionDialogV2 } from '../components/editor/versions/RestoreRevisionDialogV2';

describe('RestoreRevisionDialogV2', () => {
  it('gibt null zurück wenn isOpen false ist', () => {
    const { container } = render(
      <RestoreRevisionDialogV2
        isOpen={false}
        targetRevision={1}
        currentRevision={2}
        isDirty={false}
        onConfirmRestore={async () => {}}
        onCancel={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('rendert Bestätigungshinweise und ruft onConfirmRestore auf', () => {
    const handleRestore = vi.fn().mockResolvedValue(undefined);

    render(
      <RestoreRevisionDialogV2
        isOpen={true}
        targetRevision={1}
        currentRevision={2}
        isDirty={false}
        scope="team"
        teamName="Vertrieb Nord"
        onConfirmRestore={handleRestore}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Version wiederherstellen' })).toBeDefined();
    expect(screen.getByText(/Vertrieb Nord/)).toBeDefined();

    const confirmBtn = screen.getByTestId('confirm-restore-button');
    fireEvent.click(confirmBtn);
    expect(handleRestore).toHaveBeenCalledWith({ saveDraftAsCopy: false });
  });

  it('ruft onCancel bei Klick auf Abbrechen auf', () => {
    const handleCancel = vi.fn();
    render(
      <RestoreRevisionDialogV2
        isOpen={true}
        targetRevision={1}
        currentRevision={2}
        isDirty={false}
        onConfirmRestore={async () => {}}
        onCancel={handleCancel}
      />,
    );

    const cancelBtn = screen.getByTestId('restore-cancel-button');
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('bietet Entwurfskopie und Verwerfen an wenn isDirty true ist', () => {
    const handleRestoreCopy = vi.fn().mockResolvedValue(undefined);

    render(
      <RestoreRevisionDialogV2
        isOpen={true}
        targetRevision={1}
        currentRevision={2}
        isDirty={true}
        onConfirmRestore={handleRestoreCopy}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByText('Ungespeicherte Änderungen')).toBeDefined();
    const saveCopyBtn = screen.getByTestId('restore-save-copy-button');
    fireEvent.click(saveCopyBtn);
    expect(handleRestoreCopy).toHaveBeenCalledWith({ saveDraftAsCopy: true });

    const handleRestoreDiscard = vi.fn().mockResolvedValue(undefined);
    render(
      <RestoreRevisionDialogV2
        isOpen={true}
        targetRevision={1}
        currentRevision={2}
        isDirty={true}
        onConfirmRestore={handleRestoreDiscard}
        onCancel={() => {}}
      />,
    );

    const discardBtn = screen.getAllByTestId('restore-discard-button')[1]!;
    fireEvent.click(discardBtn);
    expect(handleRestoreDiscard).toHaveBeenCalledWith({ saveDraftAsCopy: false });
  });
});
