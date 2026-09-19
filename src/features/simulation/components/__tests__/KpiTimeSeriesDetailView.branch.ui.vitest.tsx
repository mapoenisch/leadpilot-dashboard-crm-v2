import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KpiTimeSeriesDetailView } from '../KpiTimeSeriesDetailView';
import { useSimulationStore } from '@/store/simulationStore';
import type { SimulationRun } from '../../../../types/scenario';

function completedRun(runId: string, liveARR: number): SimulationRun {
  return {
    runId,
    scenarioId: 'sc-1',
    scenarioVersionId: 'v-1',
    seed: 7,
    rngState: 7,
    modelVersion: 'v1',
    schemaVersion: '1',
    baselineVersion: 'baseline-2026',
    status: 'COMPLETED',
    startedAt: new Date().toISOString(),
    manifest: {
      runId,
      scenarioId: 'sc-1',
      scenarioVersionId: 'v-1',
      seed: 7,
      initialRngState: 7,
      modelVersion: 'v1',
      schemaVersion: '1',
      baselineVersion: 'baseline-2026',
      baselineId: 'b1',
      baselineHash: 'h1',
      organizationId: 'org-1',
      createdAt: new Date().toISOString(),
      simulationStartDate: '2026-01-01',
      targetTicks: 30,
      parameters: {},
      correlationId: 'c1',
    },
    finalMetrics: {
      liveARR,
      liveMRR: 35000,
      liveCustomers: 70,
      liveWonDeals: 10,
      financialMetrics: { ebitda: 10000, netRevenue: 420000, netCashFlow: 5000 },
    },
    timeSeries: [0, 1, 2].map((t) => ({
      tick: t,
      dayIndex: t,
      simulatedDate: `01.0${t + 1}.26`,
      metrics: { arr: 411840 + t * 1000, mrr: 34320, customers: 66, wonDeals: t },
    })),
    correlationId: 'c1',
  } as unknown as SimulationRun;
}

function seedEvents() {
  useSimulationStore.setState({
    events: [
      {
        id: 'e1',
        tick: 1,
        type: 'DEAL_WON',
        title: 'Deal gewonnen',
        details: 'd1',
        timestamp: 't',
      },
      {
        id: 'e2',
        tick: 2,
        type: 'QUALIFIED_HOT',
        title: 'Hot qualifiziert',
        details: 'd2',
        timestamp: 't',
      },
      {
        id: 'e3',
        tick: 3,
        type: 'CUSTOMER_CHURNED',
        title: 'Kunde verloren',
        details: 'd3',
        timestamp: 't',
      },
      { id: 'e4', tick: 4, type: 'NEW_LEAD', title: 'Neuer Lead', details: 'd4', timestamp: 't' },
    ] as never,
  });
}

describe('KpiTimeSeriesDetailView (branch)', () => {
  beforeEach(() => {
    useSimulationStore.setState({ runs: [], events: [] });
  });

  it('alle KPI-Tabs durchschalten: Headline und Treiber je Kennzahl', async () => {
    const user = userEvent.setup();
    render(<KpiTimeSeriesDetailView />);
    const tabs: Array<[string, RegExp, RegExp]> = [
      [
        'MRR (Monatlich wiederkehrend)',
        /MRR \(Monatlich wiederkehrend\) · Detailanalyse/,
        /Vertriebs-Kapazität/,
      ],
      ['Aktive Kunden', /Aktive Kunden · Detailanalyse/, /Neukunden-Zuwachs/],
      ['Gewonnene Deals', /Gewonnene Deals · Detailanalyse/, /Umsatzerlöse/],
      [
        'EBITDA (Operatives Ergebnis)',
        /EBITDA \(Operatives Ergebnis\) · Detailanalyse/,
        /Umsatzerlöse/,
      ],
      ['Nettoumsatz (Net Revenue)', /Nettoumsatz \(Net Revenue\) · Detailanalyse/, /Umsatzerlöse/],
      ['Netto-Cashflow', /Netto-Cashflow · Detailanalyse/, /Umsatzerlöse/],
    ];
    for (const [tab, headline, driver] of tabs) {
      await user.click(screen.getByRole('button', { name: tab }));
      expect(screen.getByText(headline)).toBeInTheDocument();
      expect(screen.getByText(driver)).toBeInTheDocument();
    }
    await user.click(screen.getByRole('button', { name: 'ARR (Jährlich wiederkehrend)' }));
    expect(screen.getByText(/ARR \(Jährlich wiederkehrend\) · Detailanalyse/)).toBeInTheDocument();
  });

  it('Prozent-Modus und Histogramm-Rahmen ohne Runs', async () => {
    const user = userEvent.setup();
    render(<KpiTimeSeriesDetailView />);
    expect(screen.getByText(/Aussagekraft eingeschränkt \(0 Runs\)/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Prozentual (%)' }));
    expect(screen.getByText('Darstellungsmodus:')).toBeInTheDocument();
    expect(screen.getByText('Monte-Carlo Häufigkeitsverteilung (Histogramm)')).toBeInTheDocument();
  });

  it('drei Runs: hohe Aussagekraft, Overlay-Limit 5 und Deselektion', async () => {
    const user = userEvent.setup();
    const runs = Array.from({ length: 6 }, (_, i) =>
      completedRun(`run-${i + 1}`, 450000 + i * 1000),
    );
    useSimulationStore.setState({ runs });
    render(<KpiTimeSeriesDetailView />);
    expect(screen.getByText(/Statistische Aussagekraft: Hoch \(6 Runs\)/)).toBeInTheDocument();

    for (let i = 1; i <= 6; i++) {
      await user.click(screen.getByRole('button', { name: new RegExp(`Run #${i} `) }));
    }
    // striktes Limit: sechster Klick wird ignoriert
    expect(screen.getByText('5 / 5 ausgewählt')).toBeInTheDocument();
    // Deselektion eines gewählten Runs
    await user.click(screen.getByRole('button', { name: /Run #1 / }));
    expect(screen.getByText('4 / 5 ausgewählt')).toBeInTheDocument();
  });

  it('Event-Filter je KPI: Sales-, Churn- und Standard-Zweig', async () => {
    const user = userEvent.setup();
    seedEvents();
    render(<KpiTimeSeriesDetailView />);
    // liveARR: DEAL_WON + QUALIFIED_HOT
    expect(screen.getByText('Deal gewonnen')).toBeInTheDocument();
    expect(screen.getByText('Hot qualifiziert')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Aktive Kunden' }));
    // liveCustomers: DEAL_WON + CUSTOMER_CHURNED
    expect(screen.getByText('Kunde verloren')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'EBITDA (Operatives Ergebnis)' }));
    // else-Zweig: DEAL_WON + NEW_LEAD
    expect(screen.getByText('Neuer Lead')).toBeInTheDocument();
  });

  it('ohne Events: Leerstands-Hinweis der Treiber-Sektion', () => {
    render(<KpiTimeSeriesDetailView />);
    expect(
      screen.getByText(
        'Keine relevanten Ereignisse für diese Kennzahl im aktuellen Verlauf protokolliert.',
      ),
    ).toBeInTheDocument();
  });
});
