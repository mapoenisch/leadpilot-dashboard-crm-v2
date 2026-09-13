import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChartFrame } from '../ChartFrame';
import { ChartInsight } from '../ChartInsight';
import { ChartEmptyState } from '../ChartEmptyState';
import { ChartMetricHeader } from '../ChartMetricHeader';
import { ChartTooltip } from '../ChartTooltip';
import { ManagementChartState } from '../ManagementChartState';
import { ManagementChartTooltip } from '../ManagementChartTooltip';
import { formatManagementMetric } from '../managementChartTheme';

describe('Chart Helpers & Subcomponents', () => {
  describe('ChartFrame', () => {
    it('renders frame with title, subtitle, sourceLabel and children', () => {
      render(
        <ChartFrame
          title="Rahmen-Titel"
          subtitle="Rahmen-Untertitel"
          sourceLabel="Quelle Live"
          insight={<span>Wichtiger Einblick</span>}
        >
          <div data-testid="chart-child">Diagramm-Inhalt</div>
        </ChartFrame>
      );

      expect(screen.getByRole('heading', { name: 'Rahmen-Titel' })).toBeInTheDocument();
      expect(screen.getByText('Rahmen-Untertitel')).toBeInTheDocument();
      expect(screen.getByText('Quelle Live')).toBeInTheDocument();
      expect(screen.getByText('Wichtiger Einblick')).toBeInTheDocument();
      expect(screen.getByTestId('chart-child')).toBeInTheDocument();
    });
  });

  describe('ChartInsight', () => {
    it('renders positive, warning and neutral insights', () => {
      const { rerender } = render(
        <ChartInsight type="positive" title="Trend">
          Positiver Trend
        </ChartInsight>
      );
      expect(screen.getByText('Trend:')).toBeInTheDocument();
      expect(screen.getByText('Positiver Trend')).toBeInTheDocument();

      rerender(
        <ChartInsight type="warning" title="Risiko">
          Erhöhtes Churn-Risiko
        </ChartInsight>
      );
      expect(screen.getByText('Risiko:')).toBeInTheDocument();
      expect(screen.getByText('Erhöhtes Churn-Risiko')).toBeInTheDocument();
    });
  });

  describe('ChartEmptyState', () => {
    it('renders title, message and requirement', () => {
      render(
        <ChartEmptyState
          title="Keine Daten"
          message="Bitte mindestens 5 Einträge erfassen"
          requirement="Aktuell: 2 von 5"
        />
      );

      expect(screen.getByText('Keine Daten')).toBeInTheDocument();
      expect(screen.getByText('Bitte mindestens 5 Einträge erfassen')).toBeInTheDocument();
      expect(screen.getByText('Aktuell: 2 von 5')).toBeInTheDocument();
    });
  });

  describe('ChartMetricHeader', () => {
    it('renders metric header with value, baseline and delta', () => {
      render(
        <ChartMetricHeader
          label="Conversion Rate"
          value="4,5"
          unit="%"
          baselineValue="3,2"
          deltaPercent={40.6}
          isPositiveChange={true}
        />
      );

      expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
      expect(screen.getByText('4,5')).toBeInTheDocument();
      expect(screen.getByText('%')).toBeInTheDocument();
      expect(screen.getByText(/3,2/)).toBeInTheDocument();
    });
  });

  describe('ChartTooltip', () => {
    it('returns null when not visible or items are empty', () => {
      const { container } = render(<ChartTooltip items={[]} visible={false} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders tooltip items with title and values', () => {
      render(
        <ChartTooltip
          title="Tooltip Titel"
          items={[
            { label: 'Umsatz', value: '100.000 €', color: '#00D9C6' },
            { label: 'Kosten', value: '80.000 €', color: '#FF7A3D' },
          ]}
          visible={true}
        />
      );

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByText('Tooltip Titel')).toBeInTheDocument();
      expect(screen.getByText('Umsatz')).toBeInTheDocument();
      expect(screen.getByText('100.000 €')).toBeInTheDocument();
    });
  });

  describe('ManagementChartState', () => {
    it('renders error state and loading state', () => {
      const { rerender } = render(
        <ManagementChartState
          type="error"
          message="Server nicht erreichbar"
          sourceLabel="Ebene A"
        />
      );

      expect(screen.getByTestId('management-chart-error')).toBeInTheDocument();
      expect(screen.getByText('Server nicht erreichbar')).toBeInTheDocument();

      rerender(
        <ManagementChartState
          type="loading"
          message="Lade Daten..."
          sourceLabel="Ebene A"
        />
      );
      expect(screen.getByTestId('management-chart-loading')).toBeInTheDocument();
      expect(screen.getByText('Lade Daten...')).toBeInTheDocument();
    });
  });

  describe('ManagementChartTooltip', () => {
    it('returns null when active is false or payload empty', () => {
      const { container } = render(<ManagementChartTooltip active={false} payload={[]} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders active tooltip with formatted metrics', () => {
      render(
        <ManagementChartTooltip
          active={true}
          label="Januar 2025"
          sourceLabel="Ebene A Baseline"
          payload={[
            { name: 'ARR', value: 411840, color: '#00D9C6', dataKey: 'arr' },
          ]}
        />
      );

      expect(screen.getByText('Januar 2025')).toBeInTheDocument();
      expect(screen.getByText('Ebene A Baseline')).toBeInTheDocument();
      expect(screen.getByText('ARR')).toBeInTheDocument();
      expect(screen.getByText('412 k€')).toBeInTheDocument();
    });
  });

  describe('formatManagementMetric', () => {
    it('formats millions, thousands, normal values, and NaN', () => {
      expect(formatManagementMetric(1500000)).toBe('1,5 Mio. €');
      expect(formatManagementMetric(450000)).toBe('450 k€');
      expect(formatManagementMetric(250)).toBe('250 €');
      expect(formatManagementMetric(NaN)).toBe('—');
    });
  });
});
