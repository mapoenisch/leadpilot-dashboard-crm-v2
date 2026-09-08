import React from 'react';

export function Divider({ style }: { style?: React.CSSProperties }) {
  return (
    <hr
      style={{
        border: 'none',
        borderTop: '1px solid var(--color-border-soft)',
        margin: 'var(--space-4) 0',
        ...style,
      }}
    />
  );
}
