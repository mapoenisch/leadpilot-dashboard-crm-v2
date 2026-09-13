import React from 'react';
import { NavLink } from 'react-router-dom';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export interface NavItemProps {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: React.ReactNode;
  onClick?: () => void;
  dataTestId?: string;
  to?: string;
}

const navItemVariants = cva(
  'flex items-center gap-3 p-[9px_12px] rounded-md cursor-pointer font-body text-[13.5px] transition-[all_150ms_ease] select-none no-underline outline-none w-full box-border',
  {
    variants: {
      active: {
        true: 'bg-primary-soft text-primary font-semibold',
        false: 'bg-transparent text-[var(--color-text-muted)] font-medium',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export function NavItem({ icon, label, active, badge, onClick, dataTestId, to }: NavItemProps) {
  const content = (
    <>
      {icon}
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
      {badge}
    </>
  );

  if (to) {
    return (
      <NavLink
        to={to}
        data-testid={dataTestId}
        onClick={onClick}
        className={({ isActive }) => {
          const effectiveActive = active !== undefined ? active : isActive;
          return cn(navItemVariants({ active: effectiveActive }));
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
      className={cn(navItemVariants({ active: isCurrent }))}
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
