import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, FolderMinus, Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardSectionV2 } from '../../../model/dashboardConfigV2';

export interface SectionHeaderV2Props {
  section: DashboardSectionV2;
  tileCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onRenameSection: (newTitle: string) => void;
  onMoveSectionUp?: () => void;
  onMoveSectionDown?: () => void;
  onRemoveSection: () => void;
  isActiveArea: boolean;
  onSelectActiveArea: () => void;
  isPreviewMode?: boolean;
  className?: string;
}

export function SectionHeaderV2({
  section,
  tileCount,
  isCollapsed,
  onToggleCollapse,
  onRenameSection,
  onMoveSectionUp,
  onMoveSectionDown,
  onRemoveSection,
  isActiveArea,
  onSelectActiveArea,
  isPreviewMode = false,
  className,
}: SectionHeaderV2Props) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(section.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleInput(section.title);
  }, [section.title]);

  useEffect(() => {
    if (isEditingTitle) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditingTitle]);

  const handleSaveTitle = () => {
    const trimmed = titleInput.trim();
    if (trimmed && trimmed.length <= 80 && trimmed !== section.title) {
      onRenameSection(trimmed);
    } else {
      setTitleInput(section.title);
    }
    setIsEditingTitle(false);
  };

  const handleCancelTitle = () => {
    setTitleInput(section.title);
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelTitle();
    }
  };

  const tileCountLabel = tileCount === 1 ? '1 Kachel' : `${tileCount} Kacheln`;

  return (
    <div
      data-testid={`section-header-${section.id}`}
      data-active-area={isActiveArea}
      onPointerDown={() => onSelectActiveArea?.()}
      className={cn(
        'group flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors select-none',
        isActiveArea && !isPreviewMode
          ? 'border-primary bg-primary/10 shadow-sm'
          : 'border-[var(--color-border,#1b3d39)] bg-[var(--color-bg-deep,#051413)]/70 hover:bg-[var(--color-bg-deep,#051413)]',
        className,
      )}
    >
      {/* Linke Seite: Einklapp-Schalter + Titel + Kachelanzahl */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          data-testid={`section-collapse-btn-${section.id}`}
          aria-expanded={!isCollapsed}
          aria-controls={`section-content-${section.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-white/10 hover:text-white transition-colors"
          title={isCollapsed ? 'Sektion ausklappen' : 'Sektion einklappen'}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>

        {isEditingTitle && !isPreviewMode ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              data-testid={`section-title-input-${section.id}`}
              value={titleInput}
              maxLength={80}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveTitle}
              className="h-8 rounded border border-primary bg-black/60 px-2 text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-primary w-48 sm:w-64"
            />
            <button
              type="button"
              data-testid={`section-title-save-btn-${section.id}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSaveTitle();
              }}
              className="flex h-8 w-8 items-center justify-center rounded text-emerald-400 hover:bg-emerald-500/20"
              title="Titel speichern (Enter)"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              data-testid={`section-title-cancel-btn-${section.id}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleCancelTitle();
              }}
              className="flex h-8 w-8 items-center justify-center rounded text-rose-400 hover:bg-rose-500/20"
              title="Abbrechen (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 truncate">
            <h3
              data-testid={`section-title-${section.id}`}
              onDoubleClick={() => !isPreviewMode && setIsEditingTitle(true)}
              className="m-0 truncate text-sm font-semibold text-white tracking-wide"
            >
              {section.title}
            </h3>
            <span
              data-testid={`section-tile-count-${section.id}`}
              className="text-xs text-[var(--color-text-muted)]"
            >
              · {tileCountLabel}
            </span>
            {isActiveArea && !isPreviewMode && (
              <span
                data-testid={`section-active-badge-${section.id}`}
                className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary uppercase"
              >
                Aktiv
              </span>
            )}
          </div>
        )}
      </div>

      {/* Rechte Seite: Sektionsaktionen (nur im Bearbeitungsmodus) */}
      {!isPreviewMode && (
        <div
          data-testid={`section-actions-${section.id}`}
          className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity"
        >
          {!isEditingTitle && (
            <button
              type="button"
              data-testid={`section-rename-btn-${section.id}`}
              onClick={() => setIsEditingTitle(true)}
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-white/10 hover:text-white transition-colors"
              title="Sektion umbenennen"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}

          {onMoveSectionUp && (
            <button
              type="button"
              data-testid={`section-move-up-btn-${section.id}`}
              onClick={onMoveSectionUp}
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-white/10 hover:text-white transition-colors"
              title="Sektion nach oben verschieben"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          )}

          {onMoveSectionDown && (
            <button
              type="button"
              data-testid={`section-move-down-btn-${section.id}`}
              onClick={onMoveSectionDown}
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-white/10 hover:text-white transition-colors"
              title="Sektion nach unten verschieben"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            data-testid={`section-remove-btn-${section.id}`}
            onClick={onRemoveSection}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-rose-400 hover:bg-rose-500/20 transition-colors"
            title="Sektion entfernen"
          >
            <FolderMinus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
