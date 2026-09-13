import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { OrganisationUnit } from '@/domain/organisationData';

export interface OrganisationUnitCardProps {
  unit: OrganisationUnit;
  highlight?: boolean;
}

export function OrganisationUnitCard({ unit, highlight = false }: OrganisationUnitCardProps) {
  const isCritical =
    unit.staffing.includes('kritisch') ||
    unit.staffing.includes('ausgereizt') ||
    unit.staffing.includes('Lücke');
  // G39 Welle 3: Status-Farben aus Build-Zeit-bekannten Werten →
  // Klassen-Ternaries (kein Laufzeitwert, Entscheidung 2).
  const frameClass = highlight
    ? 'border-[rgba(0,217,198,0.4)] shadow-[0_0_20px_rgba(0,217,198,0.08)]'
    : isCritical
      ? 'border-[rgba(255,122,61,0.35)] shadow-[0_0_16px_rgba(255,122,61,0.06)]'
      : 'border-border shadow-none';

  return (
    <Card
      variant="glass"
      // G39 Welle 3: nutzt den Block-A className-Merge.
      className={`flex flex-col gap-[var(--space-2)] h-full min-w-0 relative border border-solid ${frameClass}`}
    >
      <div className="flex items-center justify-between flex-wrap gap-[var(--space-2)]">
        <h3
          className={`m-0 font-display font-semibold text-text leading-[1.3] ${unit.isRoot ? 'text-[16px]' : 'text-[15px]'}`}
        >
          {unit.role}
        </h3>
        <Badge variant="cyan">{unit.fte}</Badge>
      </div>

      <p className="m-0 text-[13px] leading-[1.45] break-words text-[var(--color-text-muted)]">
        {unit.staffing}
      </p>

      {isCritical && (
        <div className="mt-auto pt-[var(--space-1)]">
          <Badge variant="orange">Kapazitätsfokus</Badge>
        </div>
      )}
    </Card>
  );
}
