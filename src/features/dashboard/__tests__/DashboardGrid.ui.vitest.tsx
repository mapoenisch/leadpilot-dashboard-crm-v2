// Auftrag 074 (Dashboard Teilauftrag 5): Raster, Bearbeitungsleiste, Platzhalter, Ziehen, Fokus.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { DashboardGrid, type DashboardGridProps } from '../components/DashboardGrid';
import type { TileDataHook } from '../components/LazyDashboardTile';
import type { DashboardTileConfig } from '../model/dashboardConfig';

const tile = (id: string, size: DashboardTileConfig['size'] = 'klein'): DashboardTileConfig => ({
  tileId: id,
  catalogId: 'crm.pipeline_deals',
  view: 'zahl',
  size,
  filterMode: 'dashboard',
});

const useData: TileDataHook = (t) => ({
  catalogId: t.catalogId,
  state: 'laden',
  value: null,
  series: null,
  overview: null,
  unit: 'Deals',
  timeBasis: 'Aktueller Stand',
  asOf: null,
  origin: { layer: 'crm', module: 'src/domain/x.ts', exportName: 'X' },
  scope: 'organisation',
  effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
});

function setup(extra: Partial<DashboardGridProps> = {}) {
  const props: DashboardGridProps = {
    tiles: [tile('a', 'klein'), tile('b', 'mittel'), tile('c', 'gross'), tile('d', 'voll')],
    editing: false,
    locked: false,
    useData,
    onShowDetails: vi.fn(),
    onMove: vi.fn(),
    onMoveTo: vi.fn(),
    onEdit: vi.fn(),
    onRemove: vi.fn(),
    ...extra,
  };
  const view = render(<DashboardGrid {...props} />);
  return { props, ...view };
}

const items = () => screen.getAllByRole('listitem');

describe('DashboardGrid', () => {
  it('nutzt 1/6/12 Spalten und je Größe die vorgegebene Spanne ohne dichtes Auffüllen', () => {
    setup();
    const list = screen.getByRole('list', { name: 'Dashboard-Kacheln' });
    expect(list.className).toContain('grid-cols-1');
    expect(list.className).toContain('md:grid-cols-6');
    expect(list.className).toContain('lg:grid-cols-12');
    expect(list.className).not.toMatch(/dense/);
    const [a, b, c, d] = items();
    expect(a!.className).toContain('md:col-span-3');
    expect(a!.className).toContain('lg:col-span-3');
    expect(b!.className).toContain('md:col-span-6');
    expect(b!.className).toContain('lg:col-span-6');
    expect(c!.className).toContain('md:col-span-6');
    expect(c!.className).toContain('lg:col-span-9');
    expect(d!.className).toContain('lg:col-span-12');
  });

  it('zeigt außerhalb des Bearbeitens keine Bearbeitungsleiste', () => {
    setup();
    expect(screen.queryByTestId('tile-edit-bar')).toBeNull();
  });

  it('bietet im Bearbeiten Schaltflächen mit Titel und Position und sperrt die Ränder', () => {
    const { props } = setup({ editing: true });
    expect(screen.getAllByTestId('tile-edit-bar')).toHaveLength(4);
    const first = items()[0]!;
    expect(within(first).getByRole('button', { name: /Nach oben/ })).toBeDisabled();
    const down = within(first).getByRole('button', { name: /Nach unten, Position 1 von 4/ });
    fireEvent.click(down);
    expect(props.onMove).toHaveBeenCalledWith('a', 'runter');
    const last = items()[3]!;
    expect(within(last).getByRole('button', { name: /Nach unten/ })).toBeDisabled();
    fireEvent.click(within(items()[1]!).getByRole('button', { name: /Entfernen/ }));
    expect(props.onRemove).toHaveBeenCalledWith('b');
    fireEvent.click(within(items()[2]!).getByRole('button', { name: /Bearbeiten/ }));
    expect(props.onEdit).toHaveBeenCalledWith('c');
  });

  it('sperrt alle Aktionen, solange gesperrt ist', () => {
    setup({ editing: true, locked: true });
    for (const button of screen.getAllByRole('button', {
      name: /Nach oben|Nach unten|Bearbeiten|Entfernen/,
    })) {
      expect(button).toBeDisabled();
    }
  });

  it('zeigt für unbekannte oder inaktive Kacheln einen Platzhalter ohne technische ID', () => {
    setup({
      tiles: [
        { ...tile('u'), catalogId: 'baseline.gibt_es_nicht' },
        { ...tile('v'), catalogId: 'x'.repeat(60) },
      ],
      editing: true,
    });
    const slots = screen.getAllByTestId('unavailable-slot');
    expect(slots).toHaveLength(2);
    expect(slots[0]).toHaveTextContent(/bleibt in deiner Ansicht gespeichert/);
    expect(slots[0]).not.toHaveTextContent('gibt_es_nicht');
    // Auch die Schaltflächenbeschriftungen nennen keine technische ID.
    for (const button of within(items()[0]!).getAllByRole('button')) {
      expect(button.getAttribute('aria-label') ?? '').not.toContain('gibt_es_nicht');
    }
    // Entfernen bleibt möglich, Bearbeiten nicht.
    expect(within(items()[0]!).getByRole('button', { name: /Entfernen/ })).toBeEnabled();
    expect(within(items()[0]!).getByRole('button', { name: /Bearbeiten/ })).toBeDisabled();
  });

  it('verschiebt per Ziehen auf die Zielposition', () => {
    const { props } = setup({ editing: true });
    const handle = within(items()[0]!).getByTestId('drag-handle');
    expect(handle).toHaveAttribute('aria-hidden', 'true');
    fireEvent.dragStart(handle);
    fireEvent.dragOver(items()[2]!);
    fireEvent.drop(items()[2]!);
    expect(props.onMoveTo).toHaveBeenCalledWith('a', 2);
  });

  it('ignoriert Ziehen, solange gesperrt ist', () => {
    const { props } = setup({ editing: true, locked: true });
    const handle = within(items()[0]!).getByTestId('drag-handle');
    fireEvent.dragStart(handle);
    fireEvent.drop(items()[2]!);
    expect(props.onMoveTo).not.toHaveBeenCalled();
  });

  it('setzt den Fokus auf die angeforderte Schaltfläche, bei gesperrtem Rand auf die andere', () => {
    const { rerender, props } = setup({ editing: true });
    rerender(<DashboardGrid {...props} focusRequest={{ id: 1, tileId: 'b', action: 'hoch' }} />);
    expect(within(items()[1]!).getByRole('button', { name: /Nach oben/ })).toHaveFocus();
    rerender(<DashboardGrid {...props} focusRequest={{ id: 2, tileId: 'a', action: 'hoch' }} />);
    expect(within(items()[0]!).getByRole('button', { name: /Nach unten/ })).toHaveFocus();
    rerender(<DashboardGrid {...props} focusRequest={{ id: 3, tileId: 'c', action: 'kachel' }} />);
    expect(items()[2]).toHaveFocus();
  });

  it('zeigt bei leerer Liste einen Hinweis; im Bearbeiten mit „Kachel hinzufügen“', () => {
    const onAdd = vi.fn();
    setup({ tiles: [], editing: true, onAdd });
    expect(screen.getByTestId('dashboard-empty')).toHaveTextContent(/keine Kacheln/);
    fireEvent.click(screen.getByRole('button', { name: 'Kachel hinzufügen' }));
    expect(onAdd).toHaveBeenCalled();
  });

  it('bietet im Leerzustand auch „Auf Standard zurücksetzen“ an', () => {
    const onReset = vi.fn();
    setup({ tiles: [], editing: true, onAdd: vi.fn(), onReset });
    fireEvent.click(screen.getByRole('button', { name: 'Auf Standard zurücksetzen' }));
    expect(onReset).toHaveBeenCalled();
  });
});
