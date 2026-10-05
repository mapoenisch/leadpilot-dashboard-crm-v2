// Auftrag 074 (Dashboard Teilauftrag 5): Konfigurationsfenster für Kacheln.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import TileConfigurator, { type TileConfiguratorProps } from '../components/TileConfigurator';
import type { TileDataHook } from '../components/LazyDashboardTile';
import type { DashboardTileConfig } from '../model/dashboardConfig';
import { DASHBOARD_CATEGORIES, getActiveEntries } from '../model/dashboardCatalog';

const useData: TileDataHook = (t) => ({
  catalogId: t.catalogId,
  state: 'laden',
  value: null,
  series: null,
  overview: null,
  unit: '',
  timeBasis: '',
  asOf: null,
  origin: { layer: 'baseline', module: 'src/domain/x.ts', exportName: 'X' },
  scope: 'organisation',
  effectiveFilter: { mode: 'fester_stand', period: null, pipeline: null },
});

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

const dialog = () => screen.getByRole('dialog');

describe('TileConfigurator', () => {
  it('listet Kennzahlen, filtert per Suche und sagt die Trefferzahl an', () => {
    setup();
    const all = within(dialog()).getAllByRole('radio', { name: /./ }).length;
    expect(all).toBeGreaterThan(3);
    fireEvent.change(screen.getByLabelText('Kennzahl suchen'), { target: { value: 'ARR' } });
    const status = screen.getAllByRole('status').find((el) => /Treffer/.test(el.textContent ?? ''));
    expect(status?.textContent).toMatch(/\d+ Treffer|1 Treffer/);
    fireEvent.change(screen.getByLabelText('Kennzahl suchen'), { target: { value: 'zzzzzz' } });
    expect(screen.getByText('0 Treffer')).toBeInTheDocument();
  });

  it('übernimmt Voreinstellungen der gewählten Kennzahl und fügt sie hinzu', () => {
    const props = setup();
    fireEvent.change(screen.getByLabelText('Kennzahl suchen'), { target: { value: 'ARR' } });
    const first = screen
      .getAllByRole('radio')
      .find((r) => r.getAttribute('name')?.endsWith('kennzahl'));
    fireEvent.click(first!);
    const add = screen.getByRole('button', { name: 'Hinzufügen' });
    expect(add).toBeEnabled();
    expect(screen.getByTestId('configurator-preview')).toHaveAttribute('inert');
    fireEvent.click(add);
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalled();
  });

  it('sperrt Hinzufügen ohne Auswahl und zeigt keine Vorschau', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Hinzufügen' })).toBeDisabled();
    expect(screen.getByText(/Vorschau erscheint, sobald/)).toBeInTheDocument();
  });

  it('sperrt unzulässigen Zeitbezug mit Grund', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Kennzahl suchen'), { target: { value: 'ARR' } });
    fireEvent.click(
      screen.getAllByRole('radio').find((r) => r.getAttribute('name')?.endsWith('kennzahl'))!,
    );
    const own = screen.getByRole('radio', { name: /Eigener Zeitraum/ });
    expect(own).toBeDisabled();
    expect(own.closest('label')?.textContent?.length).toBeGreaterThan(
      'Eigener Zeitraum'.length + 15,
    );
  });

  it('hebt die Größe an, wenn die Darstellung mehr Platz braucht', () => {
    setup();
    const radio = screen
      .getAllByRole('radio')
      .find((r) => r.getAttribute('name')?.endsWith('kennzahl'))!;
    fireEvent.click(radio);
    const table = screen.queryByRole('radio', { name: /^Tabelle/ });
    if (table) {
      fireEvent.click(table);
      expect(screen.getByRole('radio', { name: /^Klein/ })).toBeDisabled();
      expect(screen.getByRole('radio', { name: /^Mittel/ })).toBeChecked();
    }
  });

  it('zeigt den Grund, wenn die Übergabe abgelehnt wird, und bleibt offen', () => {
    const onSubmit = vi.fn(() => ({ ok: false as const, reason: 'Höchstens 24 Kacheln.' }));
    const props = setup({ onSubmit });
    fireEvent.click(
      screen.getAllByRole('radio').find((r) => r.getAttribute('name')?.endsWith('kennzahl'))!,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Höchstens 24 Kacheln.');
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('lehnt einen zu langen Titel mit verständlichem Hinweis ab', () => {
    setup();
    fireEvent.click(
      screen.getAllByRole('radio').find((r) => r.getAttribute('name')?.endsWith('kennzahl'))!,
    );
    fireEvent.change(screen.getByLabelText('Eigener Titel (optional)'), {
      target: { value: 'x'.repeat(81) },
    });
    expect(screen.getByRole('button', { name: 'Hinzufügen' })).toBeDisabled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('bearbeitet eine vorhandene Kachel mit fester Kennzahl', () => {
    const tile: DashboardTileConfig = {
      tileId: 't1',
      catalogId: 'baseline.arr',
      view: 'zahl',
      size: 'klein',
      filterMode: 'fester_stand',
      title: 'Mein ARR',
    };
    const props = setup({ tile });
    expect(screen.getByText(/Kennzahl:/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Kennzahl suchen')).toBeNull();
    expect(screen.getByLabelText('Eigener Titel (optional)')).toHaveValue('Mein ARR');
    fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }));
    expect(props.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ catalogId: 'baseline.arr', title: 'Mein ARR' }),
    );
  });

  it('rendert nichts, solange geschlossen', () => {
    setup({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('TileConfigurator: Codex-Befunde PR #59', () => {
  it('findet Kennzahlen auch über Begriffe aus der Definition', () => {
    setup();
    const names = (term: string) => {
      fireEvent.change(screen.getByLabelText('Kennzahl suchen'), { target: { value: term } });
      return screen
        .getAllByRole('radio')
        .filter((r) => r.getAttribute('name')?.endsWith('kennzahl')).length;
    };
    const entry = getActiveEntries().find(
      (item) => !item.name.toLowerCase().includes('zinsen') && /zinsen/i.test(item.definition),
    );
    expect(entry).toBeDefined();
    expect(names('Zinsen')).toBeGreaterThan(0);
  });

  it('bietet nur Kategorien mit aktiven Einträgen an', () => {
    setup();
    const used = new Set<string>(
      getActiveEntries().map((item) => DASHBOARD_CATEGORIES[item.category]),
    );
    const options = within(screen.getByLabelText('Kategorie'))
      .getAllByRole('option')
      .map((option) => option.textContent ?? '')
      .filter((text) => text !== 'Alle Kategorien');
    expect(options.length).toBeGreaterThan(0);
    for (const label of options) expect(used.has(label)).toBe(true);
    expect(options.length).toBe(used.size);
  });

  it('sagt die automatische Größenanhebung an', () => {
    setup();
    fireEvent.click(
      screen.getAllByRole('radio').find((r) => r.getAttribute('name')?.endsWith('kennzahl'))!,
    );
    const table = screen.queryByRole('radio', { name: /^Tabelle/ });
    if (!table) return;
    fireEvent.click(table);
    expect(
      screen
        .getAllByRole('status')
        .some((el) => /Größe automatisch auf Mittel/.test(el.textContent ?? '')),
    ).toBe(true);
  });
});
