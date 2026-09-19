import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntegrationPage } from '../IntegrationPage';
import { INTEGR } from '@/domain/produktData';

describe('IntegrationPage (characterization)', () => {
  it('rendert Titel und Beschreibung', () => {
    render(<IntegrationPage />);
    expect(screen.getByText(INTEGR.title)).toBeInTheDocument();
    expect(screen.getByText('Technologie-Stack & Sicherheit.')).toBeInTheDocument();
    expect(screen.getByText('Produkt')).toBeInTheDocument();
  });

  it('zeigt Stack-Tabelle mit allen Kategorien', () => {
    render(<IntegrationPage />);
    expect(screen.getByRole('columnheader', { name: 'Bereich' })).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Technologie / Spezifikation' }),
    ).toBeInTheDocument();
    for (const row of INTEGR.stack) {
      expect(screen.getByText(row.category)).toBeInTheDocument();
    }
  });

  it('enthält DSGVO-/Compliance-Zeilen', () => {
    const { container } = render(<IntegrationPage />);
    expect(container.textContent).toContain('Compliance');
    expect(container.textContent).toContain('Hosting');
    expect(screen.getAllByRole('row').length).toBeGreaterThan(INTEGR.stack.length);
  });
});
