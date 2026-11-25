// Auftrag 174b (K3): lange Erläuterungen im Kachelkopf eingeklappt. Ein kleines Bedienelement
// klappt sie als Überlagerung auf; die Kachel wird dadurch nicht höher.
// Codex-Befund PR #223: Die Überlagerung liegt außerhalb der Kachel (Portal, feste Position), weil
// Kachel und Rasterzelle ihren Inhalt abschneiden. Sie richtet sich nach dem freien Platz im
// Fenster (unter oder über dem Kopf) und bleibt so vollständig lesbar.

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const GAP = 4;
const MARGIN = 8;
const MIN_WIDTH = 260;

/** Breite der Überlagerung passend zum Kachelkopf und zum Fenster. */
export function explanationWidth(anchorWidth: number, viewportWidth: number): number {
  return Math.min(Math.max(anchorWidth, MIN_WIDTH), Math.max(0, viewportWidth - 2 * MARGIN));
}

/** Lage der Überlagerung zum Kachelkopf; Werte in px relativ zum Fenster. */
export function placeExplanation(
  anchor: { left: number; top: number; bottom: number; width: number },
  viewport: { width: number; height: number },
  panelHeight: number,
): { left: number; top: number; width: number; maxHeight: number } {
  const width = explanationWidth(anchor.width, viewport.width);
  const left = Math.min(Math.max(MARGIN, anchor.left), viewport.width - MARGIN - width);
  const below = viewport.height - anchor.bottom - GAP - MARGIN;
  const above = anchor.top - GAP - MARGIN;
  // Unten, solange der Text dort passt oder dort mehr Platz ist als oben.
  if (panelHeight <= below || below >= above) {
    return { left, top: anchor.bottom + GAP, width, maxHeight: Math.max(below, 0) };
  }
  const availableAbove = Math.max(above, 0);
  const height = Math.min(panelHeight, availableAbove);
  return { left, top: anchor.top - GAP - height, width, maxHeight: availableAbove };
}

export function TileExplanationToggle({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = `tile-explanation-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const anchorRectRef = useRef<{ left: number; top: number } | null>(null);

  // Position vor dem Zeichnen setzen (direkt am Element, nicht als style-Attribut, Issue #7).
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const header = rootRef.current?.closest('header') ?? rootRef.current;
    if (!open || !panel || !header) return;
    const anchor = header.getBoundingClientRect();
    anchorRectRef.current = { left: anchor.left, top: anchor.top };
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    // Endgültige Breite vor der Höhenmessung setzen, sonst bricht Text nach dem Messen schmaler um.
    panel.style.width = `${explanationWidth(anchor.width, viewport.width)}px`;
    panel.style.maxHeight = 'none';
    const place = placeExplanation(anchor, viewport, panel.offsetHeight);
    panel.style.left = `${place.left}px`;
    panel.style.top = `${place.top}px`;
    panel.style.width = `${place.width}px`;
    panel.style.maxHeight = `${place.maxHeight}px`;
  }, [open, children]);

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
      const target = e.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) close(false);
    };
    // Die Überlagerung hängt am Fenster: Schließen nur, wenn sich der Kopf beim Scrollen bewegt
    // oder das Fenster seine Größe ändert (späte Scroll-Events nach Klick schließen sonst sofort).
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      const header = rootRef.current?.closest('header') ?? rootRef.current;
      const target = e.target;
      const affectsAnchor =
        target === document ||
        target === window ||
        (header !== null && target instanceof Node && target.contains(header));
      if (!affectsAnchor || !header) return;
      const rect = header.getBoundingClientRect();
      const base = anchorRectRef.current;
      if (base && Math.abs(rect.top - base.top) <= 2 && Math.abs(rect.left - base.left) <= 2) {
        return;
      }
      close(false);
    };
    const onResize = () => close(false);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
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
      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="region"
              aria-label="Erläuterung"
              data-testid="tile-explanation"
              className="fixed left-0 top-0 z-[60] flex flex-col gap-[4px] overflow-y-auto rounded-md border border-solid border-[var(--color-border-glass)] bg-[var(--color-bg-deep,#051413)] p-[10px] text-[12px] leading-snug text-[var(--color-text-muted)] shadow-modal [overflow-wrap:anywhere]"
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
