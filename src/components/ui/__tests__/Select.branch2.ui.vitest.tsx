import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Select } from '../Select';

const OPTS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta', description: 'Zweite Option' },
  { value: 'c', label: 'Gamma' },
];

function Controlled(props: Partial<Parameters<typeof Select>[0]> = {}) {
  const [val, setVal] = useState(props.value ?? '');
  return (
    <Select
      options={OPTS}
      value={val}
      onChange={(v) => {
        setVal(v);
        props.onChange?.(v);
      }}
      {...props}
    />
  );
}

describe('Select (branch2)', () => {
  it('leere Optionen zeigen Leermeldung', async () => {
    const user = userEvent.setup();
    render(<Select options={[]} value="" onChange={() => {}} />);
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByText('Keine Optionen verfügbar')).toBeInTheDocument();
  });

  it('Enter auf geschlossener Box öffnet, Escape schließt und fokussiert Trigger', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const combo = screen.getByRole('combobox');
    combo.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(combo).toHaveFocus();
  });

  it('Space auf geschlossener Box öffnet ebenfalls', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const combo = screen.getByRole('combobox');
    combo.focus();
    await user.keyboard(' ');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('ArrowUp springt ans Ende und wählt per Space', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const combo = screen.getByRole('combobox');
    await user.click(combo);
    await user.keyboard('{ArrowUp}');
    // Highlight steht auf letzter Option (Gamma)
    expect(combo).toHaveAttribute('aria-activedescendant', expect.stringContaining('-option-2'));
    await user.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith('c');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('ArrowDown wrappt von letzter zu erster Option', async () => {
    const user = userEvent.setup();
    render(<Controlled value="c" />);
    const combo = screen.getByRole('combobox');
    expect(combo.textContent).toContain('Gamma');
    await user.click(combo);
    await user.keyboard('{ArrowDown}');
    expect(combo).toHaveAttribute('aria-activedescendant', expect.stringContaining('-option-0'));
  });

  it('Tab schließt die Liste', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Tab}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('deaktiviert: Klick und Tastatur öffnen nicht', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select options={OPTS} value="" onChange={onChange} disabled />);
    const combo = screen.getByRole('combobox');
    await user.click(combo);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    combo.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Größe sm, Label, Beschreibung, Custom-ID und Fehlertext', async () => {
    const user = userEvent.setup();
    render(
      <Select
        label="Kanal"
        id="kanal-select"
        options={OPTS}
        value="b"
        onChange={() => {}}
        sizeVariant="sm"
        fullWidth={false}
        error="Pflichtfeld"
      />,
    );
    expect(screen.getByText('Kanal')).toBeInTheDocument();
    expect(screen.getByText('Pflichtfeld')).toBeInTheDocument();
    const combo = screen.getByRole('combobox');
    expect(combo.textContent).toContain('Beta');
    await user.click(combo);
    expect(screen.getByText('Zweite Option')).toBeInTheDocument();
    // ausgewählte Option trägt aria-selected und Check-Icon
    const selected = screen.getByRole('option', { name: /Beta/ });
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(document.getElementById('kanal-select')).not.toBeNull();
  });

  it('Option per Tastatur-Enter auf li-Element wählen, MouseEnter highlightet', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await user.click(screen.getByRole('combobox'));
    const beta = screen.getByRole('option', { name: /Beta/ });
    fireEvent.mouseEnter(beta);
    fireEvent.keyDown(beta, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
