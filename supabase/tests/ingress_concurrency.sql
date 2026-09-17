-- G46-Nacharbeit (Review): Echter SQL-Konkurrenztest für claim_ingress_slot.
-- Zwei parallele Sessions beanspruchen gleichzeitig je eine ANDERE Nonce an
-- der 120er-Grenze (119 vorgefüllt). Ohne Serialisierung könnten beide unter
-- der Grenze bleiben; mit pg_advisory_xact_lock pro Quelle gewinnt genau eine.
-- Ablauf: dblink_connect ohne Connection-String nutzt libpq-Umgebung
-- (PGHOST/PGPORT/PGUSER/PGDATABASE/PGPASSWORD — lokal gesetzt, niemals im
-- Repo). Ausführung: supabase test db (lokal).
-- Erwartung: exakt einmal 'ok', einmal 'rate_limited', 120 Zeilen total.

BEGIN;

SELECT plan(3);

INSERT INTO public.ingress_nonces (nonce, source_system)
SELECT 'g46-race-prefill-' || g, 'race' FROM generate_series(1, 119) g;

SELECT dblink_connect('race1');
SELECT dblink_connect('race2');

SELECT dblink_send_query('race1', $$ SELECT public.claim_ingress_slot('g46-race-a', NULL, 'race', 120) $$);
SELECT dblink_send_query('race2', $$ SELECT public.claim_ingress_slot('g46-race-b', NULL, 'race', 120) $$);

CREATE TEMP TABLE race_outcome (slot TEXT);
INSERT INTO race_outcome SELECT * FROM dblink_get_result('race1') AS t(slot TEXT);
INSERT INTO race_outcome SELECT * FROM dblink_get_result('race2') AS t(slot TEXT);

SELECT ok(
  (SELECT count(*) FROM race_outcome WHERE slot = 'ok') = 1
    AND (SELECT count(*) FROM race_outcome WHERE slot = 'rate_limited') = 1,
  'genau ein paralleler Slot an der Grenze, einer rate-begrenzt'
);

SELECT is(
  (SELECT count(*) FROM race_outcome),
  2::bigint,
  'beide parallelen Aufrufe liefern genau ein Ergebnis'
);

SELECT is(
  (SELECT count(*) FROM public.ingress_nonces WHERE source_system = 'race'),
  120::bigint,
  'kein Tabellenmüll: 119 Prefill + genau ein Slot'
);

SELECT dblink_disconnect('race1');
SELECT dblink_disconnect('race2');

SELECT * FROM finish();

ROLLBACK;
