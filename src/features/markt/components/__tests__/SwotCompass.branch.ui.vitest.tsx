import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SwotCompass } from '../SwotCompass';

const QUADRANTS = [
  { btn: 'Stärken Handlungsoptionen fokussieren', heading: 'Stärken im DACH-Markt gezielt nutzen' },
  {
    btn: 'Schwächen Handlungsoptionen fokussieren',
    heading: 'Interne Schwachstellen strukturell absichern',
  },
  { btn: 'Chancen Handlungsoptionen fokussieren', heading: 'Markchancen für Wachstum erschließen' },
  {
    btn: 'Risiken Handlungsoptionen fokussieren',
    heading: 'Externe Risiken vorausschauend abfedern',
  },
] as const;

describe('SwotCompass (branch)', () => {
  it('startet mit Stärken als aktiver Auswahl und Detailansicht', () => {
    render(<SwotCompass />);
    expect(screen.getByRole('button', { name: QUADRANTS[0].btn })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText(QUADRANTS[0].heading)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Time-to-Value (< 30 Minuten Setup) im Vertrieb als Kernvorteil positionieren',
      ),
    ).toBeInTheDocument();
  });

  it('wechselt die Detailansicht zu Schwächen', async () => {
    const user = userEvent.setup();
    render(<SwotCompass />);
    await user.click(screen.getByRole('button', { name: QUADRANTS[1].btn }));
    expect(screen.getByRole('button', { name: QUADRANTS[1].btn })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: QUADRANTS[0].btn })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByText(QUADRANTS[1].heading)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Monatliche Burn Rate (25.750 €) steuern und Runway von 14 Monaten schützen',
      ),
    ).toBeInTheDocument();
  });

  it('wechselt die Detailansicht zu Chancen', async () => {
    const user = userEvent.setup();
    render(<SwotCompass />);
    await user.click(screen.getByRole('button', { name: QUADRANTS[2].btn }));
    expect(screen.getByText(QUADRANTS[2].heading)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Partner- und Empfehlungskanal mit günstigstem CAC (492 €) gezielt skalieren',
      ),
    ).toBeInTheDocument();
  });

  it('wechselt die Detailansicht zu Risiken', async () => {
    const user = userEvent.setup();
    render(<SwotCompass />);
    await user.click(screen.getByRole('button', { name: QUADRANTS[3].btn }));
    expect(screen.getByText(QUADRANTS[3].heading)).toBeInTheDocument();
    expect(
      screen.getByText(
        'Verschärftem Preiskampf im B2B SaaS Einstiegssegment durch klaren Mehrwert standhalten',
      ),
    ).toBeInTheDocument();
  });

  it('rendert alle vier Quadranten-Karten mit Achsen-Badges', () => {
    render(<SwotCompass />);
    for (const label of [
      'INTERN · STÄRKEN',
      'INTERN · SCHÜTZEN',
      'EXTERN · STÄRKEN',
      'EXTERN · SCHÜTZEN',
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(
      screen.getByText((_, el) => el?.textContent === 'Horizontal: Intern ↔ Extern'),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, el) => el?.textContent === 'Vertikal: Stärken ↕ Schützen'),
    ).toBeInTheDocument();
  });
});
