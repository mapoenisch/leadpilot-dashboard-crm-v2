import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessibleChartSummary, ChartBarList } from '../AccessibleChartSummary';
import { DataState } from '../DataState';

describe('AccessibleChartSummary (characterization)', () => {
  it('rendert Titel, Zusammenfassung und Kinder', () => {
    render(
      <AccessibleChartSummary title="Umsatztrend" summary="Stetig steigend über vier Quartale.">
        <div>Kindinhalt</div>
      </AccessibleChartSummary>,
    );
    expect(screen.getByTestId('chart-summary')).toBeInTheDocument();
    expect(screen.getByText('Umsatztrend')).toBeInTheDocument();
    expect(screen.getByText('Stetig steigend über vier Quartale.')).toBeInTheDocument();
    expect(screen.getByText('Kindinhalt')).toBeInTheDocument();
  });

  it('ChartBarList rendert Einträge als Liste mit Werten', () => {
    render(
      <ChartBarList
        items={[
          { label: 'Q1', value: 100, display: '100 T€' },
          { label: 'Q2', value: 150, display: '150 T€' },
        ]}
      />,
    );
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getAllByText('100 T€').length).toBeGreaterThan(0);
    expect(screen.getAllByText('150 T€').length).toBeGreaterThan(0);
  });

  it('ChartBarList ohne Einträge rendert leere Liste', () => {
    const { container } = render(<ChartBarList items={[]} />);
    expect(container.querySelector('ul')).not.toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });
});

describe('DataState (characterization)', () => {
  it('loading zeigt Status mit Standard- und eigenem Text', () => {
    const { rerender } = render(<DataState status="loading">Inhalt</DataState>);
    expect(screen.getByRole('status')).toHaveTextContent('Daten werden geladen …');
    rerender(
      <DataState status="loading" loadingText="Bitte warten">
        Inhalt
      </DataState>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Bitte warten');
    expect(screen.queryByText('Inhalt')).toBeNull();
  });

  it('empty zeigt Hinweis ohne Kinder', () => {
    render(
      <DataState status="empty" emptyText="Nichts da">
        Inhalt
      </DataState>,
    );
    expect(screen.getByText('Nichts da')).toBeInTheDocument();
    expect(screen.queryByText('Inhalt')).toBeNull();
  });

  it('error zeigt Alarm mit Retry-Button und ruft onRetry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <DataState status="error" errorText="Kaputt" onRetry={onRetry}>
        Inhalt
      </DataState>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Kaputt');
    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('ready rendert Kinder', () => {
    render(<DataState status="ready">Fertiger Inhalt</DataState>);
    expect(screen.getByText('Fertiger Inhalt')).toBeInTheDocument();
  });
});
