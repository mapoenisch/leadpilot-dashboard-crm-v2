// Executive Dashboard V2 (Auftrag 148 / P05):
// Widget-Bibliothek (Zone Links) des neuen Dashboard-Editors.
// Ermöglicht das Durchsuchen, Filtern nach Fachkategorien und Hinzufügen
// zulässiger CRM-, Baseline- und Live-Kennzahlen aus DASHBOARD_CATALOG.

import { useMemo, useState, type ChangeEvent } from 'react';
import {
  BarChart2,
  ChevronLeft,
  Hash,
  LineChart,
  PieChart,
  Plus,
  Search,
  Sparkles,
  Table,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  DASHBOARD_CATEGORIES,
  getActiveEntries,
  VIEWS_BY_SHAPE,
  type ActiveCatalogEntry,
  type DashboardView,
  type SourceLayer,
} from '../../model/dashboardCatalog';

export interface WidgetLibraryV2Props {
  onAddTile: (catalogId: string) => void;
  tileCount: number;
  maxTiles?: number;
  onClose?: () => void;
  className?: string;
}

type CategoryFilter = 'alle' | 'crm' | 'finanzen' | 'live' | 'kombination';

const CATEGORY_TABS: Array<{ id: CategoryFilter; label: string }> = [
  { id: 'alle', label: 'Alle' },
  { id: 'crm', label: 'CRM & Vertrieb' },
  { id: 'finanzen', label: 'Finanzen' },
  { id: 'live', label: 'Live' },
  { id: 'kombination', label: 'Kombis' },
];

function getLayerBadge(layer: SourceLayer) {
  switch (layer) {
    case 'crm':
      return { label: 'CRM', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' };
    case 'live':
      return { label: 'Live', color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' };
    case 'kombination':
      return { label: 'Kombi', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' };
    case 'baseline':
    default:
      return { label: 'Baseline', color: 'border-blue-500/40 bg-blue-500/10 text-blue-300' };
  }
}

function getViewIcon(view: DashboardView) {
  switch (view) {
    case 'zahl':
      return (
        <span title="Zahl">
          <Hash className="h-3 w-3" />
        </span>
      );
    case 'saeulen':
    case 'balken':
      return (
        <span title="Säulen / Balken">
          <BarChart2 className="h-3 w-3" />
        </span>
      );
    case 'linie':
    case 'flaeche':
      return (
        <span title="Linie / Fläche">
          <LineChart className="h-3 w-3" />
        </span>
      );
    case 'kreis':
    case 'ring':
      return (
        <span title="Kreis / Donut">
          <PieChart className="h-3 w-3" />
        </span>
      );
    case 'tabelle':
      return (
        <span title="Tabelle">
          <Table className="h-3 w-3" />
        </span>
      );
    case 'sparkline':
    case 'gauge':
    case 'trichter':
    default:
      return (
        <span title="Trend / Verlauf">
          <TrendingUp className="h-3 w-3" />
        </span>
      );
  }
}

export function WidgetLibraryV2({
  onAddTile,
  tileCount,
  maxTiles = 24,
  onClose,
  className,
}: WidgetLibraryV2Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('alle');

  const isFull = tileCount >= maxTiles;

  // Alle aktiven Katalogeinträge
  const activeCatalogEntries = useMemo(() => getActiveEntries(), []);

  // Filterung nach Kategorie und Suchbegriff
  const filteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return activeCatalogEntries.filter((entry) => {
      // 1. Kategorie-Filter
      if (activeCategory === 'crm' && entry.source.layer !== 'crm') return false;
      if (activeCategory === 'finanzen' && entry.category !== 'finanzen') return false;
      if (activeCategory === 'live' && entry.source.layer !== 'live') return false;
      if (activeCategory === 'kombination' && entry.source.layer !== 'kombination') return false;

      // 2. Suche
      if (!q) return true;
      return (
        entry.name.toLowerCase().includes(q) ||
        entry.id.toLowerCase().includes(q) ||
        entry.definition.toLowerCase().includes(q) ||
        entry.unit.toLowerCase().includes(q) ||
        (DASHBOARD_CATEGORIES[entry.category] ?? '').toLowerCase().includes(q)
      );
    });
  }, [activeCatalogEntries, activeCategory, searchQuery]);

  return (
    <aside
      data-testid="widget-library"
      className={cn(
        'flex h-full w-[280px] shrink-0 flex-col border-r border-[var(--color-border,#1b3d39)] bg-[var(--color-bg-deep,#041110)] select-none',
        className,
      )}
    >
      {/* Header mit Titel, Zähler und optionalem Schließen */}
      <div className="flex items-center justify-between border-b border-[var(--color-border,#1b3d39)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="m-0 text-xs font-semibold tracking-wide text-white uppercase">
            Widget-Bibliothek
          </h3>
        </div>
        {onClose && (
          <button
            type="button"
            data-testid="close-library-button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white"
            title="Bibliothek einklappen"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Suche */}
      <div className="p-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--color-text-muted,#789a95)]" />
          <input
            data-testid="library-search-input"
            type="text"
            placeholder="Kennzahl oder Kategorie suchen…"
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="h-8 w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 pl-8 pr-3 text-xs text-white placeholder-[var(--color-text-muted)] outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Kategorie-Pills */}
      <div className="flex gap-1 overflow-x-auto px-3 pb-2 pt-0.5 scrollbar-none" role="tablist">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeCategory === tab.id}
            data-testid={`library-tab-${tab.id}`}
            onClick={() => setActiveCategory(tab.id)}
            className={cn(
              'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors',
              activeCategory === tab.id
                ? 'bg-primary text-black font-semibold'
                : 'bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10 hover:text-white',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Budget-Warnung bei vollem Canvas */}
      {isFull && (
        <div
          data-testid="library-budget-notice"
          className="mx-3 mb-2 rounded border border-rose-500/40 bg-rose-500/10 p-2 text-center text-[11px] text-rose-300"
        >
          Maximum von {maxTiles} Kacheln belegt. Lösche eine Kachel, um neue hinzuzufügen.
        </div>
      )}

      {/* Kachel-Karten Liste */}
      <div data-testid="library-cards-list" className="flex-1 overflow-y-auto p-3 pt-1 space-y-2">
        {filteredEntries.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
            Keine passenden Kennzahlen gefunden.
          </div>
        ) : (
          filteredEntries.map((entry: ActiveCatalogEntry) => {
            const badge = getLayerBadge(entry.source.layer);
            const views = VIEWS_BY_SHAPE[entry.shape] ?? ['zahl'];

            return (
              <div
                key={entry.id}
                data-testid={`library-card-${entry.id}`}
                className={cn(
                  'group rounded-lg border border-[var(--color-border,#1b3d39)] bg-black/20 p-2.5 transition-all',
                  isFull ? 'opacity-50' : 'hover:border-primary/50 hover:bg-black/40',
                )}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <h4 className="m-0 truncate text-xs font-semibold text-white group-hover:text-primary transition-colors">
                      {entry.name}
                    </h4>
                    <p className="m-0 mt-0.5 line-clamp-2 text-[10.5px] leading-tight text-[var(--color-text-muted)]">
                      {entry.definition}
                    </p>
                  </div>
                  <Badge
                    variant="neutral"
                    className={cn('text-[9px] px-1 py-0 uppercase', badge.color)}
                  >
                    {badge.label}
                  </Badge>
                </div>

                {/* Footer der Karte: Ansichts-Icons, Einheit & Add-Button */}
                <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2">
                  <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                    <span className="text-[10px] font-medium text-[var(--color-text-soft)]">
                      {entry.unit}
                    </span>
                    <span className="text-[10px] opacity-30">•</span>
                    <div
                      className="flex items-center gap-0.5"
                      title="Unterstützte Darstellungsarten"
                    >
                      {views.slice(0, 3).map((v) => (
                        <span key={v} className="opacity-70">
                          {getViewIcon(v)}
                        </span>
                      ))}
                      {views.length > 3 && (
                        <span className="text-[9px] opacity-50">+{views.length - 3}</span>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isFull}
                    data-testid={`add-tile-btn-${entry.id}`}
                    onClick={() => onAddTile(entry.id)}
                    className="h-6 gap-1 px-2 text-[11px] font-medium border-primary/30 text-primary hover:bg-primary hover:text-black transition-all"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Hinzufügen</span>
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
