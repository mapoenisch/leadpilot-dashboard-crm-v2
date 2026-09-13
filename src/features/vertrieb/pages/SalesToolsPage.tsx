import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { TOOLS } from '@/domain/vertriebData';

export function SalesToolsPage() {
  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <SectionHeader
        eyebrow="Vertrieb & Marketing"
        title={TOOLS.title}
        description="Digitale Softwarelösungen im Vertrieb."
      />
      <Card padding="0">
        <Table
          columns={[
            { key: 'tool', label: 'Tool' },
            { key: 'usage', label: 'Einsatzbereich' },
          ]}
          rows={TOOLS.stack}
        />
      </Card>
    </div>
  );
}
