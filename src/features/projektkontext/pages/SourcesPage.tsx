import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { QUELLEN } from '@/domain/projektkontextData';

export function SourcesPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <SectionHeader eyebrow="Projektkontext" title={QUELLEN.title} description="Grundlagendokumente & Unterlagen." />
      <Card padding="0">
        <Table columns={[{ key: 'name', label: 'Dokument' }, { key: 'desc', label: 'Inhalt & Beschreibung' }]} rows={QUELLEN.sources} />
      </Card>
    </div>
  );
}
