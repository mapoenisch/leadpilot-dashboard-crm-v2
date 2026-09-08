import React from 'react';
import { Menu } from 'lucide-react';

export interface HeaderProps {
  currentViewTitle: string;
  categoryLabel?: string;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  isMobile?: boolean;
}

export function Header({
  currentViewTitle,
  categoryLabel,
  onToggleMobileMenu,
  isMobileMenuOpen = false,
  isMobile = false,
}: HeaderProps) {
  return (
    <header
      className="app-header"
      style={{
        minHeight: '56px',
        background: 'rgba(6, 22, 19, 0.85)',
        backdropFilter: 'var(--backdrop-blur-sm)',
        WebkitBackdropFilter: 'var(--backdrop-blur-sm)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 var(--space-4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
        boxSizing: 'border-box',
        width: '100%',
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0, flex: '1 1 auto' }}>
        {isMobile && onToggleMobileMenu && (
          <button
            type="button"
            id="mobile-menu-trigger"
            aria-label="Hauptmenü umschalten"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-sidebar-drawer"
            onClick={onToggleMobileMenu}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-primary)',
              padding: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Menu size={20} />
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0, overflow: 'hidden' }}>
          {categoryLabel && (
            <span
              className="header-category-label"
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
              }}
            >
              {categoryLabel} /
            </span>
          )}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '17px',
              fontWeight: 600,
              color: 'var(--color-text)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {currentViewTitle}
          </h1>
        </div>
      </div>

      <div className="header-user-profile" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--color-surface-raised)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
              fontWeight: 700,
              fontSize: '13px',
              flexShrink: 0,
            }}
          >
            MP
          </div>
          <div className="header-user-details" style={{ fontSize: '12px', minWidth: 0 }}>
            <div style={{ color: 'var(--color-text)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Marc Pönisch</div>
            <div className="header-user-role" style={{ color: 'var(--color-text-muted)', fontSize: '10.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

