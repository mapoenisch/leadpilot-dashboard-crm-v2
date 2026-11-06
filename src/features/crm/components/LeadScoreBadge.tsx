import { useEffect, useId, useState, type FocusEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  calculateLeadScore,
  type LeadScoringInput,
  type LeadScoringResult,
} from '../services/leadScoringService';

export interface LeadScoreBadgeProps {
  lead: LeadScoringInput;
  onClick?: () => void;
  showBreakdownOnHover?: boolean;
}

const TOOLTIP_WIDTH = 256;
const TOOLTIP_ESTIMATED_HEIGHT = 190;
const TOOLTIP_GAP = 6;
const VIEWPORT_MARGIN = 8;

interface TooltipPosition {
  left: number;
  top: number;
  placeAbove: boolean;
}

/** Positioniert am Badge, klappt ohne Platz nach unten und bleibt im Viewport. */
export function getTooltipPosition(anchor: DOMRect, viewportWidth: number): TooltipPosition {
  const placeAbove = anchor.top >= TOOLTIP_ESTIMATED_HEIGHT + TOOLTIP_GAP + VIEWPORT_MARGIN;
  const halfWidth = TOOLTIP_WIDTH / 2;
  const center = anchor.left + anchor.width / 2;
  const left = Math.max(
    halfWidth + VIEWPORT_MARGIN,
    Math.min(center, viewportWidth - halfWidth - VIEWPORT_MARGIN),
  );
  return {
    left,
    top: placeAbove ? anchor.top - TOOLTIP_GAP : anchor.bottom + TOOLTIP_GAP,
    placeAbove,
  };
}

export function LeadScoreBadge({
  lead,
  onClick,
  showBreakdownOnHover = true,
}: LeadScoreBadgeProps) {
  const result: LeadScoringResult = calculateLeadScore(lead);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const tooltipId = useId();
  const isTooltipOpen = showBreakdownOnHover && position !== null;

  // position: fixed folgt dem Badge beim Scrollen nicht, daher schließen statt versetzt stehen lassen
  useEffect(() => {
    if (!isTooltipOpen) return undefined;
    const close = () => setPosition(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isTooltipOpen]);

  const openTooltip = (e: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    setPosition(getTooltipPosition(e.currentTarget.getBoundingClientRect(), window.innerWidth));
  };
  const closeTooltip = () => setPosition(null);

  const colorStyles =
    result.tier === 'hot'
      ? 'bg-[rgba(16,185,129,0.12)] text-[var(--color-success,#10b981)] border-[rgba(16,185,129,0.3)] hover:bg-[rgba(16,185,129,0.2)]'
      : result.tier === 'warm'
        ? 'bg-[rgba(245,158,11,0.12)] text-[var(--color-accent,#f59e0b)] border-[rgba(245,158,11,0.3)] hover:bg-[rgba(245,158,11,0.2)]'
        : 'bg-[rgba(148,163,184,0.12)] text-[var(--color-text-muted,#94a3b8)] border-[rgba(148,163,184,0.3)] hover:bg-[rgba(148,163,184,0.2)]';

  const badgeContent = (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium font-mono border transition-colors cursor-pointer select-none ${colorStyles}`}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      onMouseEnter={openTooltip}
      onMouseLeave={closeTooltip}
      onFocus={openTooltip}
      onBlur={closeTooltip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
      aria-label={`Lead-Qualität: ${result.totalScore} Prozent, ${result.tierLabel}. Klick für Qualifizierungsdetails.`}
      aria-describedby={isTooltipOpen ? tooltipId : undefined}
    >
      <span aria-hidden="true">{result.icon}</span>
      <span>{result.totalScore}%</span>

      {isTooltipOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            ref={(el) => {
              if (!el) return;
              el.style.left = `${position.left}px`;
              el.style.top = `${position.top}px`;
              el.style.transform = position.placeAbove
                ? 'translate(-50%, -100%)'
                : 'translateX(-50%)';
            }}
            className="fixed w-64 p-2.5 rounded-md bg-[var(--color-surface,#18181b)] text-[var(--color-text,#f4f4f5)] border border-[var(--color-border,#27272a)] shadow-xl text-[11px] leading-relaxed z-50 pointer-events-none font-sans font-normal"
          >
            <span className="block font-semibold mb-1 text-primary">
              {result.icon} {result.tierLabel} ({result.totalScore} Pkt)
            </span>
            <span className="flex flex-col gap-1">
              {result.breakdown.map((b) => (
                <span key={b.key} className="flex justify-between items-center text-[10.5px]">
                  <span className="text-[var(--color-text-muted)] truncate mr-2">{b.label}:</span>
                  <span className="font-mono font-medium text-text whitespace-nowrap">
                    +{b.points} Pkt
                  </span>
                </span>
              ))}
            </span>
            <span className="block text-[10px] text-[var(--color-text-muted)] mt-1.5 pt-1 border-t border-[var(--color-border,#27272a)] italic">
              Klick öffnet Qualifizierungs-Cockpit
            </span>
          </span>,
          document.body,
        )}
    </span>
  );

  return badgeContent;
}
