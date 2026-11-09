import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FunnelBottleneckAlert } from '../FunnelBottleneckAlert';
import { FunnelBottleneck } from '../../services/funnelAnalyticsService';

// Auftrag 140: Deals ohne serverseitiges Phasendatum werden offen benannt,
// dürfen aber weder als Engpass noch als „alles im Plan" gewertet werden.
afterEach(cleanup);

const engpass: FunnelBottleneck = {
  stageKey: 'angebot-erstellt',
  stageName: 'Angebot erstellt',
  dealCount: 2,
  avgDaysInStage: 35,
  thresholdDays: 30,
  planDays: 14,
  recommendation: 'Engpass identifiziert: 2 Angebote verweilen zu lange.',
};

describe('FunnelBottleneckAlert', () => {
  it('alle_ohne_datum_zeigt_keine_entwarnung', () => {
    render(<FunnelBottleneckAlert bottlenecks={[]} dealsWithoutStageDate={4} showAllClear />);

    expect(
      screen.queryByText(/Alle Deals verweilen innerhalb der geplanten Zykluszeiten/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/4 Deals ohne bekannte Verweildauer \(vor v3\.1 angelegt\)\./),
    ).toBeInTheDocument();
  });

  it('nennt die Anzahl der Deals ohne bekannte Verweildauer bei vorhandenen Engpässen', () => {
    render(<FunnelBottleneckAlert bottlenecks={[engpass]} dealsWithoutStageDate={2} />);

    expect(screen.getByTestId('funnel-bottleneck-alert')).toBeInTheDocument();
    expect(
      screen.getByText(/2 Deals ohne bekannte Verweildauer \(vor v3\.1 angelegt\)\./),
    ).toBeInTheDocument();
  });

  it('zeigt bei 0 Deals ohne Phasendatum keine entsprechende Zeile', () => {
    render(<FunnelBottleneckAlert bottlenecks={[engpass]} dealsWithoutStageDate={0} />);

    expect(screen.getByTestId('funnel-bottleneck-alert')).toBeInTheDocument();
    expect(screen.queryByText(/ohne bekannte Verweildauer/)).not.toBeInTheDocument();
  });

  it('zeigt die All-Clear-Meldung nur bei vollständig bekannten Verweildauern', () => {
    render(<FunnelBottleneckAlert bottlenecks={[]} dealsWithoutStageDate={0} showAllClear />);

    expect(
      screen.getByText(/Alle Deals verweilen innerhalb der geplanten Zykluszeiten/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/ohne bekannte Verweildauer/)).not.toBeInTheDocument();
  });
});
