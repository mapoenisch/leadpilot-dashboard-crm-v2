import React, { useState, useEffect, useId } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

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
}

const stepperRootVariants = cva('flex flex-col gap-[5px] font-body', {
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

const stepperBoxVariants = cva(
  'flex items-center bg-surface border-[1.5px] border-solid rounded-md overflow-hidden transition-[border-color_150ms_ease,box-shadow_150ms_ease]',
  {
    variants: {
      error: {
        true: 'border-error',
        false: '',
      },
      focused: {
        true: '',
        false: '',
      },
      disabled: {
        true: 'opacity-[0.45]',
        false: '',
      },
    },
    compoundVariants: [
      { error: false, focused: true, class: 'border-primary shadow-focus-ring' },
      { error: false, focused: false, class: 'border-border shadow-none' },
    ],
    defaultVariants: {
      error: false,
      focused: false,
      disabled: false,
    },
  },
);

const stepperButtonVariants = cva(
  'bg-transparent border-0 flex items-center justify-center transition-[background_150ms_ease]',
  {
    variants: {
      size: {
        sm: 'p-[6px_10px]',
        md: 'p-[9px_12px]',
      },
      atLimit: {
        true: 'text-[var(--color-text-muted)] cursor-not-allowed opacity-[0.35]',
        false: 'text-primary cursor-pointer',
      },
      side: {
        left: 'border-r border-solid border-border',
        right: 'border-l border-solid border-border',
      },
    },
    defaultVariants: {
      size: 'md',
      atLimit: false,
      side: 'left',
    },
  },
);

const stepperInputVariants = cva(
  'flex-1 min-w-[60px] bg-transparent border-0 text-text font-mono font-semibold text-center outline-none',
  {
    variants: {
      size: {
        sm: 'p-[6px_10px] text-[13px]',
        md: 'p-[9px_12px] text-sm',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

const stepperHelperVariants = cva('text-[12px]', {
  variants: {
    error: {
      true: 'text-error',
      false: 'text-[var(--color-text-muted)]',
    },
  },
  defaultVariants: {
    error: false,
  },
});

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
  const hasError = !!activeError;
  const atMin = disabled || value <= min;
  const atMax = disabled || value >= max;

  return (
    <div className={cn(stepperRootVariants({ fullWidth }))}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-[12.5px] text-[var(--color-text-muted)] font-medium"
        >
          {label}
        </label>
      )}

      <div className={cn(stepperBoxVariants({ error: hasError, focused: isFocused, disabled }))}>
        {/* Decrement Button */}
        <button
          type="button"
          aria-label="Wert verringern"
          disabled={atMin}
          onClick={handleDecrement}
          className={cn(stepperButtonVariants({ size: sizeVariant, atLimit: atMin, side: 'left' }))}
          onMouseEnter={(e) => {
            if (!disabled && value > min)
              e.currentTarget.style.background = 'var(--color-primary-soft)';
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
          className={cn('no-spinner', stepperInputVariants({ size: sizeVariant }))}
        />

        {/* Unit Suffix Badge */}
        {unit && (
          <span className="px-[8px] py-0 text-[11px] text-[var(--color-text-muted)] font-semibold select-none border-l border-solid border-[var(--color-border-soft)] bg-background-deep self-stretch flex items-center">
            {unit}
          </span>
        )}

        {/* Increment Button */}
        <button
          type="button"
          aria-label="Wert erhöhen"
          disabled={atMax}
          onClick={handleIncrement}
          className={cn(
            stepperButtonVariants({ size: sizeVariant, atLimit: atMax, side: 'right' }),
          )}
          onMouseEnter={(e) => {
            if (!disabled && value < max)
              e.currentTarget.style.background = 'var(--color-primary-soft)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      {(helperText || activeError) && (
        <span id={helperId} className={cn(stepperHelperVariants({ error: hasError }))}>
          {typeof activeError === 'string' ? activeError : helperText}
        </span>
      )}
    </div>
  );
}
