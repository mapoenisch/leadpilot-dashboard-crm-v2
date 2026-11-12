-- Auftrag 152: Sicherheits- und Robustheitsnacharbeit (F-02, E-1, E-3, H-01)
-- Idempotent und re-runnable formuliert.

-- ----------------------------------------------------------------------------
-- 1. F-02: Kanonischer Phasen-Sortierschlüssel & Index auf imported_funnel_deals
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.canonical_deal_stage_label(p_stage text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(trim(p_stage)) IN (
      'lead eingegangen', 'lead', 'appointmentscheduled', 'termin vereinbart'
    ) THEN 'Lead eingegangen'
    WHEN lower(trim(p_stage)) IN (
      'erstgespräch geführt', 'erstgespraech gefuehrt', 'qualified_lead',
      'qualifiedtobuy', 'für kauf qualifiziert', 'fuer kauf qualifiziert'
    ) THEN 'Erstgespräch geführt'
    WHEN lower(trim(p_stage)) IN (
      'bedarfsanalyse', 'pitch_demo', 'presentationscheduled',
      'präsentation vereinbart', 'praesentation vereinbart'
    ) THEN 'Bedarfsanalyse'
    WHEN lower(trim(p_stage)) IN (
      'angebot erstellt', 'proposal', 'decisionmakerboughtin',
      'entscheidungsträger hat zugestimmt', 'entscheidungstraeger hat zugestimmt'
    ) THEN 'Angebot erstellt'
    WHEN lower(trim(p_stage)) IN (
      'verhandlung', 'closing', 'contractsent', 'vertrag gesendet'
    ) THEN 'Verhandlung'
    WHEN lower(trim(p_stage)) IN (
      'deal gewonnen', 'won', 'closedwon', 'abgeschlossen und gewonnen'
    ) THEN 'Deal gewonnen'
    WHEN lower(trim(p_stage)) IN (
      'deal verloren', 'lost', 'closedlost', 'abgeschlossen und verloren'
    ) THEN 'Deal verloren'
    ELSE coalesce(trim(p_stage), '')
  END;
$$;

ALTER TABLE public.imported_funnel_deals
  ADD COLUMN IF NOT EXISTS stage_sort_key text
  GENERATED ALWAYS AS (public.canonical_deal_stage_label(stage)) STORED;

CREATE INDEX IF NOT EXISTS imported_funnel_deals_stage_sort_idx
  ON public.imported_funnel_deals (organization_id, stage_sort_key, id);

-- ----------------------------------------------------------------------------
-- 2. E-1: Akteur-Erfassung im Audit-Log (transaktionslokale Einstellung & RPCs)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_log_member_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor UUID;
  v_setting TEXT;
BEGIN
  v_setting := current_setting('app.current_actor_id', true);
  IF v_setting IS NOT NULL AND v_setting ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_actor := v_setting::UUID;
  ELSE
    v_actor := auth.uid();
  END IF;

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

CREATE OR REPLACE FUNCTION public.admin_change_member_role(
  p_organization_id UUID,
  p_member_user_id UUID,
  p_new_role TEXT,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_actor_id IS NOT NULL THEN
    PERFORM set_config('app.current_actor_id', p_actor_id::TEXT, true);
  END IF;

  UPDATE public.organization_members
  SET role = p_new_role
  WHERE user_id = p_member_user_id
    AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_change_member_role(UUID, UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_change_member_role(UUID, UUID, TEXT, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_deactivate_member(
  p_organization_id UUID,
  p_member_user_id UUID,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_actor_id IS NOT NULL THEN
    PERFORM set_config('app.current_actor_id', p_actor_id::TEXT, true);
  END IF;

  UPDATE public.organization_members
  SET status = 'suspended'
  WHERE user_id = p_member_user_id
    AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_deactivate_member(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_deactivate_member(UUID, UUID, UUID) TO service_role;

-- ----------------------------------------------------------------------------
-- 3. H-01 & E-3: accept_organization_invitation Bereinigung & Ablauf ohne Rollback
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(
  p_user_id UUID,
  p_user_email TEXT,
  p_invitation_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invitation RECORD;
  v_existing_member RECORD;
  v_member_exists BOOLEAN := FALSE;
  v_norm_email TEXT;
  v_pending_count INT;
BEGIN
  -- H-01: Irreführende current_user-Prüfung entfernt; Schutz beruht auf EXECUTE-Rechten (nur service_role).

  -- E-3: Vorab alle abgelaufenen pending-Einladungen für diese E-Mail als expired markieren (ohne Rollback)
  v_norm_email := lower(trim(p_user_email));
  UPDATE public.organization_invitations
  SET status = 'expired'
  WHERE lower(email) = v_norm_email
    AND status = 'pending'
    AND expires_at <= NOW();

  IF p_invitation_id IS NOT NULL THEN
    -- Konkrete Einladung nach ID suchen
    SELECT * INTO v_invitation
    FROM public.organization_invitations
    WHERE id = p_invitation_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = 'P0002',
        DETAIL = 'Einladung mit angegebener ID nicht gefunden.';
    END IF;
  ELSE
    -- Keine ID uebergeben: Pruefe Anzahl offener gueltiger Einladungen
    SELECT COUNT(*) INTO v_pending_count
    FROM public.organization_invitations
    WHERE lower(email) = v_norm_email
      AND status = 'pending'
      AND expires_at > NOW();

    IF v_pending_count > 1 THEN
      RAISE EXCEPTION 'AMBIGUOUS_INVITATION' USING ERRCODE = 'P0001',
        DETAIL = 'Mehrere offene Einladungen fuer diese E-Mail vorhanden; konkrete invitation_id ist erforderlich.';
    ELSIF v_pending_count = 1 THEN
      SELECT * INTO v_invitation
      FROM public.organization_invitations
      WHERE lower(email) = v_norm_email
        AND status = 'pending'
        AND expires_at > NOW()
      FOR UPDATE;
    ELSE
      -- Keine offene Einladung gefunden: pruefe, ob es ueberhaupt eine Einladung gab
      SELECT * INTO v_invitation
      FROM public.organization_invitations
      WHERE lower(email) = v_norm_email
      ORDER BY created_at DESC
      LIMIT 1;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = 'P0002';
      ELSE
        RAISE EXCEPTION 'INVITATION_NOT_PENDING' USING ERRCODE = 'P0003';
      END IF;
    END IF;
  END IF;

  IF lower(v_invitation.email) != v_norm_email THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501',
      DETAIL = 'E-Mail der Einladung stimmt nicht mit Benutzer ueberein.';
  END IF;

  IF v_invitation.status != 'pending' THEN
    IF v_invitation.status = 'expired' THEN
      RETURN jsonb_build_object('error', 'INVITATION_NOT_PENDING');
    END IF;
    RAISE EXCEPTION 'INVITATION_NOT_PENDING' USING ERRCODE = 'P0003';
  END IF;

  -- Falls die konkret per ID gewählte Einladung abgelaufen ist:
  IF v_invitation.expires_at <= NOW() THEN
    UPDATE public.organization_invitations
    SET status = 'expired'
    WHERE id = v_invitation.id;
    -- E-3: Ohne Rollback signalisieren, damit status = 'expired' persistiert bleibt
    RETURN jsonb_build_object('error', 'INVITATION_NOT_PENDING');
  END IF;

  -- P1: Organisationswechsel verhindern (LeadPilot ist strikt Single-Tenant je User)
  SELECT EXISTS(
    SELECT 1 FROM public.organization_members WHERE user_id = p_user_id
  ) INTO v_member_exists;

  IF v_member_exists THEN
    SELECT * INTO v_existing_member
    FROM public.organization_members
    WHERE user_id = p_user_id;

    IF v_existing_member.organization_id != v_invitation.organization_id THEN
      RAISE EXCEPTION 'CANNOT_CHANGE_ORGANIZATION' USING ERRCODE = 'P0001',
        DETAIL = 'Benutzer besitzt bereits eine Mitgliedschaft in einer anderen Organisation.';
    END IF;
  END IF;

  -- E-1: Der einladende Admin wird als Akteur für den Audit-Trigger gesetzt
  IF v_invitation.invited_by IS NOT NULL THEN
    PERFORM set_config('app.current_actor_id', v_invitation.invited_by::TEXT, true);
  END IF;

  -- 1. Status atomar auf accepted aktualisieren
  UPDATE public.organization_invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;

  -- 2. Mitgliedschaft atomar in derselben Transaktion erstellen / reaktivieren
  IF NOT v_member_exists THEN
    INSERT INTO public.organization_members (
      organization_id,
      user_id,
      role,
      status
    )
    VALUES (
      v_invitation.organization_id,
      p_user_id,
      v_invitation.role,
      'active'
    );
  ELSE
    -- Selbe Organisation: Status auf active setzen und ggf. Rolle anpassen
    UPDATE public.organization_members
    SET role = v_invitation.role,
        status = 'active'
    WHERE user_id = p_user_id
      AND organization_id = v_invitation.organization_id;
  END IF;

  RETURN jsonb_build_object(
    'organization_id', v_invitation.organization_id,
    'role', v_invitation.role,
    'status', 'active',
    'invitation_id', v_invitation.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_organization_invitation(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(UUID, TEXT, UUID) TO service_role;
