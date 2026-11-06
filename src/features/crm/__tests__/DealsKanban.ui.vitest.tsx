import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ImportedFunnelDeal } from '@/types/crm';
import { DealsViewToggle } from '../components/DealsViewToggle';
import { DealKanbanCard } from '../components/DealKanbanCard';
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
    closeDate: '2025-01-01', // Vergangen -> Überfällig
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

    fireEvent.click(kanbanBtn);
    expect(onChange).toHaveBeenCalledWith('kanban');

    rerender(<DealsViewToggle viewMode="kanban" onChange={onChange} />);
    expect(tableBtn).toHaveAttribute('aria-pressed', 'false');
    expect(kanbanBtn).toHaveAttribute('aria-pressed', 'true');
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

  it('erlaubt barrierefreien Phasenwechsel über das Tastaturmenü', () => {
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
});
