import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { EMPATHY } from '@/domain/kundenData';

export function EmpathyPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <SectionHeader eyebrow="Kunden" title={EMPATHY.title} description="Empathy Map & Hero Statement." />
      <Card featured>
        <h3 style={{ margin: '0 0 12px', color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}>Hero Statement</h3>
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>{EMPATHY.heroStatement}</p>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        {EMPATHY.quadrants.map((q) => (
          <Card key={q.title}>
            <h4 style={{ margin: '0 0 8px', color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>{q.title}</h4>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '13.5px' }}>{q.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
