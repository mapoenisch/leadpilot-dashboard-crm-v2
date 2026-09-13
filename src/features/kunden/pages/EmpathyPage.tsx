import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { EMPATHY } from '@/domain/kundenData';

export function EmpathyPage() {
  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <SectionHeader
        eyebrow="Kunden"
        title={EMPATHY.title}
        description="Empathy Map & Hero Statement."
      />
      <Card featured>
        <h3 className="m-0 mb-[12px] font-display text-primary">Hero Statement</h3>
        <p className="text-[15px] font-semibold text-text">{EMPATHY.heroStatement}</p>
      </Card>
      <div className="grid grid-cols-2 gap-[var(--space-4)]">
        {EMPATHY.quadrants.map((q) => (
          <Card key={q.title}>
            <h4 className="m-0 mb-[8px] font-display text-text">{q.title}</h4>
            <p className="m-0 text-[13.5px] text-[var(--color-text-muted)]">{q.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
