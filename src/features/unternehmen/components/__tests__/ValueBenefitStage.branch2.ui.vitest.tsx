import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValueBenefitStage } from '../ValueBenefitStage';
import { VALUE } from '../../../../domain/unternehmenData';

describe('ValueBenefitStage (branch2)', () => {
  it('rendert Hero-Statement und alle drei Vorteil-Badges mit Zählern', () => {
    render(<ValueBenefitStage />);
    expect(screen.getByText('Kernversprechen der LeadPilot Plattform')).toBeInTheDocument();
    expect(screen.getByText(VALUE.heroStatement)).toBeInTheDocument();
    expect(screen.getByText('Kontakt wird Kunde')).toBeInTheDocument();
    expect(screen.getByText('Fokus statt Reporting-Aufwand')).toBeInTheDocument();
    expect(screen.getByText('Vom ersten Tag handlungsfähig')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
    expect(screen.getByText('03')).toBeInTheDocument();
  });

  it('zeigt Kernvorteil-Titel und Beschreibungen', () => {
    render(<ValueBenefitStage />);
    for (const b of VALUE.coreBenefits) {
      expect(screen.getAllByText(b.title).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('rendert Vektor-Symbolgrafik mit zugänglichem Label', () => {
    render(<ValueBenefitStage />);
    expect(
      screen.getByRole('img', {
        name: /Vertriebsnahe Symbolgrafik/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Persönliche B2B-Abschlüsse statt Excel-Verlust')).toBeInTheDocument();
  });

  it('Referenz-Toggle zeigt Detail-Grid und versteckt es wieder', async () => {
    const user = userEvent.setup();
    render(<ValueBenefitStage />);
    const btn = screen.getByRole('button', { name: 'Referenzübersicht anzeigen' });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(btn).toHaveAttribute('aria-controls', 'value-benefit-details');

    await user.click(btn);
    expect(screen.getByRole('button', { name: 'Referenzübersicht verbergen' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    const details = document.getElementById('value-benefit-details');
    expect(details).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Referenzübersicht verbergen' }));
    expect(document.getElementById('value-benefit-details')).toBeNull();
    expect(screen.getByRole('button', { name: 'Referenzübersicht anzeigen' })).toBeInTheDocument();
  });
});
