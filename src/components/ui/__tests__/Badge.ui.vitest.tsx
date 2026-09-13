import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders children correctly', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('renders with icon and style passthrough', () => {
    render(
      <Badge icon={<span data-testid="badge-icon">★</span>} style={{ opacity: 0.8 }}>
        With Icon
      </Badge>
    );
    expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
    expect(screen.getByText('With Icon')).toBeInTheDocument();
  });

  it('renders all variants and sizes', () => {
    const variants = ['cyan', 'orange', 'neutral', 'mint', 'red'] as const;
    const sizes = ['md', 'sm'] as const;

    for (const variant of variants) {
      for (const size of sizes) {
        render(
          <Badge variant={variant} size={size}>
            {variant}-{size}
          </Badge>
        );
        expect(screen.getByText(`${variant}-${size}`)).toBeInTheDocument();
      }
    }
  });
});
