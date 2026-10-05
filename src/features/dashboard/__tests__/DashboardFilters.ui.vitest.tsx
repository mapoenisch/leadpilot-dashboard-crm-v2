// Auftrag 074 (Dashboard Teilauftrag 5): zentrale Filter mit Entwurf, Anwenden und Startfilter.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DashboardFilters, type DashboardFiltersProps } from '../components/DashboardFilters';

function setup(extra: Partial<DashboardFiltersProps> = {}) {
  const props: DashboardFiltersProps = {
    value: undefined,
    startFilters: undefined,
    editing: false,
    locked: false,
    pipelineSupported: true,
    onApply: vi.fn(),
    onStartFilters: vi.fn(),
    ...extra,
  };
  const view = render(<DashboardFilters {...props} />);
  return { props, ...view };
}

describe('DashboardFilters', () => {
  it('wirkt erst mit „Filter anwenden“ und gibt den getrimmten Wert weiter', () => {
    const { props } = setup();
    const apply = screen.getByRole('button', { name: 'Filter anwenden' });
    expect(apply).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Pipeline'), { target: { value: '  Direkt ' } });
    expect(props.onApply).not.toHaveBeenCalled();
    fireEvent.click(apply);
    expect(props.onApply).toHaveBeenCalledWith({ pipeline: 'Direkt' });
  });

  it('wendet einen leeren Entwurf als „kein Filter“ an', () => {
    const { props } = setup({ value: { pipeline: 'Direkt' } });
    fireEvent.change(screen.getByLabelText('Pipeline'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Filter anwenden' }));
    expect(props.onApply).toHaveBeenCalledWith(undefined);
  });

  it('lehnt zu lange Eingaben mit Hinweis ab', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Pipeline'), { target: { value: 'x'.repeat(65) } });
    expect(screen.getByRole('button', { name: 'Filter anwenden' })).toBeDisabled();
    expect(screen.getByText(/höchstens 64 Zeichen/)).toBeInTheDocument();
  });

  it('setzt zurück', () => {
    const { props } = setup({ value: { pipeline: 'Direkt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Filter zurücksetzen' }));
    expect(props.onApply).toHaveBeenCalledWith(undefined);
  });

  it('bietet Startfilter nur im Bearbeiten an', () => {
    const { rerender, props } = setup({ value: { pipeline: 'Direkt' } });
    expect(screen.queryByRole('button', { name: 'Als Startfilter übernehmen' })).toBeNull();
    rerender(<DashboardFilters {...props} editing />);
    fireEvent.click(screen.getByRole('button', { name: 'Als Startfilter übernehmen' }));
    expect(props.onStartFilters).toHaveBeenCalledWith({ pipeline: 'Direkt' });
    rerender(<DashboardFilters {...props} editing startFilters={{ pipeline: 'Direkt' }} />);
    expect(screen.getByRole('button', { name: 'Als Startfilter übernehmen' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Startfilter entfernen' }));
    expect(props.onStartFilters).toHaveBeenLastCalledWith(undefined);
  });

  it('blendet die Pipeline aus, wenn keine Kachel sie unterstützt, und nennt den Zeitraum-Grund', () => {
    setup({ pipelineSupported: false });
    expect(screen.queryByLabelText('Pipeline')).toBeNull();
    expect(screen.getByText(/Keine Kachel dieser Ansicht unterstützt/)).toBeInTheDocument();
    expect(screen.getByText(/kein belegtes Datumsfeld/)).toBeInTheDocument();
  });

  it('sperrt alles beim Speichern', () => {
    setup({ locked: true, value: { pipeline: 'A' } });
    expect(screen.getByLabelText('Pipeline')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Filter zurücksetzen' })).toBeDisabled();
  });
});

describe('DashboardFilters: Codex-Befunde PR #59', () => {
  it('wendet mit Enter (Formular-Submit) an', () => {
    const { props } = setup();
    fireEvent.change(screen.getByLabelText('Pipeline'), { target: { value: 'Direkt' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Filter' }));
    expect(props.onApply).toHaveBeenCalledWith({ pipeline: 'Direkt' });
  });

  it('wendet mit Enter nichts an, wenn Anwenden gesperrt ist', () => {
    const { props } = setup();
    fireEvent.submit(screen.getByRole('form', { name: 'Filter' }));
    expect(props.onApply).not.toHaveBeenCalled();
  });

  it('leert beim Zurücksetzen auch eine noch nicht angewendete Eingabe', () => {
    setup({ value: undefined });
    const input = screen.getByLabelText('Pipeline');
    fireEvent.change(input, { target: { value: 'Entwurf' } });
    fireEvent.click(screen.getByRole('button', { name: 'Filter zurücksetzen' }));
    expect(input).toHaveValue('');
  });

  it('verknüpft den Längenfehler mit dem Feld und sagt ihn an', () => {
    setup();
    const input = screen.getByLabelText('Pipeline');
    fireEvent.change(input, { target: { value: 'x'.repeat(65) } });
    const alert = screen.getByRole('alert');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain(alert.id);
  });
});

describe('DashboardFilters: verwaister Startfilter', () => {
  it('lässt einen Startfilter entfernen, auch ohne Pipeline-fähige Kachel', () => {
    const { props } = setup({
      pipelineSupported: false,
      editing: true,
      startFilters: { pipeline: 'Alt' },
    });
    expect(screen.queryByLabelText('Pipeline')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Startfilter entfernen' }));
    expect(props.onStartFilters).toHaveBeenCalledWith(undefined);
  });
});

describe('DashboardFilters: Zeitraum', () => {
  const PERIOD = { from: '2026-01-01', to: '2026-03-31' };

  it('behält den Zeitraum, wenn nur die Pipeline angewendet wird', () => {
    const { props } = setup({ value: { period: PERIOD } });
    expect(screen.getByLabelText('Von')).toHaveValue(PERIOD.from);
    expect(screen.getByLabelText('Bis')).toHaveValue(PERIOD.to);
    fireEvent.change(screen.getByLabelText('Pipeline'), { target: { value: 'Direkt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Filter anwenden' }));
    expect(props.onApply).toHaveBeenCalledWith({ pipeline: 'Direkt', period: PERIOD });
  });

  it('wendet einen vollständigen Zeitraum an', () => {
    const { props } = setup();
    fireEvent.change(screen.getByLabelText('Von'), { target: { value: PERIOD.from } });
    fireEvent.change(screen.getByLabelText('Bis'), { target: { value: PERIOD.to } });
    fireEvent.click(screen.getByRole('button', { name: 'Filter anwenden' }));
    expect(props.onApply).toHaveBeenCalledWith({ period: PERIOD });
  });

  it('verlangt beide Grenzen und die richtige Reihenfolge', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Von'), { target: { value: PERIOD.from } });
    expect(screen.getByRole('alert')).toHaveTextContent(/zusammen angeben/);
    expect(screen.getByRole('button', { name: 'Filter anwenden' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Bis'), { target: { value: '2025-12-31' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/nicht nach „Bis“/);
    expect(screen.getByLabelText('Von').getAttribute('aria-describedby')).toContain(
      screen.getByRole('alert').id,
    );
  });

  it('vergleicht Startfilter über beide Filterarten', () => {
    setup({ editing: true, value: { period: PERIOD }, startFilters: { period: PERIOD } });
    expect(screen.getByRole('button', { name: 'Als Startfilter übernehmen' })).toBeDisabled();
  });
});
