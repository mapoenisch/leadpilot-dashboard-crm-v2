import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FaceliftGlyph } from '../FaceliftGlyph';
import { FaceliftGlyphName, VisualTone } from '@/domain/faceliftVisualData';

describe('FaceliftGlyph', () => {
  it('renders with role="img" and default accessible label', () => {
    render(<FaceliftGlyph name="success" />);
    expect(screen.getByRole('img', { name: 'Positives Signal / Erfolg' })).toBeInTheDocument();
  });

  it('renders all glyph names without crashing', () => {
    const glyphs: FaceliftGlyphName[] = [
      'contactToCustomer',
      'focus',
      'ready',
      'success',
      'challenge',
      'fit',
      'risk',
      'opportunity',
    ];

    for (const name of glyphs) {
      const { unmount } = render(<FaceliftGlyph name={name} size={32} />);
      expect(screen.getByRole('img')).toBeInTheDocument();
      unmount();
    }
  });

  it('supports tones and ariaHidden', () => {
    const tones: VisualTone[] = ['positive', 'attention', 'neutral', 'accent'];

    for (const tone of tones) {
      const { container, unmount } = render(
        <FaceliftGlyph name="focus" tone={tone} ariaHidden={true} />,
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      unmount();
    }
  });
});
