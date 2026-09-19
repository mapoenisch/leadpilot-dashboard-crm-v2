import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerPortfolio } from '../CustomerPortfolio';

describe('CustomerPortfolio (characterization)', () => {
  it('rendert Header, Raumkarte und Branchenlegende', () => {
    render(<CustomerPortfolio />);
    expect(screen.getByText('PORTFOLIO-RAUMKARTE')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /2D-Streudiagramm/ })).toBeInTheDocument();
    expect(screen.getByText('Legende Branchen:')).toBeInTheDocument();
    for (const branche of ['Maschinenbau', 'IT & Software', 'Großhandel', 'Agenturen']) {
      expect(screen.getAllByText(branche).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('zeigt echten Wertebereich und alle zehn Referenzkunden im SVG', () => {
    const { container } = render(<CustomerPortfolio />);
    expect(container.textContent).toContain('aktive Nutzer');
    expect(container.textContent).toContain('ARR');
    // SVG-Label trägt "Name (ARR)", Tabellenzelle nur den Namen
    expect(screen.getAllByText(/Northwind GmbH/).length).toBeGreaterThanOrEqual(2);
    // Zehn SVG-Punktgruppen (Tabelle zusätzlich, daher >= 10 Vorkommen prüfen via Gruppen)
    expect(container.querySelectorAll('g.portfolio-point').length).toBe(10);
  });

  it('blendet die Datentabelle per Button aus und wieder ein', () => {
    const { container } = render(<CustomerPortfolio />);
    expect(container.querySelector('.portfolio-table-wrapper')).not.toBeNull();
    expect(screen.getAllByText(/Northwind GmbH/)).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Tabelle ausblenden' }));
    expect(container.querySelector('.portfolio-table-wrapper')).toBeNull();
    // SVG-Labels bleiben sichtbar
    expect(screen.getAllByText(/Northwind GmbH/)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Tabelle anzeigen' }));
    expect(container.querySelector('.portfolio-table-wrapper')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Tabelle ausblenden' })).toBeInTheDocument();
  });
});
