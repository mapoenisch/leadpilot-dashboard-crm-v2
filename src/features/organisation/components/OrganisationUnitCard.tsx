import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { OrganisationUnit } from '@/domain/organisationData';

export interface OrganisationUnitCardProps {
  unit: OrganisationUnit;
  highlight?: boolean;
}

export function OrganisationUnitCard({ unit, highlight = false }: OrganisationUnitCardProps) {
  const isCritical = unit.staffing.includes('kritisch') || unit.staffing.includes('ausgereizt') || unit.staffing.includes('Lücke');

  return (
    <Card
      variant="glass"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        height: '100%',
        minWidth: 0,
        position: 'relative',
        border: highlight
          ? '1px solid rgba(0, 217, 198, 0.4)'
          : isCritical
          ? '1px solid rgba(255, 122, 61, 0.35)'
          : '1px solid var(--color-border)',
        boxShadow: highlight
          ? '0 0 20px rgba(0, 217, 198, 0.08)'
          : isCritical
          ? '0 0 16px rgba(255, 122, 61, 0.06)'
          : 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: unit.isRoot ? '16px' : '15px',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            color: 'var(--color-text)',
            lineHeight: 1.3,
          }}
        >
          {unit.role}
        </h3>
        <Badge variant="cyan">{unit.fte}</Badge>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          lineHeight: 1.45,
          wordBreak: 'break-word',
        }}
      >
        {unit.staffing}
      </p>

      {isCritical && (
        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-1)' }}>
          <Badge variant="orange">Kapazitätsfokus</Badge>
        </div>
      )}
    </Card>
  );
}
