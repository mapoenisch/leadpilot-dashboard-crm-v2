import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Printer, CheckSquare, Square, FileText, Calendar, Compass } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import type { DashboardFilters, DashboardTileConfig } from '../../model/dashboardConfig';
import { getCatalogEntry } from '../../model/dashboardCatalog';

export interface ReportExportConfig {
  title: string;
  periodText: string;
  periodNote?: string;
  selectedTileIds: string[];
  commentary: string;
  orientation: 'portrait' | 'landscape';
  includeAppendix: boolean;
}

export interface DashboardReportModalProps {
  open: boolean;
  onClose: () => void;
  tiles: readonly DashboardTileConfig[];
  filters?: DashboardFilters;
  onConfirmPrint: (config: ReportExportConfig) => void;
}

function resolveTileLabel(tile: DashboardTileConfig): string {
  if (tile.title?.trim()) return tile.title.trim();
  const entry = getCatalogEntry(tile.catalogId);
  return entry?.name ?? tile.catalogId;
}

export function resolvePeriodInfo(filters?: DashboardFilters): {
  displayText: string;
  isEffective: boolean;
  note?: string;
} {
  if (filters?.period?.from && filters?.period?.to) {
    return {
      displayText: `${filters.period.from} bis ${filters.period.to} (Unwirksam)`,
      isEffective: false,
      note: `Gespeicherter Zeitraumfilter (${filters.period.from} bis ${filters.period.to}) wirkt auf Quellen derzeit nicht; Kennzahlen zeigen Stichtag/Jahresbasis FY 2025.`,
    };
  }
  return {
    displayText: 'FY 2025 (Faktenblatt & operative Live-Pipeline)',
    isEffective: true,
  };
}

export function DashboardReportModal({
  open,
  onClose,
  tiles,
  filters,
  onConfirmPrint,
}: DashboardReportModalProps) {
  const [title, setTitle] = useState('LeadPilot Executive Management Briefing');
  const [commentary, setCommentary] = useState('');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [includeAppendix, setIncludeAppendix] = useState(true);

  // Initial alle Kacheln ausgewählt
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(tiles.map((t) => t.tileId)),
  );

  // Synchronisiere Auswahl beim Öffnen und entferne nicht mehr vorhandene Kacheln (Auftrag 132 Review)
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setSelectedIds(new Set(tiles.map((t) => t.tileId)));
    } else if (open) {
      setSelectedIds((prev) => {
        const available = new Set(tiles.map((t) => t.tileId));
        const next = new Set<string>();
        for (const id of prev) {
          if (available.has(id)) next.add(id);
        }
        return next.size > 0 ? next : new Set(tiles.map((t) => t.tileId));
      });
    }
    prevOpenRef.current = open;
  }, [open, tiles]);

  const periodInfo = useMemo(() => resolvePeriodInfo(filters), [filters]);

  const tileItems = useMemo(() => {
    return tiles.map((tile) => ({
      tileId: tile.tileId,
      label: resolveTileLabel(tile),
      catalogId: tile.catalogId,
      view: tile.view,
    }));
  }, [tiles]);

  const validSelectedIds = useMemo(() => {
    const available = new Set(tiles.map((t) => t.tileId));
    return Array.from(selectedIds).filter((id) => available.has(id));
  }, [tiles, selectedIds]);

  const handleToggleTile = useCallback((tileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tileId)) {
        next.delete(tileId);
      } else {
        next.add(tileId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(tiles.map((t) => t.tileId)));
  }, [tiles]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handlePrint = useCallback(() => {
    if (validSelectedIds.length === 0) return;
    onConfirmPrint({
      title: title.trim() || 'LeadPilot Executive Management Briefing',
      periodText: periodInfo.displayText,
      periodNote: periodInfo.note,
      selectedTileIds: validSelectedIds,
      commentary: commentary.trim(),
      orientation,
      includeAppendix,
    });
  }, [
    title,
    periodInfo,
    validSelectedIds,
    commentary,
    orientation,
    includeAppendix,
    onConfirmPrint,
  ]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bericht exportieren & drucken"
      maxWidth="750px"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <span className="text-[13px] text-[var(--color-text-muted)]">
            {validSelectedIds.length} von {tiles.length} Kacheln ausgewählt
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              size="sm"
              disabled={validSelectedIds.length === 0}
              onClick={handlePrint}
              data-testid="print-submit-btn"
              className="flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span>Drucken / Als PDF speichern</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5 p-1">
        {/* 1. Titel & Zeitraum */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="report-title"
              className="text-sm font-medium text-[var(--color-text-primary)]"
            >
              Berichtstitel
            </label>
            <Input
              id="report-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Executive Briefing Q4"
              data-testid="report-title-input"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="report-period"
              className="text-sm font-medium text-[var(--color-text-primary)]"
            >
              Berichtszeitraum
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-[var(--color-surface)] text-sm text-[var(--color-text-muted)]">
              <Calendar className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{periodInfo.displayText}</span>
            </div>
            {!periodInfo.isEffective && periodInfo.note ? (
              <p className="m-0 text-[11px] text-amber-600 dark:text-amber-400 leading-tight">
                {periodInfo.note}
              </p>
            ) : null}
          </div>
        </div>

        {/* 2. Format & Anhang */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-primary" aria-hidden="true" />
              Seitenformat
            </label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="orientation"
                  value="portrait"
                  checked={orientation === 'portrait'}
                  onChange={() => setOrientation('portrait')}
                  className="accent-primary"
                />
                DIN A4 Hochformat
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer ml-3">
                <input
                  type="radio"
                  name="orientation"
                  value="landscape"
                  checked={orientation === 'landscape'}
                  onChange={() => setOrientation('landscape')}
                  className="accent-primary"
                />
                DIN A4 Querformat
              </label>
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <Checkbox
              checked={includeAppendix}
              onChange={setIncludeAppendix}
              label="Strukturierten Tabellen-Anhang (Appendix) beifügen"
              description="Gibt für jedes Diagramm die Rohwerte tabellarisch aus."
            />
          </div>
        </div>

        {/* 3. Management-Kommentar */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="report-commentary"
            className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-1.5"
          >
            <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
            Management-Kommentar (optional)
          </label>
          <textarea
            id="report-commentary"
            rows={3}
            value={commentary}
            onChange={(e) => setCommentary(e.target.value)}
            placeholder="Strategische Einschätzungen oder Erläuterungen, die prominent auf dem Deckblatt gedruckt werden sollen …"
            data-testid="report-commentary-input"
            className="w-full rounded-lg border border-border bg-[var(--color-surface)] p-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
          />
        </div>

        {/* 4. Kachelauswahl */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              Enthaltene Dashboard-Kacheln
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
                Alle wählen
              </button>
              <span className="text-border">|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-xs text-[var(--color-text-muted)] hover:underline inline-flex items-center gap-1"
              >
                <Square className="h-3.5 w-3.5" aria-hidden="true" />
                Alle abwählen
              </button>
            </div>
          </div>

          <div
            data-testid="report-tiles-list"
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto p-2 border border-border rounded-lg bg-[var(--color-surface)]"
          >
            {tileItems.map((item) => {
              const checked = selectedIds.has(item.tileId);
              return (
                <div
                  key={item.tileId}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-surface-elevated/40"
                >
                  <Checkbox
                    checked={checked}
                    onChange={() => handleToggleTile(item.tileId)}
                    label={
                      <span className="text-xs font-medium truncate max-w-[240px] block">
                        {item.label}
                      </span>
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
