import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { NumberStepper } from '../NumberStepper';

function Controlled(props: Partial<Parameters<typeof NumberStepper>[0]> = {}) {
  const [val, setVal] = useState(props.value ?? 5);
  return (
    <NumberStepper
      value={val}
      onChange={(v) => {
        setVal(v);
        props.onChange?.(v);
      }}
      {...props}
    />
  );
}

describe('NumberStepper (branch2)', () => {
  it('leere Eingabe und Minuszeichen zeigen Pflicht-Hinweis', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    expect(screen.getByText('Bitte Zahl eingeben')).toBeInTheDocument();
    await user.type(input, '-');
    expect(screen.getByText('Bitte Zahl eingeben')).toBeInTheDocument();
  });

  it('number-Input sanitiert Buchstaben zu Leerstring (Pflicht-Hinweis)', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, 'abc');
    // type=number verwirft Buchstaben -> Leerstring -> Pflicht-Hinweis
    expect(screen.getByText('Bitte Zahl eingeben')).toBeInTheDocument();
  });

  it('Unterschreitung zeigt Minimalwert mit Einheit', async () => {
    const user = userEvent.setup();
    render(<Controlled min={10} unit="€" />);
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '3');
    expect(screen.getByText('Minimalwert ist 10 €')).toBeInTheDocument();
  });

  it('Überschreitung zeigt Maximalwert mit Einheit', async () => {
    const user = userEvent.setup();
    render(<Controlled max={100} unit="€" />);
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '500');
    expect(screen.getByText('Maximalwert ist 100 €')).toBeInTheDocument();
  });

  it('Blur nach geleerter Eingabe clampft auf Min und ruft onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled min={0} max={100} onChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, 'xyz');
    expect(screen.getByText('Bitte Zahl eingeben')).toBeInTheDocument();
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(0);
    expect(screen.queryByText('Bitte Zahl eingeben')).not.toBeInTheDocument();
  });

  it('Blur nach Über-Max-Eingabe clampft auf Max', () => {
    const onChange = vi.fn();
    render(<NumberStepper value={5} min={0} max={100} onChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '500' } });
    expect(screen.getByText('Maximalwert ist 100')).toBeInTheDocument();
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(100);
    expect(screen.queryByText('Maximalwert ist 100')).not.toBeInTheDocument();
  });

  it('deaktiviert: Buttons blockiert, Hover ohne Effekt', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NumberStepper value={5} onChange={onChange} disabled />);
    expect(screen.getByRole('button', { name: 'Wert verringern' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Wert erhöhen' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Wert erhöhen' }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Wert erhöhen' }));
    fireEvent.mouseLeave(screen.getByRole('button', { name: 'Wert erhöhen' }));
  });

  it('Custom-Step, Einheit, Helper-Text und Label mit Custom-ID', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Controlled
        label="Budget"
        id="budget-stepper"
        step={5}
        unit="€"
        helperText="Jahresbudget"
        sizeVariant="sm"
        fullWidth={false}
        placeholder="Betrag"
        onChange={onChange}
      />,
    );
    expect(screen.getByText('Budget')).toBeInTheDocument();
    expect(screen.getByText('€')).toBeInTheDocument();
    expect(screen.getByText('Jahresbudget')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Wert erhöhen' }));
    expect(onChange).toHaveBeenCalledWith(10);
    await user.click(screen.getByRole('button', { name: 'Wert verringern' }));
    expect(document.getElementById('budget-stepper')).not.toBeNull();
  });

  it('externer Fehler (string und boolean) überschreibt Helper-Darstellung', () => {
    const { rerender } = render(
      <NumberStepper value={5} onChange={() => {}} error="Externer Fehler" helperText="Hilfe" />,
    );
    expect(screen.getByText('Externer Fehler')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-invalid', 'true');
    rerender(<NumberStepper value={5} onChange={() => {}} error helperText="Hilfe" />);
    expect(screen.getByText('Hilfe')).toBeInTheDocument();
  });

  it('Fokus setzt Fokuszustand, Hover auf aktivem Button färbt', async () => {
    const user = userEvent.setup();
    render(<Controlled min={0} max={100} />);
    const input = screen.getByRole('spinbutton');
    await user.click(input);
    expect(input).toHaveFocus();
    const inc = screen.getByRole('button', { name: 'Wert erhöhen' });
    fireEvent.mouseEnter(inc);
    expect(inc.style.background).toContain('primary-soft');
    fireEvent.mouseLeave(inc);
    expect(inc.style.background).toBe('transparent');
  });
});
