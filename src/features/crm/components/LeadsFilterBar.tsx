import { Search } from 'lucide-react';
import { Select, SelectOption } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { QUALITY_OPTS, ORDER_OPTS } from '../utils/leadsPageConfig';

export interface LeadsFilterBarProps {
  activeTab: string;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  qualityFilter: string;
  onQualityFilterChange: (val: string) => void;
  filterLabel?: string;
  filterOptions?: SelectOption[];
  filterVal: string;
  onFilterChange: (val: string) => void;
  sortOptions: SelectOption[];
  sortField: string;
  onSortFieldChange: (val: string) => void;
  sortOrder: string;
  onSortOrderChange: (val: string) => void;
}

export function LeadsFilterBar({
  activeTab,
  searchTerm,
  onSearchChange,
  qualityFilter,
  onQualityFilterChange,
  filterLabel,
  filterOptions,
  filterVal,
  onFilterChange,
  sortOptions,
  sortField,
  onSortFieldChange,
  sortOrder,
  onSortOrderChange,
}: LeadsFilterBarProps) {
  return (
    <div className="crm-v2-filter-bar">
      <div className="flex-[1_1_260px] max-w-full">
        <Input
          type="search"
          aria-label="Suche in Liste"
          placeholder="Suchbegriff eingeben..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          leadingIcon={<Search size={16} />}
          sizeVariant="sm"
        />
      </div>
      <div className="flex items-center gap-[var(--space-3)] flex-wrap flex-[0_1_auto]">
        {activeTab === 'contacts' && (
          <div className="min-w-[150px] w-full max-w-[190px]">
            <Select
              label="Lead-Qualität:"
              options={QUALITY_OPTS}
              value={qualityFilter}
              onChange={onQualityFilterChange}
              sizeVariant="sm"
              fullWidth
            />
          </div>
        )}
        {[
          {
            l: filterLabel,
            opts: filterOptions,
            v: filterVal,
            s: onFilterChange,
            w: 'min-w-[150px] max-w-[190px]',
          },
          {
            l: 'Sortierung:',
            opts: sortOptions,
            v: sortField,
            s: onSortFieldChange,
            w: 'min-w-[150px] max-w-[190px]',
          },
          {
            l: 'Reihenfolge:',
            opts: ORDER_OPTS,
            v: sortOrder,
            s: onSortOrderChange,
            w: 'min-w-[140px] max-w-[170px]',
          },
        ].map((f) => (
          <div key={f.l} className={`w-full ${f.w}`}>
            <Select
              label={f.l ?? ''}
              options={f.opts ?? []}
              value={f.v}
              onChange={f.s}
              sizeVariant="sm"
              fullWidth
            />
          </div>
        ))}
      </div>
    </div>
  );
}
