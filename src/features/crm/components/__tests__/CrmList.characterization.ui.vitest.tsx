import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CrmDesktopTable } from '../CrmDesktopTable';
import { CrmMobileCards } from '../CrmMobileCards';
import { CrmResponsiveList, type CrmColumn } from '../CrmResponsiveList';

interface Row {
  id: string;
  name: string;
  status: string;
}

const columns: CrmColumn<Row>[] = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
];

const rows: Row[] = [
  { id: 'r1', name: 'Acme GmbH', status: 'Aktiv' },
  { id: 'r2', name: 'Beta AG', status: 'Lead' },
];

const cellValue = (row: object, key: string): unknown => (row as Record<string, unknown>)[key];
const getKey = (row: Row) => row.id;

function mockViewport(isMobile: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) => ({
      matches: isMobile,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
    writable: true,
    configurable: true,
  });
}

afterEach(() => {
  mockViewport(false);
});

describe('CrmDesktopTable (characterization)', () => {
  const props = {
    columns,
    rows,
    caption: 'Kundenliste',
    emptyText: 'Keine Kunden',
    getKey,
    cellValue,
  };

  it('rendert Spalten und Zeilen als Tabelle', () => {
    render(<CrmDesktopTable {...props} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByText('Acme GmbH')).toBeInTheDocument();
    expect(screen.getByText('Beta AG')).toBeInTheDocument();
  });

  it('zeigt Leerzustand über alle Spalten', () => {
    render(<CrmDesktopTable {...props} rows={[]} />);
    expect(screen.getByText('Keine Kunden')).toBeInTheDocument();
    expect(screen.queryByText('Acme GmbH')).toBeNull();
  });

  it('nutzt Spalten-Renderfunktion falls vorhanden', () => {
    render(
      <CrmDesktopTable
        {...props}
        columns={[{ key: 'name', label: 'Name', render: (row) => <strong>{row.name}!</strong> }]}
        rows={[rows[0]!]}
      />,
    );
    expect(screen.getByText('Acme GmbH!')).toBeInTheDocument();
  });
});

describe('CrmMobileCards (characterization)', () => {
  const props = {
    columns,
    rows,
    caption: 'Kundenliste',
    emptyText: 'Keine Kunden',
    getKey,
    cellValue,
  };

  it('rendert Karten mit Titel und Label-Zeilen', () => {
    render(<CrmMobileCards {...props} />);
    expect(screen.getByRole('region', { name: 'Kundenliste' })).toBeInTheDocument();
    expect(screen.getByText('Acme GmbH')).toBeInTheDocument();
    expect(screen.getAllByText('Status').length).toBe(2);
    expect(screen.getByText('Aktiv')).toBeInTheDocument();
  });

  it('zeigt Leerzustand als Hinweisbox', () => {
    render(<CrmMobileCards {...props} rows={[]} />);
    expect(screen.getByText('Keine Kunden')).toBeInTheDocument();
  });

  it('nutzt eigene Karten-Renderfunktion', () => {
    const renderMobileCard = vi.fn((row: Row) => <article>{row.name} mobil</article>);
    render(<CrmMobileCards {...props} renderMobileCard={renderMobileCard} />);
    expect(screen.getByText('Acme GmbH mobil')).toBeInTheDocument();
    expect(renderMobileCard).toHaveBeenCalledTimes(2);
  });
});

describe('CrmResponsiveList (characterization)', () => {
  it('rendert Desktop-Tabelle auf breitem Viewport', () => {
    mockViewport(false);
    render(<CrmResponsiveList columns={columns} rows={rows} caption="Kundenliste" />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Kundenliste' })).toBeNull();
    expect(screen.getByText('Acme GmbH')).toBeInTheDocument();
  });

  it('rendert Karten auf mobilem Viewport', () => {
    mockViewport(true);
    render(<CrmResponsiveList columns={columns} rows={rows} caption="Kundenliste" />);
    expect(screen.getByRole('region', { name: 'Kundenliste' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('Beta AG')).toBeInTheDocument();
  });

  it('zeigt Standard-Leertext und Key-Fallback', () => {
    mockViewport(false);
    render(
      <CrmResponsiveList
        columns={columns}
        rows={[{ name: 'Solo', status: 'Neu' } as Row]}
        caption="Kundenliste"
      />,
    );
    expect(screen.getByText('Solo')).toBeInTheDocument();
    mockViewport(true);
    const { unmount } = render(
      <CrmResponsiveList columns={columns} rows={[]} caption="Kundenliste" />,
    );
    expect(screen.getByText('Keine Einträge vorhanden')).toBeInTheDocument();
    unmount();
  });
});
