import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WhatIfCockpit } from '../WhatIfCockpit';

describe('WhatIfCockpit UI Tests', () => {
  it('rendert Cockpit mit allen 4 Hebeln, Presets, KPI-Karten und Diagrammen', () => {
    render(<WhatIfCockpit />);

    // Überschrift und Beschreibung
    expect(screen.getByText('„What-If“-Hebelrechner')).toBeInTheDocument();
    expect(screen.getByTestId('what-if-cockpit')).toBeInTheDocument();

    // Presets
    expect(screen.getByTestId('preset-btn-growth')).toBeInTheDocument();
    expect(screen.getByTestId('preset-btn-efficiency')).toBeInTheDocument();
    expect(screen.getByTestId('preset-btn-stress')).toBeInTheDocument();
    expect(screen.getByTestId('preset-btn-baseline')).toBeInTheDocument();

    // 4 Schieberegler
    expect(screen.getByLabelText('Monatlicher Churn in Prozent')).toBeInTheDocument();
    expect(screen.getByLabelText('Sales Cycle in Tagen')).toBeInTheDocument();
    expect(screen.getByLabelText('Marketing-Budget pro Jahr in Euro')).toBeInTheDocument();
    expect(screen.getByLabelText('Win-Rate in Prozent')).toBeInTheDocument();

    // 4 KPI-Karten
    expect(screen.getByTestId('card-target-arr')).toBeInTheDocument();
    expect(screen.getByTestId('card-net-arr')).toBeInTheDocument();
    expect(screen.getByTestId('card-customers')).toBeInTheDocument();
    expect(screen.getByTestId('card-cac-payback')).toBeInTheDocument();

    // Diagramme
    expect(screen.getByTestId('what-if-projection-chart')).toBeInTheDocument();
    expect(screen.getByTestId('what-if-tornado-chart')).toBeInTheDocument();
  });

  it('zeigt initial die Baseline-Werte an', () => {
    render(<WhatIfCockpit />);

    expect(screen.getByTestId('val-churn')).toHaveTextContent('2,8 %');
    expect(screen.getByTestId('val-cycle')).toHaveTextContent('38 Tage');
    expect(screen.getByTestId('val-budget')).toHaveTextContent('65.000 €');
    expect(screen.getByTestId('val-winrate')).toHaveTextContent('12 %');

    // Reset-Button ist bei Baseline deaktiviert
    const resetBtn = screen.getByRole('button', { name: /auf baseline zurücksetzen/i });
    expect(resetBtn).toBeDisabled();
  });

  it('schaltet Presets um und aktualisiert Werte sowie Ziel-ARR', () => {
    render(<WhatIfCockpit />);

    // Klick auf Wachstums-Offensive
    const growthBtn = screen.getByTestId('preset-btn-growth');
    fireEvent.click(growthBtn);

    expect(screen.getByTestId('val-budget')).toHaveTextContent('105.000 €');
    expect(screen.getByTestId('val-winrate')).toHaveTextContent('15 %');

    // Reset-Button ist jetzt aktiv
    const resetBtn = screen.getByRole('button', { name: /auf baseline zurücksetzen/i });
    expect(resetBtn).not.toBeDisabled();

    // Klick auf Zurücksetzen
    fireEvent.click(resetBtn);
    expect(screen.getByTestId('val-budget')).toHaveTextContent('65.000 €');
    expect(screen.getByTestId('val-winrate')).toHaveTextContent('12 %');
    expect(resetBtn).toBeDisabled();
  });

  it('erlaubt manuelle Slider-Steuerung und aktiviert Reset-Button', () => {
    render(<WhatIfCockpit />);

    const churnSlider = screen.getByLabelText('Monatlicher Churn in Prozent');
    fireEvent.change(churnSlider, { target: { value: '1.5' } });

    expect(screen.getByTestId('val-churn')).toHaveTextContent('1,5 %');

    const resetBtn = screen.getByRole('button', { name: /auf baseline zurücksetzen/i });
    expect(resetBtn).not.toBeDisabled();

    fireEvent.click(resetBtn);
    expect(screen.getByTestId('val-churn')).toHaveTextContent('2,8 %');
  });

  it('blendet Wertetabellen in beiden Diagrammen auf Klick ein', () => {
    render(<WhatIfCockpit />);

    // Zunächst keine Tabellen sichtbar
    expect(screen.queryByTestId('what-if-projection-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('what-if-tornado-table')).not.toBeInTheDocument();

    // Toggle-Buttons für Wertetabellen klicken
    const tableButtons = screen.getAllByRole('button', { name: /wertetabelle/i });
    expect(tableButtons.length).toBeGreaterThanOrEqual(2);

    const firstBtn = tableButtons[0];
    const secondBtn = tableButtons[1];
    expect(firstBtn).toBeDefined();
    expect(secondBtn).toBeDefined();

    if (firstBtn) fireEvent.click(firstBtn);
    expect(screen.getByTestId('what-if-projection-table')).toBeInTheDocument();

    if (secondBtn) fireEvent.click(secondBtn);
    expect(screen.getByTestId('what-if-tornado-table')).toBeInTheDocument();

    // Richtungsneutrale Kopfzeilen und genaue Hebel-Richtungen in der Tornado-Wertetabelle
    expect(screen.getByText('Ungünstiger Fall (Downside)')).toBeInTheDocument();
    expect(screen.getByText('Günstiger Fall (Upside)')).toBeInTheDocument();
    expect(screen.getByText(/(\+20 % → 3,4 %)/)).toBeInTheDocument();
  });
});
