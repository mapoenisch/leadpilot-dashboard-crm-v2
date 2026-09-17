-- 067F / G49 (Nacharbeit): `seed` und `rng_state` als BIGINT.
-- Der deterministische PRNG-Zustand wächst pro `next()`-Aufruf unbegrenzt
-- (Gleitkomma-Arithmetik ohne 32-Bit-Rückschnitt); nach 50 Ticks überschreitet
-- er den INTEGER-Bereich (E2E-Nachweis: 1527526101518). Seeds aus
-- `newRunSeed()` (100000..999999) waren nie betroffen, der Endzustand schon.

ALTER TABLE public.simulation_runs ALTER COLUMN seed TYPE BIGINT;
ALTER TABLE public.simulation_runs ALTER COLUMN rng_state TYPE BIGINT;

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
BEGIN
  IF public.current_organization_id() IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'ORG_MISMATCH: kein Persistenzrecht für diese Organisation'
      USING ERRCODE = '42501';
  END IF;

  v_run_id := NULLIF(p_run ->> 'runId', '');
  IF v_run_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_BUNDLE: runId fehlt' USING ERRCODE = '22023';
  END IF;
  v_status := COALESCE(NULLIF(p_run ->> 'status', ''), 'COMPLETED');

  INSERT INTO public.simulation_scenarios
    (id, organization_id, name, description, status, is_protected, current_version_id, created_by)
  VALUES (
    p_scenario ->> 'id', p_organization_id,
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
    p_version ->> 'id', p_scenario ->> 'id', p_organization_id,
    COALESCE((p_version ->> 'versionNumber')::integer, 1),
    COALESCE(p_version -> 'parameters', '{}'),
    p_version ->> 'description', auth.uid()
  )
  ON CONFLICT (id) DO UPDATE SET
    parameters = EXCLUDED.parameters,
    description = EXCLUDED.description;

  INSERT INTO public.simulation_runs
    (run_id, scenario_id, scenario_version_id, organization_id, seed, status,
     manifest, final_metrics, rng_state, correlation_id,
     completed_at)
  VALUES (
    v_run_id, p_scenario ->> 'id', p_version ->> 'id', p_organization_id,
    COALESCE((p_run ->> 'seed')::bigint, 0), v_status,
    COALESCE(p_run -> 'manifest', '{}'),
    p_run -> 'finalMetrics',
    (p_run ->> 'rngState')::bigint,
    p_run ->> 'correlationId',
    CASE WHEN v_status = 'COMPLETED' THEN NOW() ELSE NULL END
  )
  ON CONFLICT (run_id) DO UPDATE SET
    status = EXCLUDED.status,
    manifest = EXCLUDED.manifest,
    final_metrics = EXCLUDED.final_metrics,
    rng_state = EXCLUDED.rng_state,
    correlation_id = EXCLUDED.correlation_id,
    completed_at = EXCLUDED.completed_at;

  DELETE FROM public.simulation_events WHERE run_id = v_run_id;
  DELETE FROM public.simulation_timeseries WHERE run_id = v_run_id;
  DELETE FROM public.simulation_snapshots WHERE run_id = v_run_id;

  INSERT INTO public.simulation_events (run_id, organization_id, tick, event_type, title, payload)
  SELECT v_run_id, p_organization_id,
    (e ->> 'tick')::integer,
    COALESCE(e ->> 'eventType', e ->> 'type', 'UNKNOWN'),
    COALESCE(e ->> 'title', ''),
    e -> 'payload'
  FROM jsonb_array_elements(COALESCE(p_events, '[]')) AS e;

  INSERT INTO public.simulation_timeseries (run_id, tick, metrics)
  SELECT v_run_id,
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
