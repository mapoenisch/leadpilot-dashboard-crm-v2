// G45 (Auftrag 067B): Organisationskontext (Design §5.1/§5.3).
// Lädt die Mitgliedschaft (genau eine Organisation je Benutzer) des aktuell
// angemeldeten Benutzers via RLS-geschütztem Read. Ohne Sitzung oder ohne
// Mitgliedschaft ist session null — niemals ein stiller Demo-Mandant.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/db/supabaseClient';
import { useAuth } from './AuthContext';
import { isOrganizationRole, type OrganizationSession } from '../types/organization';

export interface OrganizationContextValue {
  session: OrganizationSession | null;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextValue>({
  session: null,
  isLoading: true,
});

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [session, setSession] = useState<OrganizationSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      if (!user || !isSupabaseConfigured || !supabase) {
        if (!cancelled) {
          setSession(null);
          setIsLoading(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id, role, status, organizations!inner(status)')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled) {
        const role = data?.role;
        // G45-Nacharbeit: Nur aktive Mitgliedschaft in aktiver Organisation
        // bildet eine UI-Sitzung — suspendierte Kontexte fallen auf null und
        // ProtectedRoute leitet nach /login um (Defense in depth zur RLS).
        const orgStatus = (data as { organizations?: { status?: unknown } } | null)?.organizations
          ?.status;
        setSession(
          !error &&
            data &&
            isOrganizationRole(role) &&
            data.status === 'active' &&
            orgStatus === 'active'
            ? { userId: user.id, organizationId: data.organization_id as string, role }
            : null,
        );
        setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <OrganizationContext.Provider value={{ session, isLoading }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization(): OrganizationContextValue {
  return useContext(OrganizationContext);
}
