import React, { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  position?: 'right' | 'left';
  escapeActive?: boolean;
}

const DRAWER_WIDTHS: Record<string, string> = {
  '480px': 'max-w-[min(480px,100vw)]',
  '540px': 'max-w-[min(540px,100vw)]',
  '600px': 'max-w-[min(600px,100vw)]',
  '640px': 'max-w-[min(640px,100vw)]',
};

export function Drawer({
  open,
  onClose,
  title,
  titleId: customTitleId,
  description,
  children,
  footer,
  width = '540px',
  position = 'right',
  escapeActive = true,
}: DrawerProps) {
  const generatedId = useId();
  const titleId = customTitleId || `drawer-title-${generatedId.replace(/:/g, '')}`;
  const descriptionId = description ? `drawer-desc-${generatedId.replace(/:/g, '')}` : undefined;
  const drawerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // Focus-Verwaltung beim Öffnen und Schließen
  useEffect(() => {
    if (open) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
      const timer = setTimeout(() => {
        if (drawerRef.current) {
          const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          const firstFocusable = focusable[0];
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            drawerRef.current.focus();
          }
        }
      }, 50);

      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalOverflow;
        if (
          previouslyFocusedElementRef.current &&
          typeof previouslyFocusedElementRef.current.focus === 'function'
        ) {
          previouslyFocusedElementRef.current.focus();
        }
      };
    }
  }, [open]);

  // Tastaturnavigation: Escape zum Schließen und Tab-Fokusfalle
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!escapeActive) return;
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (!firstElement || !lastElement) return;

        if (e.shiftKey) {
          if (
            document.activeElement === firstElement ||
            document.activeElement === drawerRef.current
          ) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, escapeActive]);

  if (!open) return null;

  const widthClass = DRAWER_WIDTHS[width] || 'max-w-[min(540px,100vw)]';

  return (
    <div className="fixed inset-0 z-[1000] overflow-hidden">
      {/* Kontextueller, transparenter Backdrop: Dashboard bleibt sichtbar */}
      <button
        type="button"
        data-testid="drawer-overlay"
        aria-label="Dialog schließen (Hintergrund)"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity cursor-default animate-[backdrop-fade-in_150ms_ease-out]"
      />

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={cn(
          'fixed top-0 bottom-0 z-10 flex flex-col bg-surface border-solid border-border shadow-2xl w-full outline-none transition-transform duration-200 ease-out',
          position === 'right' ? 'right-0 border-l' : 'left-0 border-r',
          widthClass,
        )}
      >
        <div className="flex items-start justify-between shrink-0 border-b border-solid border-[var(--color-border-soft)] px-5 py-4">
          <div className="flex flex-col pr-2">
            <h3 id={titleId} className="m-0 font-display text-[18px] font-semibold text-text">
              {title}
            </h3>
            {description ? (
              <p
                id={descriptionId}
                className="m-0 mt-1 text-xs text-[var(--color-text-muted)] leading-relaxed"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dialog schließen"
            className="bg-transparent border-0 text-[var(--color-text-muted)] hover:text-text cursor-pointer p-1.5 rounded-md flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto overflow-x-hidden flex-auto min-h-0 flex flex-col gap-4">
          {children}
        </div>

        {footer && (
          <div className="px-5 py-4 bg-background-deep border-t border-solid border-[var(--color-border-soft)] flex justify-end items-center gap-3 shrink-0 flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
