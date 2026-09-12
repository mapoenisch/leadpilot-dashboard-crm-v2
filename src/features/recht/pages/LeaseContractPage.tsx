import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { MIETVERTRAG } from '@/domain/rechtData';

export function LeaseContractPage() {
  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <SectionHeader eyebrow="Recht & Gründung" title={MIETVERTRAG.title} description="Standortmietvertrag Leipzig Augustusplatz." />
      <Card padding="0">
        <Table columns={[{ key: '0', label: 'Vertragspunkt' }, { key: '1', label: 'Konditionen' }]} rows={MIETVERTRAG.details.map((d: string[]) => ({ 0: d[0], 1: d[1] }))} />
      </Card>
    </div>
  );
}
