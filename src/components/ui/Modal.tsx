import React, { useEffect, useRef, useId } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

// maxWidth ist ein offener String-Prop: alle im Repo vorkommenden Werte sind
// explizit abgebildet (Fallback = Default) — kein style-Attribut nötig.
const MODAL_MAX_WIDTHS: Record<string, string> = {
  '600px': 'max-w-[min(600px,calc(100vw-2rem))]',
  '750px': 'max-w-[min(750px,calc(100vw-2rem))]',
  '960px': 'max-w-[min(960px,calc(100vw-2rem))]',
  '1000px': 'max-w-[min(1000px,calc(100vw-2rem))]',
  '1100px': 'max-w-[min(1100px,calc(100vw-2rem))]',
};

const modalOverlayVariants = cva(
  'fixed inset-0 bg-[rgba(6,22,19,0.78)] backdrop-blur-[4px] flex items-center justify-center z-[1000] p-4 box-border animate-[backdrop-fade-in_150ms_ease-out]'
);

const modalDialogVariants = cva(
  'bg-surface border border-solid border-border rounded-xl w-full shadow-modal flex flex-col overflow-hidden box-border outline-none max-h-[calc(100dvh-2rem)]'
);

export function Modal({
  open,
  onClose,
  title,
  titleId: customTitleId,
  children,
  footer,
  maxWidth,
}: ModalProps) {
  const generatedId = useId();
  const titleId = customTitleId || `modal-title-${generatedId.replace(/:/g, '')}`;
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // Manage focus capture and return
  useEffect(() => {
    if (open) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
      // Focus modal container or first focusable element
      const timer = setTimeout(() => {
        if (modalRef.current) {
          const focusable = modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            focusable[0].focus();
          } else {
            modalRef.current.focus();
          }
        }
      }, 50);

      // Disable body scroll while modal is open
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalOverflow;
        if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === 'function') {
          previouslyFocusedElementRef.current.focus();
        }
      };
    }
  }, [open]);

  // Keyboard navigation: Escape to close and Tab focus trap
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || document.activeElement === modalRef.current) {
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
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Dialog schließen"
      className={cn(modalOverlayVariants())}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          modalDialogVariants(),
          (maxWidth && MODAL_MAX_WIDTHS[maxWidth]) || 'max-w-[min(560px,calc(100vw-2rem))]'
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between shrink-0 border-b border-solid border-soft px-5 py-4">
          <h3 id={titleId} className="m-0 font-display text-[18px] font-semibold text-text">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dialog schließen"
            className="bg-transparent border-0 text-[var(--color-text-muted)] text-[22px] cursor-pointer leading-none px-[8px] py-[4px] rounded-sm flex items-center justify-center"
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          >
            ×
          </button>
        </div>
        <div className="p-5 overflow-y-auto overflow-x-hidden flex-auto min-h-0">
          {children}
        </div>
        {footer && (
          <div className="px-5 py-4 bg-background-deep border-t border-solid border-soft flex justify-end items-center gap-3 shrink-0 flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
