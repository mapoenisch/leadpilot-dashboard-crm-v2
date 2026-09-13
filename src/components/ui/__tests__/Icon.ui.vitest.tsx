import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Icon } from '../Icon';

describe('Icon', () => {
  it('renders known icons from map', () => {
    const names = ['user', 'trendingUp', 'settings', 'search', 'filter'];
    for (const name of names) {
      const { container, unmount } = render(
        <Icon name={name} size={24} color="#ff0000" className="my-icon" />,
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveAttribute('height', '24');
      unmount();
    }
  });

  it('falls back to default icon for unknown name', () => {
    const { container } = render(<Icon name="unknown-icon-name" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
