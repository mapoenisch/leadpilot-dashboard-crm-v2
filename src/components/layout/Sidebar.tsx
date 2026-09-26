import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { NAV_CATEGORIES } from '../../domain/navData';
import { NavItem } from '../ui/NavItem';
import { Icon } from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { X } from 'lucide-react';
import { routeForViewId, routeForPathname } from '@/app/routes';
import { useOrganization } from '@/auth/organizationContext';

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
  const { session } = useOrganization();
  const isAdmin = session?.role === 'admin';

  // Finde die Kategorie des aktuellen Pfads heraus
  const currentCategory = NAV_CATEGORIES.find((cat) =>
    cat.items.some((item) => item.id === currentRoute.id),
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
      setOpenCategories((prev) =>
        prev[currentCategory] ? prev : { ...prev, [currentCategory]: true },
      );
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
            'button, [href], input, [tabindex]:not([tabindex="-1"])',
          );
          if (focusable.length === 0) return;

          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (!first || !last) return;

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
      <div className="border-0 flex items-center justify-between gap-[var(--space-3)] border-b border-solid border-border-soft p-[var(--space-4)]">
        <div className="flex items-center gap-[var(--space-3)]">
          <img
            src="/assets/logo/leadpilot-logo.png"
            alt="LeadPilot Logo"
            width={80}
            height={36}
            className="h-[36px] w-[80px] object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          {/* G66: Das Logo ist die Wortmarke; daneben nur noch der Produktzusatz. */}
          <span className="text-[11px] font-bold text-primary uppercase tracking-[0.05em]">
            Enterprise
          </span>
        </div>

        {isMobile && onCloseMobileDrawer && (
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            aria-label="Menü schließen"
            autoFocus
            className="flex items-center justify-center cursor-pointer rounded border-0 bg-transparent p-[6px] text-[var(--color-text-muted)] hover:text-primary"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-[var(--space-3)] px-[var(--space-2)]">
        {NAV_CATEGORIES.map((cat) => {
          const isOpen = !!openCategories[cat.id];
          const iconName = CATEGORY_ICONS[cat.id] || 'layers';
          const hasActiveChild = cat.items.some((item) => item.id === currentRoute.id);

          return (
            <div key={cat.id} className="mb-[4px]">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`nav-category-items-${cat.id}`}
                onClick={() => toggleCategory(cat.id)}
                className={`w-full flex items-center justify-between rounded-md border-0 bg-transparent cursor-pointer px-[10px] py-[8px] font-body text-[12.5px] font-semibold uppercase tracking-[0.04em] select-none text-left transition-[background_150ms_ease,color_150ms_ease] hover:bg-surface ${hasActiveChild ? 'text-primary' : 'text-[var(--color-text-muted)]'}`}
              >
                <div className="flex items-center gap-[8px]">
                  <Icon
                    name={iconName}
                    size={15}
                    color={hasActiveChild ? 'var(--color-primary)' : 'var(--color-text-muted)'}
                  />
                  <span>{cat.label}</span>
                </div>
                <span className="text-[10px] opacity-70">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div
                  id={`nav-category-items-${cat.id}`}
                  className="flex flex-col gap-[2px] mt-[2px] pl-[12px]"
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
                        badge={
                          item.id === 's-leads' ? <Badge variant="cyan">{leadCount}</Badge> : null
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {isAdmin && (
          <div className="mt-[var(--space-3)] pt-[var(--space-3)] border-0 border-t border-solid border-border-soft">
            <div className="px-[10px] py-[6px] font-body text-[11px] font-semibold uppercase tracking-[0.05em] text-accent">
              Administration
            </div>
            <NavItem
              to="/admin/members"
              dataTestId="nav-item-admin-members"
              label="Mitgliederverwaltung"
              active={currentRoute.id === 's-admin-members'}
              onClick={handleLinkClick}
            />
            <NavItem
              to="/admin/audit"
              dataTestId="nav-item-admin-audit"
              label="Audit-Log"
              active={currentRoute.id === 's-admin-audit'}
              onClick={handleLinkClick}
            />
            <NavItem
              to="/admin/health"
              dataTestId="nav-item-admin-health"
              label="Systemdiagnose"
              active={currentRoute.id === 's-admin-health'}
              onClick={handleLinkClick}
            />
          </div>
        )}
      </nav>

      <div className="border-0 border-t border-solid border-border-soft px-[var(--space-4)] py-[var(--space-3)] text-[11px] text-[var(--color-text-muted)]">
        <div>LeadPilot GmbH © 2026</div>
        <div className="text-primary">Simulation Engine v1.3.0</div>
      </div>
    </>
  );

  if (isMobile) {
    // 067J / G56: Der Backdrop ist ein echtes (natives) Button-Element als
    // Geschwister des Drawers — kein fokussierbares div mit vorgetäuschter
    // Rolle. Klick und Tastatur (nativ) schließen, Escape läuft zusätzlich
    // über den window-Keydown-Listener (inkl. Fokus-Restore auf den Trigger).
    return (
      <div className="fixed inset-0 z-[1040] animate-[backdrop-fade-in_150ms_ease-out]">
        <button
          type="button"
          aria-label="Menü schließen (Hintergrund)"
          tabIndex={-1}
          onClick={onCloseMobileDrawer}
          className="absolute inset-0 bg-[rgba(6,22,19,0.78)] backdrop-blur-[4px] cursor-default"
        />
        <aside
          ref={drawerRef}
          id="mobile-sidebar-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Hauptnavigation"
          tabIndex={-1}
          className="border-0 fixed top-0 left-0 bottom-0 z-[1050] flex flex-col h-screen overflow-hidden w-[min(280px,85vw)] border-r border-solid border-border bg-background-deep shadow-modal outline-none animate-[drawer-slide-in_200ms_cubic-bezier(0.16,1,0.3,1)]"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {content}
        </aside>
      </div>
    );
  }

  return (
    <aside className="border-0 flex flex-col h-screen overflow-hidden shrink-0 w-[260px] border-r border-solid border-border bg-[rgba(6,22,19,0.95)] backdrop-blur">
      {content}
    </aside>
  );
}
