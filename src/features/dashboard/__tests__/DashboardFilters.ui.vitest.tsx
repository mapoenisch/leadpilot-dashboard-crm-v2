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
    expect(screen.getByText(/Höchstens 64 Zeichen/)).toBeInTheDocument();
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
