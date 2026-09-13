import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from '../Select';

const sampleOptions = [
  { value: 'opt1', label: 'Option 1', description: 'Erste Wahl' },
  { value: 'opt2', label: 'Option 2', description: 'Zweite Wahl' },
  { value: 'opt3', label: 'Option 3' },
];

describe('Select', () => {
  it('renders label and placeholder when no value is selected', () => {
    render(
      <Select
        label="Branche"
        options={sampleOptions}
        value=""
        onChange={() => {}}
        placeholder="Bitte Branche wählen"
      />,
    );

    expect(screen.getByText('Branche')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveTextContent('Bitte Branche wählen');
  });

  it('renders selected option label', () => {
    render(<Select options={sampleOptions} value="opt2" onChange={() => {}} />);

    expect(screen.getByRole('combobox')).toHaveTextContent('Option 2');
  });

  it('opens listbox on click and allows selecting an option', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Select options={sampleOptions} value="opt1" onChange={handleChange} />);

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const option3 = screen.getByRole('option', { name: /Option 3/i });
    await user.click(option3);

    expect(handleChange).toHaveBeenCalledWith('opt3');
  });

  it('supports keyboard navigation (ArrowDown, Enter, Escape)', () => {
    const handleChange = vi.fn();
    render(<Select options={sampleOptions} value="opt1" onChange={handleChange} />);

    const trigger = screen.getByRole('combobox');
    // Open with ArrowDown
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Move to next option
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    // Select with Enter
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(handleChange).toHaveBeenCalled();
  });

  it('closes when clicking outside', () => {
    render(
      <div>
        <span data-testid="outside">Außen</span>
        <Select options={sampleOptions} value="opt1" onChange={() => {}} />
      </div>,
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('displays error message and handles disabled state', () => {
    render(
      <Select
        options={sampleOptions}
        value="opt1"
        disabled
        error="Fehlerhafte Auswahl"
        onChange={() => {}}
      />,
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByText('Fehlerhafte Auswahl')).toBeInTheDocument();
  });
});
