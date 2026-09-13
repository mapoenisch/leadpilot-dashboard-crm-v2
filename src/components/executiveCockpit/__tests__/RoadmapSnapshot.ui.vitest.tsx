import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoadmapSnapshot } from '../RoadmapSnapshot';

describe('RoadmapSnapshot', () => {
  it('renders roadmap timeline with releases and milestone items', () => {
    render(<RoadmapSnapshot />);

    expect(screen.getByTestId('roadmap-snapshot')).toBeInTheDocument();
    expect(screen.getByText('Import-Assistent')).toBeInTheDocument();
    expect(screen.getByText('v1.2 (Feb 2025)')).toBeInTheDocument();
  });
});
