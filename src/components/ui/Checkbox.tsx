import React, { useId, useState } from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  description?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  'data-testid'?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
  className,
  style,
  'data-testid': testId,
}: CheckboxProps) {
  const [isFocused, setIsFocused] = useState(false);
  const generatedId = useId();
  const checkboxId = id ?? `checkbox-${generatedId.replace(/:/g, '')}`;

  return (
    <label
      htmlFor={checkboxId}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: description ? 'flex-start' : 'center',
        gap: 'var(--space-2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'var(--font-body)',
        position: 'relative',
        ...style,
      }}
    >
      {/* Visually hidden native checkbox for semantic & screen reader access */}
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        data-testid={testId}
        onChange={(e) => {
          if (!disabled) {
            onChange(e.target.checked);
          }
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          position: 'absolute',
          opacity: 0,
          width: '1px',
          height: '1px',
          margin: '-1px',
          padding: 0,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          border: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Visible custom styled checkbox control */}
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
          minWidth: '18px',
          minHeight: '18px',
          borderRadius: 'var(--radius-xs, 4px)',
          background: checked ? 'var(--color-primary)' : 'var(--color-surface)',
          border: checked ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border)',
          boxShadow: isFocused ? 'var(--focus-ring)' : 'none',
          transition: 'background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
          boxSizing: 'border-box',
          marginTop: description ? '2px' : '0',
        }}
      >
        {checked && (
          <Check
            size={13}
            strokeWidth={3}
            style={{
              color: 'var(--color-bg-deep, #070d18)',
              display: 'block',
            }}
          />
        )}
      </span>

      {/* Label and description container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span
          style={{
            fontSize: '13px',
            color: checked ? 'var(--color-text)' : 'var(--color-text-muted)',
            fontWeight: checked ? 500 : 400,
            lineHeight: '18px',
            transition: 'color 150ms ease',
          }}
        >
          {label}
        </span>
        {description && (
          <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', lineHeight: '15px' }}>
            {description}
          </span>
        )}
      </div>
    </label>
  );
}
