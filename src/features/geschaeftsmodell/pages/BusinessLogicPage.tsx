import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { LOGIK } from '@/domain/geschaeftsmodellData';

export function BusinessLogicPage() {
  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <SectionHeader eyebrow="Geschäftsmodell" title={LOGIK.title} description="Wirtschaftliche Skalierungshebel." />
      <div className="grid grid-cols-3 gap-[var(--space-4)]">
        {LOGIK.levers.map((l: { title: string; desc: string }) => (
          <Card key={l.title} featured>
            <h4 className="m-0 mb-[8px] font-display text-primary">{l.title}</h4>
            <p className="m-0 text-[13.5px] leading-[1.5] text-text">{l.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
