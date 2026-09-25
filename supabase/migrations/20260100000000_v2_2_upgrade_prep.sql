-- G65 (Auftrag 067S): Upgrade-Vorbereitung für Datenbanken im Stand v2.2.0.
--
-- `20260101000000_base_schema.sql` beschreibt das Zielschema für eine leere
-- Datenbank. In v2.2.0 existieren companies, contacts und
-- imported_funnel_deals bereits, aber ohne organization_id. Dann überspringt
-- base_schema das CREATE TABLE und bricht beim Constraint
-- `companies_org_id_unique` ab (Nachweis: scripts/verifyMigrationUpgrade.mjs).
--
-- Diese Migration läuft davor und ergänzt nur für vorhandene Alt-Tabellen die
-- Spalte organization_id. Bestandszeilen gehen an den synthetischen
-- Demo-Mandanten, genau wie in 20260916_identity_and_tenant_rls.sql. NOT NULL,
-- Fremdschlüssel und Policies setzen die folgenden Migrationen unverändert.
-- Auf einer leeren Datenbank ist sie wirkungslos. Idempotent, nicht destruktiv.

DO $$
DECLARE
  legacy_table TEXT;
BEGIN
  FOREACH legacy_table IN ARRAY ARRAY['companies', 'contacts', 'imported_funnel_deals'] LOOP
    IF to_regclass('public.' || legacy_table) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id UUID',
        legacy_table
      );
      EXECUTE format(
        'UPDATE public.%I SET organization_id = %L WHERE organization_id IS NULL',
        legacy_table,
        '00000000-0000-0000-0000-000000000001'
      );
    END IF;
  END LOOP;
END
$$;
