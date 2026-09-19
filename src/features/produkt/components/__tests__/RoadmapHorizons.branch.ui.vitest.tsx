import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoadmapHorizons } from '../RoadmapHorizons';
import { ROADMAP } from '@/domain/produktData';

describe('RoadmapHorizons (branch)', () => {
  it('rendert alle drei Horizonte mit Zählern', () => {
    render(<RoadmapHorizons />);
    expect(screen.getByText('NOW')).toBeInTheDocument();
    expect(screen.getByText('NEXT')).toBeInTheDocument();
    expect(screen.getByText('LATER')).toBeInTheDocument();
    expect(screen.getByText(ROADMAP.title)).toBeInTheDocument();
    const nowCount = ROADMAP.releases.filter((r) => r.status === 'Released').length;
    expect(
      screen.getByText(`${nowCount} ${nowCount === 1 ? 'Feature' : 'Features'}`),
    ).toBeInTheDocument();
  });

  it('rendert Release-Karten mit Status-Badges aller Varianten', () => {
    render(<RoadmapHorizons />);
    for (const rel of ROADMAP.releases) {
      expect(screen.getByText(rel.title)).toBeInTheDocument();
    }
    expect(screen.getAllByText('Released').length).toBeGreaterThan(0);
  });

  it('blendet die Referenztabelle per Toggle ein und aus', async () => {
    const user = userEvent.setup();
    render(<RoadmapHorizons />);
    const toggle = screen.getByRole('button', { name: 'Tabellenansicht anzeigen' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Vollständige Roadmap-Tabelle (Originalansicht):')).toBeNull();

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Tabellenansicht verbergen' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('Vollständige Roadmap-Tabelle (Originalansicht):')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tabellenansicht verbergen' }));
    expect(screen.queryByText('Vollständige Roadmap-Tabelle (Originalansicht):')).toBeNull();
  });

  it('verknüpft Toggle und Tabelle per aria-controls', async () => {
    const user = userEvent.setup();
    render(<RoadmapHorizons />);
    await user.click(screen.getByRole('button', { name: 'Tabellenansicht anzeigen' }));
    const toggle = screen.getByRole('button', { name: 'Tabellenansicht verbergen' });
    expect(toggle).toHaveAttribute('aria-controls', 'roadmap-horizons-table');
    expect(document.getElementById('roadmap-horizons-table')).not.toBeNull();
  });
});
