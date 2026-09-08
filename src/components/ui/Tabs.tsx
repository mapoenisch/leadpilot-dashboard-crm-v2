import React, { useRef } from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}

export function Tabs({ items = [], activeId, onChange, ariaLabel = 'Registerkarten' }: TabsProps) {
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = -1;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = items.length - 1;
        break;
    }

    if (nextIndex >= 0) {
      onChange(items[nextIndex].id);
      const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      if (buttons && buttons[nextIndex]) {
        buttons[nextIndex].focus();
      }
    }
  };

  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: '0px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {items.map((tab, idx) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
              padding: '10px 16px',
              fontFamily: 'var(--font-body)',
              fontSize: '13.5px',
              fontWeight: active ? 600 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              transition: 'all 150ms ease',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                style={{
                  background: active ? 'var(--color-primary-soft)' : 'var(--color-bg-deep)',
                  color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  borderRadius: 'var(--radius-full)',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

