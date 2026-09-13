import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NumberStepper } from '../NumberStepper';

describe('NumberStepper', () => {
  it('renders label, unit and initial value', () => {
    render(
      <NumberStepper
        label="Budget"
        value={100}
        onChange={() => {}}
        unit="EUR"
        helperText="Monatlich"
      />,
    );

    expect(screen.getByText('Budget')).toBeInTheDocument();
    expect(screen.getByText('EUR')).toBeInTheDocument();
    expect(screen.getByText('Monatlich')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(100);
  });

  it('handles increment and decrement clicks', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    function StatefulStepper() {
      const [val, setVal] = React.useState(10);
      return (
        <NumberStepper
          value={val}
          min={0}
          max={20}
          step={5}
          onChange={(v) => {
            setVal(v);
            handleChange(v);
          }}
        />
      );
    }
    render(<StatefulStepper />);

    const incBtn = screen.getByRole('button', { name: 'Wert erhöhen' });
    const decBtn = screen.getByRole('button', { name: 'Wert verringern' });

    await user.click(incBtn);
    expect(handleChange).toHaveBeenCalledWith(15);

    await user.click(decBtn);
    expect(handleChange).toHaveBeenCalledWith(10);
  });

  it('disables buttons at min and max limits', () => {
    const { rerender } = render(<NumberStepper value={0} min={0} max={10} onChange={() => {}} />);

    expect(screen.getByRole('button', { name: 'Wert verringern' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Wert erhöhen' })).not.toBeDisabled();

    rerender(<NumberStepper value={10} min={0} max={10} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Wert verringern' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Wert erhöhen' })).toBeDisabled();
  });

  it('handles manual typing and blur clamping', () => {
    const handleChange = vi.fn();
    render(<NumberStepper value={5} min={0} max={10} onChange={handleChange} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.blur(input);

    expect(handleChange).toHaveBeenCalledWith(10);
  });

  it('displays error message when invalid input is entered', () => {
    render(<NumberStepper value={5} error="Ungültiger Wert" onChange={() => {}} />);
    expect(screen.getByText('Ungültiger Wert')).toBeInTheDocument();
  });
});
