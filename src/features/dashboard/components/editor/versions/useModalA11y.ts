// Executive Dashboard V2 (Auftrag 165 / P12):
// Barrierefreie Tastaturführung für modale Dialoge und Slide-Over-Panels:
// - Speichert aktives Auslöser-Element und stellt Fokus beim Schließen wieder her
// - Setzt Initial-Fokus auf den Container oder das erste fokussierbare Element
// - Schließt Dialoge per Escape-Taste
// - Fängt Tab / Shift-Tab innerhalb des Containers (Focus Trap)

import { useEffect, useRef } from 'react';

export interface UseModalA11yOptions {
  isOpen: boolean;
  onClose: () => void;
  initialFocusSelector?: string;
  closeOnEscape?: boolean;
}

export function useModalA11y<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  onClose,
  initialFocusSelector,
  closeOnEscape = true,
}: UseModalA11yOptions) {
  const containerRef = useRef<T>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  // Aktuelle Werte per Ref, damit wechselnde Callbacks/Sperren den Fokus-Effekt nicht neu starten.
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  useEffect(() => {
    onCloseRef.current = onClose;
    closeOnEscapeRef.current = closeOnEscape;
  }, [onClose, closeOnEscape]);

  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current = document.activeElement as HTMLElement | null;

    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      if (initialFocusSelector) {
        const customEl = containerRef.current.querySelector<HTMLElement>(initialFocusSelector);
        if (customEl) {
          customEl.focus();
          return;
        }
      }
      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length > 0 && focusable[0]) {
        focusable[0].focus();
      } else {
        containerRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscapeRef.current && e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab' && containerRef.current) {
        const focusables = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null || el.getClientRects().length > 0);

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;

        if (e.shiftKey) {
          if (
            document.activeElement === first ||
            !containerRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (
            document.activeElement === last ||
            !containerRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    };
  }, [isOpen, initialFocusSelector]);

  return containerRef;
}
