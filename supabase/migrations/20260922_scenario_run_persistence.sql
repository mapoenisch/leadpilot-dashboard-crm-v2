-- 067F / G49 (Auftrag 067F, Step 3): Dauerhafte Persistenz für Szenarien,
-- Versionen, Runs, Events, Zeitreihen und Snapshots (Design §8.1).
--
-- Schreibmodell: Direkte INSERT/UPDATE/DELETE sind für alle App-Rollen
-- gesperrt (keine Policies); jeder Schreibpfad läuft über den atomaren
-- SECURITY-DEFINER-RPC `persist_completed_run` (alles oder nichts).
-- Lesezugriff: jede aktive Mitgliedschaft liest die eigene Organisation
-- (G45-Konvention). Schreibrecht im RPC: aktive Mitgliedschaft in der
-- Zielorganisation (rollenunabhängig — Persistenz folgt der
-- Run-Berechtigung, kein Admin-Akt).
-- Idempotent und re-runnable formuliert.

-- ---------------------------------------------------------- 1. Tabellen --
CREATE TABLE IF NOT EXISTS public.simulation_scenarios (
  id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  is_protected BOOLEAN NOT NULL DEFAULT false,
  current_version_id TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.simulation_scenario_versions (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL REFERENCES public.simulation_scenarios(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  parameters JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.simulation_runs (
  run_id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL REFERENCES public.simulation_scenarios(id) ON DELETE CASCADE,
  scenario_version_id TEXT NOT NULL REFERENCES public.simulation_scenario_versions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  seed INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PREPARING'
    CHECK (status IN ('PREPARING', 'RUNNING', 'COMPLETED', 'CANCELLED', 'FAILED')),
  manifest JSONB NOT NULL DEFAULT '{}',
  final_metrics JSONB,
  rng_state INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  correlation_id TEXT
);

CREATE TABLE IF NOT EXISTS public.simulation_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES public.simulation_runs(run_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tick INTEGER NOT NULL CHECK (tick >= 0),
  event_type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.simulation_timeseries (
  run_id TEXT NOT NULL REFERENCES public.simulation_runs(run_id) ON DELETE CASCADE,
  tick INTEGER NOT NULL CHECK (tick >= 0),
  metrics JSONB NOT NULL DEFAULT '{}',
  PRIMARY KEY (run_id, tick)
);

CREATE TABLE IF NOT EXISTS public.simulation_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES public.simulation_runs(run_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tick_id INTEGER NOT NULL CHECK (tick_id >= 0),
  state JSONB NOT NULL DEFAULT '{}',
  projection JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS simulation_scenarios_org_idx ON public.simulation_scenarios (organization_id);
CREATE INDEX IF NOT EXISTS simulation_versions_scenario_idx ON public.simulation_scenario_versions (scenario_id);
CREATE INDEX IF NOT EXISTS simulation_versions_org_idx ON public.simulation_scenario_versions (organization_id);
CREATE INDEX IF NOT EXISTS simulation_runs_org_idx ON public.simulation_runs (organization_id);
CREATE INDEX IF NOT EXISTS simulation_runs_version_idx ON public.simulation_runs (scenario_version_id);
CREATE INDEX IF NOT EXISTS simulation_events_run_idx ON public.simulation_events (run_id);
CREATE INDEX IF NOT EXISTS simulation_snapshots_run_idx ON public.simulation_snapshots (run_id);

-- --------------------------------------------------------------- 2. RLS --
ALTER TABLE public.simulation_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_scenario_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_timeseries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_snapshots ENABLE ROW LEVEL SECURITY;

-- Lesezugriff für Mitglieder der eigenen Organisation (alle Rollen).
-- Schreibzugriff ausschließlich über persist_completed_run (keine
-- INSERT/UPDATE/DELETE-Policies → Default-Deny für App-Rollen).
DROP POLICY IF EXISTS "persist_select_scenarios" ON public.simulation_scenarios;
CREATE POLICY "persist_select_scenarios" ON public.simulation_scenarios
  FOR SELECT USING (organization_id = public.current_organization_id());

DROP POLICY IF EXISTS "persist_select_versions" ON public.simulation_scenario_versions;
CREATE POLICY "persist_select_versions" ON public.simulation_scenario_versions
  FOR SELECT USING (organization_id = public.current_organization_id());

DROP POLICY IF EXISTS "persist_select_runs" ON public.simulation_runs;
CREATE POLICY "persist_select_runs" ON public.simulation_runs
  FOR SELECT USING (organization_id = public.current_organization_id());

DROP POLICY IF EXISTS "persist_select_events" ON public.simulation_events;
CREATE POLICY "persist_select_events" ON public.simulation_events
  FOR SELECT USING (organization_id = public.current_organization_id());

DROP POLICY IF EXISTS "persist_select_timeseries" ON public.simulation_timeseries;
CREATE POLICY "persist_select_timeseries" ON public.simulation_timeseries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.simulation_runs r
      WHERE r.run_id = simulation_timeseries.run_id
        AND r.organization_id = public.current_organization_id()
    )
  );

DROP POLICY IF EXISTS "persist_select_snapshots" ON public.simulation_snapshots;
CREATE POLICY "persist_select_snapshots" ON public.simulation_snapshots
  FOR SELECT USING (organization_id = public.current_organization_id());

-- ------------------------------------------------- 3. Atomarer RPC-Pfad --
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
  -- Nur aktive Mitglieder der Zielorganisation (rollenunabhängig). Ohne
  -- Mitgliedschaft ist current_organization_id() NULL und ungleich.
  IF public.current_organization_id() IS DISTINCT FROM p_organization_id THEN
    RAISE EXCEPTION 'ORG_MISMATCH: kein Persistenzrecht für diese Organisation'
      USING ERRCODE = '42501';
  END IF;

  v_run_id := NULLIF(p_run ->> 'runId', '');
  IF v_run_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_BUNDLE: runId fehlt' USING ERRCODE = '22023';
  END IF;
  v_status := COALESCE(NULLIF(p_run ->> 'status', ''), 'COMPLETED');

  -- Alles oder nichts: ein Fehler in einer Zeile rollt das Bundle zurück.
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
    COALESCE((p_run ->> 'seed')::integer, 0), v_status,
    COALESCE(p_run -> 'manifest', '{}'),
    p_run -> 'finalMetrics',
    (p_run ->> 'rngState')::integer,
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

  -- Idempotenter Retry: Kinder des Runs ersetzen (keine Duplikate).
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

REVOKE ALL ON FUNCTION public.persist_completed_run(UUID, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.persist_completed_run(UUID, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB)
  TO authenticated;
