import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { RISIKO } from '@/domain/strategieData';

export function RiskRegisterPage() {
  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <SectionHeader
        eyebrow="Strategie"
        title="Risikoregister"
        description="Identifizierte Unternehmensrisiken & Vorbeugemaßnahmen."
      />
      <Card padding="0">
        <Table
          columns={RISIKO.headers.map((h, i) => ({ key: String(i), label: h }))}
          rows={RISIKO.rows.map((r) => ({ 0: r[0], 1: r[1], 2: r[2], 3: r[3] }))}
        />
      </Card>
    </div>
  );
}
