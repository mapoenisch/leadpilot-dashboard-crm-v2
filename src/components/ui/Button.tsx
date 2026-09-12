import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap shrink-0 font-body font-semibold rounded-full transition-[all_var(--duration-fast,150ms)_ease-in-out]',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-[var(--color-text-inverse)] border-[1.5px] border-solid border-transparent',
        secondary: 'bg-transparent text-primary border-[1.5px] border-solid border-primary',
        accent:
          'bg-accent text-[var(--color-text-inverse)] border-[1.5px] border-solid border-transparent',
        danger: 'bg-error text-white border-[1.5px] border-solid border-transparent',
      },
      size: {
        sm: 'px-[16px] py-[8px] text-[13px] gap-[6px]',
        md: 'px-[22px] py-[12px] text-sm gap-[8px]',
        lg: 'px-[28px] py-[16px] text-[15px] gap-[8px]',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
      inactive: {
        true: 'cursor-not-allowed pointer-events-none opacity-50',
        false: 'cursor-pointer',
      },
      // Hover läuft über Runtime-State (nicht :hover), daher als Variante.
      hovered: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      { variant: 'primary', hovered: true, class: 'bg-primary-hover' },
      { variant: 'accent', hovered: true, class: 'bg-accent-hover' },
      { variant: 'secondary', hovered: true, class: 'bg-primary-soft' },
      { variant: 'danger', hovered: true, class: 'bg-[#e0484d]' },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      inactive: false,
      hovered: false,
    },
  }
);

const buttonSpinnerVariants = cva('shrink-0 animate-[spin_1s_linear_infinite]', {
  variants: {
    size: {
      sm: 'w-[13px] h-[13px]',
      md: 'w-[15px] h-[15px]',
      lg: 'w-[15px] h-[15px]',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  children,
  onClick,
  type = 'button',
  style,
  ...rest
}: ButtonProps) {
  const [hover, setHover] = React.useState(false);
  const isInactive = disabled || loading;
  const hovered = !isInactive && hover;

  return (
    <button
      type={type}
      disabled={isInactive}
      aria-busy={loading ? 'true' : undefined}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(buttonVariants({ variant, size, fullWidth, inactive: isInactive, hovered }))}
      // Ausnahme (G38-Entscheidung 5, Nachtrag): style-Passthrough bleibt,
      // weil Konsumenten Overrides übergeben. Disable-Anweisung in Block D.
      // eslint-disable-next-line react/forbid-dom-props -- Passthrough des Aufrufer-style-Props, siehe Auftrag 053 Entscheidung 5
      style={style}
      {...rest}
    >
      {loading ? (
        <svg
          role="status"
          aria-label="Laden..."
          className={cn(buttonSpinnerVariants({ size }))}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
      ) : (
        iconLeft
      )}
      {children}
      {!loading && iconRight}
    </button>
  );
}
