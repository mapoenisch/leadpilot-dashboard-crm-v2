import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { CS } from '@/domain/kundenData';

export function CustomerSuccessPage() {
  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <SectionHeader
        eyebrow="Kunden"
        title={CS.title}
        description="Retention, Onboarding & Customer Success KPIs."
      />
      <div className="grid grid-cols-4 gap-[var(--space-4)]">
        {CS.kpis.map((k) => (
          <Card key={k.label}>
            <div className="text-[12px] text-[var(--color-text-muted)]">{k.label}</div>
            <div className="font-display text-[24px] font-bold text-primary mt-[4px]">{k.val}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
