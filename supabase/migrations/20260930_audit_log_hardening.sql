-- G62-Nacharbeit (Auftrag 067P, Review-Befund P0 + P1):
-- Audit-Log-Härtung.
--
-- P0: Direkte Browser-Schreibrechte (INSERT für `authenticated`) werden entzogen.
-- Audit-Ereignisse laufen ausschließlich über die SECURITY-DEFINER-Funktion
-- `public.log_audit_event(...)`, die Organisation und Akteur serverseitig aus dem
-- JWT ableitet (`auth.uid()`, `current_organization_id()`) und Aktion, Ziel-Typ
-- sowie Details gegen geschlossene Whitelists prüft.
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

-- ------------------------------------------------- 3. Kontrollierter Serverpfad
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::JSONB,
  p_correlation_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_org UUID;
  v_id UUID;
BEGIN
  -- Akteur und Organisation ausschließlich aus der Sitzung ableiten
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'log_audit_event requires an authenticated session (error code: LP_AUDIT_UNAUTHORIZED)';
  END IF;

  SELECT public.current_organization_id() INTO v_org;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'log_audit_event requires an active organization membership (error code: LP_AUDIT_NO_ORG)';
  END IF;

  -- Geschlossene Action-Whitelist (spiegelt AuditAction im Frontend)
  IF p_action NOT IN (
    'auth.login',
    'auth.logout',
    'auth.password_reset',
    'member.role_changed',
    'member.invited',
    'member.deactivated',
    'data_source.switch',
    'data_source.sync_started',
    'data_source.sync_completed',
    'baseline.created',
    'scenario.run_started',
    'scenario.run_completed',
    'scenario.exported',
    'config.changed'
  ) THEN
    RAISE EXCEPTION 'log_audit_event rejected unknown action (error code: LP_AUDIT_ACTION)';
  END IF;

  -- Geschlossene Ziel-Typ-Whitelist (NULL = kein Zielobjekt)
  IF p_target_type IS NOT NULL AND p_target_type NOT IN (
    'member',
    'contact',
    'company',
    'deal',
    'activity',
    'data_source',
    'scenario',
    'config',
    'session'
  ) THEN
    RAISE EXCEPTION 'log_audit_event rejected unknown target_type (error code: LP_AUDIT_TARGET)';
  END IF;

  -- Details müssen ein Objekt sein (keine Arrays/Skalare/NULL-Tricks)
  IF p_details IS NULL THEN
    p_details := '{}'::JSONB;
  END IF;
  IF jsonb_typeof(p_details) <> 'object' THEN
    RAISE EXCEPTION 'log_audit_event requires details to be a JSON object (error code: LP_AUDIT_DETAILS)';
  END IF;

  -- Längenbegrenzung gegen Missbrauch als Datenschleuse
  IF p_target_id IS NOT NULL AND char_length(p_target_id) > 128 THEN
    RAISE EXCEPTION 'log_audit_event rejected oversized target_id (error code: LP_AUDIT_TARGET)';
  END IF;
  IF p_correlation_id IS NOT NULL AND char_length(p_correlation_id) > 128 THEN
    RAISE EXCEPTION 'log_audit_event rejected oversized correlation_id (error code: LP_AUDIT_TARGET)';
  END IF;

  INSERT INTO public.audit_log (
    organization_id, actor_id, action, target_type, target_id, details, correlation_id
  )
  VALUES (
    v_org, v_actor, p_action, p_target_type, p_target_id, p_details, p_correlation_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Nur angemeldete Mitglieder dürfen die Funktion ausführen; kein anon-Zugriff.
REVOKE ALL ON FUNCTION public.log_audit_event(TEXT, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated;
