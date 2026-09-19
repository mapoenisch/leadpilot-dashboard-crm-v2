import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveKpiCard } from '../LiveKpiCard';
import * as liveKpiHook from '@/hooks/useLiveKpi';

vi.mock('@/hooks/useLiveKpi');

function liveSnapshot(over: Record<string, unknown> = {}) {
  return {
    snapshot: {
      id: 'snap-1',
      kpiId: 'arr',
      value: 1200000,
      unit: 'EUR',
      occurredAt: new Date().toISOString(),
      qualityStatus: 'valid',
      sourceSystem: 'n8n',
      ingestedAt: new Date().toISOString(),
      ...over,
    },
    status: 'live',
    error: null,
    refresh: vi.fn(),
  };
}

describe('LiveKpiCard (branch2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('relative Zeit: gerade eben bei frischem Snapshot', () => {
    vi.mocked(liveKpiHook.useLiveKpi).mockReturnValue(liveSnapshot() as never);
    render(<LiveKpiCard kpiId="arr" title="ARR" />);
    expect(screen.getByText('Aktualisiert: gerade eben')).toBeInTheDocument();
    expect(screen.getByText('Quelle: n8n')).toBeInTheDocument();
  });

  it('relative Zeit: vor Sekunden und Minuten', () => {
    vi.mocked(liveKpiHook.useLiveKpi).mockReturnValue(
      liveSnapshot({ occurredAt: new Date(Date.now() - 30_000).toISOString() }) as never,
    );
    const { unmount } = render(<LiveKpiCard kpiId="arr" title="ARR" />);
    expect(screen.getByText('Aktualisiert: vor 30s')).toBeInTheDocument();
    unmount();
    vi.mocked(liveKpiHook.useLiveKpi).mockReturnValue(
      liveSnapshot({ occurredAt: new Date(Date.now() - 5 * 60_000).toISOString() }) as never,
    );
    render(<LiveKpiCard kpiId="arr" title="ARR" />);
    expect(screen.getByText('Aktualisiert: vor 5m')).toBeInTheDocument();
  });

  it('relative Zeit: vor Stunden und Fallback auf Uhrzeit nach 24h', () => {
    vi.mocked(liveKpiHook.useLiveKpi).mockReturnValue(
      liveSnapshot({ occurredAt: new Date(Date.now() - 3 * 3600_000).toISOString() }) as never,
    );
    const { unmount } = render(<LiveKpiCard kpiId="arr" title="ARR" />);
    expect(screen.getByText('Aktualisiert: vor 3h')).toBeInTheDocument();
    unmount();
    vi.mocked(liveKpiHook.useLiveKpi).mockReturnValue(
      liveSnapshot({ occurredAt: new Date(Date.now() - 2 * 86400_000).toISOString() }) as never,
    );
    render(<LiveKpiCard kpiId="arr" title="ARR" />);
    expect(screen.getByText(/Aktualisiert: \d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('ungültiger Zeitstempel wird roh angezeigt', () => {
    vi.mocked(liveKpiHook.useLiveKpi).mockReturnValue(
      liveSnapshot({ occurredAt: 'kein-datum' }) as never,
    );
    render(<LiveKpiCard kpiId="arr" title="ARR" />);
    expect(screen.getByText('Aktualisiert: kein-datum')).toBeInTheDocument();
  });

  it('fallbackUnit greift wenn Snapshot keine Einheit liefert', () => {
    vi.mocked(liveKpiHook.useLiveKpi).mockReturnValue(liveSnapshot({ unit: undefined }) as never);
    render(<LiveKpiCard kpiId="arr" title="ARR" fallbackUnit="€" />);
    expect(screen.getByText(/1\.200\.000 €/)).toBeInTheDocument();
  });

  it('Wertänderung zwischen Renders zeigt Pulse-Overlay', () => {
    vi.mocked(liveKpiHook.useLiveKpi).mockReturnValue(liveSnapshot({ value: 100 }) as never);
    const { container, rerender } = render(<LiveKpiCard kpiId="arr" title="ARR" />);
    expect(container.querySelector('.live-kpi-pulse')).toBeNull();
    vi.mocked(liveKpiHook.useLiveKpi).mockReturnValue(liveSnapshot({ value: 200 }) as never);
    // React.memo: Prop ändern, damit neu gerendert wird (Hook liefert neuen Wert)
    rerender(<LiveKpiCard kpiId="arr" title="ARR neu" />);
    expect(container.querySelector('.live-kpi-pulse')).not.toBeNull();
  });

  it('className wird übernommen, ohne Beschreibung kein Beschreibungs-Block', () => {
    vi.mocked(liveKpiHook.useLiveKpi).mockReturnValue({
      snapshot: null,
      status: 'offline',
      error: null,
      refresh: vi.fn(),
    });
    const { container } = render(<LiveKpiCard kpiId="arr" title="ARR" className="meine-klasse" />);
    expect(container.querySelector('.meine-klasse.live-performance-panel')).not.toBeNull();
    expect(screen.getByText('Quelle: n8n / Live-Feed')).toBeInTheDocument();
    expect(screen.getByText('Stand: Ausstehend')).toBeInTheDocument();
    expect(screen.getByText('Warte auf Live-Events (Ebene C)...')).toBeInTheDocument();
  });
});
