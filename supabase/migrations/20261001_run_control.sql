-- G63 (Auftrag 067Q): Run-Steuerung — pausierte Runs als Resume-Snapshots,
-- rollen- und mandantengebundene Steuer-RPCs, atomare Bereinigung beim
-- Abschluss und Audit ohne PII (Spec §8.2, §9, §12).
--
-- 1. Tabelle simulation_run_pauses: genau ein Resume-Snapshot je Run.
--    Lesen: aktive Mitglieder der eigenen Organisation. Schreiben nur per RPC.
-- 2. save_run_pause / discard_run_pause / record_run_control: nur Admin und
--    Manager der eigenen Organisation (Viewer, Fremdmandant, anonym → 42501).
-- 3. Trigger auf simulation_runs: Abschluss (COMPLETED) löscht den Snapshot
--    in derselben Transaktion wie persist_completed_run.
-- 4. Audit: scenario.run_paused / run_resumed / run_cancelled / run_retried.
--
-- Idempotent und re-runnable formuliert.

-- ------------------------------------------------- 1. Tabelle
CREATE TABLE IF NOT EXISTS public.simulation_run_pauses (
  run_id              TEXT        PRIMARY KEY,
  organization_id     UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scenario_version_id TEXT        NOT NULL,
  tick                INTEGER     NOT NULL CHECK (tick > 0),
  target_ticks        INTEGER     NOT NULL,
  snapshot            JSONB       NOT NULL,
  snapshot_hash       TEXT        NOT NULL CHECK (snapshot_hash ~ '^[0-9a-f]{64}$'),
  correlation_id      TEXT,
  created_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT simulation_run_pauses_tick_range CHECK (tick < target_ticks)
);

CREATE INDEX IF NOT EXISTS simulation_run_pauses_org_idx
  ON public.simulation_run_pauses (organization_id, created_at DESC);

ALTER TABLE public.simulation_run_pauses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "run_pauses_select_own_org" ON public.simulation_run_pauses;
CREATE POLICY "run_pauses_select_own_org" ON public.simulation_run_pauses
  FOR SELECT USING (organization_id = public.current_organization_id());

REVOKE INSERT, UPDATE, DELETE ON public.simulation_run_pauses FROM authenticated, anon;

-- ------------------------------------------------- 2. Gemeinsame Prüfung
-- Liefert die Organisation des Aufrufers, wenn er sie steuern darf; sonst
-- Abbruch mit 42501 (keine Unterscheidung nach außen, ob Rolle oder Mandant).
CREATE OR REPLACE FUNCTION public.run_control_organization(p_organization_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org UUID;
BEGIN
  v_org := public.current_organization_id();
  IF v_org IS NULL OR p_organization_id IS NULL OR p_organization_id <> v_org
     OR NOT public.has_org_role(ARRAY['admin', 'manager']) THEN
    RAISE EXCEPTION 'FORBIDDEN: Run-Steuerung nur für Admin/Manager der eigenen Organisation'
      USING ERRCODE = '42501';
  END IF;
  RETURN v_org;
END;
$$;

REVOKE ALL ON FUNCTION public.run_control_organization(UUID) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------- 2a. Pause speichern
CREATE OR REPLACE FUNCTION public.save_run_pause(
  p_organization_id UUID,
  p_run_id TEXT,
  p_snapshot JSONB,
  p_snapshot_hash TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org UUID;
  v_tick INTEGER;
  v_target INTEGER;
BEGIN
  v_org := public.run_control_organization(p_organization_id);

  IF p_run_id IS NULL OR p_run_id = '' OR p_snapshot IS NULL
     OR p_snapshot ->> 'runId' IS DISTINCT FROM p_run_id
     OR p_snapshot ->> 'organizationId' IS DISTINCT FROM v_org::TEXT
     OR p_snapshot ->> 'snapshotHash' IS DISTINCT FROM p_snapshot_hash THEN
    RAISE EXCEPTION 'SIMULATION_RESUME_INVALID: Snapshot passt nicht zu Run/Organisation/Hash'
      USING ERRCODE = '22023';
  END IF;

  v_tick := (p_snapshot ->> 'tick')::INTEGER;
  v_target := (p_snapshot ->> 'targetTicks')::INTEGER;

  -- Fremder Run mit gleicher ID oder bereits abgeschlossener Run: kein Überschreiben.
  IF EXISTS (
    SELECT 1 FROM public.simulation_run_pauses
    WHERE run_id = p_run_id AND organization_id <> v_org
  ) OR EXISTS (
    SELECT 1 FROM public.simulation_runs WHERE run_id = p_run_id
  ) THEN
    RAISE EXCEPTION 'SIMULATION_RESUME_INVALID: Run ist abgeschlossen oder gehört nicht zur Organisation'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.simulation_run_pauses (
    run_id, organization_id, scenario_version_id, tick, target_ticks,
    snapshot, snapshot_hash, correlation_id, created_by
  )
  VALUES (
    p_run_id, v_org, p_snapshot ->> 'scenarioVersionId', v_tick, v_target,
    p_snapshot, p_snapshot_hash, p_snapshot ->> 'correlationId', auth.uid()
  )
  ON CONFLICT (run_id) DO UPDATE SET
    tick = EXCLUDED.tick,
    target_ticks = EXCLUDED.target_ticks,
    snapshot = EXCLUDED.snapshot,
    snapshot_hash = EXCLUDED.snapshot_hash,
    correlation_id = EXCLUDED.correlation_id,
    created_by = EXCLUDED.created_by,
    created_at = NOW();

  INSERT INTO public.audit_log (
    organization_id, actor_id, action, target_type, target_id, details, correlation_id
  )
  VALUES (
    v_org, auth.uid(), 'scenario.run_paused', 'simulation_run', p_run_id,
    jsonb_build_object('tick', v_tick, 'target_ticks', v_target),
    p_snapshot ->> 'correlationId'
  );
END;
$$;

-- ------------------------------------------------- 2b. Pause verwerfen (Abbruch)
CREATE OR REPLACE FUNCTION public.discard_run_pause(p_organization_id UUID, p_run_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org UUID;
  v_deleted INTEGER;
BEGIN
  v_org := public.run_control_organization(p_organization_id);

  DELETE FROM public.simulation_run_pauses
  WHERE run_id = p_run_id AND organization_id = v_org;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted > 0 THEN
    INSERT INTO public.audit_log (
      organization_id, actor_id, action, target_type, target_id, details
    )
    VALUES (
      v_org, auth.uid(), 'scenario.run_cancelled', 'simulation_run', p_run_id,
      jsonb_build_object('source', 'paused_snapshot')
    );
  END IF;
  RETURN v_deleted > 0;
END;
$$;

-- ------------------------------------------------- 2c. Steuerbefehl protokollieren
CREATE OR REPLACE FUNCTION public.record_run_control(
  p_organization_id UUID,
  p_run_id TEXT,
  p_action TEXT,
  p_correlation_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org UUID;
BEGIN
  v_org := public.run_control_organization(p_organization_id);
  IF p_action NOT IN ('resumed', 'cancelled', 'retried') OR p_run_id IS NULL OR p_run_id = '' THEN
    RAISE EXCEPTION 'INVALID_ACTION: %', p_action USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.audit_log (
    organization_id, actor_id, action, target_type, target_id, details, correlation_id
  )
  VALUES (
    v_org, auth.uid(), 'scenario.run_' || p_action, 'simulation_run', p_run_id,
    '{}'::JSONB, p_correlation_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_run_pause(UUID, TEXT, JSONB, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.discard_run_pause(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_run_control(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_run_pause(UUID, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.discard_run_pause(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_run_control(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------- 3. Atomare Bereinigung
CREATE OR REPLACE FUNCTION public.simulation_run_pauses_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'COMPLETED' THEN
    DELETE FROM public.simulation_run_pauses
    WHERE run_id = NEW.run_id AND organization_id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_simulation_run_pauses_cleanup ON public.simulation_runs;
CREATE TRIGGER trg_simulation_run_pauses_cleanup
  AFTER INSERT OR UPDATE OF status ON public.simulation_runs
  FOR EACH ROW EXECUTE FUNCTION public.simulation_run_pauses_cleanup();
