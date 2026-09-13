import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

// SectionHeader hat keine Stil-Varianten (Bedingungen sind Inhalte, kein
// Aussehen) — cva daher nur als Basis.
const sectionHeaderRootVariants = cva(
  'flex items-end justify-between gap-5 flex-wrap mb-2 min-w-0 w-full',
);

export function SectionHeader({ eyebrow, title, description, actions }: SectionHeaderProps) {
  return (
    <div className={cn('section-header-root', sectionHeaderRootVariants())}>
      <div className="min-w-0 flex-auto [overflow-wrap:anywhere]">
        {eyebrow && (
          <div className="text-primary text-[11px] font-semibold uppercase tracking-[0.08em] mb-[4px] [overflow-wrap:anywhere]">
            {eyebrow}
          </div>
        )}
        <h2 className="section-header-title m-0 font-display text-[26px] font-semibold text-text tracking-[-0.02em] [overflow-wrap:anywhere] [word-break:break-word]">
          {title}
        </h2>
        {description && (
          <p className="mt-[6px] mr-0 mb-0 ml-0 text-[var(--color-text-muted)] text-[14px] max-w-[640px] [overflow-wrap:anywhere] [word-break:break-word]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex gap-3 items-center flex-wrap min-w-0">{actions}</div>}
      <style>{`
        @media (max-width: 600px) {
          .section-header-title {
            font-size: 1.35rem !important;
          }
        }
      `}</style>
    </div>
  );
}
