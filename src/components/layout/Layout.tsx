import React, { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SimulationBar } from './SimulationBar';
import { routeForPathname } from '@/app/routes';

export type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'leadpilot-theme';

export function Layout() {
  const location = useLocation();
  const meta = routeForPathname(location.pathname);

  // G39 Welle 1 (Auftrag 054, Block A): explizite Theme-Umschaltung.
  // Standard exakt der heutige Zustand (dunkel), kein prefers-color-scheme-
  // Automatismus — Persistenz in localStorage.
  const [theme, setTheme] = useState<ThemeMode>(() =>
    typeof window !== 'undefined' && window.localStorage.getItem(THEME_STORAGE_KEY) === 'light'
      ? 'light'
      : 'dark'
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Private-Modus o. ä.: Theme gilt für die Session, kein Fehler.
    }
  }, [theme]);

  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileDrawerOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleDrawer = () => {
    setIsMobileDrawerOpen((prev) => !prev);
  };

  const handleCloseDrawer = () => {
    setIsMobileDrawerOpen(false);
  };

  return (
    <div className="flex w-screen max-w-[100vw] h-screen overflow-hidden box-border font-body bg-[radial-gradient(120%_120%_at_50%_0%,var(--color-bg)_0%,var(--color-bg-deep)_100%)]">
      {/* Sidebar (Desktop static or Mobile Drawer) */}
      <Sidebar
        isMobile={isMobile}
        isMobileDrawerOpen={isMobileDrawerOpen}
        onCloseMobileDrawer={handleCloseDrawer}
      />

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden"
        aria-hidden={isMobile && isMobileDrawerOpen}
        {...((isMobile && isMobileDrawerOpen) ? { inert: '' } : {})}
      >
        <Header
          currentViewTitle={meta.title}
          categoryLabel={meta.categoryLabel}
          onToggleMobileMenu={handleToggleDrawer}
          isMobileMenuOpen={isMobileDrawerOpen}
          isMobile={isMobile}
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        />
        <SimulationBar />
        <main
          tabIndex={0}
          aria-label="Hauptinhalt"
          className={`flex-1 overflow-y-auto box-border ${isMobile ? 'p-[var(--space-4)]' : 'p-[var(--space-6)]'}`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
