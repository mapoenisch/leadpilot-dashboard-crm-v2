import React from 'react';

export interface ToolbarProps {
  children: React.ReactNode;
  ariaLabel?: string;
  align?: 'left' | 'center' | 'right' | 'between';
  gap?: string;
  style?: React.CSSProperties;
}

export function Toolbar({
  children,
  ariaLabel = 'Aktionsleiste',
  align = 'left',
  gap = 'var(--space-2)',
  style,
}: ToolbarProps) {
  const justify = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
    between: 'space-between',
  }[align];

  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: justify,
        flexWrap: 'wrap',
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
