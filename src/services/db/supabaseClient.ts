import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
const supabasePublishableKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  !supabaseUrl.includes('your-project') &&
  !supabasePublishableKey.includes('your-anon-public-key') &&
  !supabasePublishableKey.includes('your-publishable-key'),
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;

// Test-only Hook für den externen E2E-Runner (Gate G28, scripts/runLiveKpiE2e.ts):
// macht den Client unter einem klar als Test markierten globalen Namen erreichbar,
// damit ein echter Verbindungsabbruch simuliert werden kann (realtime.disconnect()),
// statt sich auf Network.emulateNetworkConditions zu verlassen — CDP kappt keine
// bereits offenen WebSocket-Verbindungen, nur neue. Ausschließlich aktiv, wenn der
// Runner selbst dieses Flag beim Build setzt; in jedem normalen Build (dev/prod)
// bleibt window unverändert.
if (
  typeof window !== 'undefined' &&
  typeof import.meta !== 'undefined' &&
  import.meta.env?.VITE_E2E_EXPOSE_SUPABASE_CLIENT === 'true' &&
  supabase
) {
  (window as unknown as { __E2E_SUPABASE_CLIENT__?: typeof supabase }).__E2E_SUPABASE_CLIENT__ =
    supabase;
}
