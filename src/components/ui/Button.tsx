import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const SIZES = {
  sm: { padding: '8px 16px', fontSize: '13px', gap: '6px' },
  md: { padding: '12px 22px', fontSize: '14px', gap: '8px' },
  lg: { padding: '16px 28px', fontSize: '15px', gap: '8px' },
};

function variantStyle(variant: string) {
  switch (variant) {
    case 'secondary':
      return {
        background: 'transparent',
        color: 'var(--color-primary)',
        border: '1.5px solid var(--color-primary)',
      };
    case 'accent':
      return {
        background: 'var(--color-accent)',
        color: 'var(--color-text-inverse)',
        border: '1.5px solid transparent',
      };
    case 'danger':
      return {
        background: 'var(--color-error)',
        color: 'var(--white)',
        border: '1.5px solid transparent',
      };
    default:
      return {
        background: 'var(--color-primary)',
        color: 'var(--color-text-inverse)',
        border: '1.5px solid transparent',
      };
  }
}

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
  const base = variantStyle(variant);
  const sizeStyle = SIZES[size] || SIZES.md;
  const hoverBg = {
    primary: 'var(--color-primary-hover)',
    accent: 'var(--color-accent-hover)',
    secondary: 'var(--color-primary-soft)',
    danger: '#e0484d',
  }[variant];

  return (
    <button
      type={type}
      disabled={isInactive}
      aria-busy={loading ? 'true' : undefined}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        gap: sizeStyle.gap,
        width: fullWidth ? '100%' : 'auto',
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        borderRadius: 'var(--radius-full)',
        cursor: isInactive ? 'not-allowed' : 'pointer',
        pointerEvents: isInactive ? 'none' : 'auto',
        opacity: isInactive ? 0.5 : 1,
        transition: 'all var(--duration-fast, 150ms) ease-in-out',
        ...base,
        background: !isInactive && hover && hoverBg ? hoverBg : base.background,
        ...style,
      }}
      {...rest}
    >
      {loading ? (
        <svg
          role="status"
          aria-label="Laden..."
          style={{
            width: size === 'sm' ? '13px' : '15px',
            height: size === 'sm' ? '13px' : '15px',
            animation: 'spin 1s linear infinite',
            flexShrink: 0,
          }}
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
