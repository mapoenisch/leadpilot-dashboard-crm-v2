import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders children correctly', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('renders with icon and merges className overrides without inline style', () => {
    render(
      <Badge icon={<span data-testid="badge-icon">★</span>} className="text-[9.5px]">
        With Icon
      </Badge>,
    );
    expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
    const badge = screen.getByText('With Icon');
    expect(badge).toHaveClass('text-[9.5px]');
    expect(badge).not.toHaveClass('text-[11px]');
    expect(badge).not.toHaveAttribute('style');
  });

  it('renders all variants and sizes', () => {
    const variants = ['cyan', 'orange', 'neutral', 'mint', 'red'] as const;
    const sizes = ['md', 'sm'] as const;

    for (const variant of variants) {
      for (const size of sizes) {
        render(
          <Badge variant={variant} size={size}>
            {variant}-{size}
          </Badge>,
        );
        expect(screen.getByText(`${variant}-${size}`)).toBeInTheDocument();
      }
    }
  });
});
