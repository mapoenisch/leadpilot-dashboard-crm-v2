import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { INTEGR } from '@/domain/produktData';

export function IntegrationPage() {
  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <SectionHeader
        eyebrow="Produkt"
        title={INTEGR.title}
        description="Technologie-Stack & Sicherheit."
      />
      <Card padding="0">
        <Table
          columns={[
            { key: 'category', label: 'Bereich' },
            { key: 'tech', label: 'Technologie / Spezifikation' },
          ]}
          rows={INTEGR.stack}
        />
      </Card>
    </div>
  );
}
