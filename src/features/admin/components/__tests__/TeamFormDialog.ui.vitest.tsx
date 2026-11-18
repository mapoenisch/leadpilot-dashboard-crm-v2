// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeamFormDialog } from '../TeamFormDialog';

describe('TeamFormDialog', () => {
  it('renders correctly in create mode and submits valid input', async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue({ ok: true });

    render(<TeamFormDialog open={true} onClose={onClose} onSubmit={onSubmit} />);

    expect(screen.getByText('Neues Team anlegen')).toBeInTheDocument();
    const submitBtn = screen.getByTestId('team-form-submit-button');
    expect(submitBtn).toBeDisabled();

    const nameInput = screen.getByTestId('team-name-input');
    fireEvent.change(nameInput, { target: { value: 'Vertrieb Nord' } });
    expect(submitBtn).not.toBeDisabled();

    const descInput = screen.getByTestId('team-description-input');
    fireEvent.change(descInput, { target: { value: 'Nordregion' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('Vertrieb Nord', 'Nordregion');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('renders in edit mode with initial data and displays errors on failure', async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue({
      ok: false,
      error: { kind: 'team_name_vergeben' },
    });

    render(
      <TeamFormDialog
        open={true}
        onClose={onClose}
        initialData={{
          id: 'team-1',
          name: 'Altes Team',
          description: 'Alte Beschreibung',
        }}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('Team bearbeiten')).toBeInTheDocument();
    const nameInput = screen.getByTestId('team-name-input') as HTMLInputElement;
    expect(nameInput.value).toBe('Altes Team');

    const submitBtn = screen.getByTestId('team-form-submit-button');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('Altes Team', 'Alte Beschreibung');
      expect(screen.getByTestId('team-form-error')).toBeInTheDocument();
    });
  });

  it('handles cancel button and isSaving state', () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    const { rerender } = render(
      <TeamFormDialog open={true} onClose={onClose} onSubmit={onSubmit} isSaving={false} />,
    );

    fireEvent.click(screen.getByText('Abbrechen'));
    expect(onClose).toHaveBeenCalled();

    rerender(<TeamFormDialog open={true} onClose={onClose} onSubmit={onSubmit} isSaving={true} />);

    expect(screen.getByTestId('team-form-submit-button')).toBeDisabled();
    expect(screen.getByText('Wird angelegt...')).toBeInTheDocument();
  });

  it('sperrt Abbrechen und Absenden, solange die Anfrage läuft', async () => {
    const onClose = vi.fn();
    let resolveSubmit: (v: { ok: boolean }) => void = () => {};
    const onSubmit = vi.fn().mockImplementation(
      () =>
        new Promise<{ ok: boolean }>((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    render(<TeamFormDialog open={true} onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('team-name-input'), { target: { value: 'Vertrieb' } });
    fireEvent.click(screen.getByTestId('team-form-submit-button'));

    await waitFor(() => expect(screen.getByTestId('team-form-submit-button')).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Abbrechen' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(onClose).not.toHaveBeenCalled();

    resolveSubmit({ ok: true });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
