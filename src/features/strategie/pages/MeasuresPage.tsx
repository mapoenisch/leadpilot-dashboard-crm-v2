import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { MASSNAHMEN } from '@/domain/strategieData';

export function MeasuresPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <SectionHeader eyebrow="Strategie" title={MASSNAHMEN.title} description="Priorisiertes Maßnahmenportfolio." />
      <Card padding="0">
        <Table
          columns={[{ key: 'name', label: 'Maßnahme' }, { key: 'prio', label: 'Priorität', render: (r: any) => <Badge variant="orange">{r.prio}</Badge> }, { key: 'owner', label: 'Owner' }]}
          rows={MASSNAHMEN.items}
        />
      </Card>
    </div>
  );
}
