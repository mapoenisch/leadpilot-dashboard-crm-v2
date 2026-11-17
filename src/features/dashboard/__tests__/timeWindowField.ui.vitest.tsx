// Auftrag 161 (P10b-2): UI-Tests für TimeWindowField im Inspector.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TimeWindowField, type TimeWindowConfig } from '../components/editor/inspector/TimeWindowField';
import { getCatalogEntry, type ActiveCatalogEntry } from '../model/dashboardCatalog';

const crmEntry = getCatalogEntry('crm.phaseneintritte_verlauf') as ActiveCatalogEntry;
const liveEntry = getCatalogEntry('live.arr.verlauf') as ActiveCatalogEntry;

describe('TimeWindowField', () => {
  it('rendert Standard-Label und Presets für CRM-Kennzahlen', () => {
    const onChange = vi.fn();
    render(
      <TimeWindowField
        catalogEntry={crmEntry}
        currentWindow={undefined}
        onChangeWindow={onChange}
      />,
    );

    const select = screen.getByTestId('inspector-window-preset-select');
    expect(select).toBeInTheDocument();
    expect(screen.getByText(/Standard \(12 Wochen\)/i)).toBeInTheDocument();
  });

  it('wechselt Preset und ruft onChangeWindow auf', () => {
    const onChange = vi.fn();
    render(
      <TimeWindowField
        catalogEntry={crmEntry}
        currentWindow={undefined}
        onChangeWindow={onChange}
      />,
    );

    const select = screen.getByTestId('inspector-window-preset-select');
    fireEvent.change(select, { target: { value: '26_wochen' } });

    expect(onChange).toHaveBeenCalledWith({ count: 26, resolution: 'woche' });

    // Zurück zu Standard
    fireEvent.change(select, { target: { value: 'standard' } });
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('erlaubt benutzerdefiniertes Fenster mit Validierung', () => {
    const onChange = vi.fn();
    render(
      <TimeWindowField
        catalogEntry={crmEntry}
        currentWindow={{ count: 10, resolution: 'tag' }}
        onChangeWindow={onChange}
      />,
    );

    const countInput = screen.getByTestId('inspector-window-custom-count');
    const resSelect = screen.getByTestId('inspector-window-custom-resolution');

    // Valide Änderung
    fireEvent.change(countInput, { target: { value: '45' } });
    expect(onChange).toHaveBeenCalledWith({ count: 45, resolution: 'tag' });

    // Auflösungswechsel
    fireEvent.change(resSelect, { target: { value: 'monat' } });
    expect(onChange).toHaveBeenCalledWith({ count: 45, resolution: 'monat' });

    // Obergrenzen-Überschreitung für Monat (max. 120)
    fireEvent.change(countInput, { target: { value: '150' } });
    expect(screen.getByTestId('inspector-window-error')).toHaveTextContent(/Maximal 120 Monate/i);

    // Negative Zahl oder 0
    fireEvent.change(countInput, { target: { value: '0' } });
    expect(screen.getByTestId('inspector-window-error')).toHaveTextContent(/mindestens 1/i);

    // Dezimalzahl wie 1.5
    fireEvent.change(countInput, { target: { value: '1.5' } });
    expect(screen.getByTestId('inspector-window-error')).toHaveTextContent(/mindestens 1/i);

    // Exponentialschreibweise wie 1e2
    fireEvent.change(countInput, { target: { value: '1e2' } });
    expect(screen.getByTestId('inspector-window-error')).toHaveTextContent(/mindestens 1/i);
  });

  it('prüft Obergrenzen für Live-Kennzahlen (max 90 Tage, max 168 Stunden)', () => {
    const onChange = vi.fn();
    render(
      <TimeWindowField
        catalogEntry={liveEntry}
        currentWindow={{ count: 6, resolution: 'stunde' }}
        onChangeWindow={onChange}
      />,
    );
    const select = screen.getByTestId('inspector-window-preset-select');
    fireEvent.change(select, { target: { value: 'custom' } });

    const countInput = screen.getByTestId('inspector-window-custom-count');

    fireEvent.change(countInput, { target: { value: '200' } });
    expect(screen.getByTestId('inspector-window-error')).toHaveTextContent(/Maximal 168 Stunden/i);
  });

  it('synchronisiert den internen Zustand bei Wechsel der Kachel oder von currentWindow', () => {
    const { rerender } = render(
      <TimeWindowField
        catalogEntry={crmEntry}
        currentWindow={{ count: 12, resolution: 'woche' }}
        onChangeWindow={() => {}}
      />,
    );

    const select = screen.getByTestId('inspector-window-preset-select') as HTMLSelectElement;
    expect(select.value).toBe('12_wochen');

    // Kachelwechsel oder Undo auf ein anderes Fenster (z. B. custom 5 Wochen)
    rerender(
      <TimeWindowField
        catalogEntry={crmEntry}
        currentWindow={{ count: 5, resolution: 'woche' }}
        onChangeWindow={() => {}}
      />,
    );
    expect(select.value).toBe('custom');
    expect((screen.getByTestId('inspector-window-custom-count') as HTMLInputElement).value).toBe('5');

    // Wechsel auf eine Live-Kachel ohne gesetztes Fenster (Standard)
    rerender(
      <TimeWindowField
        catalogEntry={liveEntry}
        currentWindow={undefined}
        onChangeWindow={() => {}}
      />,
    );
    expect(select.value).toBe('standard');
    expect(screen.queryByTestId('inspector-window-custom-count')).not.toBeInTheDocument();
  });

  it('behält den benutzerdefinierten Modus bei, auch wenn die Werte einem Preset entsprechen', () => {
    let current: TimeWindowConfig | undefined = { count: 12, resolution: 'woche' };
    const { rerender } = render(
      <TimeWindowField
        catalogEntry={crmEntry}
        currentWindow={current}
        onChangeWindow={(next) => {
          current = next;
        }}
      />,
    );

    const select = screen.getByTestId('inspector-window-preset-select') as HTMLSelectElement;
    expect(select.value).toBe('12_wochen');

    // Wähle "Eigenes Fenster…"
    fireEvent.change(select, { target: { value: 'custom' } });
    expect(select.value).toBe('custom');
    expect(screen.getByTestId('inspector-window-custom-count')).toBeInTheDocument();

    // Re-render mit dem übernommenen Fenster (das count: 12, resolution: 'woche' entspricht)
    rerender(
      <TimeWindowField
        catalogEntry={crmEntry}
        currentWindow={current}
        onChangeWindow={(next) => {
          current = next;
        }}
      />,
    );
    // Soll weiterhin im custom-Modus bleiben und Eingabefelder nicht einklappen
    expect(select.value).toBe('custom');
    expect(screen.getByTestId('inspector-window-custom-count')).toBeInTheDocument();
  });
});
