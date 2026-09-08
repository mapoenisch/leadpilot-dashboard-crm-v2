import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { CS } from '@/domain/kundenData';

export function CustomerSuccessPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <SectionHeader eyebrow="Kunden" title={CS.title} description="Retention, Onboarding & Customer Success KPIs." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
        {CS.kpis.map((k) => (
          <Card key={k.label}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{k.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-primary)', marginTop: '4px' }}>{k.val}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
