import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '../Skeleton';

describe('Skeleton', () => {
  it('renders default rect skeleton with aria-hidden', () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector('.skeleton');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });

  it('supports variants text, rect and circle', () => {
    const variants = ['text', 'rect', 'circle'] as const;
    for (const variant of variants) {
      const { container, unmount } = render(<Skeleton variant={variant} width={100} height={20} />);
      const el = container.querySelector('.skeleton');
      expect(el).toBeInTheDocument();
      unmount();
    }
  });

  it('renders with accessible status label when provided', () => {
    render(<Skeleton label="Lade Benutzerprofil..." width="100%" height="40px" />);
    const el = screen.getByRole('status', { name: 'Lade Benutzerprofil...' });
    expect(el).toBeInTheDocument();
    expect(el).not.toHaveAttribute('aria-hidden');
  });
});
