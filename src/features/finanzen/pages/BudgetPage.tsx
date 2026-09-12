import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { SimpleChart, ChartFrame } from '@/components/ui/Charts';
import { BUDGET, CHART_BUDGET } from '@/domain/finanzenData';

export function BudgetPage() {
  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <SectionHeader eyebrow="Finanzen" title={BUDGET.title} description="Geplante Ausgaben und Ressourcenverteilung." />
      <ChartFrame
        title="Budget- und Kostenallokation 2026"
        subtitle="Geplante Mittelverwendung (€ 830.000 Gesamtbudget)"
        sourceLabel="Budgetplanung 2026"
      >
        <SimpleChart config={CHART_BUDGET} />
      </ChartFrame>
      <Card padding="0">
        <Table columns={[{ key: 'area', label: 'Bereich' }, { key: 'budget', label: 'Budget' }, { key: 'share', label: 'Anteil' }]} rows={BUDGET.allocations} />
      </Card>
    </div>
  );
}
