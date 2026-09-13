import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';

describe('Input', () => {
  it('renders label and placeholder', () => {
    render(<Input label="E-Mail" placeholder="name@example.com" />);
    expect(screen.getByLabelText('E-Mail')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
  });

  it('handles user typing and calls onChange', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Input label="Name" onChange={handleChange} />);

    const input = screen.getByLabelText('Name');
    await user.type(input, 'LeadPilot');
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders disabled state', () => {
    render(<Input label="Gesperrt" disabled />);
    expect(screen.getByLabelText('Gesperrt')).toBeDisabled();
  });

  it('renders error message and helper text', () => {
    const { rerender } = render(<Input label="Feld" helperText="Zusatzinfo" />);
    expect(screen.getByText('Zusatzinfo')).toBeInTheDocument();

    rerender(<Input label="Feld" error="Ungültige Eingabe" />);
    expect(screen.getByText('Ungültige Eingabe')).toBeInTheDocument();

    rerender(<Input label="Feld" error={true} helperText="Fallback Info" />);
    expect(screen.getByText('Fallback Info')).toBeInTheDocument();
  });

  it('renders leading icon and focus/blur styles', () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();
    render(
      <Input
        label="Suche"
        leadingIcon={<span data-testid="search-icon">🔍</span>}
        sizeVariant="sm"
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    );

    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    const input = screen.getByLabelText('Suche');

    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalled();

    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalled();
  });
});
