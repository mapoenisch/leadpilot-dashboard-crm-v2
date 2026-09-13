import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LivePerformanceSection } from '../LivePerformanceSection';
import * as liveKpiHook from '@/hooks/useLiveKpi';
import * as liveKpiHistoryHook from '@/hooks/useLiveKpiHistory';
import * as liveKpiActivityHook from '@/hooks/useLiveKpiActivity';

vi.mock('@/hooks/useLiveKpi');
vi.mock('@/hooks/useLiveKpiHistory');
vi.mock('@/hooks/useLiveKpiActivity');

describe('LivePerformanceSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(liveKpiHook.useLiveKpi).mockReturnValue({
      snapshot: null,
      status: 'loading',
      error: null,
      refresh: vi.fn(),
    });
    vi.mocked(liveKpiHistoryHook.useLiveKpiHistory).mockReturnValue({
      history: [],
      status: 'loading',
      error: null,
      refresh: vi.fn(),
    });
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [],
      status: 'loading',
      error: null,
      refresh: vi.fn(),
    });
  });

  it('renders section header, badges and child panels', () => {
    render(<LivePerformanceSection className="custom-test-class" />);

    expect(screen.getByTestId('live-performance-section')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Live Performance/i })).toBeInTheDocument();
    expect(screen.getByText('Ebene C · Echtzeit-Steuerung')).toBeInTheDocument();
    expect(screen.getByText('Ebene C · bestätigte Live-Ist-Daten')).toBeInTheDocument();
    expect(screen.getByText('Realtime Stream')).toBeInTheDocument();
    expect(screen.getByText('Multi-KPI Pipeline')).toBeInTheDocument();
  });
});
