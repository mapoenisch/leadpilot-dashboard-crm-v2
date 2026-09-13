import React, { useId } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style'> {
  label?: string;
  error?: string | boolean;
  helperText?: string;
  sizeVariant?: 'sm' | 'md';
  leadingIcon?: React.ReactNode;
}

const inputRootVariants = cva('flex flex-col gap-[6px] font-body w-full');

const inputLabelVariants = cva('text-[13px] text-[var(--color-text-muted)] font-medium');

const inputIconVariants = cva(
  'absolute top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-[1] transition-colors',
  {
    variants: {
      size: {
        sm: 'left-[12px]',
        md: 'left-[14px]',
      },
      focused: {
        true: 'text-primary',
        false: 'text-[var(--color-text-muted)]',
      },
    },
    defaultVariants: {
      size: 'md',
      focused: false,
    },
  },
);

const inputFieldVariants = cva(
  'w-full bg-surface border-[1.5px] border-solid rounded-md text-text outline-none box-border transition-[border-color_150ms_ease-in-out,box-shadow_150ms_ease-in-out] [font-family:inherit]',
  {
    variants: {
      size: {
        sm: 'text-[13.5px]',
        md: 'text-sm',
      },
      error: {
        true: 'border-error',
        false: '',
      },
      focused: {
        true: '',
        false: '',
      },
      disabled: {
        true: 'opacity-50',
        false: '',
      },
    },
    compoundVariants: [
      { error: true, class: 'border-error' },
      { error: false, focused: true, class: 'border-primary shadow-focus-ring' },
      { error: false, focused: false, class: 'border-border shadow-none' },
    ],
    defaultVariants: {
      size: 'md',
      error: false,
      focused: false,
      disabled: false,
    },
  },
);

const inputPaddingVariants = cva('', {
  variants: {
    size: {
      sm: '',
      md: '',
    },
    hasIcon: {
      true: '',
      false: '',
    },
  },
  compoundVariants: [
    { size: 'sm', hasIcon: true, class: 'py-[9px] pr-[14px] pl-[38px]' },
    { size: 'sm', hasIcon: false, class: 'py-[9px] px-[14px]' },
    { size: 'md', hasIcon: true, class: 'py-[13px] pr-[16px] pl-[42px]' },
    { size: 'md', hasIcon: false, class: 'py-[13px] px-[16px]' },
  ],
  defaultVariants: {
    size: 'md',
    hasIcon: false,
  },
});

const inputHelperVariants = cva('text-[12px]', {
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
  id,
  ...rest
}: InputProps) {
  const [focused, setFocused] = React.useState(false);
  const generatedId = useId();
  const inputId = id ?? `input-${generatedId.replace(/:/g, '')}`;
  const hasError = !!error;
  const hasIcon = leadingIcon !== undefined && leadingIcon !== null;

  return (
    <div className={cn(inputRootVariants())}>
      {label && (
        <label htmlFor={inputId} className={cn(inputLabelVariants())}>
          {label}
        </label>
      )}
      <div className="relative w-full flex items-center">
        {leadingIcon && (
          <span
            aria-hidden="true"
            className={cn(inputIconVariants({ size: sizeVariant, focused }))}
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
          className={cn(
            inputFieldVariants({ size: sizeVariant, error: hasError, focused, disabled }),
            inputPaddingVariants({ size: sizeVariant, hasIcon }),
          )}
          {...rest}
        />
      </div>
      {(helperText || error) && (
        <span className={cn(inputHelperVariants({ error: hasError }))}>
          {typeof error === 'string' ? error : helperText}
        </span>
      )}
    </div>
  );
}
