import React from 'react';
import { Menu, Moon, Sun } from 'lucide-react';
import type { ThemeMode } from './Layout';

export interface HeaderProps {
  currentViewTitle: string;
  categoryLabel?: string;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  isMobile?: boolean;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export function Header({
  currentViewTitle,
  categoryLabel,
  onToggleMobileMenu,
  isMobileMenuOpen = false,
  isMobile = false,
  theme = 'dark',
  onToggleTheme,
}: HeaderProps) {
  return (
    <header className="app-header flex items-center justify-between flex-wrap gap-[var(--space-3)] box-border w-full min-h-[56px] border-b border-solid border-border bg-[rgba(6,22,19,0.85)] backdrop-blur-sm px-[var(--space-4)] z-10">
      <div className="flex items-center gap-[var(--space-3)] min-w-0 flex-[1_1_auto]">
        {isMobile && onToggleMobileMenu && (
          <button
            type="button"
            id="mobile-menu-trigger"
            aria-label="Hauptmenü umschalten"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-sidebar-drawer"
            onClick={onToggleMobileMenu}
            className="inline-flex items-center justify-center shrink-0 cursor-pointer rounded-md border border-solid border-border bg-transparent p-[6px] text-primary"
          >
            <Menu size={20} />
          </button>
        )}

        <div className="flex items-center gap-[var(--space-2)] min-w-0 overflow-hidden">
          {categoryLabel && (
            <span className="header-category-label whitespace-nowrap text-[12px] uppercase tracking-[0.05em] text-[var(--color-text-muted)]">
              {categoryLabel} /
            </span>
          )}
          <h1 className="m-0 font-display text-[17px] font-semibold text-text whitespace-nowrap overflow-hidden text-ellipsis">
            {currentViewTitle}
          </h1>
        </div>
      </div>

      <div className="header-user-profile flex items-center gap-[var(--space-3)] min-w-0 shrink-0">
        {/* G39 Welle 1 (Auftrag 054, Block A): Theme-Umschalter. Klassen-
            basiert (kein style-Prop) — nimmt die Block-D-Migration vorweg. */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            aria-pressed={theme === 'light'}
            aria-label={theme === 'dark' ? 'Zum hellen Design wechseln' : 'Zum dunklen Design wechseln'}
            title={theme === 'dark' ? 'Zum hellen Design wechseln' : 'Zum dunklen Design wechseln'}
            className="flex items-center justify-center shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-[6px] text-primary transition-colors hover:bg-surface-raised"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}
        <div className="flex items-center gap-[10px] min-w-0">
          <div className="flex items-center justify-center shrink-0 rounded-full bg-surface-raised text-primary font-bold text-[13px] w-[32px] h-[32px]">
            MP
          </div>
          <div className="header-user-details text-[12px] min-w-0">
            <div className="text-text font-semibold whitespace-nowrap overflow-hidden text-ellipsis">Marc Pönisch</div>
            <div className="header-user-role whitespace-nowrap overflow-hidden text-ellipsis text-[10.5px] text-[var(--color-text-muted)]">
              CEO & Gründer · LeadPilot GmbH
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .header-category-label {
            display: none !important;
          }
        }
        @media (max-width: 480px) {
          .app-header {
            padding: 0 8px !important;
          }
          .header-user-role {
            display: none !important;
          }
        }
        @media (max-width: 340px) {
          .header-user-details {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}

