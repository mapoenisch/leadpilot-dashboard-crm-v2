-- ============================================================================
-- Migration 20260928: Organisationsbezogene Composite- und Sortierindizes für CRM
-- Gate G60 / Auftrag 067N (Task 14)
--
-- Ergänzt minimale Composite-Indizes für companies, contacts und imported_funnel_deals,
-- um serverseitige mandantengebundene Filterung, Sortierung und Pagination
-- performant und stabil über (organization_id, <field>, id) abzubilden.
-- ============================================================================

-- 1. Companies Indizes
CREATE INDEX IF NOT EXISTS idx_companies_org_name
  ON public.companies(organization_id, name, id);

CREATE INDEX IF NOT EXISTS idx_companies_org_industry
  ON public.companies(organization_id, industry, id);

CREATE INDEX IF NOT EXISTS idx_companies_org_city
  ON public.companies(organization_id, city, id);

CREATE INDEX IF NOT EXISTS idx_companies_org_employee_count
  ON public.companies(organization_id, employee_count, id);

CREATE INDEX IF NOT EXISTS idx_companies_org_created_at
  ON public.companies(organization_id, created_at DESC, id);

-- 2. Contacts Indizes
CREATE INDEX IF NOT EXISTS idx_contacts_org_last_name
  ON public.contacts(organization_id, last_name, first_name, id);

CREATE INDEX IF NOT EXISTS idx_contacts_org_email
  ON public.contacts(organization_id, email, id);

CREATE INDEX IF NOT EXISTS idx_contacts_org_company
  ON public.contacts(organization_id, company_id, id);

CREATE INDEX IF NOT EXISTS idx_contacts_org_job_title
  ON public.contacts(organization_id, job_title, id);

CREATE INDEX IF NOT EXISTS idx_contacts_org_created_at
  ON public.contacts(organization_id, created_at DESC, id);

-- 3. Deals (imported_funnel_deals) Indizes
CREATE INDEX IF NOT EXISTS idx_deals_org_deal_name
  ON public.imported_funnel_deals(organization_id, deal_name, id);

CREATE INDEX IF NOT EXISTS idx_deals_org_stage
  ON public.imported_funnel_deals(organization_id, stage, id);

CREATE INDEX IF NOT EXISTS idx_deals_org_amount
  ON public.imported_funnel_deals(organization_id, amount, id);

CREATE INDEX IF NOT EXISTS idx_deals_org_close_date
  ON public.imported_funnel_deals(organization_id, close_date, id);

CREATE INDEX IF NOT EXISTS idx_deals_org_pipeline
  ON public.imported_funnel_deals(organization_id, pipeline, id);

CREATE INDEX IF NOT EXISTS idx_deals_org_created_at
  ON public.imported_funnel_deals(organization_id, created_at DESC, id);
