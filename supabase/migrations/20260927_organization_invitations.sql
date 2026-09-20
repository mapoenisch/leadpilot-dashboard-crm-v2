-- G59 (Auftrag 067M, Step 2): Organisationseinladungen und LAST_ACTIVE_ADMIN Invariante
--
-- 1. Tabelle organization_invitations mit Ablaufdatum, Status-Constraints und RLS.
-- 2. Direkte Writes fuer authenticated sind Default-Deny (Verwaltung ueber Edge Function).
-- 3. Trigger check_last_active_admin verhindert atomar und race-condition-sicher
--    die Deaktivierung, Herabstufung oder Loeschung des letzten aktiven Administrators.
--
-- Idempotent und re-runnable formuliert.

-- ------------------------------------------------- 1. Tabelle organization_invitations
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'revoked', 'accepted', 'expired'))
);

-- Eindeutigkeit: Maximal eine offene Einladung pro Organisation und E-Mail
CREATE UNIQUE INDEX IF NOT EXISTS organization_invitations_pending_email_unique
  ON public.organization_invitations (organization_id, lower(email))
  WHERE status = 'pending';

-- ------------------------------------------------- 2. RLS fuer organization_invitations
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Admins koennen Einladungen der eigenen aktiven Organisation lesen
DROP POLICY IF EXISTS "admin_select_organization_invitations" ON public.organization_invitations;
CREATE POLICY "admin_select_organization_invitations" ON public.organization_invitations
  FOR SELECT TO authenticated
  USING (
    public.current_organization_role() = 'admin'
    AND public.current_organization_id() = organization_id
  );

-- Keine INSERT/UPDATE/DELETE Policies fuer authenticated (Default-Deny).
-- Saemtliche Mutationen erfolgen ueber die Edge Function manage-members mit Service-Role.
REVOKE INSERT, UPDATE, DELETE ON public.organization_invitations FROM authenticated, anon;
GRANT SELECT ON public.organization_invitations TO authenticated;

-- ------------------------------------------------- 3. LAST_ACTIVE_ADMIN Invariante
CREATE OR REPLACE FUNCTION public.check_last_active_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org_status TEXT;
  v_active_admins BIGINT;
BEGIN
  -- Relevanzpruefung: Ein aktiver Admin soll herabgestuft, deaktiviert oder geloescht werden
  IF (TG_OP = 'DELETE' AND OLD.role = 'admin' AND OLD.status = 'active') OR
     (TG_OP = 'UPDATE' AND OLD.role = 'admin' AND OLD.status = 'active' AND (NEW.role != 'admin' OR NEW.status != 'active')) THEN

    -- Pruefe den Status der Organisation (mit Lock gegen Concurrency-Races)
    SELECT status INTO v_org_status
    FROM public.organizations
    WHERE id = OLD.organization_id
    FOR UPDATE;

    -- Wenn die Organisation existiert und aktiv ist, MUSS mindestens ein aktiver Admin verbleiben
    IF v_org_status = 'active' THEN
      SELECT COUNT(*) INTO v_active_admins
      FROM public.organization_members
      WHERE organization_id = OLD.organization_id
        AND role = 'admin'
        AND status = 'active';

      IF v_active_admins = 0 THEN
        RAISE EXCEPTION 'LAST_ACTIVE_ADMIN'
          USING ERRCODE = 'P0001',
                DETAIL = 'Eine aktive Organisation muss mindestens einen aktiven Administrator behalten.';
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_last_active_admin ON public.organization_members;
CREATE CONSTRAINT TRIGGER trigger_enforce_last_active_admin
  AFTER UPDATE OR DELETE ON public.organization_members
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.check_last_active_admin();

-- ------------------------------------------------- 4. Atomare Einladungsannahme
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
BEGIN
  -- P0: Direkten RPC-Bypass durch unprivilegierte Rollen serverseitig abwehren
  IF current_user != 'postgres' AND (auth.role() IS NULL OR auth.role() != 'service_role') THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501',
      DETAIL = 'Direkter Aufruf der Funktion accept_organization_invitation ist nicht gestattet.';
  END IF;

  v_norm_email := lower(trim(p_user_email));

  IF p_invitation_id IS NOT NULL THEN
    SELECT * INTO v_invitation
    FROM public.organization_invitations
    WHERE id = p_invitation_id
    FOR UPDATE;
  ELSE
    SELECT * INTO v_invitation
    FROM public.organization_invitations
    WHERE lower(email) = v_norm_email
      AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
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

  IF lower(v_invitation.email) != v_norm_email THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501',
      DETAIL = 'E-Mail der Einladung stimmt nicht mit Benutzer ueberein.';
  END IF;

  IF v_invitation.status != 'pending' THEN
    RAISE EXCEPTION 'INVITATION_NOT_PENDING' USING ERRCODE = 'P0003';
  END IF;

  IF v_invitation.expires_at <= NOW() THEN
    UPDATE public.organization_invitations
    SET status = 'expired'
    WHERE id = v_invitation.id;
    RAISE EXCEPTION 'INVITATION_NOT_PENDING' USING ERRCODE = 'P0003';
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

-- P0: Berechtigungen strikt auf service_role beschraenken (kein authenticated, kein anon, kein PUBLIC)
REVOKE ALL ON FUNCTION public.accept_organization_invitation(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(UUID, TEXT, UUID) TO service_role;

-- ------------------------------------------------- 5. Automatischer Annahmeweg nach E-Mail-Link
CREATE OR REPLACE FUNCTION public.handle_auth_user_accept_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Wenn der Nutzer bestaetigt oder eingeloggt ist und eine offene Einladung vorliegt
  IF NEW.email IS NOT NULL AND (NEW.email_confirmed_at IS NOT NULL OR NEW.last_sign_in_at IS NOT NULL) THEN
    IF EXISTS (
      SELECT 1 FROM public.organization_invitations
      WHERE lower(email) = lower(trim(NEW.email))
        AND status = 'pending'
        AND expires_at > NOW()
    ) THEN
      BEGIN
        PERFORM public.accept_organization_invitation(NEW.id, NEW.email);
      EXCEPTION WHEN OTHERS THEN
        -- Konflikte (z.B. CANNOT_CHANGE_ORGANIZATION) sollen den Auth-Vorgang nicht blockieren
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed_accept_invitation ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_accept_invitation
  AFTER INSERT OR UPDATE OF email_confirmed_at, last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_accept_invitation();
