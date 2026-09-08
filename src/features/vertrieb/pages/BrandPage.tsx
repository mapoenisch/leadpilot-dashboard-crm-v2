import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { SimpleChart, ChartFrame } from '@/components/ui/Charts';
import { BRAND } from '@/domain/vertriebData';

export function BrandPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <SectionHeader eyebrow="Vertrieb & Marketing" title="Brand & Digital Presence" description="Reichweite und Bewertungen." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-4)' }}>
        {BRAND.metrics.map((m) => (
          <Card key={m.label}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{m.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-primary)', marginTop: '4px' }}>{m.val}</div>
          </Card>
        ))}
      </div>
      <ChartFrame
        title="Wachstum Besucher, Follower & Abonnenten (2025)"
        subtitle="Monatliche Entwicklung der digitalen Reichweite"
        sourceLabel="Web & Social Analytics"
      >
        <SimpleChart config={BRAND.chart as any} />
      </ChartFrame>
    </div>
  );
}
