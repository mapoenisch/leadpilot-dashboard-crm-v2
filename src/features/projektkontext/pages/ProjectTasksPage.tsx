import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { PROJEKT } from '@/domain/projektkontextData';

export function ProjectTasksPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <SectionHeader eyebrow="Projektkontext" title={PROJEKT.title} description={PROJEKT.summary} />
      <Card padding="0">
        <Table
          columns={[{ key: 'id', label: 'Task ID' }, { key: 'title', label: 'Arbeitspaket' }, { key: 'status', label: 'Status', render: (r: any) => <Badge variant="cyan">{r.status}</Badge> }, { key: 'date', label: 'Datum' }]}
          rows={PROJEKT.tasks}
        />
      </Card>
    </div>
  );
}
