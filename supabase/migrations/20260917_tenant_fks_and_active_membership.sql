-- G45-Nacharbeit (Review): referenzielle Mandantengrenzen und aktive Mitgliedschaft.
--
-- 1. members.status (active/suspended, Default active).
-- 2. organization_id-FKs auf organizations(id) für alle Mandantentabellen.
-- 3. Zusammengesetzter FK contacts(company_id, organization_id) gegen
--    companies(id, organization_id) — organisationsübergreifende Beziehungen
--    sind auf Datenbankebene unmöglich (Trigger bleibt als zweite Schicht).
-- 4. Helper und Policies prüfen aktive Mitgliedschaft + aktiven Org-Status.
-- Idempotent und re-runnable formuliert.

-- ------------------------------------------------- 1. Member-Status
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'suspended'));

-- ------------------------------------------------- 2. FKs auf organizations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_organization_id_fkey'
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_organization_id_fkey'
  ) THEN
    ALTER TABLE public.contacts
      ADD CONSTRAINT contacts_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deals_organization_id_fkey'
  ) THEN
    ALTER TABLE public.imported_funnel_deals
      ADD CONSTRAINT deals_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- ------------------------------------------------- 3. Zusammengesetzter FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_org_id_unique'
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_org_id_unique UNIQUE (organization_id, id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_same_org_fkey'
  ) THEN
    ALTER TABLE public.contacts
      ADD CONSTRAINT contacts_same_org_fkey
      FOREIGN KEY (company_id, organization_id)
      REFERENCES public.companies(id, organization_id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- ------------------------------------------------- 4. Status-bewusste Helper
CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT m.organization_id
  FROM public.organization_members AS m
  JOIN public.organizations AS o ON o.id = m.organization_id
  WHERE m.user_id = auth.uid()
    AND m.status = 'active'
    AND o.status = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_organization_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT m.role
  FROM public.organization_members AS m
  JOIN public.organizations AS o ON o.id = m.organization_id
  WHERE m.user_id = auth.uid()
    AND m.status = 'active'
    AND o.status = 'active'
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
    FROM public.organization_members AS m
    JOIN public.organizations AS o ON o.id = m.organization_id
    WHERE m.user_id = auth.uid()
      AND m.status = 'active'
      AND o.status = 'active'
      AND m.role = ANY (required_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_active_member()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS m
    JOIN public.organizations AS o ON o.id = m.organization_id
    WHERE m.user_id = auth.uid()
      AND m.status = 'active'
      AND o.status = 'active'
  )
$$;

-- ------------------------------------------------- 5. Status in Lese-Policies
-- SELECT-Policies verlangen neben Org-Gleichheit eine aktive Mitgliedschaft
-- in aktiver Organisation (zusätzlich zum NULL-Fallweg über
-- current_organization_id()).
DROP POLICY IF EXISTS "tenant_select_companies" ON public.companies;
CREATE POLICY "tenant_select_companies" ON public.companies
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.is_active_member()
    AND EXISTS (
      SELECT 1 FROM public.organization_members AS membership
      WHERE membership.user_id = auth.uid()
        AND membership.organization_id = organization_id
        AND membership.status = 'active'
    )
  );

DROP POLICY IF EXISTS "tenant_select_contacts" ON public.contacts;
CREATE POLICY "tenant_select_contacts" ON public.contacts
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.is_active_member()
    AND EXISTS (
      SELECT 1 FROM public.organization_members AS membership
      WHERE membership.user_id = auth.uid()
        AND membership.organization_id = organization_id
        AND membership.status = 'active'
    )
  );

DROP POLICY IF EXISTS "tenant_select_deals" ON public.imported_funnel_deals;
CREATE POLICY "tenant_select_deals" ON public.imported_funnel_deals
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.is_active_member()
    AND EXISTS (
      SELECT 1 FROM public.organization_members AS membership
      WHERE membership.user_id = auth.uid()
        AND membership.organization_id = organization_id
        AND membership.status = 'active'
    )
  );
