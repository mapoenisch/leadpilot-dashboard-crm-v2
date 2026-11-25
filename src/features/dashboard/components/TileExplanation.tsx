// Auftrag 174b (K3): lange Erläuterungen im Kachelkopf eingeklappt. Ein kleines Bedienelement
// klappt sie als Überlagerung auf; die Kachel wird dadurch nicht höher.

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TileExplanationToggle({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = `tile-explanation-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (refocus: boolean) => {
      setOpen(false);
      if (refocus) buttonRef.current?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(true);
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="shrink-0">
      <button
        ref={buttonRef}
        type="button"
        data-testid="tile-explanation-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Erläuterung ausblenden' : 'Erläuterung anzeigen'}
        title={open ? 'Erläuterung ausblenden' : 'Erläuterung anzeigen'}
        onClick={(e) => {
          // Klick öffnet nur die Erläuterung, ohne die Kachel zusätzlich auszuwählen.
          e.stopPropagation();
          setOpen((value) => !value);
        }}
        className="flex h-5 w-5 items-center justify-center rounded text-[var(--color-text-muted)] opacity-70 transition hover:bg-white/10 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ChevronDown
          aria-hidden="true"
          className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label="Erläuterung"
          data-testid="tile-explanation"
          className="absolute inset-x-0 top-full z-30 mt-[4px] flex flex-col gap-[4px] rounded-md border border-solid border-[var(--color-border-glass)] bg-[var(--color-bg-deep,#051413)] p-[10px] text-[12px] leading-snug text-[var(--color-text-muted)] shadow-modal [overflow-wrap:anywhere]"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
