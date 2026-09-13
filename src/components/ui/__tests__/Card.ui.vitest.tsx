import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../Card';

describe('Card', () => {
  it('renders children correctly', () => {
    render(<Card>Karteninhalt</Card>);
    expect(screen.getByText('Karteninhalt')).toBeInTheDocument();
  });

  it('supports featured prop', () => {
    const { container } = render(<Card featured>Featured Card</Card>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('supports all variants and paddings', () => {
    const variants = ['default', 'glass', 'elevated', 'warning', 'info'] as const;
    const paddings = ['0', 'var(--space-3)', 'var(--space-4)', 'var(--space-5)', 'custom-pad'];

    for (const variant of variants) {
      for (const padding of paddings) {
        const { unmount } = render(
          <Card variant={variant} padding={padding} style={{ opacity: 0.9 }} className="test-card">
            {variant}-{padding}
          </Card>
        );
        expect(screen.getByText(`${variant}-${padding}`)).toBeInTheDocument();
        unmount();
      }
    }
  });
});
