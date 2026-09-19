-- G46-Nacharbeit (Review): Lockdown der Ingress-RPCs und atomarer Rate-Claim.
--
-- 1. REVOKE EXECUTE auf claim_ingress_nonce und ingress_nonce_count_last_minute
--    für PUBLIC/anon/authenticated (Default-Grant schließen); ausschließlich
--    die Ingest-Rolle erhält EXECUTE (falls vorhanden).
-- 2. claim_ingress_slot(): ein einziger Server-Roundtrip für Nonce-Claim und
--    Rate-Limit — keine TOCTOU-Lücke zwischen Messung und Claim. Gibt
--    'ok' | 'replay' | 'rate_limited' zurück; bei Rate-Limit wird die eben
--    beanspruchte Nonce zurückgenommen (kein Tabellenmüll).
-- Idempotent und re-runnable formuliert.

REVOKE ALL ON FUNCTION public.claim_ingress_nonce(TEXT, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ingress_nonce_count_last_minute(TEXT)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_ingress_slot(
  p_nonce TEXT,
  p_organization_id UUID DEFAULT NULL,
  p_source_system TEXT DEFAULT 'n8n',
  p_max_per_minute INT DEFAULT 120
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_affected INT := 0;
  v_recent BIGINT := 0;
BEGIN
  IF p_nonce IS NULL OR btrim(p_nonce) = '' OR char_length(p_nonce) > 128 THEN
    RETURN 'replay';
  END IF;
  IF p_max_per_minute IS NULL OR p_max_per_minute < 1 THEN
    RETURN 'rate_limited';
  END IF;
  -- Serialisierung pro Quelle: Ohne Sperre könnten zwei parallele
  -- Transaktionen (READ COMMITTED) je nur die eigene neue Zeile sehen und
  -- beide unter der Grenze bleiben. Der transaktionale Advisory-Lock macht
  -- Insert + Count zu einer kritischen Sektion je Quelle.
  PERFORM pg_advisory_xact_lock(hashtext('ingress-slot:' || p_source_system));
  INSERT INTO public.ingress_nonces (nonce, organization_id, source_system)
  VALUES (btrim(p_nonce), p_organization_id, p_source_system)
  ON CONFLICT (nonce) DO NOTHING;
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected = 0 THEN
    RETURN 'replay';
  END IF;
  SELECT count(*) INTO v_recent
  FROM public.ingress_nonces
  WHERE source_system = p_source_system
    AND first_seen > NOW() - INTERVAL '60 seconds';
  IF v_recent > p_max_per_minute THEN
    DELETE FROM public.ingress_nonces WHERE nonce = btrim(p_nonce);
    RETURN 'rate_limited';
  END IF;
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.claim_ingress_slot(TEXT, UUID, TEXT, INT)
  FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'n8n_ingest') THEN
    GRANT EXECUTE ON FUNCTION public.claim_ingress_nonce(TEXT, UUID, TEXT) TO n8n_ingest;
    GRANT EXECUTE ON FUNCTION public.ingress_nonce_count_last_minute(TEXT) TO n8n_ingest;
    GRANT EXECUTE ON FUNCTION public.claim_ingress_slot(TEXT, UUID, TEXT, INT) TO n8n_ingest;
  END IF;
END $$;
