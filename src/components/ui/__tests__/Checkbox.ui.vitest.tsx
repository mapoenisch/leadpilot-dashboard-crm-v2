import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from '../Checkbox';

describe('Checkbox', () => {
  it('renders label and description', () => {
    render(
      <Checkbox
        checked={false}
        onChange={() => {}}
        label="AGB akzeptieren"
        description="Bitte durchlesen"
      />
    );
    expect(screen.getByText('AGB akzeptieren')).toBeInTheDocument();
    expect(screen.getByText('Bitte durchlesen')).toBeInTheDocument();
  });

  it('triggers onChange when clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <Checkbox
        checked={false}
        onChange={handleChange}
        label="Option 1"
        data-testid="chk-1"
      />
    );

    const checkbox = screen.getByTestId('chk-1');
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('does not trigger onChange when disabled', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <Checkbox
        checked={false}
        onChange={handleChange}
        label="Disabled"
        disabled
        data-testid="chk-disabled"
      />
    );

    const checkbox = screen.getByTestId('chk-disabled');
    expect(checkbox).toBeDisabled();

    await user.click(checkbox);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('handles focus and blur states', () => {
    render(
      <Checkbox
        checked={true}
        onChange={() => {}}
        label="Focused Checkbox"
        data-testid="chk-focus"
      />
    );

    const checkbox = screen.getByTestId('chk-focus');
    fireEvent.focus(checkbox);
    fireEvent.blur(checkbox);
    expect(checkbox).toBeChecked();
  });
});
