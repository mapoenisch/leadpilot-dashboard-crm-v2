import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExecutiveCockpit } from '../ExecutiveCockpit';
import * as pipelineHook from '@/hooks/queries/usePipelineOverview';
import * as liveKpiHook from '@/hooks/useLiveKpi';

vi.mock('@/hooks/queries/usePipelineOverview');
vi.mock('@/hooks/useLiveKpi');

describe('ExecutiveCockpit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(pipelineHook.usePipelineOverview).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof pipelineHook.usePipelineOverview>);
    vi.mocked(liveKpiHook.useLiveKpi).mockReturnValue({
      snapshot: null,
      status: 'loading',
      error: null,
      refresh: vi.fn(),
    });
  });

  it('renders executive cockpit layout and main sections', () => {
    render(<ExecutiveCockpit />);

    expect(screen.getByTestId('executive-cockpit-root')).toBeInTheDocument();
    expect(screen.getByTestId('cockpit-kpi-rail')).toBeInTheDocument();
    expect(screen.getByText('Finanzentwicklung & ARR-Trend')).toBeInTheDocument();
    expect(screen.getByText('MRR-Verteilung nach Paketen')).toBeInTheDocument();
    expect(screen.getByText('Teamstruktur & HR-Snapshot')).toBeInTheDocument();
    expect(screen.getByText('Produkt-Roadmap & Meilensteine')).toBeInTheDocument();
    expect(screen.getByText('Vertriebspipeline Snapshot')).toBeInTheDocument();
  });

  it('renders custom liveKpiCard when passed as prop', () => {
    render(
      <ExecutiveCockpit
        liveKpiCard={<div data-testid="custom-live-card">Custom Live KPI</div>}
      />
    );

    expect(screen.getByTestId('custom-live-card')).toBeInTheDocument();
  });
});
