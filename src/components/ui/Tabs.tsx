import React, { useRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

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

const tabVariants = cva(
  'bg-transparent border-0 border-b-2 border-solid px-[16px] py-[10px] font-body text-[13.5px] cursor-pointer flex items-center gap-[6px] whitespace-nowrap transition-[all_150ms_ease] outline-none box-border',
  {
    variants: {
      active: {
        true: 'border-b-primary text-primary font-semibold',
        false: 'border-b-transparent text-[var(--color-text-muted)] font-medium',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

const tabCountVariants = cva('rounded-full px-[8px] py-[2px] text-[11px] font-semibold', {
  variants: {
    active: {
      true: 'bg-primary-soft text-primary',
      false: 'bg-background-deep text-[var(--color-text-muted)]',
    },
  },
  defaultVariants: {
    active: false,
  },
});

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
      className="flex gap-[4px] border-b border-solid border-border pb-0 overflow-x-auto [-webkit-overflow-scrolling:touch]"
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
            className={cn(tabVariants({ active }))}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(tabCountVariants({ active }))}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
