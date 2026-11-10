-- Auftrag 143: API-Rollen brauchen Tabellenrechte auf public — aber nur so
--viel, wie der Datenpfad tatsächlich nutzt. Auf gehosteten Supabase-Projekten
--legt `supabase db push` Tabellen als Rolle `postgres` an; deren
--Default-Privileges gewähren den API-Rollen kein SELECT/INSERT/UPDATE.
--Folge beim ersten Hosted-Rollout (11.11.2026): alle PostgREST-Abfragen liefen
--auf 403, die App zeigte eine leere Seite.
--
-- WICHTIG — bewusst kein GRANT ALL für authenticated: Mehrere Tabellen sind
--absichtlich nur über SECURITY-DEFINER-RPCs oder Trigger schreibbar
--(z. B. deal_stage_events, organization_invitations, audit_log); pgTAP-Tests
--verifizieren genau diese Direktsperren. Ein pauschales ALL würde sie aufheben.
--RLS bleibt zusätzlich die Zeilen-Kontrolle.
--
-- Der manuelle Fix auf nfyiywfcnfjtjbdbptdg wurde entsprechend nachgezogen;
-- diese Migration macht ihn reproduzierbar:
--   SELECT für authenticated auf allen Tabellen (die App liest fast alles
--   direkt; Schreibzugriffe laufen über RPCs)
--   SELECT+INSERT+UPDATE auf lead_qualifications (einziger direkter
--   Upsert-Pfad der App, src/features/crm/services/leadQualificationService.ts)
--   ALL für service_role (Edge Functions, interne Pfade; umgeht ohnehin RLS)
--   nichts für anon über das bestehende live_kpi_public_feed-Grant hinaus

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lead_qualifications TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Künftige Tabellen, die `postgres` anlegt (db push), bekommen dieselben Rechte.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO service_role;
