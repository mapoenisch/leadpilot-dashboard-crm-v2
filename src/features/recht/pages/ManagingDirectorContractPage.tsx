import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { GF_VERTRAG } from '@/domain/rechtData';

export function ManagingDirectorContractPage() {
  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <SectionHeader eyebrow="Recht & Gründung" title={GF_VERTRAG.title} description="Anstellungsvertrag der Geschäftsführung." />
      <Card padding="0">
        <Table columns={[{ key: '0', label: 'Bestimmung' }, { key: '1', label: 'Vereinbarung' }]} rows={GF_VERTRAG.details.map((d: string[]) => ({ 0: d[0], 1: d[1] }))} />
      </Card>
    </div>
  );
}
