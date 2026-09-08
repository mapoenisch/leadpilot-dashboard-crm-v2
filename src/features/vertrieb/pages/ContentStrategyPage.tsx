import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { CONTENT } from '@/domain/vertriebData';

export function ContentStrategyPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <SectionHeader eyebrow="Vertrieb & Marketing" title={CONTENT.title} description="Schwerpunkte der LeadPilot Content-Strategie." />
      <Card featured>
        <ul style={{ paddingLeft: '18px', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {CONTENT.focusAreas.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </Card>
    </div>
  );
}
