import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionHeader } from '../SectionHeader';

describe('SectionHeader', () => {
  it('renders title', () => {
    render(<SectionHeader title="Übersicht" />);
    expect(screen.getByRole('heading', { name: 'Übersicht' })).toBeInTheDocument();
  });

  it('renders eyebrow, description and actions', () => {
    render(
      <SectionHeader
        eyebrow="Finanzen"
        title="GuV Übersicht"
        description="Alle Daten zu Erlösen und Kosten"
        actions={<button type="button">Exportieren</button>}
      />
    );

    expect(screen.getByText('Finanzen')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'GuV Übersicht' })).toBeInTheDocument();
    expect(screen.getByText('Alle Daten zu Erlösen und Kosten')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportieren' })).toBeInTheDocument();
  });
});
