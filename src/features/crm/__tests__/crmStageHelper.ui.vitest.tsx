import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  KANBAN_STAGES,
  normalizeCanonicalStageLabel,
  isWonStage,
  isLostStage,
  isClosedStage,
  getDealStageFilterVariants,
} from '../utils/crmStageHelper';
import { DealsKanbanBoard } from '../components/DealsKanbanBoard';
import { DealKanbanCard } from '../components/DealKanbanCard';
import type { ImportedFunnelDeal } from '@/types/crm';

describe('crmStageHelper – Kanonische CRM-Phasen und Statusprüfungen', () => {
  it('enthält die 7 Kernphasen in KANBAN_STAGES', () => {
    expect(KANBAN_STAGES).toEqual([
      'Lead eingegangen',
      'Erstgespräch geführt',
      'Bedarfsanalyse',
      'Angebot erstellt',
      'Verhandlung',
      'Deal gewonnen',
      'Deal verloren',
    ]);
  });

  it('normalisiert kanonische HubSpot- und CRM-Stages auf deutsche Standardlabels', () => {
    expect(normalizeCanonicalStageLabel('WON')).toBe('Deal gewonnen');
    expect(normalizeCanonicalStageLabel('won')).toBe('Deal gewonnen');
    expect(normalizeCanonicalStageLabel('LOST')).toBe('Deal verloren');
    expect(normalizeCanonicalStageLabel('lost')).toBe('Deal verloren');
    expect(normalizeCanonicalStageLabel('LEAD')).toBe('Lead eingegangen');
    expect(normalizeCanonicalStageLabel('QUALIFIED_LEAD')).toBe('Erstgespräch geführt');
    expect(normalizeCanonicalStageLabel('PITCH_DEMO')).toBe('Bedarfsanalyse');
    expect(normalizeCanonicalStageLabel('PROPOSAL')).toBe('Angebot erstellt');
    expect(normalizeCanonicalStageLabel('CLOSING')).toBe('Verhandlung');
    expect(normalizeCanonicalStageLabel('closedwon')).toBe('Deal gewonnen');
    expect(normalizeCanonicalStageLabel('closedlost')).toBe('Deal verloren');

    // Bestehende deutsche Labels und Custom-Stages bleiben unverändert
    expect(normalizeCanonicalStageLabel('Deal gewonnen')).toBe('Deal gewonnen');
    expect(normalizeCanonicalStageLabel('Spezial-Phase')).toBe('Spezial-Phase');
    expect(normalizeCanonicalStageLabel('')).toBe('');
    expect(normalizeCanonicalStageLabel(undefined)).toBe('');
  });

  it('erkennt gewonnene, verlorene und geschlossene Phasen zuverlässig', () => {
    expect(isWonStage('WON')).toBe(true);
    expect(isWonStage('Deal gewonnen')).toBe(true);
    expect(isWonStage('closedwon')).toBe(true);
    expect(isWonStage('Lead eingegangen')).toBe(false);

    expect(isLostStage('LOST')).toBe(true);
    expect(isLostStage('Deal verloren')).toBe(true);
    expect(isLostStage('closedlost')).toBe(true);
    expect(isLostStage('Angebot erstellt')).toBe(false);

    expect(isClosedStage('WON')).toBe(true);
    expect(isClosedStage('LOST')).toBe(true);
    expect(isClosedStage('Deal gewonnen')).toBe(true);
    expect(isClosedStage('Deal verloren')).toBe(true);
    expect(isClosedStage('Verhandlung')).toBe(false);
  });

  it('ermittelt alle Filtervarianten einer Deal-Phase für serverseitige Abfragen', () => {
    const wonVariants = getDealStageFilterVariants('Deal gewonnen');
    expect(wonVariants).toContain('Deal gewonnen');
    expect(wonVariants).toContain('WON');
    expect(wonVariants).toContain('closedwon');
    expect(wonVariants).toContain('ABGESCHLOSSEN UND GEWONNEN');

    const wonFromIdentifier = getDealStageFilterVariants('WON');
    expect(wonFromIdentifier).toContain('Deal gewonnen');
    expect(wonFromIdentifier).toContain('WON');

    expect(getDealStageFilterVariants('Unbekannte Phase')).toEqual(['Unbekannte Phase']);
    expect(getDealStageFilterVariants(undefined)).toEqual([]);
  });
});

describe('DealsKanbanBoard & DealKanbanCard mit kanonischen Phasen (Befund 1)', () => {
  const MOCK_DEALS_CANONICAL: ImportedFunnelDeal[] = [
    {
      id: 'd-won-1',
      dealName: 'Kanonischer Won Deal',
      stage: 'WON',
      amount: 45000,
      closeDate: '2026-01-01', // abgelaufenes Datum
      pipeline: 'Enterprise SaaS',
    },
    {
      id: 'd-lost-1',
      dealName: 'Kanonischer Lost Deal',
      stage: 'LOST',
      amount: 15000,
      closeDate: '2026-01-01',
      pipeline: 'Enterprise SaaS',
    },
    {
      id: 'd-de-won',
      dealName: 'Deutscher Won Deal',
      stage: 'Deal gewonnen',
      amount: 55000,
      closeDate: '2026-12-31',
      pipeline: 'Enterprise SaaS',
    },
  ];

  it('gruppiert WON-Deals in die Spalte "Deal gewonnen" und addiert sie zum gewonnenen Volumen', () => {
    render(<DealsKanbanBoard deals={MOCK_DEALS_CANONICAL} />);

    // Keine extra Spalte für "WON" oder "LOST"
    expect(screen.queryByTestId('column-header-WON')).not.toBeInTheDocument();
    expect(screen.queryByTestId('column-header-LOST')).not.toBeInTheDocument();

    // Spalte "Deal gewonnen" enthält beide gewonnenen Deals (WON + Deal gewonnen = 2 Deals)
    const wonCount = screen.getByTestId('column-count-Deal gewonnen');
    expect(wonCount).toHaveTextContent('2');

    // Gewonnenes Volumen im Header und in der Spalte: 45.000 + 55.000 = 100.000 €
    expect(screen.getByTestId('column-sum-Deal gewonnen')).toHaveTextContent('100.000 €');
    expect(screen.getAllByText('100.000 €')).toHaveLength(2);
  });

  it('zeigt für WON- und LOST-Deals trotz vergangener Fälligkeit keine Überfälligkeitswarnung an', () => {
    const { container: containerWon } = render(
      <DealKanbanCard
        deal={MOCK_DEALS_CANONICAL[0]!}
        moveStages={KANBAN_STAGES}
        onMoveStage={() => {}}
      />,
    );
    // WON Deal darf kein "Überfällig"-Badge besitzen
    expect(containerWon).not.toHaveTextContent('Überfällig');

    const { container: containerLost } = render(
      <DealKanbanCard
        deal={MOCK_DEALS_CANONICAL[1]!}
        moveStages={KANBAN_STAGES}
        onMoveStage={() => {}}
      />,
    );
    // LOST Deal darf kein "Überfällig"-Badge besitzen
    expect(containerLost).not.toHaveTextContent('Überfällig');
  });
});
