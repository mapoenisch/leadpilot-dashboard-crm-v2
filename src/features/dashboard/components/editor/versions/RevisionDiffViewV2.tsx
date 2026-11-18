// Executive Dashboard V2 (Auftrag 165 / P12):
// Strukturierte Diff-Ansicht zwischen zwei Revisionen oder Revision und Entwurf.

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  PlusCircle,
  MinusCircle,
  FileEdit,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { DashboardConfigV2 } from '../../../model/dashboardConfigV2';
import {
  type ConfigDiffEntry,
  diffDashboardConfigsV2,
  summarizeDiffV2,
} from '../../../model/dashboardConfigDiff';
import { getCatalogEntry } from '../../../model/dashboardCatalog';

export interface RevisionDiffViewV2Props {
  labelA: string;
  configA: DashboardConfigV2;
  labelB: string;
  configB: DashboardConfigV2;
  draftConfig?: DashboardConfigV2 | null;
  isDirty?: boolean;
  onBack: () => void;
  onCompareWithDraft?: () => void;
}

export function RevisionDiffViewV2({
  labelA,
  configA,
  labelB,
  configB,
  draftConfig,
  isDirty = false,
  onBack,
  onCompareWithDraft,
}: RevisionDiffViewV2Props) {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const diffs = diffDashboardConfigsV2(configA, configB);
  const summary = summarizeDiffV2(diffs);

  const toggleExpand = (key: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getTileDisplayTitle = (tileId?: string, label?: string) => {
    if (!tileId) return label ?? 'Kachel';
    const tile =
      configB.tiles?.find((t) => t.id === tileId) ?? configA.tiles?.find((t) => t.id === tileId);
    if (!tile) return label ?? tileId;
    const catalog = getCatalogEntry(tile.catalogId);
    return tile.title || catalog?.name || tile.catalogId;
  };

  const dashboardDiffs = diffs.filter((d) => d.bereich === 'dashboard');
  const sectionDiffs = diffs.filter((d) => d.bereich === 'sektion');
  const tileDiffs = diffs.filter((d) => d.bereich === 'kachel');

  const renderBadge = (art: ConfigDiffEntry['art']) => {
    switch (art) {
      case 'hinzugefuegt':
        return (
          <Badge
            variant="neutral"
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 gap-1 text-[11px]"
          >
            <PlusCircle className="h-3 w-3" />
            <span>Hinzugefügt</span>
          </Badge>
        );
      case 'entfernt':
        return (
          <Badge
            variant="neutral"
            className="border-rose-500/40 bg-rose-500/10 text-rose-400 gap-1 text-[11px]"
          >
            <MinusCircle className="h-3 w-3" />
            <span>Entfernt</span>
          </Badge>
        );
      case 'geaendert':
      default:
        return (
          <Badge
            variant="neutral"
            className="border-amber-500/40 bg-amber-500/10 text-amber-400 gap-1 text-[11px]"
          >
            <FileEdit className="h-3 w-3" />
            <span>Geändert</span>
          </Badge>
        );
    }
  };

  const renderDiffItem = (item: ConfigDiffEntry, index: number, prefix: string) => {
    const key = `${prefix}-${item.id ?? index}`;
    const isExpanded = expandedEntries.has(key);

    return (
      <div
        key={key}
        data-testid={`diff-entry-${key}`}
        className="rounded border border-[var(--color-border,#1b3d39)] bg-black/20 overflow-hidden"
      >
        <button
          type="button"
          onClick={() => toggleExpand(key)}
          className="flex w-full items-center justify-between p-3 text-left hover:bg-white/5 transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
            ) : (
              <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />
            )}
            <span className="text-sm font-medium text-white">
              {item.bereich === 'kachel' ? getTileDisplayTitle(item.id, item.label) : item.label}
            </span>
          </div>
          <div>{renderBadge(item.art)}</div>
        </button>

        {isExpanded && item.pfade.length > 0 && (
          <div className="border-t border-[var(--color-border,#1b3d39)] bg-black/40 p-3 space-y-2 text-xs">
            {item.pfade.map((p, pIdx) => (
              <div key={pIdx} className="space-y-1">
                <span className="font-mono text-[var(--color-text-muted)]">{p.pfad}:</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="rounded bg-rose-950/20 border border-rose-900/30 p-2 overflow-x-auto text-rose-300">
                    <div className="text-[10px] uppercase font-semibold text-rose-400 mb-1">
                      Alt ({labelA})
                    </div>
                    <pre className="whitespace-pre-wrap">
                      {p.alt !== undefined ? JSON.stringify(p.alt, null, 2) : '—'}
                    </pre>
                  </div>
                  <div className="rounded bg-emerald-950/20 border border-emerald-900/30 p-2 overflow-x-auto text-emerald-300">
                    <div className="text-[10px] uppercase font-semibold text-emerald-400 mb-1">
                      Neu ({labelB})
                    </div>
                    <pre className="whitespace-pre-wrap">
                      {p.neu !== undefined ? JSON.stringify(p.neu, null, 2) : '—'}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div data-testid="revision-diff-view" className="flex flex-col h-full space-y-4">
      {/* Kopfzeile */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border,#1b3d39)] pb-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            data-testid="diff-back-button"
            variant="secondary"
            size="sm"
            onClick={onBack}
            className="h-8 gap-1.5 px-2 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Zurück</span>
          </Button>
          <h3 className="text-sm font-semibold text-white">
            {labelA} ↔ {labelB}
          </h3>
        </div>

        {isDirty && draftConfig && onCompareWithDraft && (
          <Button
            type="button"
            data-testid="compare-with-draft-button"
            variant="secondary"
            size="sm"
            onClick={onCompareWithDraft}
            className="h-8 text-xs"
          >
            Mit meinem Entwurf vergleichen
          </Button>
        )}
      </div>

      {/* Kurzfassung */}
      <div
        data-testid="diff-summary"
        className="rounded border border-[var(--color-border,#1b3d39)] bg-black/30 p-3 text-xs text-[var(--color-text-soft,#e6f3f1)]"
      >
        <span className="font-semibold text-white">Zusammenfassung: </span>
        <span>{summary}</span>
      </div>

      {/* Diff Gruppen */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {diffs.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">
            Keine inhaltlichen Unterschiede.
          </div>
        ) : (
          <>
            {dashboardDiffs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Dashboard
                </h4>
                <div className="space-y-2">
                  {dashboardDiffs.map((d, i) => renderDiffItem(d, i, 'dash'))}
                </div>
              </div>
            )}

            {sectionDiffs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Sektionen
                </h4>
                <div className="space-y-2">
                  {sectionDiffs.map((d, i) => renderDiffItem(d, i, 'sec'))}
                </div>
              </div>
            )}

            {tileDiffs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Kacheln
                </h4>
                <div className="space-y-2">
                  {tileDiffs.map((d, i) => renderDiffItem(d, i, 'tile'))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
