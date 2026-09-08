import React, { useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | boolean;
  helperText?: string;
  sizeVariant?: 'sm' | 'md';
  leadingIcon?: React.ReactNode;
}

export function Input({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  disabled = false,
  error,
  helperText,
  sizeVariant = 'md',
  leadingIcon,
  style,
  id,
  ...rest
}: InputProps) {
  const [focused, setFocused] = React.useState(false);
  const generatedId = useId();
  const inputId = id ?? `input-${generatedId.replace(/:/g, '')}`;
  const leftPad = leadingIcon ? (sizeVariant === 'sm' ? '38px' : '42px') : (sizeVariant === 'sm' ? '14px' : '16px');
  const rightPad = sizeVariant === 'sm' ? '14px' : '16px';
  const verticalPad = sizeVariant === 'sm' ? '9px' : '13px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: 'var(--font-body)', width: '100%' }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
        {leadingIcon && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: sizeVariant === 'sm' ? '12px' : '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              color: focused ? 'var(--color-primary)' : 'var(--color-text-muted)',
              zIndex: 1,
              transition: 'color 150ms ease-in-out',
            }}
          >
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={{
            width: '100%',
            background: 'var(--color-surface)',
            border: `1.5px solid ${error ? 'var(--color-error)' : focused ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text)',
            padding: `${verticalPad} ${rightPad} ${verticalPad} ${leftPad}`,
            fontSize: sizeVariant === 'sm' ? '13.5px' : '14px',
            fontFamily: 'inherit',
            outline: 'none',
            boxShadow: focused && !error ? 'var(--focus-ring)' : 'none',
            opacity: disabled ? 0.5 : 1,
            transition: 'border-color 150ms ease-in-out, box-shadow 150ms ease-in-out',
            boxSizing: 'border-box',
            ...style,
          }}
          {...rest}
        />
      </div>
      {(helperText || error) && (
        <span style={{ fontSize: '12px', color: error ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
          {typeof error === 'string' ? error : helperText}
        </span>
      )}
    </div>
  );
}

