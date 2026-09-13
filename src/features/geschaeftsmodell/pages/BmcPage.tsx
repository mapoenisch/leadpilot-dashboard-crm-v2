import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { BMC } from '@/domain/geschaeftsmodellData';

export function BmcPage() {
  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <SectionHeader
        eyebrow="Geschäftsmodell"
        title={BMC.title}
        description="9 Bausteine des LeadPilot Geschäftsmodells."
      />
      <div className="grid grid-cols-3 gap-[var(--space-4)]">
        {BMC.sections.map((sec: { title: string; items: string[] }) => (
          <Card key={sec.title}>
            <h4 className="m-0 mb-[8px] font-display text-[15px] text-primary">{sec.title}</h4>
            <ul className="flex flex-col gap-[4px] pl-[16px] text-[12.5px] text-[var(--color-text-muted)]">
              {sec.items.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
