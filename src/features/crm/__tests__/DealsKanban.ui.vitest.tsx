import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ImportedFunnelDeal } from '@/types/crm';
import { DealsViewToggle } from '../components/DealsViewToggle';
import { DealKanbanCard, isDealOverdue } from '../components/DealKanbanCard';
import { KanbanColumn } from '../components/KanbanColumn';
import { DealsKanbanBoard, KANBAN_STAGES } from '../components/DealsKanbanBoard';

const MOCK_DEALS: ImportedFunnelDeal[] = [
  {
    id: 'deal-1',
    dealName: 'Cloud Migration Pilot',
    stage: 'Lead eingegangen',
    amount: 25000,
    closeDate: '2026-12-31',
    pipeline: 'Enterprise SaaS',
  },
  {
    id: 'deal-2',
    dealName: 'Security Audit Standard',
    stage: 'Erstgespräch geführt',
    amount: 15000,
    closeDate: '2026-11-30',
    pipeline: 'Compliance',
  },
  {
    id: 'deal-3',
    dealName: 'Legacy ERP Modernization',
    stage: 'Deal gewonnen',
    amount: 120000,
    closeDate: '2026-06-30',
    pipeline: 'Enterprise SaaS',
  },
  {
    id: 'deal-overdue',
    dealName: 'Overdue Project Deal',
    stage: 'Bedarfsanalyse',
    amount: 45000,
    closeDate: '2025-01-01',
    pipeline: 'Advisory',
  },
];

describe('DealsViewToggle', () => {
  it('rendert Umschalter für Tabelle und Kanban mit korrektem ARIA-Zustand', () => {
    const onChange = vi.fn();
    const { rerender } = render(<DealsViewToggle viewMode="tabelle" onChange={onChange} />);

    const tableBtn = screen.getByTestId('deals-view-table-btn');
    const kanbanBtn = screen.getByTestId('deals-view-kanban-btn');

    expect(tableBtn).toBeInTheDocument();
    expect(kanbanBtn).toBeInTheDocument();
    expect(tableBtn).toHaveAttribute('aria-pressed', 'true');
    expect(kanbanBtn).toHaveAttribute('aria-pressed', 'false');
    expect(tableBtn).toHaveAttribute('aria-label', 'Tabellenansicht');
    expect(kanbanBtn).toHaveAttribute('aria-label', 'Kanban-Ansicht');

    fireEvent.click(kanbanBtn);
    expect(onChange).toHaveBeenCalledWith('kanban');

    rerender(<DealsViewToggle viewMode="kanban" onChange={onChange} />);
    expect(tableBtn).toHaveAttribute('aria-pressed', 'false');
    expect(kanbanBtn).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('isDealOverdue', () => {
  it('unterscheidet fällige und überfällige Deals exakt auf Kalendertagebene', () => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

    // Heute fällig ist noch NICHT überfällig
    expect(isDealOverdue(todayStr, false)).toBe(false);

    // Gestern fällig ist überfällig
    expect(isDealOverdue(yesterdayStr, false)).toBe(true);

    // Morgen fällig ist nicht überfällig
    expect(isDealOverdue(tomorrowStr, false)).toBe(false);

    // Gewonnene oder verlorene Deals sind nie überfällig
    expect(isDealOverdue(yesterdayStr, true)).toBe(false);
  });
});

describe('DealKanbanCard', () => {
  it('zeigt Titel, Betrag, Abschlussdatum und Überfälligkeits-Warnung an', () => {
    render(
      <DealKanbanCard deal={MOCK_DEALS[3]!} allStages={KANBAN_STAGES} onMoveStage={vi.fn()} />,
    );

    expect(screen.getByText('Overdue Project Deal')).toBeInTheDocument();
    expect(screen.getByText('45.000 €')).toBeInTheDocument();
    expect(screen.getByText('2025-01-01')).toBeInTheDocument();
    expect(screen.getByText('Überfällig')).toBeInTheDocument();
  });

  it('erlaubt barrierefreien Phasenwechsel über das Portal-Tastaturmenü', () => {
    const onMoveStage = vi.fn();
    render(
      <DealKanbanCard deal={MOCK_DEALS[0]!} allStages={KANBAN_STAGES} onMoveStage={onMoveStage} />,
    );

    const menuBtn = screen.getByLabelText('Cloud Migration Pilot: Phase ändern');
    fireEvent.click(menuBtn);

    const targetStageOption = screen.getByRole('menuitem', { name: /Angebot erstellt/ });
    expect(targetStageOption).toBeInTheDocument();

    fireEvent.click(targetStageOption);
    expect(onMoveStage).toHaveBeenCalledWith('deal-1', 'Angebot erstellt');
  });

  it('schließt das Phasenmenü bei Escape', () => {
    render(
      <DealKanbanCard deal={MOCK_DEALS[0]!} allStages={KANBAN_STAGES} onMoveStage={vi.fn()} />,
    );

    const menuBtn = screen.getByLabelText('Cloud Migration Pilot: Phase ändern');
    fireEvent.click(menuBtn);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('fokussiert beim Öffnen den ersten wählbaren Eintrag und stellt Fokus beim Schließen wieder her', async () => {
    vi.useFakeTimers();
    render(
      <DealKanbanCard deal={MOCK_DEALS[0]!} allStages={KANBAN_STAGES} onMoveStage={vi.fn()} />,
    );

    const menuBtn = screen.getByLabelText('Cloud Migration Pilot: Phase ändern');
    fireEvent.click(menuBtn);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Timer für Focus ablaufen lassen
    vi.advanceTimersByTime(20);

    // Der erste wählbare Eintrag (Erstgespräch geführt) muss fokussiert sein (da Lead eingegangen deaktiviert ist)
    const firstActiveOption = screen.getByRole('menuitem', { name: /Erstgespräch geführt/ });
    expect(document.activeElement).toBe(firstActiveOption);

    // Schließen via Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    // Fokus springt zurück auf den Button
    expect(document.activeElement).toBe(menuBtn);
    vi.useRealTimers();
  });

  it('hält den Fokus mit Focus-Trap innerhalb des Menüs bei Tab und Shift-Tab', async () => {
    vi.useFakeTimers();
    render(
      <DealKanbanCard deal={MOCK_DEALS[0]!} allStages={KANBAN_STAGES} onMoveStage={vi.fn()} />,
    );

    const menuBtn = screen.getByLabelText('Cloud Migration Pilot: Phase ändern');
    fireEvent.click(menuBtn);
    vi.advanceTimersByTime(20);

    const menu = screen.getByRole('menu');
    const buttons = Array.from(menu.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
    const first = buttons[0]!;
    const last = buttons[buttons.length - 1]!;

    // Von erstem Button mit Shift+Tab zurückgehen -> springt auf den letzten Button
    first.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    // Vom letzten Button mit Tab vorwärtsgehen -> springt auf den ersten Button
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(first);

    vi.useRealTimers();
  });

  it('schließt das Phasenmenü beim Scrollen des Fensters, aber nicht beim Scrollen innerhalb des Menüs', () => {
    render(
      <DealKanbanCard deal={MOCK_DEALS[0]!} allStages={KANBAN_STAGES} onMoveStage={vi.fn()} />,
    );

    const menuBtn = screen.getByLabelText('Cloud Migration Pilot: Phase ändern');
    fireEvent.click(menuBtn);
    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();

    // Scroll-Ereignis innerhalb des Menüs (z. B. lange Phasenliste)
    fireEvent.scroll(menu);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Scroll-Ereignis auf Fenster-Ebene
    fireEvent.scroll(window);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('begrenzt das Phasenmenü auf den Viewport und weicht bei Platzmangel nach oben aus', () => {
    // Simuliere Button nahe dem unteren Bildschirmrand (z. B. y=700 bei Viewport-Höhe 768)
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function () {
      if (this.getAttribute('aria-label')?.includes('Phase ändern')) {
        return {
          top: 720,
          bottom: 744,
          left: 500,
          right: 524,
          width: 24,
          height: 24,
          x: 500,
          y: 720,
          toJSON: () => {},
        };
      }
      return originalGetBoundingClientRect.call(this);
    };

    try {
      render(
        <DealKanbanCard deal={MOCK_DEALS[0]!} allStages={KANBAN_STAGES} onMoveStage={vi.fn()} />,
      );

      const menuBtn = screen.getByLabelText('Cloud Migration Pilot: Phase ändern');
      fireEvent.click(menuBtn);

      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      // Bei top=720 und window.innerHeight=768 ist nach unten kein Platz (spaceBelow=16px).
      // Das Menü muss oberhalb des Buttons positioniert werden (top < 720).
      const topStyle = parseInt(menu.style.top, 10);
      expect(topStyle).toBeLessThan(720);
      expect(topStyle).toBeGreaterThanOrEqual(8);
      expect(parseInt(menu.style.maxHeight, 10)).toBeGreaterThan(0);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });

  it('setzt bei HTML5 Drag-Start die Deal-ID', () => {
    const onDragStart = vi.fn();
    render(
      <DealKanbanCard
        deal={MOCK_DEALS[0]!}
        allStages={KANBAN_STAGES}
        onMoveStage={vi.fn()}
        onDragStart={onDragStart}
      />,
    );

    const card = screen.getByTestId('deal-card-deal-1');
    const setDataMock = vi.fn();
    fireEvent.dragStart(card, {
      dataTransfer: {
        setData: setDataMock,
        effectAllowed: 'uninitialized',
      },
    });

    expect(onDragStart).toHaveBeenCalledWith('deal-1');
    expect(setDataMock).toHaveBeenCalledWith('text/plain', 'deal-1');
  });
});

describe('KanbanColumn', () => {
  it('stellt Titel, Zähler und aggregierte Summe dar', () => {
    render(
      <KanbanColumn
        stage="Lead eingegangen"
        deals={[MOCK_DEALS[0]!]}
        allStages={KANBAN_STAGES}
        onMoveStage={vi.fn()}
      />,
    );

    expect(screen.getByRole('region')).toHaveAttribute(
      'aria-label',
      'Vertriebsphase: Lead eingegangen (1 Deals)',
    );
    expect(screen.getByTestId('column-count-Lead eingegangen')).toHaveTextContent('1');
    expect(screen.getByTestId('column-sum-Lead eingegangen')).toHaveTextContent('25.000 €');
  });

  it('zeigt bei leerer Spalte einen Platzhalter', () => {
    render(
      <KanbanColumn
        stage="Verhandlung"
        deals={[]}
        allStages={KANBAN_STAGES}
        onMoveStage={vi.fn()}
      />,
    );

    expect(screen.getByTestId('empty-column-Verhandlung')).toHaveTextContent(
      'Keine Deals in dieser Phase',
    );
  });

  it('akzeptiert Drop-Events und ruft onMoveStage auf', () => {
    const onMoveStage = vi.fn();
    render(
      <KanbanColumn
        stage="Angebot erstellt"
        deals={[]}
        allStages={KANBAN_STAGES}
        onMoveStage={onMoveStage}
      />,
    );

    const column = screen.getByTestId('kanban-column-Angebot erstellt');
    fireEvent.dragOver(column, {
      dataTransfer: { dropEffect: 'none' },
    });
    fireEvent.drop(column, {
      dataTransfer: {
        getData: (type: string) => (type === 'text/plain' ? 'deal-2' : ''),
      },
    });

    expect(onMoveStage).toHaveBeenCalledWith('deal-2', 'Angebot erstellt');
  });
});

describe('DealsKanbanBoard', () => {
  it('rendert alle 7 Kernphasen und die Gesamtstatistiken', () => {
    render(<DealsKanbanBoard deals={MOCK_DEALS} />);

    for (const stage of KANBAN_STAGES) {
      expect(screen.getByTestId(`kanban-column-${stage}`)).toBeInTheDocument();
    }

    // Gesamtvolumen = 25.000 + 15.000 + 120.000 + 45.000 = 205.000 €
    expect(screen.getByText('205.000 €')).toBeInTheDocument();
    // Gewonnenes Volumen = 120.000 €
    expect(screen.getAllByText('120.000 €').length).toBeGreaterThanOrEqual(1);
    // Aktive Deals im Board: 4
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('zeigt Teilsummen-Hinweis und Nachlade-Button bei mehr Deals als geladen', () => {
    const onLoadMore = vi.fn();
    render(
      <DealsKanbanBoard
        deals={MOCK_DEALS}
        totalDeals={100}
        hasMore={true}
        onLoadMore={onLoadMore}
      />,
    );

    expect(screen.getByText(/Teilsumme: 4 von 100 Deals/)).toBeInTheDocument();
    expect(screen.getByText('4 von 100')).toBeInTheDocument();

    const loadMoreBtn = screen.getByTestId('kanban-load-more-btn');
    expect(loadMoreBtn).toBeInTheDocument();
    fireEvent.click(loadMoreBtn);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('aktualisiert Phasen und Summen optimistisch bei Phasenwechsel', () => {
    const onStageChange = vi.fn();
    render(<DealsKanbanBoard deals={MOCK_DEALS} onDealStageChange={onStageChange} />);

    // Verschiebe deal-1 ("Cloud Migration Pilot", 25.000 €) von "Lead eingegangen" nach "Verhandlung"
    const columnVerhandlung = screen.getByTestId('kanban-column-Verhandlung');

    fireEvent.drop(columnVerhandlung, {
      dataTransfer: {
        getData: () => 'deal-1',
      },
    });

    expect(onStageChange).toHaveBeenCalledWith('deal-1', 'Verhandlung');

    // "Lead eingegangen" hat jetzt 0 Deals und 0 €
    expect(screen.getByTestId('column-count-Lead eingegangen')).toHaveTextContent('0');
    expect(screen.getByTestId('column-sum-Lead eingegangen')).toHaveTextContent('0 €');

    // "Verhandlung" hat jetzt 1 Deal und 25.000 €
    expect(screen.getByTestId('column-count-Verhandlung')).toHaveTextContent('1');
    expect(screen.getByTestId('column-sum-Verhandlung')).toHaveTextContent('25.000 €');
  });

  it('setzt activeDragId beim Drop in eine andere Spalte sofort zurück (kein verbleibender Drag-Zustand)', () => {
    render(<DealsKanbanBoard deals={MOCK_DEALS} />);

    const card = screen.getByTestId('deal-card-deal-1');
    // Simuliere Drag-Start
    fireEvent.dragStart(card, {
      dataTransfer: {
        setData: vi.fn(),
        effectAllowed: 'move',
      },
    });

    // Die Karte ist im Drag-Zustand (opacity-40)
    expect(card.className).toContain('opacity-40');

    // Drop in Spalte "Verhandlung"
    const columnVerhandlung = screen.getByTestId('kanban-column-Verhandlung');
    fireEvent.drop(columnVerhandlung, {
      dataTransfer: {
        getData: () => 'deal-1',
      },
    });

    // Nach dem Drop darf die neu gemountete Karte in "Verhandlung" kein opacity-40 mehr haben
    const movedCard = screen.getByTestId('deal-card-deal-1');
    expect(movedCard.className).not.toContain('opacity-40');
  });
});
