import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useOrganization } from './organizationContext';

export interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isHydrated } = useAuth();
  const { session, isLoading: isOrgLoading } = useOrganization();
  const location = useLocation();

  // G45-Nacharbeit: Erst Hydration + Organisationssitzung abwarten — kein
  // vorzeitiger Redirect, kein Zugang ohne gültige Organisationssitzung.
  if (!isHydrated || isOrgLoading) {
    return null;
  }

  if (!isAuthenticated || !session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ? <>{children}</> : <Outlet />;
}
