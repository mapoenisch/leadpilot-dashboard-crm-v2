// Auftrag 171 (P15a): Supabase als Quelle des Sitzungswächters (`onAuthStateChange`).
import { supabase } from '@/services/db/supabaseClient';
import type { SessionSource } from './useSessionGuard';

type SupabaseLike = NonNullable<typeof supabase>;

function toMs(expiresAtSeconds: number | undefined | null): number | null {
  return typeof expiresAtSeconds === 'number' && Number.isFinite(expiresAtSeconds)
    ? expiresAtSeconds * 1000
    : null;
}

/** Supabase-Quelle; null, wenn Supabase nicht konfiguriert ist (dann zählt nur der Auth-Kontext). */
export function createSupabaseSessionSource(
  client: SupabaseLike | null = supabase,
): SessionSource | null {
  if (!client) return null;
  return {
    async read() {
      const { data } = await client.auth.getSession();
      return data.session ? (toMs(data.session.expires_at) ?? Number.POSITIVE_INFINITY) : null;
    },
    subscribe(listener) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        const expiresAt = session ? (toMs(session.expires_at) ?? Number.POSITIVE_INFINITY) : null;
        if (event === 'SIGNED_OUT' || !session) listener('abgemeldet', null);
        else if (event === 'TOKEN_REFRESHED') listener('erneuert', expiresAt);
        else listener('angemeldet', expiresAt);
      });
      return () => data.subscription.unsubscribe();
    },
  };
}
