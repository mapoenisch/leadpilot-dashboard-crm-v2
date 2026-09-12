import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { CONTENT } from '@/domain/vertriebData';

export function ContentStrategyPage() {
  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <SectionHeader eyebrow="Vertrieb & Marketing" title={CONTENT.title} description="Schwerpunkte der LeadPilot Content-Strategie." />
      <Card featured>
        <ul className="pl-[18px] text-[14px] flex flex-col gap-[10px]">
          {CONTENT.focusAreas.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </Card>
    </div>
  );
}
