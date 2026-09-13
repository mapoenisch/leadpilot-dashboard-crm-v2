import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PipelineSnapshot } from '../PipelineSnapshot';
import * as pipelineHook from '@/hooks/queries/usePipelineOverview';

vi.mock('@/hooks/queries/usePipelineOverview');

describe('PipelineSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(pipelineHook.usePipelineOverview).mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    render(<PipelineSnapshot />);
    expect(screen.getByText('Lade Pipeline-Daten aus CRM-Baseline...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    vi.mocked(pipelineHook.usePipelineOverview).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('Datenbank-Fehler'),
    } as any);

    render(<PipelineSnapshot />);
    expect(
      screen.getByText('Integritätsfehler: Datenbank-Fehler')
    ).toBeInTheDocument();
  });

  it('renders empty state when no deals or stages exist', () => {
    vi.mocked(pipelineHook.usePipelineOverview).mockReturnValue({
      data: { totalDeals: 0, totalVolume: 0, stages: [] },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<PipelineSnapshot />);
    expect(
      screen.getByText('Keine aktiven Deals in der CRM-Pipeline erfasst')
    ).toBeInTheDocument();
  });

  it('renders active pipeline data with total volume and stages', () => {
    vi.mocked(pipelineHook.usePipelineOverview).mockReturnValue({
      data: {
        totalDeals: 15,
        totalVolume: 450000,
        weightedVolume: 225000,
        avgDealSize: 30000,
        stages: [
          {
            stage: 'Lead In',
            dealsCount: 8,
            volume: 200000,
            probability: 0.2,
            weightedVolume: 40000,
          },
          {
            stage: 'Verhandlung',
            dealsCount: 7,
            volume: 250000,
            probability: 0.7,
            weightedVolume: 175000,
          },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<PipelineSnapshot />);
    expect(screen.getByTestId('pipeline-snapshot')).toBeInTheDocument();
    expect(screen.getByText('Gesamt-Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Lead In')).toBeInTheDocument();
    expect(screen.getByText('Verhandlung')).toBeInTheDocument();
  });
});
