-- G62 (Auftrag 067P, Step 1): Append-only Audit-Log mit Immutabilitaets-Trigger und Admin-RLS.
--
-- 1. Tabelle audit_log mit allen Pflichtfeldern.
-- 2. Trigger verhindert UPDATE und DELETE fuer alle Rollen (inklusive Service-Role).
-- 3. RLS:
--    - SELECT: Nur Admins der eigenen Organisation.
--    - INSERT: Authenticated (eigene Organisation) oder Service-Role.
--    - UPDATE/DELETE: Keine Policy (Default-Deny); zusaetzlich Trigger-Schutz.
--
-- Idempotent und re-runnable formuliert.

-- ------------------------------------------------- 1. Tabelle audit_log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email      TEXT,
  action           TEXT        NOT NULL,
  target_type      TEXT,
  target_id        TEXT,
  details          JSONB       NOT NULL DEFAULT '{}'::JSONB,
  correlation_id   TEXT,
  ip_address       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index fuer Filterpfade (Organisation + Zeit, Aktion, Korrelation)
CREATE INDEX IF NOT EXISTS audit_log_org_created_idx
  ON public.audit_log (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_action_idx
  ON public.audit_log (action);

CREATE INDEX IF NOT EXISTS audit_log_correlation_idx
  ON public.audit_log (correlation_id)
  WHERE correlation_id IS NOT NULL;

-- ------------------------------------------------- 2. Immutabilitaets-Trigger
CREATE OR REPLACE FUNCTION public.audit_log_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log records are immutable — UPDATE and DELETE are forbidden (error code: LP_AUDIT_IMMUTABLE)';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON public.audit_log;
CREATE TRIGGER trg_audit_log_immutable
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable();

-- ------------------------------------------------- 3. RLS fuer audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- SELECT: Nur Admins der eigenen aktiven Organisation
DROP POLICY IF EXISTS "admin_select_audit_log" ON public.audit_log;
CREATE POLICY "admin_select_audit_log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    public.current_organization_role() = 'admin'
    AND public.current_organization_id() = organization_id
  );

-- INSERT: Authenticated Mitglieder der eigenen Organisation
DROP POLICY IF EXISTS "member_insert_audit_log" ON public.audit_log;
CREATE POLICY "member_insert_audit_log" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_organization_id() = organization_id
  );

-- Keine UPDATE/DELETE-Policies (Default-Deny) + Trigger-Schutz oben
REVOKE UPDATE, DELETE ON public.audit_log FROM authenticated, anon;
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
