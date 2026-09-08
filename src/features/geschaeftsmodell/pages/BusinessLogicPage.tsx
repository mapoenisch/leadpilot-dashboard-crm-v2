import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { LOGIK } from '@/domain/geschaeftsmodellData';

export function BusinessLogicPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <SectionHeader eyebrow="Geschäftsmodell" title={LOGIK.title} description="Wirtschaftliche Skalierungshebel." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
        {LOGIK.levers.map((l: { title: string; desc: string }) => (
          <Card key={l.title} featured>
            <h4 style={{ margin: '0 0 8px', color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}>{l.title}</h4>
            <p style={{ margin: 0, color: 'var(--color-text)', fontSize: '13.5px', lineHeight: 1.5 }}>{l.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
