-- ============================================================================
-- Migration: 20260907_live_kpi_read_layer.sql
-- LeadPilot Phase 4 / Auftrag 035 / Gate G19: Isolierte Browser-Leseschicht für Ebene C
--
-- Sicherheitsarchitektur:
-- 1. Tabelle public.live_kpi_public_feed für minimierte, browserfähige Live-KPI-Projektionen
-- 2. Triggerfunktion public.project_live_kpi_to_public_feed() als SECURITY DEFINER (SET search_path = pg_catalog)
-- 3. Trigger nach INSERT auf public.live_kpi_events
-- 4. RLS aktiv, ausschließlich SELECT für anon/authenticated, keine Schreibrechte
-- 5. Strikt kein EXECUTE auf Triggerfunktion für PUBLIC, anon, authenticated, n8n_ingest
-- 6. Idempotente Realtime-Publication für Supabase
-- ============================================================================

-- 1. Projektionstabelle (ausschließlich browserfähige Felder, kein context, keine Secrets)
CREATE TABLE IF NOT EXISTS public.live_kpi_public_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  quality_status TEXT NOT NULL,
  source_system TEXT NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL
);

-- Index für performante Snapshot-Abfragen: neuester Wert je KPI
CREATE INDEX IF NOT EXISTS idx_live_kpi_public_feed_kpi_occurred
  ON public.live_kpi_public_feed (kpi_id, occurred_at DESC, ingested_at DESC);

-- 2. Gehärtete Triggerfunktion zur automatischen Projektion nach INSERT auf live_kpi_events
CREATE OR REPLACE FUNCTION public.project_live_kpi_to_public_feed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO public.live_kpi_public_feed (
    kpi_id,
    value,
    unit,
    occurred_at,
    quality_status,
    source_system,
    ingested_at
  ) VALUES (
    NEW.kpi_id,
    NEW.value,
    NEW.unit,
    NEW.occurred_at,
    NEW.quality_status,
    NEW.source_system,
    NEW.ingested_at
  );
  RETURN NEW;
END;
$$;

-- 3. Zwingender Rechteentzug auf Triggerfunktion
REVOKE EXECUTE ON FUNCTION public.project_live_kpi_to_public_feed() FROM PUBLIC, anon, authenticated, n8n_ingest;

-- 4. Trigger auf live_kpi_events
DROP TRIGGER IF EXISTS trg_project_live_kpi_event ON public.live_kpi_events;
CREATE TRIGGER trg_project_live_kpi_event
  AFTER INSERT ON public.live_kpi_events
  FOR EACH ROW
  EXECUTE FUNCTION public.project_live_kpi_to_public_feed();

-- 5. Row Level Security & Least-Privilege
ALTER TABLE public.live_kpi_public_feed ENABLE ROW LEVEL SECURITY;

-- Grundsätzlich alle Berechtigungen entziehen
REVOKE ALL ON TABLE public.live_kpi_public_feed FROM anon, authenticated, PUBLIC, n8n_ingest;

-- Ausschließlich Lesezugriff (SELECT) für Browserrollen gewähren
GRANT SELECT ON TABLE public.live_kpi_public_feed TO anon, authenticated;

-- RLS-Policy: Leserechte für anon und authenticated
DROP POLICY IF EXISTS allow_anon_authenticated_read ON public.live_kpi_public_feed;
CREATE POLICY allow_anon_authenticated_read
  ON public.live_kpi_public_feed
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 6. Idempotente Realtime-Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'live_kpi_public_feed'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_kpi_public_feed;
  END IF;
END;
$$;
