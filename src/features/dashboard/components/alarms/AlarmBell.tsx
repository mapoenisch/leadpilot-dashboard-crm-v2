import React from 'react';
import { Bell } from 'lucide-react';
import { useUnreadAlarmCount } from '../../hooks/useUnreadAlarmCount';

export interface AlarmBellProps {
  to?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const AlarmBell: React.FC<AlarmBellProps> = ({ to = '/dashboard/alarme', onClick }) => {
  const { display, ariaLabel, hasUnread } = useUnreadAlarmCount();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
      return;
    }
    if (
      !e.defaultPrevented &&
      e.button === 0 &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.shiftKey &&
      !e.altKey
    ) {
      e.preventDefault();
      window.history.pushState({}, '', to);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <a
      href={to}
      onClick={handleClick}
      data-testid="header-alarm-bell"
      aria-label={ariaLabel}
      title={ariaLabel}
      className="relative flex items-center justify-center shrink-0 rounded-md border border-border bg-transparent p-[6px] text-primary transition-colors hover:bg-surface-raised cursor-pointer"
    >
      <Bell size={18} aria-hidden="true" />
      {hasUnread && (
        <span
          data-testid="alarm-bell-badge"
          className="absolute -top-1 -right-1 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white leading-none shadow-sm"
        >
          {display}
        </span>
      )}
    </a>
  );
};
