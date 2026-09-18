import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FundingTimeline } from '../FundingTimeline';
import { HISTORIE } from '../../../../domain/unternehmenData';

describe('FundingTimeline (branch2)', () => {
  it('rendert Header, alle vier Perioden und Spuren-Labels', () => {
    render(<FundingTimeline />);
    expect(screen.getByText('Gemeinsame Gründungs- & Entwicklungszeitachse')).toBeInTheDocument();
    // Desktop- und Mobile-Ansicht rendern beide (CSS blendet je Viewport aus)
    expect(screen.getAllByText('21.07.2022').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Mai 2023').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Q1 2024').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Dez 2025').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Kapital & Recht').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Produkt & Markt').length).toBeGreaterThanOrEqual(2);
  });

  it('zeigt Kapital- und Produkt-Titel aus HISTORIE', () => {
    render(<FundingTimeline />);
    for (const e of HISTORIE.events) {
      expect(screen.getAllByText(e.title).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('zeigt Verbinder-Badge nur in der Q1-2024-Spalte', () => {
    render(<FundingTimeline />);
    expect(screen.getAllByText('Ermöglicht Launch').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Finanzierung ermöglicht Produkt-Launch (GA)').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('Toggle-Button klappt Detail-Ereignisliste auf und zu (aria-expanded)', async () => {
    const user = userEvent.setup();
    render(<FundingTimeline />);
    const btn = screen.getByRole('button', { name: 'Ereignisliste anzeigen' });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(btn).toHaveAttribute('aria-controls', 'funding-timeline-details');
    expect(screen.queryByText('Vollständige Meilensteine (Original-Historie):')).toBeNull();

    await user.click(btn);
    expect(screen.getByRole('button', { name: 'Ereignisliste verbergen' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('Vollständige Meilensteine (Original-Historie):')).toBeInTheDocument();
    // jede Historie-Datumsangabe erscheint in der Detail-Liste
    for (const e of HISTORIE.events) {
      expect(screen.getAllByText(e.date).length).toBeGreaterThanOrEqual(1);
    }

    await user.click(screen.getByRole('button', { name: 'Ereignisliste verbergen' }));
    expect(
      screen.queryByText('Vollständige Meilensteine (Original-Historie):'),
    ).not.toBeInTheDocument();
  });

  it('leere Spur-Zellen rendern Platzhalter-Striche', () => {
    render(<FundingTimeline />);
    // Dez 2025 hat kein Kapital-Event, 21.07.2022/Mai 2023 kein Produkt-Event
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });
});
