import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHero } from '../PageHero';
import { splitGlossaryTerms } from '@/config/glossary';

describe('Glossar im Seitenkopf (Auftrag 117)', () => {
  it('zerlegt Text an Glossarbegriffen', () => {
    expect(splitGlossaryTerms('Kanalperformance & CAC')).toEqual([
      { text: 'Kanalperformance & ' },
      { text: 'CAC', term: 'CAC' },
    ]);
    expect(splitGlossaryTerms('Ohne Kürzel')).toEqual([{ text: 'Ohne Kürzel' }]);
  });

  it('zeichnet Kürzel in Untertitel und Pills mit Erklärung aus', () => {
    render(
      <PageHero
        eyebrow="Finanzen"
        title="Jahresvergleich"
        subtitle="Monatlicher MRR-Verlauf und EBITDA"
        pills={['ARR 2026']}
      />,
    );
    expect(screen.getByText('EBITDA')).toHaveAttribute('title', expect.stringContaining('Zinsen'));
    expect(screen.getByText('MRR')).toHaveAttribute('title', expect.stringContaining('monatlich'));
    expect(screen.getByText('ARR')).toHaveAttribute('title', expect.stringContaining('jährlich'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Jahresvergleich');
  });

  it('lässt Texte ohne Kürzel und Nicht-Strings unverändert', () => {
    render(<PageHero eyebrow="CRM" title="Leads" subtitle={<em>Hinweis</em>} />);
    expect(document.querySelector('abbr')).toBeNull();
    expect(screen.getByText('Hinweis')).toBeInTheDocument();
  });
});
