import { Table, Kanban } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export type DealsViewMode = 'tabelle' | 'kanban';

export interface DealsViewToggleProps {
  viewMode: DealsViewMode;
  onChange: (mode: DealsViewMode) => void;
  disabled?: boolean;
}

export function DealsViewToggle({ viewMode, onChange, disabled }: DealsViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Ansicht wählen"
      className="inline-flex items-center rounded-lg border border-border bg-surface/80 p-0.5 backdrop-blur-sm shadow-sm"
    >
      <Button
        variant={viewMode === 'tabelle' ? 'primary' : 'secondary'}
        size="sm"
        disabled={disabled}
        onClick={() => onChange('tabelle')}
        aria-pressed={viewMode === 'tabelle'}
        data-testid="deals-view-table-btn"
        className="h-8 gap-1.5 px-2.5 text-xs font-medium"
      >
        <Table size={14} aria-hidden="true" />
        <span className="hidden sm:inline">Tabelle</span>
      </Button>

      <Button
        variant={viewMode === 'kanban' ? 'primary' : 'secondary'}
        size="sm"
        disabled={disabled}
        onClick={() => onChange('kanban')}
        aria-pressed={viewMode === 'kanban'}
        data-testid="deals-view-kanban-btn"
        className="h-8 gap-1.5 px-2.5 text-xs font-medium"
      >
        <Kanban size={14} aria-hidden="true" />
        <span className="hidden sm:inline">Kanban</span>
      </Button>
    </div>
  );
}
