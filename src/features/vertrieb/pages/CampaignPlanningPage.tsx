import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { SimpleChart, ChartFrame } from '@/components/ui/Charts';
import { KAMPAGNE } from '@/domain/vertriebData';

export function CampaignPlanningPage() {
  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <SectionHeader
        eyebrow="Vertrieb & Marketing"
        title={KAMPAGNE.title}
        description={KAMPAGNE.summary}
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[var(--space-4)]">
        {KAMPAGNE.kpis.map((k) => (
          <Card key={k.label}>
            <div className="text-[12px] text-[var(--color-text-muted)]">{k.label}</div>
            <div className="text-[26px] font-bold font-display text-primary mt-[4px]">{k.val}</div>
          </Card>
        ))}
      </div>
      <ChartFrame
        title="Kampagnenbudget-Verteilung Connect (€ 2.500 gesamt)"
        subtitle="Allokation der Mittel auf Kanäle und Maßnahmen"
        sourceLabel="Kampagnenplanung"
      >
        <SimpleChart config={KAMPAGNE.chartKampbudget} />
      </ChartFrame>
    </div>
  );
}
