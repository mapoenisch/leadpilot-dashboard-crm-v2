import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { BMC } from '@/domain/geschaeftsmodellData';

export function BmcPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <SectionHeader eyebrow="Geschäftsmodell" title={BMC.title} description="9 Bausteine des LeadPilot Geschäftsmodells." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
        {BMC.sections.map((sec: { title: string; items: string[] }) => (
          <Card key={sec.title}>
            <h4 style={{ margin: '0 0 8px', color: 'var(--color-primary)', fontSize: '15px', fontFamily: 'var(--font-display)' }}>{sec.title}</h4>
            <ul style={{ paddingLeft: '16px', fontSize: '12.5px', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {sec.items.map((item: string, i: number) => <li key={i}>{item}</li>)}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
