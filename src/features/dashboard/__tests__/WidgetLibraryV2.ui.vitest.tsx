import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WidgetLibraryV2 } from '../components/editor/WidgetLibraryV2';

describe('WidgetLibraryV2', () => {
  it('rendert Suche, Kategorie-Pills und aktive Kennzahlenkarten', () => {
    const onAddTile = vi.fn();
    render(<WidgetLibraryV2 onAddTile={onAddTile} tileCount={3} maxTiles={24} />);

    expect(screen.getByTestId('widget-library')).toBeInTheDocument();
    expect(screen.getByTestId('library-search-input')).toBeInTheDocument();
    expect(screen.getByTestId('library-tab-alle')).toBeInTheDocument();
    expect(screen.getByTestId('library-tab-crm')).toBeInTheDocument();
    expect(screen.getByTestId('library-tab-finanzen')).toBeInTheDocument();

    // Kartenliste prüfen
    expect(screen.getByTestId('library-cards-list')).toBeInTheDocument();
  });

  it('filtert Kacheln live nach Suchbegriff', () => {
    const onAddTile = vi.fn();
    render(<WidgetLibraryV2 onAddTile={onAddTile} tileCount={0} maxTiles={24} />);

    const searchInput = screen.getByTestId('library-search-input');
    fireEvent.change(searchInput, { target: { value: 'ARR' } });

    // Es sollten Karten angezeigt werden, die "ARR" im Namen/Kategorie tragen
    const cards = screen.getAllByTestId(/^library-card-/);
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0]?.textContent).toContain('ARR');
  });

  it('löst onAddTile beim Klick auf Hinzufügen aus', () => {
    const onAddTile = vi.fn();
    render(<WidgetLibraryV2 onAddTile={onAddTile} tileCount={2} maxTiles={24} />);

    const firstAddBtn = screen.getAllByTestId(/^add-tile-btn-/)[0]!;
    fireEvent.click(firstAddBtn);

    expect(onAddTile).toHaveBeenCalledTimes(1);
    expect(typeof onAddTile.mock.calls[0]![0]).toBe('string');
  });

  it('deaktiviert das Hinzufügen und warnt, wenn das 24-Kachel-Budget voll ist', () => {
    const onAddTile = vi.fn();
    render(<WidgetLibraryV2 onAddTile={onAddTile} tileCount={24} maxTiles={24} />);

    expect(screen.getByTestId('library-budget-notice')).toBeInTheDocument();
    expect(screen.getByTestId('library-budget-notice')).toHaveTextContent(
      'Maximum von 24 Kacheln belegt',
    );

    const buttons = screen.getAllByTestId(/^add-tile-btn-/);
    for (const btn of buttons) {
      expect(btn).toBeDisabled();
    }
  });
});
