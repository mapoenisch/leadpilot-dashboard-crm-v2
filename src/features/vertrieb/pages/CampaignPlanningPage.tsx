import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { SimpleChart, ChartFrame } from '@/components/ui/Charts';
import { KAMPAGNE } from '@/domain/vertriebData';

export function CampaignPlanningPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <SectionHeader eyebrow="Vertrieb & Marketing" title={KAMPAGNE.title} description={KAMPAGNE.summary} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
        {KAMPAGNE.kpis.map((k) => (
          <Card key={k.label}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{k.label}</div>
            <div style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-primary)', marginTop: '4px' }}>{k.val}</div>
          </Card>
        ))}
      </div>
      <ChartFrame
        title="Kampagnenbudget-Verteilung Connect (€ 2.500 gesamt)"
        subtitle="Allokation der Mittel auf Kanäle und Maßnahmen"
        sourceLabel="Kampagnenplanung"
      >
        <SimpleChart config={KAMPAGNE.chartKampbudget as any} />
      </ChartFrame>
    </div>
  );
}
