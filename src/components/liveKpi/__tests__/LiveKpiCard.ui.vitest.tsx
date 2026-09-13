import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveKpiCard } from '../LiveKpiCard';
import * as liveKpiHook from '@/hooks/useLiveKpi';

vi.mock('@/hooks/useLiveKpi');

describe('LiveKpiCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton when status is loading', () => {
    vi.mocked(liveKpiHook.useLiveKpi).mockReturnValue({
      snapshot: null,
      status: 'loading',
      error: null,
      refresh: vi.fn(),
    });

    render(<LiveKpiCard kpiId="arr" title="Annual Recurring Revenue" />);
    expect(screen.getByText('Annual Recurring Revenue')).toBeInTheDocument();
    expect(screen.getByText('Lädt...')).toBeInTheDocument();
    expect(screen.getByText('Lade aktuellen Snapshot...')).toBeInTheDocument();
  });

  it('renders unconfigured state when status is unconfigured', () => {
    vi.mocked(liveKpiHook.useLiveKpi).mockReturnValue({
      snapshot: null,
      status: 'unconfigured',
      error: null,
      refresh: vi.fn(),
    });

    render(<LiveKpiCard kpiId="arr" title="ARR" description="Jahresumsatz" />);
    expect(screen.getByText('ARR')).toBeInTheDocument();
    expect(screen.getByText('Jahresumsatz')).toBeInTheDocument();
    expect(screen.getByText('Offline (Lokal)')).toBeInTheDocument();
    expect(screen.getByText('Supabase nicht konfiguriert')).toBeInTheDocument();
  });

  it('renders offline state when status is offline', () => {
    vi.mocked(liveKpiHook.useLiveKpi).mockReturnValue({
      snapshot: null,
      status: 'offline',
      error: null,
      refresh: vi.fn(),
    });

    render(<LiveKpiCard kpiId="arr" title="ARR" />);
    expect(screen.getByText('Warte auf Feed')).toBeInTheDocument();
  });

  it('renders error state with fallback or custom error message', () => {
    vi.mocked(liveKpiHook.useLiveKpi).mockReturnValue({
      snapshot: null,
      status: 'error',
      error: new Error('Netzwerkabbruch'),
      refresh: vi.fn(),
    });

    render(<LiveKpiCard kpiId="arr" title="ARR" />);
    expect(screen.getByText('Verbindungsfehler')).toBeInTheDocument();
    expect(screen.getByText('Realtime-Verbindung unterbrochen')).toBeInTheDocument();
  });

  it('renders live snapshot value and live badge', () => {
    vi.mocked(liveKpiHook.useLiveKpi).mockReturnValue({
      snapshot: {
        id: '1',
        kpiId: 'arr',
        value: 1200000,
        unit: 'EUR',
        occurredAt: new Date().toISOString(),
        qualityStatus: 'valid',
        sourceSystem: 'n8n',
        ingestedAt: new Date().toISOString(),
      },
      status: 'live',
      error: null,
      refresh: vi.fn(),
    });

    render(
      <LiveKpiCard
        kpiId="arr"
        title="Annual Recurring Revenue"
        description="Jährlich wiederkehrender Ertrag"
        fallbackUnit="€"
      />,
    );

    expect(screen.getByText('Annual Recurring Revenue')).toBeInTheDocument();
    expect(screen.getByText('Jährlich wiederkehrender Ertrag')).toBeInTheDocument();
    expect(screen.getByText('Live Realtime')).toBeInTheDocument();
    expect(screen.getByText(/1\.200\.000/)).toBeInTheDocument();
  });

  it('renders degraded quality badge when snapshot is degraded', () => {
    vi.mocked(liveKpiHook.useLiveKpi).mockReturnValue({
      snapshot: {
        id: '2',
        kpiId: 'arr',
        value: 950000,
        unit: 'EUR',
        occurredAt: new Date().toISOString(),
        qualityStatus: 'degraded',
        sourceSystem: 'fallback',
        ingestedAt: new Date().toISOString(),
      },
      status: 'live',
      error: null,
      refresh: vi.fn(),
    });

    render(<LiveKpiCard kpiId="arr" title="ARR" />);
    expect(screen.getByText('Qualität eingeschränkt (Degraded)')).toBeInTheDocument();
  });
});
