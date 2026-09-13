import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreamingAreaChart } from '../StreamingAreaChart';
import * as liveKpiHistoryHook from '@/hooks/useLiveKpiHistory';

vi.mock('@/hooks/useLiveKpiHistory');

describe('StreamingAreaChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(liveKpiHistoryHook.useLiveKpiHistory).mockReturnValue({
      history: [],
      status: 'loading',
      error: null,
    });

    render(<StreamingAreaChart />);
    expect(screen.getByText('Live ARR Verlauf (30 Min)')).toBeInTheDocument();
    expect(screen.getAllByText('Lade Live-ARR-Historie...')[0]).toBeInTheDocument();
  });

  it('renders unconfigured state message', () => {
    vi.mocked(liveKpiHistoryHook.useLiveKpiHistory).mockReturnValue({
      history: [],
      status: 'unconfigured',
      error: null,
    });

    render(<StreamingAreaChart />);
    expect(
      screen.getAllByText('Supabase nicht konfiguriert – keine Live-ARR-Historie verfügbar.')[0]
    ).toBeInTheDocument();
  });

  it('renders offline state message', () => {
    vi.mocked(liveKpiHistoryHook.useLiveKpiHistory).mockReturnValue({
      history: [],
      status: 'offline',
      error: null,
    });

    render(<StreamingAreaChart />);
    expect(
      screen.getAllByText('Warte auf Live-Feed (Offline) – keine aktuellen Ereignisse.')[0]
    ).toBeInTheDocument();
  });

  it('renders error state message', () => {
    vi.mocked(liveKpiHistoryHook.useLiveKpiHistory).mockReturnValue({
      history: [],
      status: 'error',
      error: new Error('Netzwerkabbruch'),
    });

    render(<StreamingAreaChart />);
    expect(
      screen.getAllByText(/Verbindungsfehler beim Abruf der Historie: Netzwerkabbruch/)[0]
    ).toBeInTheDocument();
  });

  it('renders empty history message when status is live but history is empty', () => {
    vi.mocked(liveKpiHistoryHook.useLiveKpiHistory).mockReturnValue({
      history: [],
      status: 'live',
      error: null,
    });

    render(<StreamingAreaChart />);
    expect(
      screen.getAllByText('Noch keine ARR-Ereignisse im 30-Minuten-Fenster erfasst.')[0]
    ).toBeInTheDocument();
  });

  it('renders chart data points when valid history exists', () => {
    const now = Date.now();
    const iso1 = new Date(now - 60000).toISOString();
    const iso2 = new Date(now - 30000).toISOString();
    vi.mocked(liveKpiHistoryHook.useLiveKpiHistory).mockReturnValue({
      history: [
        {
          id: '1',
          kpiId: 'arr',
          value: 1200000,
          occurredAt: iso1,
          qualityStatus: 'valid',
          sourceSystem: 'n8n',
          unit: 'EUR',
          ingestedAt: iso1,
        },
        {
          id: '2',
          kpiId: 'arr',
          value: 1220000,
          occurredAt: iso2,
          qualityStatus: 'valid',
          sourceSystem: 'n8n',
          unit: 'EUR',
          ingestedAt: iso2,
        },
      ],
      status: 'live',
      error: null,
    });

    render(<StreamingAreaChart />);
    expect(screen.getByText('2 Punkte aktiv')).toBeInTheDocument();
    expect(screen.getByText(/1\.220\.000/)).toBeInTheDocument();
  });
});
