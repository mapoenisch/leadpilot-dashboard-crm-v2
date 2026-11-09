-- Auftrag 137: Phasenwechsel dauerhaft speichern.
--
-- 1. imported_funnel_deals.stage_entered_at: Zeitpunkt des letzten Phasenwechsels.
--    Bestandsdaten bleiben NULL (keine erfundene Verweildauer).
-- 2. deal_stage_events: unveränderliche Historie jedes Wechsels.
--    Lesen: aktive Mitglieder der eigenen Organisation. Schreiben nur per RPC.
-- 3. move_deal_stage: rollen-, mandanten- und konfliktgeprüfter Wechsel mit
--    FOR UPDATE, Event und Audit-Eintrag.
-- 4. normalize_deal_stage: bildet die Frontend-Normalisierung aus
--    crmStageHelper.ts (CANONICAL_STAGE_TO_LABEL) in SQL ab.
--
-- Idempotent und re-runnable formuliert.

-- ------------------------------------------------- 1. Verweildauer-Spalte
ALTER TABLE public.imported_funnel_deals
  ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ NULL;

-- ------------------------------------------------- 2. Ereignis-Historie
CREATE TABLE IF NOT EXISTS public.deal_stage_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id         TEXT        NOT NULL REFERENCES public.imported_funnel_deals(id) ON DELETE CASCADE,
  from_stage      TEXT        NULL,
  to_stage        TEXT        NOT NULL,
  actor_id        UUID        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS deal_stage_events_org_time_idx
  ON public.deal_stage_events (organization_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS deal_stage_events_deal_time_idx
  ON public.deal_stage_events (deal_id, occurred_at DESC);

ALTER TABLE public.deal_stage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deal_stage_events_select_own_org" ON public.deal_stage_events;
CREATE POLICY "deal_stage_events_select_own_org" ON public.deal_stage_events
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.is_active_member()
  );

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.deal_stage_events FROM authenticated, anon;

-- ------------------------------------------------- 3. Normalisierung
-- Spiegel des Frontend-Mappings: kanonische Identifier und HubSpot-Rohwerte
-- werden auf die sieben deutschen Labels gehoben. Alles andere bleibt getrimmt.
CREATE OR REPLACE FUNCTION public.normalize_deal_stage(p_stage TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE upper(trim(p_stage))
    WHEN 'LEAD EINGEGANGEN' THEN 'Lead eingegangen'
    WHEN 'LEAD' THEN 'Lead eingegangen'
    WHEN 'APPOINTMENTSCHEDULED' THEN 'Lead eingegangen'
    WHEN 'TERMIN VEREINBART' THEN 'Lead eingegangen'
    WHEN 'ERSTGESPRÄCH GEFÜHRT' THEN 'Erstgespräch geführt'
    WHEN 'QUALIFIED_LEAD' THEN 'Erstgespräch geführt'
    WHEN 'QUALIFIEDTOBUY' THEN 'Erstgespräch geführt'
    WHEN 'FÜR KAUF QUALIFIZIERT' THEN 'Erstgespräch geführt'
    WHEN 'BEDARFSANALYSE' THEN 'Bedarfsanalyse'
    WHEN 'PITCH_DEMO' THEN 'Bedarfsanalyse'
    WHEN 'PRESENTATIONSCHEDULED' THEN 'Bedarfsanalyse'
    WHEN 'PRÄSENTATION VEREINBART' THEN 'Bedarfsanalyse'
    WHEN 'ANGEBOT ERSTELLT' THEN 'Angebot erstellt'
    WHEN 'PROPOSAL' THEN 'Angebot erstellt'
    WHEN 'DECISIONMAKERBOUGHTIN' THEN 'Angebot erstellt'
    WHEN 'ENTSCHEIDUNGSTRÄGER HAT ZUGESTIMMT' THEN 'Angebot erstellt'
    WHEN 'VERHANDLUNG' THEN 'Verhandlung'
    WHEN 'CLOSING' THEN 'Verhandlung'
    WHEN 'CONTRACTSENT' THEN 'Verhandlung'
    WHEN 'VERTRAG GESENDET' THEN 'Verhandlung'
    WHEN 'DEAL GEWONNEN' THEN 'Deal gewonnen'
    WHEN 'WON' THEN 'Deal gewonnen'
    WHEN 'CLOSEDWON' THEN 'Deal gewonnen'
    WHEN 'ABGESCHLOSSEN UND GEWONNEN' THEN 'Deal gewonnen'
    WHEN 'DEAL VERLOREN' THEN 'Deal verloren'
    WHEN 'LOST' THEN 'Deal verloren'
    WHEN 'CLOSEDLOST' THEN 'Deal verloren'
    WHEN 'ABGESCHLOSSEN UND VERLOREN' THEN 'Deal verloren'
    ELSE trim(p_stage)
  END;
$$;

REVOKE ALL ON FUNCTION public.normalize_deal_stage(TEXT) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------- 4. Phasenwechsel-RPC
CREATE OR REPLACE FUNCTION public.move_deal_stage(
  p_deal_id TEXT,
  p_expected_stage TEXT,
  p_new_stage TEXT
)
RETURNS TABLE (deal_id TEXT, stage TEXT, stage_entered_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org UUID;
  v_current_stage TEXT;
BEGIN
  -- Rolle: nur Admin und Manager der eigenen Organisation.
  IF NOT public.has_org_role(ARRAY['admin', 'manager']) THEN
    RAISE EXCEPTION 'FORBIDDEN: Phasenwechsel nur für Admin/Manager der eigenen Organisation'
      USING ERRCODE = 'LP403';
  END IF;

  v_org := public.current_organization_id();
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Deal nicht gefunden'
      USING ERRCODE = 'LP404';
  END IF;

  -- Zielphase: genau eines der sieben kanonischen Labels.
  IF p_new_stage IS NULL OR p_new_stage NOT IN (
    'Lead eingegangen',
    'Erstgespräch geführt',
    'Bedarfsanalyse',
    'Angebot erstellt',
    'Verhandlung',
    'Deal gewonnen',
    'Deal verloren'
  ) THEN
    RAISE EXCEPTION 'INVALID_STAGE: unbekannte Zielphase'
      USING ERRCODE = 'LP422';
  END IF;

  -- Deal der eigenen Organisation sperren. Fremdmandant und fehlender Deal
  -- sind nach außen nicht unterscheidbar.
  SELECT d.stage INTO v_current_stage
  FROM public.imported_funnel_deals AS d
  WHERE d.id = p_deal_id
    AND d.organization_id = v_org
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: Deal nicht gefunden'
      USING ERRCODE = 'LP404';
  END IF;

  -- Konflikt: Der Client muss den zuletzt gesehenen Rohwert mitschicken.
  IF v_current_stage IS DISTINCT FROM p_expected_stage THEN
    RAISE EXCEPTION 'CONFLICT: Deal wurde inzwischen geändert'
      USING ERRCODE = 'LP409';
  END IF;

  -- Gleiche Phase (normalisiert): No-op ohne Event.
  IF public.normalize_deal_stage(v_current_stage) = p_new_stage THEN
    RETURN QUERY
      SELECT d.id, d.stage, d.stage_entered_at
      FROM public.imported_funnel_deals AS d
      WHERE d.id = p_deal_id
        AND d.organization_id = v_org;
    RETURN;
  END IF;

  UPDATE public.imported_funnel_deals AS d
  SET stage = p_new_stage,
      stage_entered_at = NOW()
  WHERE d.id = p_deal_id
    AND d.organization_id = v_org;

  INSERT INTO public.deal_stage_events (organization_id, deal_id, from_stage, to_stage, actor_id)
  VALUES (v_org, p_deal_id, v_current_stage, p_new_stage, auth.uid());

  INSERT INTO public.audit_log (
    organization_id, actor_id, action, target_type, target_id, details
  )
  VALUES (
    v_org, auth.uid(), 'crm.deal.stage_changed', 'deal', p_deal_id,
    jsonb_build_object('from', v_current_stage, 'to', p_new_stage)
  );

  RETURN QUERY
    SELECT d.id, d.stage, d.stage_entered_at
    FROM public.imported_funnel_deals AS d
    WHERE d.id = p_deal_id
      AND d.organization_id = v_org;
END;
$$;

REVOKE ALL ON FUNCTION public.move_deal_stage(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_deal_stage(TEXT, TEXT, TEXT) TO authenticated;
