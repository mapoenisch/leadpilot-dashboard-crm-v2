import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toolbar } from '../Toolbar';

describe('Toolbar', () => {
  it('renders toolbar with role and accessible label', () => {
    render(
      <Toolbar ariaLabel="Tabellen-Aktionen">
        <button type="button">Filter</button>
      </Toolbar>,
    );

    expect(screen.getByRole('toolbar', { name: 'Tabellen-Aktionen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
  });

  it('supports align and gap variants', () => {
    const aligns = ['left', 'center', 'right', 'between'] as const;
    const gaps = ['6px', 'var(--space-2)'];

    for (const align of aligns) {
      for (const gap of gaps) {
        const { unmount } = render(
          <Toolbar align={align} gap={gap}>
            <span>Item</span>
          </Toolbar>,
        );
        expect(screen.getByRole('toolbar')).toBeInTheDocument();
        unmount();
      }
    }
  });
});
