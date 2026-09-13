import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  id?: string;
  sizeVariant?: 'sm' | 'md';
  fullWidth?: boolean;
}

const selectRootVariants = cva('flex flex-col gap-[5px] font-body relative', {
  variants: {
    fullWidth: {
      true: 'w-full',
      false: 'w-auto',
    },
  },
  defaultVariants: {
    fullWidth: true,
  },
});

const selectTriggerVariants = cva(
  'flex items-center justify-between w-full bg-surface border-[1.5px] border-solid rounded-md font-medium text-left box-border transition-[all_150ms_ease] outline-none',
  {
    variants: {
      size: {
        sm: 'px-[12px] py-[7px] text-[13px]',
        md: 'px-[14px] py-[10px] text-sm',
      },
      error: {
        true: 'border-error',
        false: '',
      },
      open: {
        true: '',
        false: '',
      },
      disabled: {
        true: 'cursor-not-allowed opacity-[0.45]',
        false: 'cursor-pointer',
      },
    },
    compoundVariants: [
      { error: false, open: true, class: 'border-primary shadow-focus-ring' },
      { error: false, open: false, class: 'border-border shadow-none' },
    ],
    defaultVariants: {
      size: 'md',
      error: false,
      open: false,
      disabled: false,
    },
  },
);

const selectValueVariants = cva('overflow-hidden text-ellipsis whitespace-nowrap', {
  variants: {
    hasSelection: {
      true: 'text-text',
      false: 'text-[var(--color-text-muted)]',
    },
  },
  defaultVariants: {
    hasSelection: false,
  },
});

const selectChevronVariants = cva('shrink-0 ml-[8px] transition-[transform_150ms_ease]', {
  variants: {
    open: {
      true: 'text-primary rotate-180',
      false: 'text-[var(--color-text-muted)] rotate-0',
    },
  },
  defaultVariants: {
    open: false,
  },
});

const selectOptionVariants = cva(
  'flex items-center justify-between px-[12px] py-[8px] rounded-sm text-[13px] cursor-pointer transition-[background_100ms_ease]',
  {
    variants: {
      selected: {
        true: 'font-semibold',
        false: 'font-normal',
      },
      highlighted: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      { highlighted: true, class: 'bg-surface' },
      { highlighted: false, selected: true, class: 'bg-primary-soft' },
      { highlighted: false, selected: false, class: 'bg-transparent' },
      { selected: true, class: 'text-primary' },
      { selected: false, highlighted: true, class: 'text-text' },
      { selected: false, highlighted: false, class: 'text-[var(--color-text-muted)]' },
    ],
    defaultVariants: {
      selected: false,
      highlighted: false,
    },
  },
);

export function Select({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Bitte wählen...',
  disabled = false,
  error,
  id: customId,
  sizeVariant = 'md',
  fullWidth = true,
}: SelectProps) {
  const generatedId = useId();
  const selectId = customId || `select-${generatedId.replace(/:/g, '')}`;
  const listboxId = `listbox-${selectId}`;

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Synchronize highlightedIndex with active value when opening
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, options, value]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          const opt = options[highlightedIndex];
          if (opt) {
            onChange(opt.value);
            setIsOpen(false);
            triggerRef.current?.focus();
          }
        }
        break;
      case 'Escape':
      case 'Tab':
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
    }
  };

  const hasError = !!error;

  return (
    <div ref={containerRef} className={cn(selectRootVariants({ fullWidth }))}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-[12.5px] text-[var(--color-text-muted)] font-medium"
        >
          {label}
        </label>
      )}

      {/* Combobox Trigger Button */}
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={
          isOpen && highlightedIndex >= 0 ? `${selectId}-option-${highlightedIndex}` : undefined
        }
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={cn(
          selectTriggerVariants({ size: sizeVariant, error: hasError, open: isOpen, disabled }),
        )}
      >
        <span className={cn(selectValueVariants({ hasSelection: !!selectedOption }))}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={cn(selectChevronVariants({ open: isOpen }))} />
      </button>

      {/* Dropdown Listbox */}
      {isOpen && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          className="absolute top-[calc(100%_+_4px)] left-0 right-0 z-[1050] bg-background-deep border border-solid border-primary-soft rounded-md shadow-modal list-none p-[4px] m-0 max-h-[220px] overflow-y-auto"
        >
          {options.length === 0 ? (
            <li className="px-[12px] py-[8px] text-[12.5px] text-[var(--color-text-muted)] text-center">
              Keine Optionen verfügbar
            </li>
          ) : (
            options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={opt.value}
                  id={`${selectId}-option-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onChange(opt.value);
                      setIsOpen(false);
                      triggerRef.current?.focus();
                    }
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={cn(
                    selectOptionVariants({ selected: isSelected, highlighted: isHighlighted }),
                  )}
                >
                  <div className="flex flex-col gap-[2px] overflow-hidden">
                    <span className="text-ellipsis overflow-hidden whitespace-nowrap">
                      {opt.label}
                    </span>
                    {opt.description && (
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        {opt.description}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check size={14} color="var(--color-primary)" className="shrink-0 ml-[8px]" />
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}

      {error && <span className="text-[12px] text-error">{error}</span>}
    </div>
  );
}
