-- G46 (Auftrag 067C, Step 3): Nonce-Einmaligkeit und Rate-Limit für den
-- signierten Live-KPI-Ingress (Design §10.1). Jede Nonce gilt genau einmal
-- (pro Organisation, soweit bekannt); Rate-Limit zählt Nonces je Quelle im
-- Ein-Minuten-Fenster. N8n-Guard und Edge Function nutzen dieselben Bausteine.

CREATE TABLE IF NOT EXISTS public.ingress_nonces (
  nonce TEXT PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_system TEXT NOT NULL DEFAULT 'n8n',
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ingress_nonces ENABLE ROW LEVEL SECURITY;

-- Kein direkter Tabellen-Zugriff für anonyme/authentifizierte Rollen oder
-- die Ingest-Rolle: ausschließlich über die Claim-Funktion (Default-Deny,
-- keine Policies = kein Zugriff).
REVOKE ALL ON TABLE public.ingress_nonces FROM anon, authenticated, PUBLIC, n8n_ingest;

-- Atomarer Nonce-Claim: TRUE bei Erstverwendung, FALSE bei Replay.
CREATE OR REPLACE FUNCTION public.claim_ingress_nonce(
  p_nonce TEXT,
  p_organization_id UUID DEFAULT NULL,
  p_source_system TEXT DEFAULT 'n8n'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_affected INT := 0;
BEGIN
  IF p_nonce IS NULL OR btrim(p_nonce) = '' OR char_length(p_nonce) > 128 THEN
    RETURN FALSE;
  END IF;
  INSERT INTO public.ingress_nonces (nonce, organization_id, source_system)
  VALUES (btrim(p_nonce), p_organization_id, p_source_system)
  ON CONFLICT (nonce) DO NOTHING;
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected = 1;
END;
$$;

-- Rate-Limit: Anzahl beanspruchter Nonces einer Quelle in den letzten 60 s.
CREATE OR REPLACE FUNCTION public.ingress_nonce_count_last_minute(
  p_source_system TEXT DEFAULT 'n8n'
)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT count(*)
  FROM public.ingress_nonces
  WHERE source_system = p_source_system
    AND first_seen > NOW() - INTERVAL '60 seconds'
$$;

-- Ausführungsrechte für die Ingest-Rolle (nur falls vorhanden — Rolle wird
-- außerhalb des Repos vom Operator angelegt; kein Hartfehler ohne sie).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'n8n_ingest') THEN
    GRANT EXECUTE ON FUNCTION public.claim_ingress_nonce(TEXT, UUID, TEXT) TO n8n_ingest;
    GRANT EXECUTE ON FUNCTION public.ingress_nonce_count_last_minute(TEXT) TO n8n_ingest;
  END IF;
END $$;
