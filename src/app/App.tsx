import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { queryClient } from '@/app/queryClient';
import { APP_ROUTES } from '@/app/routes';
import { ROUTE_PAGES } from '@/app/routePages';
import { RouteErrorBoundary } from '@/components/ui/RouteErrorBoundary';
import { NotFoundPage } from '@/app/NotFoundPage';
import '@/services/data';

const DesignSystemPage = React.lazy(() =>
  import('@/app/DesignSystemPage').then((m) => ({
    default: m.DesignSystemPage,
  }))
);

export function App() {
  return (
    <RouteErrorBoundary resetKey="app-root">
      <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            {/* Root-Redirect zum Executive Dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Generisches deklaratives Routing aller 41 Routen mit RouteErrorBoundary */}
            {APP_ROUTES.map((route) => {
              const PageComponent = ROUTE_PAGES[route.id];
              return (
                <Route
                  key={route.id}
                  path={route.path}
                  element={
                    <RouteErrorBoundary resetKey={route.id}>
                      <React.Suspense
                        fallback={
                          <div
                            role="status"
                            aria-live="polite"
                            className="p-[2rem] text-[14px] text-[var(--color-text-muted,#94a3b8)]"
                          >
                            Ansicht wird geladen …
                          </div>
                        }
                      >
                        <PageComponent />
                      </React.Suspense>
                    </RouteErrorBoundary>
                  }
                />
              );
            })}

            {/* Explizite 404-Fallback-Route für unbekannte Pfade */}
            <Route
              path="*"
              element={
                <RouteErrorBoundary resetKey="not-found">
                  <NotFoundPage />
                </RouteErrorBoundary>
              }
            />

            {/* G38: Design-System-Galerie — nur im Dev-Modus registriert,
                in Prod existiert die Route nicht (kein Navi-Eintrag). */}
            {import.meta.env.DEV && (
              <Route
                path="/design-system"
                element={
                  <RouteErrorBoundary resetKey="design-system">
                    <React.Suspense
                      fallback={
                        <div
                          role="status"
                          aria-live="polite"
                          className="p-[2rem] text-[14px] text-[var(--color-text-muted,#94a3b8)]"
                        >
                          Ansicht wird geladen …
                        </div>
                      }
                    >
                      <DesignSystemPage />
                    </React.Suspense>
                  </RouteErrorBoundary>
                }
              />
            )}
          </Route>
        </Routes>
      </BrowserRouter>
      </QueryClientProvider>
    </RouteErrorBoundary>
  );
}

export default App;
