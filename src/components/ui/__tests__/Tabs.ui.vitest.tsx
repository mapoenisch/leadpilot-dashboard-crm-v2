import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabItem } from '../Tabs';

const sampleTabs: TabItem[] = [
  { id: 'tab-1', label: 'Übersicht', count: 5 },
  { id: 'tab-2', label: 'Aktivitäten', count: 12 },
  { id: 'tab-3', label: 'Einstellungen' },
];

describe('Tabs', () => {
  it('renders tablist and tabs with counts', () => {
    render(
      <Tabs items={sampleTabs} activeId="tab-1" onChange={() => {}} ariaLabel="Hauptnavigation" />,
    );

    expect(screen.getByRole('tablist', { name: 'Hauptnavigation' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Übersicht/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /Aktivitäten/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('triggers onChange when clicking another tab', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Tabs items={sampleTabs} activeId="tab-1" onChange={handleChange} />);

    const tab2 = screen.getByRole('tab', { name: /Aktivitäten/i });
    await user.click(tab2);
    expect(handleChange).toHaveBeenCalledWith('tab-2');
  });

  it('supports keyboard navigation (ArrowRight, ArrowLeft, Home, End)', () => {
    const handleChange = vi.fn();
    render(<Tabs items={sampleTabs} activeId="tab-1" onChange={handleChange} />);

    const tab1 = screen.getByRole('tab', { name: /Übersicht/i });

    // ArrowRight moves to tab-2
    fireEvent.keyDown(tab1, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith('tab-2');

    // ArrowLeft wraps to tab-3
    fireEvent.keyDown(tab1, { key: 'ArrowLeft' });
    expect(handleChange).toHaveBeenCalledWith('tab-3');

    // Home moves to tab-1
    fireEvent.keyDown(tab1, { key: 'Home' });
    expect(handleChange).toHaveBeenCalledWith('tab-1');

    // End moves to tab-3
    fireEvent.keyDown(tab1, { key: 'End' });
    expect(handleChange).toHaveBeenCalledWith('tab-3');
  });
});
