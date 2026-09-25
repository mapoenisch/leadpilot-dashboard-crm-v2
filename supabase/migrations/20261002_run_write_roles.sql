-- Viewer strikt lesend (Entscheid Marc Poenisch, 25.09.2026; Revision G49).
-- `persist_completed_run` verlangt zusätzlich zur Organisationsbindung die
-- Rolle Admin oder Manager (wie `simulation:run` in src/auth/permissions.ts
-- und die Run-Steuerung aus G63). Viewer erhalten 42501, bevor irgendetwas
-- geschrieben wird; es bleiben keine Teilreste.
-- Funktionskörper sonst unverändert gegenüber 20260926_run_final_state.sql;
-- Signatur, Rechte (REVOKE/GRANT aus 20260922) und Rückgabewert bleiben.
-- Idempotent (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.persist_completed_run(
  p_organization_id UUID,
  p_scenario JSONB,
  p_version JSONB,
  p_run JSONB,
  p_events JSONB,
  p_timeseries JSONB,
  p_snapshots JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_run_id TEXT;
  v_status TEXT;
  v_scenario_id TEXT;
  v_version_id TEXT;
  v_owner UUID;
BEGIN
  IF public.current_organization_id() IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'ORG_MISMATCH: kein Persistenzrecht für diese Organisation'
      USING ERRCODE = '42501';
  END IF;

  -- Viewer strikt lesend: Läufe speichern nur Admin und Manager.
  IF NOT public.has_org_role(ARRAY['admin', 'manager']) THEN
    RAISE EXCEPTION 'FORBIDDEN: Simulationsläufe speichern nur Admin/Manager der eigenen Organisation'
      USING ERRCODE = '42501';
  END IF;

  v_run_id := NULLIF(p_run ->> 'runId', '');
  IF v_run_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_BUNDLE: runId fehlt' USING ERRCODE = '22023';
  END IF;
  v_status := COALESCE(NULLIF(p_run ->> 'status', ''), 'COMPLETED');
  v_scenario_id := p_scenario ->> 'id';
  v_version_id := p_version ->> 'id';

  SELECT organization_id INTO v_owner
  FROM public.simulation_scenarios WHERE id = v_scenario_id;
  IF FOUND AND v_owner IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'ORG_MISMATCH: Szenario gehört fremder Organisation'
      USING ERRCODE = '42501';
  END IF;

  SELECT organization_id INTO v_owner
  FROM public.simulation_scenario_versions WHERE id = v_version_id;
  IF FOUND AND v_owner IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'ORG_MISMATCH: Version gehört fremder Organisation'
      USING ERRCODE = '42501';
  END IF;

  SELECT organization_id INTO v_owner
  FROM public.simulation_runs WHERE run_id = v_run_id;
  IF FOUND AND v_owner IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'ORG_MISMATCH: Run gehört fremder Organisation'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.simulation_scenarios
    (id, organization_id, name, description, status, is_protected, current_version_id, created_by)
  VALUES (
    v_scenario_id, p_organization_id,
    COALESCE(p_scenario ->> 'name', 'Unbenannt'),
    p_scenario ->> 'description',
    COALESCE(p_scenario ->> 'status', 'ACTIVE'),
    COALESCE((p_scenario ->> 'isProtected')::boolean, false),
    p_scenario ->> 'currentVersionId', auth.uid()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    current_version_id = EXCLUDED.current_version_id,
    updated_at = NOW();

  INSERT INTO public.simulation_scenario_versions
    (id, scenario_id, organization_id, version_number, parameters, description, created_by)
  VALUES (
    v_version_id, v_scenario_id, p_organization_id,
    COALESCE((p_version ->> 'versionNumber')::integer, 1),
    COALESCE(p_version -> 'parameters', '{}'),
    p_version ->> 'description', auth.uid()
  )
  ON CONFLICT (id) DO UPDATE SET
    parameters = EXCLUDED.parameters,
    description = EXCLUDED.description;

  INSERT INTO public.simulation_runs
    (run_id, scenario_id, scenario_version_id, organization_id, seed, status,
     manifest, final_metrics, final_state, rng_state, correlation_id,
     completed_at)
  VALUES (
    v_run_id, v_scenario_id, v_version_id, p_organization_id,
    COALESCE((p_run ->> 'seed')::bigint, 0), v_status,
    COALESCE(p_run -> 'manifest', '{}'),
    p_run -> 'finalMetrics',
    p_run -> 'finalState',
    (p_run ->> 'rngState')::bigint,
    p_run ->> 'correlationId',
    CASE WHEN v_status = 'COMPLETED' THEN NOW() ELSE NULL END
  )
  ON CONFLICT (run_id) DO UPDATE SET
    status = EXCLUDED.status,
    manifest = EXCLUDED.manifest,
    final_metrics = EXCLUDED.final_metrics,
    final_state = EXCLUDED.final_state,
    rng_state = EXCLUDED.rng_state,
    correlation_id = EXCLUDED.correlation_id,
    completed_at = EXCLUDED.completed_at;

  DELETE FROM public.simulation_events WHERE run_id = v_run_id AND organization_id = p_organization_id;
  DELETE FROM public.simulation_timeseries WHERE run_id = v_run_id AND organization_id = p_organization_id;
  DELETE FROM public.simulation_snapshots WHERE run_id = v_run_id AND organization_id = p_organization_id;

  INSERT INTO public.simulation_events (run_id, organization_id, tick, event_type, title, payload)
  SELECT v_run_id, p_organization_id,
    (e ->> 'tick')::integer,
    COALESCE(e ->> 'eventType', e ->> 'type', 'UNKNOWN'),
    COALESCE(e ->> 'title', ''),
    COALESCE(e -> 'payload', e)
  FROM jsonb_array_elements(COALESCE(p_events, '[]')) AS e;

  INSERT INTO public.simulation_timeseries (run_id, organization_id, tick, metrics)
  SELECT v_run_id, p_organization_id,
    (t ->> 'tick')::integer,
    COALESCE(t -> 'metrics', '{}')
  FROM jsonb_array_elements(COALESCE(p_timeseries, '[]')) AS t;

  INSERT INTO public.simulation_snapshots (snapshot_id, run_id, organization_id, tick_id, state, projection)
  SELECT
    s ->> 'snapshotId', v_run_id, p_organization_id,
    COALESCE((s ->> 'tickId')::integer, 0),
    COALESCE(s -> 'state', '{}'),
    COALESCE(s -> 'projection', '{}')
  FROM jsonb_array_elements(COALESCE(p_snapshots, '[]')) AS s;

  RETURN v_run_id;
END;
$$;
