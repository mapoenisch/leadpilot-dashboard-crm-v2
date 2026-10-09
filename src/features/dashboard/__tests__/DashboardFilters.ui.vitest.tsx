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
    expect(
      screen.getByText(/Zeitraumfilter für diese Daten derzeit nicht verfügbar/),
    ).toBeInTheDocument();
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

describe('DashboardFilters: Zeitraum (Auftrag 086, ohne Wirkung ausgeblendet)', () => {
  const PERIOD = { from: '2026-01-01', to: '2026-03-31' };

  it('zeigt keine Von-/Bis-Felder', () => {
    setup();
    expect(screen.queryByLabelText('Von')).toBeNull();
    expect(screen.queryByLabelText('Bis')).toBeNull();
  });

  it('behält einen gespeicherten Zeitraum verlustfrei, wenn nur die Pipeline angewendet wird', () => {
    const { props } = setup({ value: { period: PERIOD } });
    expect(
      screen.getByText(/Gespeicherter Zeitraum .* bleibt erhalten, wirkt aber nicht/),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Pipeline'), { target: { value: 'Direkt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Filter anwenden' }));
    expect(props.onApply).toHaveBeenCalledWith({ pipeline: 'Direkt', period: PERIOD });
  });

  it('nennt einen gespeicherten Startzeitraum auch ohne Sitzungsfilter', () => {
    setup({ editing: true, startFilters: { period: PERIOD } });
    expect(screen.getByText(/Gespeicherter Zeitraum/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Startfilter entfernen' })).toBeEnabled();
  });

  it('vergleicht Startfilter über beide Filterarten', () => {
    setup({ editing: true, value: { period: PERIOD }, startFilters: { period: PERIOD } });
    expect(screen.getByRole('button', { name: 'Als Startfilter übernehmen' })).toBeDisabled();
  });
});

describe('DashboardFilters: mobiler Filterknopf (Auftrag 086)', () => {
  it('ist zunächst zu und klappt ohne Anwenden auf und zu', () => {
    const { props } = setup();
    const toggle = screen.getByTestId('dashboard-filters-toggle');
    const form = screen.getByTestId('dashboard-filters');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(form.className).toMatch(/(^| )hidden( |$)/);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(form.className).not.toMatch(/(^| )hidden( |$)/);
    fireEvent.change(screen.getByLabelText('Pipeline'), { target: { value: 'Entwurf' } });
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Pipeline')).toHaveValue('Entwurf');
    expect(props.onApply).not.toHaveBeenCalled();
  });

  it('nennt nur angewendete, wirksame Filter', () => {
    const { rerender, props } = setup({ value: { pipeline: 'Direkt' } });
    expect(screen.getByTestId('dashboard-filters-toggle')).toHaveTextContent('Filter: 1 aktiv');
    rerender(
      <DashboardFilters {...props} value={{ period: { from: '2026-01-01', to: '2026-02-01' } }} />,
    );
    expect(screen.getByTestId('dashboard-filters-toggle')).toHaveTextContent(/^Filter$/);
    rerender(
      <DashboardFilters {...props} value={{ pipeline: 'Direkt' }} pipelineSupported={false} />,
    );
    expect(screen.getByTestId('dashboard-filters-toggle')).toHaveTextContent(/^Filter$/);
  });

  it('erklärt das exakte Pipeline-Verhalten', () => {
    setup();
    expect(screen.getByText(/genau so heißt/)).toBeInTheDocument();
  });
});

describe('DashboardFilters: ausgeblendetes Pipeline-Feld', () => {
  it('ignoriert einen Pipeline-Entwurf, sobald keine Kachel sie mehr unterstützt', () => {
    const { rerender, props } = setup();
    fireEvent.change(screen.getByLabelText('Pipeline'), { target: { value: 'Direkt' } });
    rerender(<DashboardFilters {...props} pipelineSupported={false} />);
    expect(screen.getByRole('button', { name: 'Filter anwenden' })).toBeDisabled();
  });

  it('zeigt für ein ausgeblendetes Feld keinen Fehler', () => {
    const { rerender, props } = setup();
    fireEvent.change(screen.getByLabelText('Pipeline'), { target: { value: 'x'.repeat(65) } });
    rerender(<DashboardFilters {...props} pipelineSupported={false} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('DashboardFilters: Gesamtabnahme Auftrag 079', () => {
  // Während des Ladens baut die Ansicht den Filterbereich aus der Standardansicht (mit
  // Pipeline-Feld). Hat die gespeicherte Ansicht keine CRM-Kachel, ersetzt der Hinweis das Feld.
  // Belegt er einen anderen Platz, bricht die Zeile bei 768 px um und das Raster springt
  // (gemessen CLS 0,28). Feld und Hinweis teilen deshalb denselben Platz in der Zeile.
  it('Hinweis ohne Pipeline belegt denselben Platz wie das Pipeline-Feld', () => {
    const slotOf = (supported: boolean) => {
      const { container, unmount } = setup({ pipelineSupported: supported });
      const slot = container.querySelector('form')?.firstElementChild;
      const classes = slot?.className ?? '';
      unmount();
      return classes;
    };
    expect(slotOf(false)).toBe(slotOf(true));
  });
});
