-- H-02: Schema-Test — Jede Tabelle im Schema public hat ROW LEVEL SECURITY aktiviert.
-- Keine stillen Lücken durch pauschale SELECT-Grants.
BEGIN;

SELECT plan(2);

-- 1. Keine public-Tabelle ohne RLS (relrowsecurity = true)
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename AND c.relnamespace = 'public'::regnamespace
    WHERE t.schemaname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  ),
  'Jede Tabelle im Schema public hat Row Level Security (RLS) aktiviert'
);

-- 2. Mindestens die erwarteten Kern-Tabellen existieren im public-Schema
SELECT ok(
  (
    SELECT count(*)
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'organizations',
        'organization_members',
        'organization_invitations',
        'companies',
        'contacts',
        'imported_funnel_deals',
        'audit_log',
        'dashboards',
        'dashboard_revisions'
      )
  ) >= 9,
  'Kern-Tabellen existieren im Schema public'
);

SELECT * FROM finish();
ROLLBACK;
