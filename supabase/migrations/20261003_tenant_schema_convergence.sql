-- G65 (Auftrag 067S): Neuaufbau und Upgrade führen zum selben Schema.
--
-- scripts/verifyMigrationUpgrade.mjs vergleicht das Schema aus einer leeren
-- Datenbank mit dem nach einem Upgrade von v2.2.0. Zwei Abweichungen gab es
-- nur beim Neuaufbau, beide aus den Inline-Definitionen in supabase/schema.sql
-- (als 20260101000000_base_schema.sql eingespielt):
--
-- 1. organization_id hatte auf companies, contacts und imported_funnel_deals
--    den Default „Demo-Mandant“. Ein INSERT ohne Organisation wäre still dem
--    Demo-Mandanten zugefallen. Der Upgrade-Pfad kennt diesen Default nicht,
--    und die Spec (§6) verbietet stille Demo-Mischung. Der Default entfällt,
--    ein INSERT ohne organization_id scheitert jetzt an NOT NULL.
-- 2. imported_funnel_deals hatte zusätzlich zu deals_organization_id_fkey
--    (20260917) einen gleichwertigen zweiten Fremdschlüssel
--    imported_funnel_deals_organization_id_fkey. Der doppelte entfällt, der
--    Fremdschlüssel aus 20260917 bleibt.
--
-- Nicht destruktiv: keine Daten und keine Spalten werden entfernt. Idempotent.

ALTER TABLE public.companies ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE public.contacts ALTER COLUMN organization_id DROP DEFAULT;
ALTER TABLE public.imported_funnel_deals ALTER COLUMN organization_id DROP DEFAULT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deals_organization_id_fkey'
  ) THEN
    ALTER TABLE public.imported_funnel_deals
      DROP CONSTRAINT IF EXISTS imported_funnel_deals_organization_id_fkey;
  END IF;
END $$;
