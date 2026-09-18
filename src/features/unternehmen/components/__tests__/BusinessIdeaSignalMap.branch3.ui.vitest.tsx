import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BusinessIdeaSignalMap } from '../BusinessIdeaSignalMap';
import { IDEE, VALUE } from '@/domain/unternehmenData';

const origParagraphs = [...IDEE.paragraphs];

afterEach(() => {
  IDEE.paragraphs.splice(0, IDEE.paragraphs.length, ...origParagraphs);
});

describe('BusinessIdeaSignalMap (branch3)', () => {
  it('rendert alle vier Phasen mit eingeklappten Details', () => {
    render(<BusinessIdeaSignalMap />);
    expect(screen.getByText('Geschäftsidee Signal-Map')).toBeInTheDocument();
    expect(screen.getByText('DACH-KMU-Situation')).toBeInTheDocument();
    expect(screen.getByText('Vertriebsreibung')).toBeInTheDocument();
    expect(screen.getByText('LeadPilot-Mechanik')).toBeInTheDocument();
    expect(screen.getByText('Nutzen')).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Ausführliche Texte anzeigen' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByText('Alleinstellungsmerkmale (USPs im Original):'),
    ).not.toBeInTheDocument();
  });

  it('Toggle klappt Detailtexte mit Titel, Absätzen und USPs auf und zu', async () => {
    const user = userEvent.setup();
    render(<BusinessIdeaSignalMap />);
    await user.click(screen.getByRole('button', { name: 'Ausführliche Texte anzeigen' }));
    expect(screen.getByRole('button', { name: 'Ausführliche Texte verbergen' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText(`${IDEE.title} – ${IDEE.subtitle}`)).toBeInTheDocument();
    for (const p of IDEE.paragraphs) {
      expect(screen.getByText(p)).toBeInTheDocument();
    }
    expect(screen.getByText('Alleinstellungsmerkmale (USPs im Original):')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ausführliche Texte verbergen' }));
    expect(screen.getByRole('button', { name: 'Ausführliche Texte anzeigen' })).toBeInTheDocument();
    expect(
      screen.queryByText('Alleinstellungsmerkmale (USPs im Original):'),
    ).not.toBeInTheDocument();
  });

  it('erster USP ist hervorgehoben, weitere neutral', () => {
    expect(IDEE.usps.length).toBeGreaterThanOrEqual(2);
    render(<BusinessIdeaSignalMap />);
    const first = screen.getByText(IDEE.usps[0]!).closest('li');
    const second = screen.getByText(IDEE.usps[1]!).closest('li');
    expect(first?.className).toContain('text-cyan-light');
    expect(second?.className).toContain('text-text');
  });

  it('Nutzen zeigt genau die ersten zwei Kernvorteile', () => {
    render(<BusinessIdeaSignalMap />);
    expect(screen.getByText(VALUE.heroStatement)).toBeInTheDocument();
    const shown = VALUE.coreBenefits.slice(0, 2);
    for (const cb of shown) {
      expect(screen.getByText(`${cb.title}:`)).toBeInTheDocument();
    }
    if (VALUE.coreBenefits.length > 2) {
      expect(screen.queryByText(`${VALUE.coreBenefits[2]!.title}:`)).not.toBeInTheDocument();
    }
  });

  it('kurze Absätze ohne Satzzeichen rendern mit Fallback-Texten', () => {
    IDEE.paragraphs.splice(0, IDEE.paragraphs.length, 'Kurzer Satz ohne Punkt');
    render(<BusinessIdeaSignalMap />);
    expect(screen.getByText('Kurzer Satz ohne Punkt.')).toBeInTheDocument();
    expect(screen.getByText('Geschäftsidee Signal-Map')).toBeInTheDocument();
  });
});
