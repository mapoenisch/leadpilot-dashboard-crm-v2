import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { SimpleChart, ChartFrame } from '@/components/ui/Charts';
import { MBUDGET } from '@/domain/vertriebData';

export function MarketingBudgetPage() {
  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <SectionHeader
        eyebrow="Vertrieb & Marketing"
        title="Marketing-Budget & ROI"
        description="Soll/Ist Budget-Vergleich."
      />
      <ChartFrame
        title="Budget vs. Ist nach Kanal (€)"
        subtitle="Soll-Budget im Vergleich zu den tatsächlichen Ausgaben 2025"
        sourceLabel="Finanzcontrolling"
      >
        <SimpleChart config={MBUDGET.chartSpend} />
      </ChartFrame>
      <Card padding="0">
        <Table
          columns={MBUDGET.headers.map((h, i) => ({ key: String(i), label: h }))}
          rows={MBUDGET.rows.map((r) => ({
            0: r[0],
            1: r[1],
            2: r[2],
            3: r[3],
            4: r[4],
            5: r[5],
            6: r[6],
          }))}
        />
      </Card>
    </div>
  );
}
