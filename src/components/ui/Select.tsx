import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

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
  style?: React.CSSProperties;
}

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
  style,
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
          onChange(options[highlightedIndex].value);
          setIsOpen(false);
          triggerRef.current?.focus();
        }
        break;
      case 'Escape':
      case 'Tab':
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
    }
  };

  const pad = sizeVariant === 'sm' ? '7px 12px' : '10px 14px';
  const fontSize = sizeVariant === 'sm' ? '13px' : '14px';

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        width: fullWidth ? '100%' : 'auto',
        fontFamily: 'var(--font-body)',
        position: 'relative',
        ...style,
      }}
    >
      {label && (
        <label
          htmlFor={selectId}
          style={{
            fontSize: '12.5px',
            color: 'var(--color-text-muted)',
            fontWeight: 500,
          }}
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
        aria-activedescendant={isOpen && highlightedIndex >= 0 ? `${selectId}-option-${highlightedIndex}` : undefined}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: pad,
          background: 'var(--color-surface)',
          border: `1.5px solid ${error ? 'var(--color-error)' : isOpen ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-md)',
          color: selectedOption ? 'var(--color-text)' : 'var(--color-text-muted)',
          fontSize,
          fontWeight: 500,
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.45 : 1,
          boxShadow: isOpen && !error ? 'var(--focus-ring)' : 'none',
          outline: 'none',
          transition: 'all 150ms ease',
          boxSizing: 'border-box',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          style={{
            color: isOpen ? 'var(--color-primary)' : 'var(--color-text-muted)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
            flexShrink: 0,
            marginLeft: '8px',
          }}
        />
      </button>

      {/* Dropdown Listbox */}
      {isOpen && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1050,
            background: 'var(--color-bg-deep)',
            border: '1px solid var(--color-primary-soft)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-modal)',
            listStyle: 'none',
            padding: '4px',
            margin: 0,
            maxHeight: '220px',
            overflowY: 'auto',
          }}
        >
          {options.length === 0 ? (
            <li style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    background: isHighlighted
                      ? 'var(--color-surface)'
                      : isSelected
                      ? 'var(--color-primary-soft)'
                      : 'transparent',
                    color: isSelected
                      ? 'var(--color-primary)'
                      : isHighlighted
                      ? 'var(--color-text)'
                      : 'var(--color-text-muted)',
                    fontWeight: isSelected ? 600 : 400,
                    transition: 'background 100ms ease',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {opt.label}
                    </span>
                    {opt.description && (
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {opt.description}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check size={14} color="var(--color-primary)" style={{ flexShrink: 0, marginLeft: '8px' }} />}
                </li>
              );
            })
          )}
        </ul>
      )}

      {error && (
        <span style={{ fontSize: '12px', color: 'var(--color-error)' }}>
          {error}
        </span>
      )}
    </div>
  );
}
