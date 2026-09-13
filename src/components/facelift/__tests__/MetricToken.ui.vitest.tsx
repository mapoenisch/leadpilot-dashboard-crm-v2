import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricToken } from '../MetricToken';
import { VisualTone } from '@/domain/faceliftVisualData';

describe('MetricToken', () => {
  it('renders label, value and unit', () => {
    render(<MetricToken label="ARR" value="411.840" unit="€" />);
    expect(screen.getByText('ARR')).toBeInTheDocument();
    expect(screen.getByText('411.840')).toBeInTheDocument();
    expect(screen.getByText('€')).toBeInTheDocument();
  });

  it('renders delta and subtext', () => {
    render(
      <MetricToken
        label="Leads"
        value={120}
        delta={{ value: '15%', isPositive: true, label: 'vs. Vormonat' }}
        subtext="Letzte 30 Tage"
      />
    );

    expect(screen.getByText('+15% vs. Vormonat')).toBeInTheDocument();
    expect(screen.getByText('Letzte 30 Tage')).toBeInTheDocument();
  });

  it('supports tones and sizes', () => {
    const tones: VisualTone[] = ['positive', 'attention', 'neutral', 'accent'];
    const sizes = ['sm', 'md', 'lg'] as const;

    for (const tone of tones) {
      for (const size of sizes) {
        const { unmount } = render(
          <MetricToken
            label="Test"
            value={42}
            tone={tone}
            size={size}
            glyph={<span data-testid="glyph">★</span>}
          />
        );
        expect(screen.getByText('Test')).toBeInTheDocument();
        expect(screen.getByTestId('glyph')).toBeInTheDocument();
        unmount();
      }
    }
  });
});
