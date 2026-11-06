import { useState } from 'react';
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

export function LeadScoreBadge({
  lead,
  onClick,
  showBreakdownOnHover = true,
}: LeadScoreBadgeProps) {
  const result: LeadScoringResult = calculateLeadScore(lead);
  const [isHovered, setIsHovered] = useState(false);

  const colorStyles =
    result.tier === 'hot'
      ? 'bg-[rgba(16,185,129,0.12)] text-[var(--color-success,#10b981)] border-[rgba(16,185,129,0.3)] hover:bg-[rgba(16,185,129,0.2)]'
      : result.tier === 'warm'
        ? 'bg-[rgba(245,158,11,0.12)] text-[var(--color-accent,#f59e0b)] border-[rgba(245,158,11,0.3)] hover:bg-[rgba(245,158,11,0.2)]'
        : 'bg-[rgba(148,163,184,0.12)] text-[var(--color-text-muted,#94a3b8)] border-[rgba(148,163,184,0.3)] hover:bg-[rgba(148,163,184,0.2)]';

  const badgeContent = (
    <span
      className={`relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium font-mono border transition-colors cursor-pointer select-none ${colorStyles}`}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
    >
      <span aria-hidden="true">{result.icon}</span>
      <span>{result.totalScore}%</span>

      {showBreakdownOnHover && isHovered && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-64 p-2.5 rounded-md bg-[var(--color-surface,#18181b)] text-[var(--color-text,#f4f4f5)] border border-[var(--color-border,#27272a)] shadow-xl text-[11px] leading-relaxed z-50 pointer-events-none font-sans font-normal"
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
        </span>
      )}
    </span>
  );

  return badgeContent;
}
