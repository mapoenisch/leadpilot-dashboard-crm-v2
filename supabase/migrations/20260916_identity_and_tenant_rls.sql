-- G45 (Auftrag 067B, Steps 3-4): Identität, Mandanten und zeilenbasierte RLS.
--
-- Erzeugt organizations + organization_members, ergänzt organization_id
-- (NOT NULL) auf allen Mandantentabellen, ersetzt die offenen
-- USING(true)-Policies durch organisations- und rollengebundene Policies und
-- stellt die Helper current_organization_id(), current_organization_role()
-- und has_org_role() bereit. Idempotent und re-runnable formuliert.
-- CRM-Schreibrechte (INSERT/UPDATE/DELETE): nur Rolle admin in eigener Org;
-- manager und viewer lesen die eigene Org. Demo-Bestand ohne Org wird dem
-- synthetischen Demo-Mandanten zugeordnet.

-- ---------------------------------------------------------------- 1. Tabellen
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('synthetic', 'real')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, organization_id),
  CONSTRAINT organization_members_single_org UNIQUE (user_id)
);

-- Synthetischer Demo-Mandant für Bestandsdaten ohne Organisationsbezug.
INSERT INTO public.organizations (id, name, mode, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'LeadPilot Demo', 'synthetic', 'active')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------- 2. organization_id-Spalten
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.imported_funnel_deals ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Bestands-Contacts übernehmen die Org ihrer Company.
UPDATE public.contacts AS ct
SET organization_id = c.organization_id
FROM public.companies AS c
WHERE ct.company_id = c.id
  AND ct.organization_id IS NULL
  AND c.organization_id IS NOT NULL;

-- Verbleibende NULLs dem Demo-Mandanten zuordnen, dann NOT NULL erzwingen.
UPDATE public.companies SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;
UPDATE public.contacts SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;
UPDATE public.imported_funnel_deals SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

ALTER TABLE public.companies ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.contacts ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.imported_funnel_deals ALTER COLUMN organization_id SET NOT NULL;

-- ------------------------------------------------- 3. Helper-Funktionen
CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_organization_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role
  FROM public.organization_members
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = auth.uid()
      AND role = ANY (required_roles)
  )
$$;

-- ------------------------------------------------- 4. Fremdschlüssel-Divergenz
-- Ein Contact darf nie zu einer Company fremder Organisation zeigen.
CREATE OR REPLACE FUNCTION public.enforce_contact_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  company_org UUID;
BEGIN
  SELECT organization_id INTO company_org
  FROM public.companies
  WHERE id = NEW.company_id;
  IF company_org IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'ORG_FK_VIOLATION: Contact-Organisation weicht von Company-Organisation ab.'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contacts_same_organization ON public.contacts;
CREATE TRIGGER trg_contacts_same_organization
BEFORE INSERT OR UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.enforce_contact_organization();

-- ------------------------------------------------- 5. RLS-Policies Mandanten
-- Offene V1-Policies entfernen.
DROP POLICY IF EXISTS "Allow public read access to companies" ON public.companies;
DROP POLICY IF EXISTS "Allow public read access to contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public read access to imported_funnel_deals" ON public.imported_funnel_deals;

-- companies
DROP POLICY IF EXISTS "tenant_select_companies" ON public.companies;
CREATE POLICY "tenant_select_companies" ON public.companies
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.organization_members AS membership
      WHERE membership.user_id = auth.uid()
        AND membership.organization_id = organization_id
    )
  );
DROP POLICY IF EXISTS "tenant_write_companies" ON public.companies;
CREATE POLICY "tenant_write_companies" ON public.companies
  FOR ALL TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.has_org_role(ARRAY['admin'])
  )
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.has_org_role(ARRAY['admin'])
  );

-- contacts
DROP POLICY IF EXISTS "tenant_select_contacts" ON public.contacts;
CREATE POLICY "tenant_select_contacts" ON public.contacts
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.organization_members AS membership
      WHERE membership.user_id = auth.uid()
        AND membership.organization_id = organization_id
    )
  );
DROP POLICY IF EXISTS "tenant_write_contacts" ON public.contacts;
CREATE POLICY "tenant_write_contacts" ON public.contacts
  FOR ALL TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.has_org_role(ARRAY['admin'])
  )
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.has_org_role(ARRAY['admin'])
  );

-- imported_funnel_deals
DROP POLICY IF EXISTS "tenant_select_deals" ON public.imported_funnel_deals;
CREATE POLICY "tenant_select_deals" ON public.imported_funnel_deals
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.organization_members AS membership
      WHERE membership.user_id = auth.uid()
        AND membership.organization_id = organization_id
    )
  );
DROP POLICY IF EXISTS "tenant_write_deals" ON public.imported_funnel_deals;
CREATE POLICY "tenant_write_deals" ON public.imported_funnel_deals
  FOR ALL TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.has_org_role(ARRAY['admin'])
  )
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.has_org_role(ARRAY['admin'])
  );

-- ------------------------------------------------- 6. RLS-Policies Identität
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Organisationen: Mitglieder sehen ihren eigenen Mandanten.
DROP POLICY IF EXISTS "member_select_own_organization" ON public.organizations;
CREATE POLICY "member_select_own_organization" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.current_organization_id());

-- Mitgliedschaften: jeder sieht nur die eigene Zeile; Writes nur service_role
-- (keine Policy für authenticated = Default-Deny; Einladungen/Bootstrap
-- erfolgen privilegiert in 067C ff.).
DROP POLICY IF EXISTS "member_select_own_membership" ON public.organization_members;
CREATE POLICY "member_select_own_membership" ON public.organization_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
