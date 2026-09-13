import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusChip } from '../StatusChip';

describe('StatusChip', () => {
  it('renders label and default neutral variant', () => {
    render(<StatusChip label="Aktiv" />);
    expect(screen.getByText('Aktiv')).toBeInTheDocument();
  });

  it('renders all variants and sizes', () => {
    const variants = ['cyan', 'orange', 'mint', 'neutral'] as const;
    const sizes = ['sm', 'md'] as const;

    for (const variant of variants) {
      for (const size of sizes) {
        const { unmount } = render(
          <StatusChip variant={variant} size={size} label={`${variant}-${size}`} />
        );
        expect(screen.getByText(`${variant}-${size}`)).toBeInTheDocument();
        unmount();
      }
    }
  });

  it('renders with custom icon or pulse dot', () => {
    const { rerender } = render(
      <StatusChip label="Mit Icon" icon={<span data-testid="chip-icon">★</span>} />
    );
    expect(screen.getByTestId('chip-icon')).toBeInTheDocument();

    rerender(<StatusChip label="Live Feed" pulse variant="cyan" />);
    expect(screen.getByText('Live Feed')).toBeInTheDocument();
  });
});
