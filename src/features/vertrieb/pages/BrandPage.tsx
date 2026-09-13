import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { SimpleChart, ChartFrame } from '@/components/ui/Charts';
import { BRAND } from '@/domain/vertriebData';

export function BrandPage() {
  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <SectionHeader
        eyebrow="Vertrieb & Marketing"
        title="Brand & Digital Presence"
        description="Reichweite und Bewertungen."
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-[var(--space-4)]">
        {BRAND.metrics.map((m) => (
          <Card key={m.label}>
            <div className="text-[12px] text-[var(--color-text-muted)]">{m.label}</div>
            <div className="text-[24px] font-bold font-display text-primary mt-[4px]">{m.val}</div>
          </Card>
        ))}
      </div>
      <ChartFrame
        title="Wachstum Besucher, Follower & Abonnenten (2025)"
        subtitle="Monatliche Entwicklung der digitalen Reichweite"
        sourceLabel="Web & Social Analytics"
      >
        <SimpleChart config={BRAND.chart} />
      </ChartFrame>
    </div>
  );
}
