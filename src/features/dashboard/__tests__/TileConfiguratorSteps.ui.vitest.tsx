// Auftrag 092 (Paket F Teil 2): Konfigurator in Kennzahl, Darstellung, Vorschau und Erweiterte Einstellungen.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import TileConfigurator from '../components/TileConfigurator';
import type { TileDataHook } from '../components/LazyDashboardTile';
import type { DashboardTileConfig } from '../model/dashboardConfig';

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

function setup(tile?: DashboardTileConfig) {
  render(
    <TileConfigurator
      open
      tile={tile}
      useData={useData}
      onSubmit={vi.fn(() => ({ ok: true as const, config: { version: 1 as const, tiles: [] } }))}
      onClose={vi.fn()}
    />,
  );
}

const pickFirst = (query: string) => {
  fireEvent.change(screen.getByLabelText('Kennzahl suchen'), { target: { value: query } });
  fireEvent.click(
    screen.getAllByRole('radio').find((r) => r.getAttribute('name')?.endsWith('kennzahl'))!,
  );
};
const advancedButton = () => screen.getByRole('button', { name: /Erweiterte Einstellungen/ });

describe('TileConfigurator: Abschnitte', () => {
  it('gliedert in Kennzahl, Darstellung und Vorschau; Erweitertes ist eingeklappt', () => {
    setup();
    expect(screen.getByRole('heading', { name: '1 · Kennzahl' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '3 · Vorschau' })).toBeInTheDocument();
    pickFirst('EBITDA');
    expect(screen.getByRole('heading', { name: '2 · Darstellung' })).toBeInTheDocument();
    expect(advancedButton()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('group', { name: 'Zeitbezug' })).toBeNull();
    expect(screen.queryByTestId('combination-picker')).toBeNull();
    fireEvent.click(advancedButton());
    expect(advancedButton()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('group', { name: 'Zeitbezug' })).toBeInTheDocument();
    expect(screen.getByTestId('combination-picker')).toBeInTheDocument();
  });

  it('listet gesperrte Partner nur eingeklappt unter „Nicht kombinierbar“', () => {
    setup();
    pickFirst('EBITDA');
    fireEvent.click(advancedButton());
    const blocked = screen.getByTestId('combination-blocked');
    expect(blocked.tagName).toBe('DETAILS');
    expect(blocked).not.toHaveAttribute('open');
    expect(blocked.textContent).toMatch(/Nicht kombinierbar \(\d+\)/);
  });

  it('klappt Erweitertes von selbst auf, wenn die Kachel eine eigene Pipeline trägt', () => {
    setup({
      tileId: 't',
      catalogId: 'crm.pipeline_deals',
      view: 'zahl',
      size: 'klein',
      filterMode: 'dashboard',
      pipeline: 'Direkt',
    });
    expect(advancedButton()).toHaveAttribute('aria-expanded', 'true');
    expect(advancedButton().textContent).toMatch(/1 Abweichung/);
  });

  it('macht Arbeitskopie und Speichern unterscheidbar', () => {
    setup();
    expect(screen.getByText(/landet zunächst in der Arbeitskopie/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zur Arbeitskopie hinzufügen' })).toBeDisabled();
  });

  it('sagt mögliche Kombinationen auch bei eingeklapptem Bereich an (Codex PR #78)', () => {
    setup();
    pickFirst('EBITDA');
    expect(advancedButton()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('combination-status').textContent).toMatch(/Kombination/);
  });

  it('lässt den langen Arbeitskopie-Knopf umbrechen (Codex PR #78)', () => {
    setup();
    const button = screen.getByRole('button', { name: 'Zur Arbeitskopie hinzufügen' });
    expect(button.className).toMatch(/whitespace-normal/);
    expect(button.className).not.toMatch(/whitespace-nowrap/);
  });
});
