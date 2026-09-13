import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Table, Column } from '../Table';

interface TestRow {
  id: string;
  name: string;
  amount: number;
}

describe('Table', () => {
  const columns: Column<TestRow>[] = [
    { key: 'name', label: 'Name' },
    {
      key: 'amount',
      label: 'Betrag',
      render: (row) => `${row.amount} €`,
    },
  ];

  const rows: TestRow[] = [
    { id: '1', name: 'Kunde A', amount: 500 },
    { id: '2', name: 'Kunde B', amount: 1200 },
  ];

  it('renders columns and row data with custom renderer', () => {
    render(<Table columns={columns} rows={rows} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Betrag')).toBeInTheDocument();
    expect(screen.getByText('Kunde A')).toBeInTheDocument();
    expect(screen.getByText('500 €')).toBeInTheDocument();
    expect(screen.getByText('Kunde B')).toBeInTheDocument();
    expect(screen.getByText('1200 €')).toBeInTheDocument();
  });

  it('renders emptyText when rows array is empty', () => {
    render(<Table columns={columns} rows={[]} emptyText="Keine Daten vorhanden" />);
    expect(screen.getByText('Keine Daten vorhanden')).toBeInTheDocument();
  });

  it('handles row hover states and custom minWidth', () => {
    const { container } = render(<Table columns={columns} rows={rows} minWidth="650px" />);
    const tr = container.querySelectorAll('tbody tr')[0];
    expect(tr).toBeDefined();
    if (tr) {
      fireEvent.mouseEnter(tr);
      fireEvent.mouseLeave(tr);
    }
  });
});
