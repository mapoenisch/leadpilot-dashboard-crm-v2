import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocationPage } from '../LocationPage';
import { STANDORT } from '@/domain/unternehmenData';

describe('LocationPage (characterization)', () => {
  it('rendert Titel, Adresse und Headquarters-Panel', () => {
    render(<LocationPage />);
    expect(screen.getByText(STANDORT.title)).toBeInTheDocument();
    expect(screen.getAllByText(STANDORT.address).length).toBeGreaterThan(0);
    expect(screen.getByTestId('location-headquarters')).toBeInTheDocument();
    expect(screen.getByText('HEADQUARTERS // STANDORTDATEN')).toBeInTheDocument();
  });

  it('zeigt Hero-Station und drei Innenansichten', () => {
    render(<LocationPage />);
    expect(screen.getByText('Unternehmenssitz · Augustusplatz 9')).toBeInTheDocument();
    expect(screen.getByText('Empfangsbereich')).toBeInTheDocument();
    expect(screen.getByText('Besprechungsraum')).toBeInTheDocument();
    expect(screen.getByText('Arbeitsbereich')).toBeInTheDocument();
    expect(screen.getAllByText('FIKTIVE VISUALISIERUNG').length).toBeGreaterThanOrEqual(4);
  });

  it('listet alle sechs Standortdetails mit Kennzahlen', () => {
    const { container } = render(<LocationPage />);
    expect(screen.getByText('Standortdetails & Mietdaten')).toBeInTheDocument();
    expect(screen.getByText('6 KENNDATENSÄTZE')).toBeInTheDocument();
    const grid = container.querySelector('.unternehmen-v2-details-grid');
    expect(grid?.children.length).toBe(6);
    expect(screen.getByText(/39\.800 €/)).toBeInTheDocument();
  });
});
