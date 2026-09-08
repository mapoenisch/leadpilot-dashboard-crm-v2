import React from 'react';
import { NavLink } from 'react-router-dom';

export interface NavItemProps {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: React.ReactNode;
  onClick?: () => void;
  dataTestId?: string;
  to?: string;
}

export function NavItem({
  icon,
  label,
  active,
  badge,
  onClick,
  dataTestId,
  to,
}: NavItemProps) {
  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: '9px 12px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: '13.5px',
    transition: 'all 150ms ease',
    userSelect: 'none',
    textDecoration: 'none',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const getActiveStyle = (isActive: boolean): React.CSSProperties => ({
    background: isActive ? 'var(--color-primary-soft)' : 'transparent',
    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
    fontWeight: isActive ? 600 : 500,
  });

  const content = (
    <>
      {icon}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {badge}
    </>
  );

  if (to) {
    return (
      <NavLink
        to={to}
        data-testid={dataTestId}
        onClick={onClick}
        style={({ isActive }) => {
          const effectiveActive = active !== undefined ? active : isActive;
          return {
            ...baseStyle,
            ...getActiveStyle(effectiveActive),
          };
        }}
        onMouseEnter={(e) => {
          if (!e.currentTarget.getAttribute('aria-current')) {
            e.currentTarget.style.background = 'var(--color-surface-raised)';
          }
        }}
        onMouseLeave={(e) => {
          if (!e.currentTarget.getAttribute('aria-current')) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        {content}
      </NavLink>
    );
  }

  const isCurrent = Boolean(active);
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={dataTestId}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        ...baseStyle,
        ...getActiveStyle(isCurrent),
      }}
      onMouseEnter={(e) => {
        if (!isCurrent) e.currentTarget.style.background = 'var(--color-surface-raised)';
      }}
      onMouseLeave={(e) => {
        if (!isCurrent) e.currentTarget.style.background = 'transparent';
      }}
    >
      {content}
    </div>
  );
}
