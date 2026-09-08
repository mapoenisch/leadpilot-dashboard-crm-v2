import React, { useState, useEffect, useId } from 'react';
import { Minus, Plus } from 'lucide-react';

export interface NumberStepperProps {
  label?: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string | boolean;
  helperText?: string;
  id?: string;
  sizeVariant?: 'sm' | 'md';
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

export function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 1000000000,
  step = 1,
  unit,
  placeholder,
  disabled = false,
  error,
  helperText,
  id: customId,
  sizeVariant = 'md',
  fullWidth = true,
  style,
}: NumberStepperProps) {
  const generatedId = useId();
  const inputId = customId || `stepper-${generatedId.replace(/:/g, '')}`;
  const helperId = `${inputId}-helper`;

  // Local string state to allow smooth user typing
  const [localStr, setLocalStr] = useState<string>(String(value ?? 0));
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFocused) {
      setLocalStr(String(value ?? 0));
      setInternalError(null);
    }
  }, [value, isFocused]);

  const clamp = (val: number): number => {
    if (isNaN(val)) return min;
    return Math.min(Math.max(val, min), max);
  };

  const validateInput = (raw: string): { valid: boolean; num: number; errMsg?: string } => {
    if (raw.trim() === '' || raw === '-') {
      return { valid: false, num: min, errMsg: 'Bitte Zahl eingeben' };
    }
    const parsed = parseFloat(raw);
    if (isNaN(parsed)) {
      return { valid: false, num: min, errMsg: 'Ungültige Zahleneingabe' };
    }
    if (parsed < min) {
      return { valid: false, num: min, errMsg: `Minimalwert ist ${min} ${unit || ''}`.trim() };
    }
    if (parsed > max) {
      return { valid: false, num: max, errMsg: `Maximalwert ist ${max} ${unit || ''}`.trim() };
    }
    return { valid: true, num: parsed };
  };

  const handleDecrement = () => {
    if (disabled) return;
    const current = parseFloat(localStr) || min;
    const next = clamp(current - step);
    setLocalStr(String(next));
    setInternalError(null);
    onChange(next);
  };

  const handleIncrement = () => {
    if (disabled) return;
    const current = parseFloat(localStr) || min;
    const next = clamp(current + step);
    setLocalStr(String(next));
    setInternalError(null);
    onChange(next);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalStr(raw);
    const valResult = validateInput(raw);
    if (!valResult.valid) {
      setInternalError(valResult.errMsg || 'Ungültiger Wert');
    } else {
      setInternalError(null);
      onChange(valResult.num);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const valResult = validateInput(localStr);
    if (!valResult.valid) {
      const clamped = clamp(valResult.num);
      setLocalStr(String(clamped));
      setInternalError(null);
      onChange(clamped);
    } else {
      setInternalError(null);
    }
  };

  const activeError = error || internalError;
  const pad = sizeVariant === 'sm' ? '6px 10px' : '9px 12px';
  const fontSize = sizeVariant === 'sm' ? '13px' : '14px';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        width: fullWidth ? '100%' : 'auto',
        fontFamily: 'var(--font-body)',
        ...style,
      }}
    >
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: '12.5px',
            color: 'var(--color-text-muted)',
            fontWeight: 500,
          }}
        >
          {label}
        </label>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--color-surface)',
          border: `1.5px solid ${activeError ? 'var(--color-error)' : isFocused ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-md)',
          boxShadow: isFocused && !activeError ? 'var(--focus-ring)' : 'none',
          overflow: 'hidden',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
          opacity: disabled ? 0.45 : 1,
        }}
      >
        {/* Decrement Button */}
        <button
          type="button"
          aria-label="Wert verringern"
          disabled={disabled || value <= min}
          onClick={handleDecrement}
          style={{
            background: 'transparent',
            border: 'none',
            borderRight: '1px solid var(--color-border)',
            color: disabled || value <= min ? 'var(--color-text-muted)' : 'var(--color-primary)',
            padding: pad,
            cursor: disabled || value <= min ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled || value <= min ? 0.35 : 1,
            transition: 'background 150ms ease',
          }}
          onMouseEnter={(e) => {
            if (!disabled && value > min) e.currentTarget.style.background = 'var(--color-primary-soft)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <Minus size={14} />
        </button>

        {/* Numeric Input */}
        <input
          id={inputId}
          type="number"
          className="no-spinner"
          value={localStr}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          aria-invalid={!!activeError}
          aria-describedby={helperText || activeError ? helperId : undefined}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          style={{
            flex: 1,
            minWidth: '60px',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text)',
            padding: pad,
            fontSize,
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            textAlign: 'center',
            outline: 'none',
          }}
        />

        {/* Unit Suffix Badge */}
        {unit && (
          <span
            style={{
              padding: '0 8px',
              fontSize: '11px',
              color: 'var(--color-text-muted)',
              fontWeight: 600,
              userSelect: 'none',
              borderLeft: '1px solid var(--color-border-soft)',
              background: 'var(--color-bg-deep)',
              alignSelf: 'stretch',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {unit}
          </span>
        )}

        {/* Increment Button */}
        <button
          type="button"
          aria-label="Wert erhöhen"
          disabled={disabled || value >= max}
          onClick={handleIncrement}
          style={{
            background: 'transparent',
            border: 'none',
            borderLeft: '1px solid var(--color-border)',
            color: disabled || value >= max ? 'var(--color-text-muted)' : 'var(--color-primary)',
            padding: pad,
            cursor: disabled || value >= max ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled || value >= max ? 0.35 : 1,
            transition: 'background 150ms ease',
          }}
          onMouseEnter={(e) => {
            if (!disabled && value < max) e.currentTarget.style.background = 'var(--color-primary-soft)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      {(helperText || activeError) && (
        <span
          id={helperId}
          style={{
            fontSize: '12px',
            color: activeError ? 'var(--color-error)' : 'var(--color-text-muted)',
          }}
        >
          {typeof activeError === 'string' ? activeError : helperText}
        </span>
      )}
    </div>
  );
}
