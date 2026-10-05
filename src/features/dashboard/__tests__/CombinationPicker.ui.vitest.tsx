// Auftrag 076 (Dashboard Teilauftrag 6): Auswahl der zweiten Kennzahl im Konfigurator.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TileConfigurator, { type TileConfiguratorProps } from '../components/TileConfigurator';
import { CombinationPicker } from '../components/CombinationPicker';
import type { TileDataHook } from '../components/LazyDashboardTile';
import { resolveCombination } from '../data/resolveCombination';
import { resolveBaseline } from '../data/resolveBaseline';
import { getCatalogEntry, isActiveEntry } from '../model/dashboardCatalog';
import { resolveEffectiveFilter } from '../model/dashboardFilters';

/** Vorschau über denselben Rechenweg wie die echte Kachel (nur Stammdaten und Kombinationen). */
const useData: TileDataHook = (tile, filters) => {
  const entry = getCatalogEntry(tile.catalogId);
  if (!entry || !isActiveEntry(entry)) throw new Error(tile.catalogId);
  const filter = resolveEffectiveFilter(tile, entry, filters);
  return entry.source.layer === 'kombination'
    ? resolveCombination(entry, filter)
    : resolveBaseline(entry, filter);
};

function setup(extra: Partial<TileConfiguratorProps> = {}) {
  const props: TileConfiguratorProps = {
    open: true,
    useData,
    onSubmit: vi.fn(() => ({ ok: true as const, config: { version: 1 as const, tiles: [] } })),
    onClose: vi.fn(),
    ...extra,
  };
  render(<TileConfigurator {...props} />);
  return props;
}

const firstRadio = (name: string) =>
  screen
    .queryAllByRole('radio', { name: new RegExp(`^${name}`) })
    .find((radio) => radio.getAttribute('name')?.endsWith('kennzahl'));
const comboStatus = () => screen.getByTestId('combination-status').textContent;

describe('CombinationPicker', () => {
  it('bietet nur Partner der Matrix an, gesperrte mit Grund', () => {
    render(
      <CombinationPicker
        name="k"
        firstId="baseline.umsatz"
        selectedId="baseline.umsatz"
        onPick={() => undefined}
      />,
    );
    expect(screen.getByRole('radio', { name: /^Ohne Kombination/ })).toBeChecked();
    const marge = screen.getByRole('radio', { name: /^EBITDA-Marge \(mit EBITDA\)/ });
    expect(marge).toBeEnabled();
    expect(marge.closest('label')?.textContent).toContain('Formel: EBITDA ÷ Umsatzerlöse × 100');
    const arr = screen.getByRole('radio', { name: /^ARR Nicht kombinierbar/ });
    expect(arr).toBeDisabled();
    expect(arr.closest('label')?.textContent).toMatch(
      /Nicht kombinierbar: Unterschiedliche Zeitbasis/,
    );
  });

  it('erscheint nicht, wenn es weder Partner noch naheliegende Sperren gibt', () => {
    const { container } = render(
      <CombinationPicker
        name="k"
        firstId="baseline.headcount"
        selectedId="baseline.headcount"
        onPick={() => undefined}
      />,
    );
    expect(container.textContent).toBe('');
  });
});

describe('TileConfigurator mit Kombination', () => {
  it('Kombinationen stehen nicht in der Kennzahl-Liste', () => {
    setup();
    expect(firstRadio('EBITDA-Marge')).toBeUndefined();
    expect(firstRadio('EBITDA')).toBeDefined();
  });

  it('Wahl ersetzt die Kennzahl, übernimmt Darstellung, Größe und Zeitbezug aus der Regel', () => {
    const props = setup();
    fireEvent.click(firstRadio('EBITDA')!);
    expect(comboStatus()).toBe('1 Kombination mit einer zweiten Kennzahl möglich.');
    fireEvent.click(screen.getByRole('radio', { name: /^EBITDA-Marge/ }));
    expect(comboStatus()).toBe('Kombination „EBITDA-Marge“ gewählt: EBITDA ÷ Umsatzerlöse × 100.');
    expect(screen.queryByRole('radio', { name: /^Ring/ })).toBeNull();
    expect(screen.getByTestId('configurator-preview').textContent).toContain('-92,0 %');
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));
    expect(props.onSubmit).toHaveBeenCalledWith({
      catalogId: 'kombination.ebitda_marge',
      view: 'zahl',
      size: 'klein',
      filterMode: expect.any(String),
    });
  });

  it('Anteil bietet Ring an; Entfernen stellt die erste Kennzahl wieder her', () => {
    setup();
    fireEvent.click(firstRadio('MRR nach Paket')!);
    expect(comboStatus()).toBe('3 Kombinationen mit einer zweiten Kennzahl möglich.');
    fireEvent.click(screen.getByRole('radio', { name: /^MRR-Anteil Pro/ }));
    expect(screen.getByRole('radio', { name: /^Ring/ })).toBeEnabled();
    fireEvent.click(screen.getByRole('radio', { name: /^Ohne Kombination/ }));
    expect(comboStatus()).toBe('Kombination entfernt; die erste Kennzahl gilt allein.');
    expect(screen.getByRole('radio', { name: /^Balken/ })).toBeInTheDocument();
  });

  it('Wechsel der ersten Kennzahl verwirft die Kombination mit Ansage, nichts bleibt hängen', () => {
    const props = setup();
    fireEvent.click(firstRadio('EBITDA')!);
    fireEvent.click(screen.getByRole('radio', { name: /^EBITDA-Marge/ }));
    fireEvent.click(firstRadio('Headcount')!);
    expect(comboStatus()).toBe(
      'Kombination „EBITDA-Marge“ verworfen, weil die erste Kennzahl wechselte.',
    );
    expect(screen.queryByTestId('combination-picker')).toBeNull();
    expect(screen.getByTestId('configurator-preview').textContent).not.toContain('Formel');
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));
    expect(props.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ catalogId: 'baseline.headcount' }),
    );
  });

  it('per Tastatur bedienbar: Partner wählen, Fokus bleibt in der Gruppe, hinzufügen', async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(firstRadio('Fully-Loaded CAC')!);
    const none = screen.getByRole('radio', { name: /^Ohne Kombination/ });
    none.focus();
    await user.keyboard('{ArrowDown}');
    const partner = screen.getByRole('radio', { name: /^CAC-Aufschlagfaktor/ });
    expect(partner).toBeChecked();
    expect(document.activeElement).toBe(partner);
    expect(screen.getByTestId('configurator-preview').textContent).toContain('5,2x');
    await user.click(screen.getByRole('button', { name: 'Hinzufügen' }));
    expect(props.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ catalogId: 'kombination.cac_aufschlag' }),
    );
  });

  it('bearbeitet eine Kombinationskachel mit fester Kennzahl und Formel', () => {
    setup({
      tile: {
        tileId: 't',
        catalogId: 'kombination.mrr_anteil_growth',
        view: 'ring',
        size: 'mittel',
        filterMode: 'fester_stand',
      },
    });
    expect(screen.queryByTestId('combination-picker')).toBeNull();
    expect(screen.getAllByTestId('tile-formula')[0]?.textContent).toBe(
      'Formel: MRR Growth ÷ Gesamt-MRR × 100',
    );
  });

  it('Escape schließt nur, solange keine Rückfrage darüber liegt', () => {
    const props = setup({ escapeActive: false });
    fireEvent.click(firstRadio('EBITDA')!);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onClose).not.toHaveBeenCalled();
  });
});
