import React, { useId, useState } from 'react';
import { Check } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  description?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  'data-testid'?: string;
}

const checkboxRootVariants = cva(
  'inline-flex gap-[var(--space-2)] select-none font-body relative',
  {
    variants: {
      disabled: {
        true: 'cursor-not-allowed opacity-50',
        false: 'cursor-pointer',
      },
      hasDescription: {
        true: 'items-start',
        false: 'items-center',
      },
    },
    defaultVariants: {
      disabled: false,
      hasDescription: false,
    },
  },
);

const checkboxControlVariants = cva(
  'inline-flex items-center justify-center w-[18px] h-[18px] min-w-[18px] min-h-[18px] rounded-[var(--radius-xs,4px)] box-border transition-[background-color_150ms_ease,border-color_150ms_ease,box-shadow_150ms_ease]',
  {
    variants: {
      checked: {
        true: 'bg-primary border-[1.5px] border-solid border-primary',
        false: 'bg-surface border-[1.5px] border-solid border-border',
      },
      focused: {
        true: 'shadow-focus-ring',
        false: 'shadow-none',
      },
      hasDescription: {
        true: 'mt-[2px]',
        false: 'mt-0',
      },
    },
    defaultVariants: {
      checked: false,
      focused: false,
      hasDescription: false,
    },
  },
);

const checkboxLabelVariants = cva('text-[13px] leading-[18px] transition-colors', {
  variants: {
    checked: {
      true: 'text-text font-medium',
      false: 'text-[var(--color-text-muted)] font-normal',
    },
  },
  defaultVariants: {
    checked: false,
  },
});

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
  className,
  'data-testid': testId,
}: CheckboxProps) {
  const [isFocused, setIsFocused] = useState(false);
  const generatedId = useId();
  const checkboxId = id ?? `checkbox-${generatedId.replace(/:/g, '')}`;
  const hasDescription = description !== undefined;

  return (
    <label
      htmlFor={checkboxId}
      className={cn(checkboxRootVariants({ disabled, hasDescription }), className)}
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
        className="sr-only opacity-0 pointer-events-none"
      />

      {/* Visible custom styled checkbox control */}
      <span
        aria-hidden="true"
        className={cn(checkboxControlVariants({ checked, focused: isFocused, hasDescription }))}
      >
        {checked && (
          <Check size={13} strokeWidth={3} className="block text-[var(--color-bg-deep,#070d18)]" />
        )}
      </span>

      {/* Label and description container */}
      <div className="flex flex-col gap-[2px]">
        <span className={cn(checkboxLabelVariants({ checked }))}>{label}</span>
        {description && (
          <span className="text-[11.5px] text-[var(--color-text-muted)] leading-[15px]">
            {description}
          </span>
        )}
      </div>
    </label>
  );
}
