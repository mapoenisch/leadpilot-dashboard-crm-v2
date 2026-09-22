-- G62-Nacharbeit (Auftrag 067P, Review-Befund P0 + P1, Scope-Erweiterung
-- von Marc am 2026-09-22 genehmigt; RPC-Entfernung am 2026-09-22 angewiesen):
-- Audit-Log-Härtung mit vertrauenswürdigem serverseitigem Producer.
--
-- P0: Direkte Browser-Schreibrechte (INSERT für `authenticated`) sind entzogen.
-- Die RPC `public.log_audit_event(...)` ist ersatzlos ENTFERNT (Abschnitt 3):
-- Sie hatte nach dem service_role-Lockdown keinen Produzenten mehr (Trigger
-- schreiben direkt, Browser duerfen nichts schreiben) und waere nur ungenutzte
-- Angriffsflaeche geblieben. Es existiert kein schreibender RPC-Einstieg mehr.
-- Produzent echter Ereignisse ist der DB-Trigger `trg_audit_log_member_changes`
-- auf `organization_members` (SECURITY DEFINER, INSERT direkt als Owner,
-- Organisation aus der Zeile, Akteur aus `auth.uid()`, keine PII in Details).
--
-- P1: PII-Spalten `actor_email` und `ip_address` werden entfernt (G62-Vertrag:
-- keine PII im Audit-Log). Der Akteur bleibt als `actor_id` (UUID) referenziert.
--
-- Idempotent und re-runnable formuliert.

-- ------------------------------------------------- 1. Direkte INSERTs sperren
DROP POLICY IF EXISTS "member_insert_audit_log" ON public.audit_log;
REVOKE INSERT ON public.audit_log FROM authenticated, anon;
GRANT SELECT ON public.audit_log TO authenticated;

-- ------------------------------------------------- 2. PII-Spalten entfernen
ALTER TABLE public.audit_log DROP COLUMN IF EXISTS actor_email;
ALTER TABLE public.audit_log DROP COLUMN IF EXISTS ip_address;

-- ------------------------------------------------- 3. RPC ersatzlos entfernen
-- `public.log_audit_event(...)` hatte nach dem service_role-Lockdown keinen
-- Produzenten mehr (Trigger schreiben direkt, Browser duerfen nichts schreiben).
-- Statt sie als ungenutzte Angriffsflaeche zu behalten, wird sie gedroppt.
-- Haertefall: Falls eine alte Migration sie auf einer bestehenden DB angelegt
-- hat, entfernt DROP sie dort ebenfalls — idempotent und re-runnable.
DROP FUNCTION IF EXISTS public.log_audit_event(TEXT, TEXT, TEXT, JSONB, TEXT);

-- ------------------------------------------------- 4. Vertrauenswürdiger Producer:
-- DB-Trigger auf organization_members (von Marc am 2026-09-22 gewählt).
-- Die Trigger-Funktion läuft als SECURITY DEFINER (Owner) und schreibt direkt
-- in audit_log — kein Browser-Pfad, keine RPC-Rechte nötig. Organisation kommt
-- aus der betroffenen Zeile (nicht aus manipulierbarem Client-Input), der
-- Akteur aus auth.uid() (NULL bei service_role-Schreibern, Spalte ist
-- nullable). Details enthalten nur Rollen-/Statuswerte, keine PII.
CREATE OR REPLACE FUNCTION public.audit_log_member_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
BEGIN
  v_actor := auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (
      organization_id, actor_id, action, target_type, target_id, details
    )
    VALUES (
      NEW.organization_id, v_actor, 'member.invited', 'member', NEW.user_id::TEXT,
      jsonb_build_object('role', NEW.role)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      INSERT INTO public.audit_log (
        organization_id, actor_id, action, target_type, target_id, details
      )
      VALUES (
        NEW.organization_id, v_actor, 'member.role_changed', 'member', NEW.user_id::TEXT,
        jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role)
      );
    ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'active' THEN
      INSERT INTO public.audit_log (
        organization_id, actor_id, action, target_type, target_id, details
      )
      VALUES (
        NEW.organization_id, v_actor, 'member.deactivated', 'member', NEW.user_id::TEXT,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (
      organization_id, actor_id, action, target_type, target_id, details
    )
    VALUES (
      OLD.organization_id, v_actor, 'member.deactivated', 'member', OLD.user_id::TEXT,
      jsonb_build_object('old_role', OLD.role)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_member_changes ON public.organization_members;
CREATE TRIGGER trg_audit_log_member_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_member_changes();
