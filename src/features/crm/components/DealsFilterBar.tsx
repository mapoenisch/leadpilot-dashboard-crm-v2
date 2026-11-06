import { Search } from 'lucide-react';
import { Select, SelectOption } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';

export const BASE_STAGE_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'Alle Vertriebsphasen' },
  { value: 'Lead eingegangen', label: 'Lead eingegangen' },
  { value: 'Erstgespräch geführt', label: 'Erstgespräch geführt' },
  { value: 'Bedarfsanalyse', label: 'Bedarfsanalyse' },
  { value: 'Angebot erstellt', label: 'Angebot erstellt' },
  { value: 'Verhandlung', label: 'Verhandlung' },
  { value: 'Deal gewonnen', label: 'Deal gewonnen' },
  { value: 'Deal verloren', label: 'Deal verloren' },
];

export const DEAL_SORT_OPTIONS: SelectOption[] = [
  { value: 'close_date', label: 'Abschlussdatum' },
  { value: 'amount', label: 'Betrag' },
  { value: 'deal_name', label: 'Deal Name' },
  { value: 'stage', label: 'Vertriebsphase' },
];

export const ORDER_OPTIONS: SelectOption[] = [
  { value: 'desc', label: 'Absteigend' },
  { value: 'asc', label: 'Aufsteigend' },
];

export interface DealsFilterBarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  stageFilter: string;
  stageOptions: SelectOption[];
  onStageChange: (val: string) => void;
  sortField: string;
  onSortChange: (val: string) => void;
  sortOrder: string;
  onOrderChange: (val: string) => void;
  resultCountText: string;
}

export function DealsFilterBar({
  searchTerm,
  onSearchChange,
  stageFilter,
  stageOptions,
  onStageChange,
  sortField,
  onSortChange,
  sortOrder,
  onOrderChange,
  resultCountText,
}: DealsFilterBarProps) {
  return (
    <div className="crm-v2-filter-bar">
      <div className="flex-[1_1_280px] max-w-full">
        <Input
          type="search"
          aria-label="Deals suchen"
          placeholder="Deal Name oder Pipeline suchen..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          leadingIcon={<Search size={16} />}
          sizeVariant="sm"
        />
      </div>

      <div className="flex items-center gap-[var(--space-4)] flex-wrap flex-[0_1_auto]">
        <div className="min-w-[170px] w-full max-w-[210px]">
          <Select
            label="Vertriebsphase:"
            options={stageOptions}
            value={stageFilter}
            onChange={onStageChange}
            sizeVariant="sm"
            fullWidth
          />
        </div>
        <div className="min-w-[170px] w-full max-w-[210px]">
          <Select
            label="Sortierung:"
            options={DEAL_SORT_OPTIONS}
            value={sortField}
            onChange={onSortChange}
            sizeVariant="sm"
            fullWidth
          />
        </div>
        <div className="min-w-[150px] w-full max-w-[180px]">
          <Select
            label="Reihenfolge:"
            options={ORDER_OPTIONS}
            value={sortOrder}
            onChange={onOrderChange}
            sizeVariant="sm"
            fullWidth
          />
        </div>
        <div className="crm-v2-result-count" aria-live="polite">
          {resultCountText}
        </div>
      </div>
    </div>
  );
}
