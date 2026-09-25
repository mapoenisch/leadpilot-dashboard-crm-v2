# Fixture: Datenbankstand v2.2.0

Grundlage für `scripts/verifyMigrationUpgrade.mjs` (G65, Auftrag 067S). Die Dateien
`01`–`03` sind unveränderte Kopien aus dem Tag `v2.2.0`
(`supabase/schema.sql` und die beiden damaligen Migrationen). `04_demo_state.sql`
legt synthetische CRM-Zeilen ohne `organization_id` an, wie sie in v2.2.0 entstanden.

Nicht bearbeiten: Der Upgrade-Test soll genau den ausgelieferten Stand v2.2.0 nachbilden.
