import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveActivityFeed } from '../LiveActivityFeed';
import * as liveKpiActivityHook from '@/hooks/useLiveKpiActivity';

vi.mock('@/hooks/useLiveKpiActivity');

describe('LiveActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [],
      status: 'loading',
    });

    render(<LiveActivityFeed />);
    expect(screen.getByText('Live-Aktivitäten')).toBeInTheDocument();
    expect(screen.getByText('Lade Live-Aktivitäten...')).toBeInTheDocument();
  });

  it('renders unconfigured status message', () => {
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [],
      status: 'unconfigured',
    });

    render(<LiveActivityFeed />);
    expect(
      screen.getByText('Supabase nicht konfiguriert – keine Live-Aktivitäten.')
    ).toBeInTheDocument();
  });

  it('renders offline status message', () => {
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [],
      status: 'offline',
    });

    render(<LiveActivityFeed />);
    expect(
      screen.getByText('Warte auf Live-Feed (Offline)...')
    ).toBeInTheDocument();
  });

  it('renders error status message', () => {
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [],
      status: 'error',
    });

    render(<LiveActivityFeed />);
    expect(
      screen.getByText('Verbindungsfehler – Live-Aktivitäten nicht erreichbar.')
    ).toBeInTheDocument();
  });

  it('renders empty items state when status is live but no items', () => {
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [],
      status: 'live',
    });

    render(<LiveActivityFeed />);
    expect(
      screen.getByText('Noch keine bestätigten Live-Aktivitäten.')
    ).toBeInTheDocument();
  });

  it('renders event items with formatted values', () => {
    const now = new Date().toISOString();
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [
        {
          kpiId: 'arr',
          value: 1250000,
          occurredAt: now,
          qualityStatus: 'valid',
          unit: 'EUR',
        },
        {
          kpiId: 'pipeline_coverage',
          value: 3.45,
          occurredAt: now,
          qualityStatus: 'degraded',
          unit: 'x',
        },
      ],
      status: 'live',
    });

    render(<LiveActivityFeed />);
    expect(screen.getByText('2 Events')).toBeInTheDocument();
    expect(screen.getByText('1.250.000 €')).toBeInTheDocument();
    expect(screen.getByText('3,45x')).toBeInTheDocument();
  });
});
