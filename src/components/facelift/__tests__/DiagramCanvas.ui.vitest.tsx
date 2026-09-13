import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiagramCanvas } from '../DiagramCanvas';

describe('DiagramCanvas', () => {
  it('renders title, description and svg children', () => {
    render(
      <DiagramCanvas
        title="Marktanteile DACH"
        description="Verteilung nach Segmenten"
        viewBox="0 0 400 200"
      >
        <circle cx="200" cy="100" r="50" data-testid="test-circle" />
      </DiagramCanvas>
    );

    expect(screen.getByRole('heading', { name: 'Marktanteile DACH' })).toBeInTheDocument();
    expect(screen.getAllByText('Verteilung nach Segmenten')[0]).toBeInTheDocument();
    expect(screen.getByTestId('test-circle')).toBeInTheDocument();
  });

  it('renders legend, source and summary when provided', () => {
    render(
      <DiagramCanvas
        title="Diagramm mit Extras"
        viewBox="0 0 100 100"
        legend={<div data-testid="test-legend">Legende Details</div>}
        summary={<div data-testid="test-summary">Zusammenfassung Text</div>}
        source={{
          label: 'Destatis',
          url: 'https://destatis.de',
          metric: 'BIP 2025',
        }}
        aspectRatio="16/9"
      >
        <rect width="100" height="100" />
      </DiagramCanvas>
    );

    expect(screen.getByTestId('test-legend')).toBeInTheDocument();
    expect(screen.getByTestId('test-summary')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Destatis' })).toHaveAttribute(
      'href',
      'https://destatis.de'
    );
    expect(screen.getByText('(BIP 2025)')).toBeInTheDocument();
  });
});
