import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { NAV_CATEGORIES } from '../../domain/navData';
import { NavItem } from '../ui/NavItem';
import { Icon } from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { X } from 'lucide-react';
import { routeForViewId, routeForPathname } from '@/app/routes';

export interface SidebarProps {
  isMobile?: boolean;
  isMobileDrawerOpen?: boolean;
  onCloseMobileDrawer?: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  uebersicht: 'trendingUp',
  crm: 'user',
  unternehmen: 'building',
  produkt: 'product',
  markt: 'target',
  kunden: 'users',
  vertrieb: 'pieChart',
  finanzen: 'dollar',
  organisation: 'briefcase',
  strategie: 'award',
  resources: 'layers',
  recht: 'fileText',
};

export function Sidebar({
  isMobile = false,
  isMobileDrawerOpen = false,
  onCloseMobileDrawer,
}: SidebarProps) {
  const location = useLocation();
  const currentRoute = routeForPathname(location.pathname);

  // Finde die Kategorie des aktuellen Pfads heraus
  const currentCategory = NAV_CATEGORIES.find((cat) =>
    cat.items.some((item) => item.id === currentRoute.id)
  )?.id;

  const [openCategories, setOpenCategories] = React.useState<Record<string, boolean>>({
    uebersicht: true,
    crm: true,
    vertrieb: true,
    ...(currentCategory ? { [currentCategory]: true } : {}),
  });

  // Kategorie bei Routenwechsel automatisch öffnen falls noch nicht offen
  useEffect(() => {
    if (currentCategory) {
      setOpenCategories((prev) => (prev[currentCategory] ? prev : { ...prev, [currentCategory]: true }));
    }
  }, [currentCategory]);

  const drawerRef = useRef<HTMLElement>(null);
  const leadCount = 0;

  const toggleCategory = (catId: string) => {
    setOpenCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleLinkClick = () => {
    if (isMobile && onCloseMobileDrawer) {
      onCloseMobileDrawer();
    }
  };

  // Keyboard navigation for mobile drawer: Escape to close, Tab focus trap, and Focus return
  useEffect(() => {
    if (!isMobile) return;

    if (isMobileDrawerOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onCloseMobileDrawer?.();
          setTimeout(() => {
            document.getElementById('mobile-menu-trigger')?.focus();
          }, 0);
          return;
        }

        if (e.key === 'Tab' && drawerRef.current) {
          const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;

          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === first || document.activeElement === drawerRef.current) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isMobile, isMobileDrawerOpen, onCloseMobileDrawer]);

  // If mobile and drawer is not open, do not render
  if (isMobile && !isMobileDrawerOpen) {
    return null;
  }

  const content = (
    <>
      <div
        style={{
          padding: 'var(--space-4) var(--space-4)',
          borderBottom: '1px solid var(--color-border-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <img
            src="/assets/logo/leadpilot-logo-full.png"
            alt="LeadPilot Logo"
            style={{ height: '26px', objectFit: 'contain' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: 'var(--color-text)' }}>
            LeadPilot <span style={{ fontSize: '11px', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enterprise</span>
          </div>
        </div>

        {isMobile && onCloseMobileDrawer && (
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            aria-label="Menü schließen"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-3) var(--space-2)' }}>
        {NAV_CATEGORIES.map((cat) => {
          const isOpen = !!openCategories[cat.id];
          const iconName = CATEGORY_ICONS[cat.id] || 'layers';
          const hasActiveChild = cat.items.some((item) => item.id === currentRoute.id);

          return (
            <div key={cat.id} style={{ marginBottom: '4px' }}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`nav-category-items-${cat.id}`}
                onClick={() => toggleCategory(cat.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: hasActiveChild ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontFamily: 'var(--font-body)',
                  userSelect: 'none',
                  textAlign: 'left',
                  transition: 'background 150ms ease, color 150ms ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name={iconName} size={15} color={hasActiveChild ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
                  <span>{cat.label}</span>
                </div>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div
                  id={`nav-category-items-${cat.id}`}
                  style={{ paddingLeft: '12px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}
                >
                  {cat.items.map((item) => {
                    const routeMeta = routeForViewId[item.id];
                    const targetPath = routeMeta ? routeMeta.path : '/dashboard';
                    const isItemActive = currentRoute.id === item.id;

                    return (
                      <NavItem
                        key={item.id}
                        to={targetPath}
                        dataTestId={`nav-item-${item.id}`}
                        label={item.label}
                        active={isItemActive}
                        onClick={handleLinkClick}
                        badge={item.id === 's-leads' ? <Badge variant="cyan">{leadCount}</Badge> : null}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div style={{ padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--color-border-soft)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
        <div>LeadPilot GmbH © 2026</div>
        <div style={{ color: 'var(--color-primary)' }}>Simulation Engine v1.3.0</div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label="Menü schließen"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1040,
          background: 'rgba(6, 22, 19, 0.78)',
          backdropFilter: 'blur(4px)',
          animation: 'backdrop-fade-in 150ms ease-out',
        }}
        onClick={onCloseMobileDrawer}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onCloseMobileDrawer();
          }
        }}
      >
        <aside
          ref={drawerRef}
          id="mobile-sidebar-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Hauptnavigation"
          tabIndex={-1}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: 'min(280px, 85vw)',
            background: 'var(--color-bg-deep)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'hidden',
            zIndex: 1050,
            boxShadow: 'var(--shadow-modal)',
            animation: 'drawer-slide-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
            outline: 'none',
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {content}
        </aside>
      </div>
    );
  }

  return (
    <aside
      style={{
        width: '260px',
        background: 'rgba(6, 22, 19, 0.95)',
        backdropFilter: 'var(--backdrop-blur)',
        WebkitBackdropFilter: 'var(--backdrop-blur)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {content}
    </aside>
  );
}
