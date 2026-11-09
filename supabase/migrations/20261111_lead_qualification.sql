-- Auftrag 139: Qualifizierung und Konvertierung serverseitig.
--
-- 1. lead_qualifications: BANT-Qualifizierung pro Kontakt, mandantengebunden.
--    Lesen: aktive Mitglieder der eigenen Organisation. Schreiben: admin/manager.
-- 2. imported_funnel_deals.source_contact_id: Rückverweis auf den Lead-Kontakt
--    plus eindeutiger Index pro Organisation (ein Lead = ein Deal).
-- 3. convert_lead_to_deal: transaktionale, rollen- und mandantengeprüfte
--    Konvertierung mit Deal, Phasen-Event (from_stage NULL), qualified_at
--    und Audit-Eintrag.
--
-- Idempotent und re-runnable formuliert.

-- ------------------------------------------------- 1. Qualifizierungs-Tabelle
-- Tenant-FK: contacts.id ist global eindeutig, aber die Qualifizierung darf nur
-- auf Kontakte der eigenen Organisation verweisen. Dafür braucht es einen
-- eindeutigen Schlüssel auf (organization_id, id) in contacts — analog zum
-- bestehenden companies_org_id_unique-Muster.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contacts_org_id_unique'
      AND conrelid = 'public.contacts'::regclass
  ) THEN
    ALTER TABLE public.contacts
      ADD CONSTRAINT contacts_org_id_unique UNIQUE (organization_id, id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.lead_qualifications (
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id      TEXT        NOT NULL,
  budget          BOOLEAN     NOT NULL DEFAULT FALSE,
  authority       BOOLEAN     NOT NULL DEFAULT FALSE,
  need            BOOLEAN     NOT NULL DEFAULT FALSE,
  timeline        BOOLEAN     NOT NULL DEFAULT FALSE,
  notes           TEXT        NOT NULL DEFAULT '' CHECK (char_length(notes) <= 2000),
  qualified_at    TIMESTAMPTZ NULL,
  updated_by      UUID        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, contact_id),
  CONSTRAINT lead_qualifications_contact_org_fkey
    FOREIGN KEY (organization_id, contact_id)
    REFERENCES public.contacts(organization_id, id) ON DELETE CASCADE
);

-- Falls die erste Fassung (Einzel-FK auf contacts.id) bereits angewendet wurde:
-- alten FK entfernen und Mandanten-FK nachziehen.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lead_qualifications_contact_id_fkey'
      AND conrelid = 'public.lead_qualifications'::regclass
  ) THEN
    ALTER TABLE public.lead_qualifications
      DROP CONSTRAINT lead_qualifications_contact_id_fkey;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lead_qualifications_contact_org_fkey'
      AND conrelid = 'public.lead_qualifications'::regclass
  ) THEN
    ALTER TABLE public.lead_qualifications
      ADD CONSTRAINT lead_qualifications_contact_org_fkey
      FOREIGN KEY (organization_id, contact_id)
      REFERENCES public.contacts(organization_id, id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.lead_qualifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_qualifications_select_own_org" ON public.lead_qualifications;
CREATE POLICY "lead_qualifications_select_own_org" ON public.lead_qualifications
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.is_active_member()
  );

DROP POLICY IF EXISTS "lead_qualifications_insert_write_roles" ON public.lead_qualifications;
CREATE POLICY "lead_qualifications_insert_write_roles" ON public.lead_qualifications
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.has_org_role(ARRAY['admin', 'manager'])
  );

DROP POLICY IF EXISTS "lead_qualifications_update_write_roles" ON public.lead_qualifications;
CREATE POLICY "lead_qualifications_update_write_roles" ON public.lead_qualifications
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.has_org_role(ARRAY['admin', 'manager'])
  )
  WITH CHECK (
    organization_id = public.current_organization_id()
    AND public.has_org_role(ARRAY['admin', 'manager'])
  );

DROP POLICY IF EXISTS "lead_qualifications_delete_write_roles" ON public.lead_qualifications;
CREATE POLICY "lead_qualifications_delete_write_roles" ON public.lead_qualifications
  FOR DELETE TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.has_org_role(ARRAY['admin', 'manager'])
  );

REVOKE ALL ON public.lead_qualifications FROM anon;

-- updated_by/updated_at werden von der Datenbank gesetzt, nicht vom Client.
CREATE OR REPLACE FUNCTION public.touch_lead_qualification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lead_qualifications_touch ON public.lead_qualifications;
CREATE TRIGGER lead_qualifications_touch
  BEFORE INSERT OR UPDATE ON public.lead_qualifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_lead_qualification();

REVOKE ALL ON FUNCTION public.touch_lead_qualification() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------- 2. Rückverweis auf den Lead
ALTER TABLE public.imported_funnel_deals
  ADD COLUMN IF NOT EXISTS source_contact_id TEXT NULL;

-- FK auf (organization_id, contact_id): der Quellkontakt muss zum Deal-Mandanten
-- gehören. Ersetzt den Einzel-FK aus der ersten Fassung.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'imported_funnel_deals_source_contact_id_fkey'
      AND conrelid = 'public.imported_funnel_deals'::regclass
  ) THEN
    ALTER TABLE public.imported_funnel_deals
      DROP CONSTRAINT imported_funnel_deals_source_contact_id_fkey;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'imported_funnel_deals_source_contact_org_fkey'
      AND conrelid = 'public.imported_funnel_deals'::regclass
  ) THEN
    ALTER TABLE public.imported_funnel_deals
      ADD CONSTRAINT imported_funnel_deals_source_contact_org_fkey
      FOREIGN KEY (organization_id, source_contact_id)
      REFERENCES public.contacts(organization_id, id)
      ON DELETE SET NULL (source_contact_id);
  END IF;
END $$;

-- Backfill: vor Auftrag 139 erzeugte die Konvertierung Deals mit der ID
-- `d-conv-<Kontakt-ID>-<Zeitstempel>` ohne source_contact_id. Ohne Backfill
-- könnte ein bereits konvertierter Kontakt erneut konvertiert werden (LP409
-- greift nur auf source_contact_id). Der reguläre Ausdruck ist greedy und
-- lässt den Zeitstempel als letztes numerisches Segment übrig; der
-- EXISTS-Guard stellt sicher, dass nur mandantenzugehörige Kontakte verlinkt
-- werden (sonst verletzt der zusammengesetzte FK die Migration). Bei
-- historischem Doppelkonvertieren gewinnt deterministisch die kleinste Deal-ID
-- den Link; weitere Duplikate bleiben unverlinkt, der Kontakt ist über den
-- ersten Deal weiterhin vor LP409-Doppelkonvertierung geschützt.
UPDATE public.imported_funnel_deals AS d
SET source_contact_id = substring(d.id from '^d-conv-(.+)-\d+$')
WHERE d.source_contact_id IS NULL
  AND d.id ~ '^d-conv-.+-\d+$'
  AND d.id = (
    SELECT min(d2.id)
    FROM public.imported_funnel_deals AS d2
    WHERE d2.organization_id = d.organization_id
      AND d2.id ~ '^d-conv-.+-\d+$'
      AND substring(d2.id from '^d-conv-(.+)-\d+$')
        = substring(d.id from '^d-conv-(.+)-\d+$')
  )
  AND EXISTS (
    SELECT 1 FROM public.contacts AS c
    WHERE c.organization_id = d.organization_id
      AND c.id = substring(d.id from '^d-conv-(.+)-\d+$')
  );

-- Qualifizierungsstatus übernehmen: konvertierte Kontakte galten im
-- bisherigen Ablauf als qualifiziert (alter Client markierte sie nach dem
-- Deal). Ohne diese Zeilen erscheinen sie nach dem Upgrade wieder als
-- „Offen". ON CONFLICT ergänzt nur qualified_at — vorhandene BANT-Werte
-- und Notizen bleiben unangetastet.
INSERT INTO public.lead_qualifications (organization_id, contact_id, qualified_at)
SELECT d.organization_id, d.source_contact_id, COALESCE(d.created_at, NOW())
FROM public.imported_funnel_deals AS d
WHERE d.source_contact_id IS NOT NULL
ON CONFLICT (organization_id, contact_id)
DO UPDATE SET qualified_at = COALESCE(lead_qualifications.qualified_at, EXCLUDED.qualified_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_deals_source_contact
  ON public.imported_funnel_deals (organization_id, source_contact_id)
  WHERE source_contact_id IS NOT NULL;

-- ------------------------------------------- 3. Konvertierungs-RPC
CREATE OR REPLACE FUNCTION public.convert_lead_to_deal(
  p_contact_id TEXT,
  p_deal_name   TEXT,
  p_stage       TEXT,
  p_amount      NUMERIC,
  p_close_date  DATE,
  p_pipeline    TEXT
)
RETURNS public.imported_funnel_deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org        UUID;
  v_deal_id    TEXT;
  v_deal       public.imported_funnel_deals;
  v_constraint TEXT;
BEGIN
  -- Rolle: nur Admin und Manager der eigenen Organisation.
  IF NOT public.has_org_role(ARRAY['admin', 'manager']) THEN
    RAISE EXCEPTION 'FORBIDDEN: Konvertierung nur für Admin/Manager der eigenen Organisation'
      USING ERRCODE = 'LP403';
  END IF;

  v_org := public.current_organization_id();
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Kontakt nicht gefunden'
      USING ERRCODE = 'LP404';
  END IF;

  -- Kontakt muss der eigenen Organisation angehören. Fremdmandant und
  -- fehlender Kontakt sind nach außen nicht unterscheidbar.
  IF NOT EXISTS (
    SELECT 1 FROM public.contacts AS c
    WHERE c.id = p_contact_id
      AND c.organization_id = v_org
  ) THEN
    RAISE EXCEPTION 'NOT_FOUND: Kontakt nicht gefunden'
      USING ERRCODE = 'LP404';
  END IF;

  -- Parallele Konvertierungen desselben Kontakts serialisieren: die zweite
  -- Transaktion wartet hier, bis die erste committet hat, und schlägt dann
  -- unten sauber mit LP409 fehl statt mit einem rohen 23505 auf dem
  -- Unique-Index (Codex-Befund: sonst Fehllauf als Netzwerkfehler).
  PERFORM pg_advisory_xact_lock(hashtextextended(v_org::text || ':' || p_contact_id, 0));

  -- Ein Lead wird genau einmal konvertiert.
  IF EXISTS (
    SELECT 1 FROM public.imported_funnel_deals AS d
    WHERE d.organization_id = v_org
      AND d.source_contact_id = p_contact_id
  ) THEN
    RAISE EXCEPTION 'CONFLICT: Lead wurde bereits konvertiert'
      USING ERRCODE = 'LP409';
  END IF;

  -- Betrag muss positiv sein.
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_STAGE: Deal-Betrag muss positiv sein'
      USING ERRCODE = 'LP422';
  END IF;

  -- Startphase: eines der sieben kanonischen Labels.
  IF p_stage IS NULL OR p_stage NOT IN (
    'Lead eingegangen',
    'Erstgespräch geführt',
    'Bedarfsanalyse',
    'Angebot erstellt',
    'Verhandlung',
    'Deal gewonnen',
    'Deal verloren'
  ) THEN
    RAISE EXCEPTION 'INVALID_STAGE: unbekannte Startphase'
      USING ERRCODE = 'LP422';
  END IF;

  v_deal_id := 'd-conv-' || gen_random_uuid()::text;

  INSERT INTO public.imported_funnel_deals (
    id, deal_name, stage, amount, close_date, pipeline,
    organization_id, source_contact_id, stage_entered_at
  )
  VALUES (
    v_deal_id, p_deal_name, p_stage, p_amount, p_close_date,
    COALESCE(p_pipeline, 'Enterprise SaaS'), v_org, p_contact_id, NOW()
  )
  RETURNING * INTO v_deal;

  -- Phasen-Event mit from_stage NULL: der Deal entsteht direkt in p_stage.
  INSERT INTO public.deal_stage_events (organization_id, deal_id, from_stage, to_stage, actor_id)
  VALUES (v_org, v_deal_id, NULL, p_stage, auth.uid());

  -- Qualifizierungsstatus: qualified_at setzen (vorhandener Wert bleibt).
  INSERT INTO public.lead_qualifications (organization_id, contact_id, qualified_at)
  VALUES (v_org, p_contact_id, NOW())
  ON CONFLICT (organization_id, contact_id)
  DO UPDATE SET qualified_at = COALESCE(lead_qualifications.qualified_at, NOW());

  INSERT INTO public.audit_log (
    organization_id, actor_id, action, target_type, target_id, details
  )
  VALUES (
    v_org, auth.uid(), 'crm.lead.converted', 'contact', p_contact_id,
    jsonb_build_object('deal_id', v_deal_id, 'deal_name', p_deal_name, 'stage', p_stage)
  );

  RETURN v_deal;
EXCEPTION
  WHEN unique_violation THEN
    -- Restfall trotz Advisory-Lock (z. B. direkter INSERT außerhalb der RPC):
    -- eine Verletzung von uq_deals_source_contact bedeutet „bereits
    -- konvertiert" und wird als LP409-Konflikt statt Generikfehler gemeldet.
    GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
    IF v_constraint = 'uq_deals_source_contact' THEN
      RAISE EXCEPTION 'CONFLICT: Lead wurde bereits konvertiert'
        USING ERRCODE = 'LP409';
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_lead_to_deal(TEXT, TEXT, TEXT, NUMERIC, DATE, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_deal(TEXT, TEXT, TEXT, NUMERIC, DATE, TEXT)
  TO authenticated;
