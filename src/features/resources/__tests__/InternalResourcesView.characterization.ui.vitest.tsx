import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InternalResourcesView } from '../InternalResourcesView';

describe('InternalResourcesView (characterization)', () => {
  it('rendert Header, Kennzahlen und alle Materialien', () => {
    const { container } = render(<InternalResourcesView />);
    expect(screen.getByText('Internal Resources & Dokumentenbibliothek')).toBeInTheDocument();
    expect(container.textContent).toContain('Dokumente & Decks:');
    expect(screen.getByText('100% Verlustfrei integriert')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Marketingplanung H2-2026 – Roadmap öffnen/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Personalisierte Präsentation AUTEC öffnen/ }),
    ).toBeInTheDocument();
  });

  it('filtert per Suche und setzt sie per Clear-Button zurück', async () => {
    const user = userEvent.setup();
    const { container } = render(<InternalResourcesView />);
    const search = screen.getByPlaceholderText('Dokument oder Tag suchen...');
    await user.type(search, 'autec');
    expect(
      screen.getByRole('button', { name: /Personalisierte Präsentation AUTEC öffnen/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Marketingplanung H2-2026 – Roadmap öffnen/ }),
    ).not.toBeInTheDocument();
    await user.type(search, 'xyznichtsdrin');
    expect(container.textContent).toContain('Keine Ressourcen für den Suchbegriff');
    fireEvent.click(screen.getByText('✕'));
    expect(
      screen.getByRole('button', { name: /Marketingplanung H2-2026 – Roadmap öffnen/ }),
    ).toBeInTheDocument();
  });

  it('wechselt Kategorietabs und filtert das Raster', () => {
    render(<InternalResourcesView />);
    fireEvent.click(screen.getByRole('button', { name: 'Vertrieb & Pitch-Decks' }));
    expect(
      screen.getByRole('button', { name: /Personalisierte Präsentation AUTEC öffnen/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Marketingplanung H2-2026 – Roadmap öffnen/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Operations & SLA' }));
    expect(
      screen.getByRole('button', { name: /Lead-Qualifizierungs-Matrix \(SLA\) öffnen/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Personalisierte Präsentation AUTEC öffnen/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Alle Materialien' }));
    expect(
      screen.getByRole('button', { name: /Marketingplanung H2-2026 – Roadmap öffnen/ }),
    ).toBeInTheDocument();
  });
});
