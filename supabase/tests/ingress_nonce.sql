-- G46-Nacharbeit (Review): Nonce-Claim-, Rate- und Grant-Negativtests für den
-- signierten Ingress. Direkte RPC-Aufrufe als anonyme/authentifizierte Rolle
-- ohne Mitgliedschaft müssen scheitern (42501); Erst-Claim ist 'ok', Replay
-- ist 'replay', volle Buckets sind 'rate_limited'.
-- Ausführung: supabase test db (lokal).

BEGIN;

SELECT plan(9);

-- ------------------------------------------------- 1..3: Claim-Semantik
SELECT is(
  public.claim_ingress_nonce('g46-test-nonce-1', NULL, 'pgtest'),
  true,
  'Erst-Claim einer Nonce ist true'
);

SELECT is(
  public.claim_ingress_nonce('g46-test-nonce-1', NULL, 'pgtest'),
  false,
  'Replay derselben Nonce ist false'
);

SELECT is(
  public.claim_ingress_nonce('', NULL, 'pgtest'),
  false,
  'Leere Nonce wird abgewiesen'
);

-- ------------------------------------------------- 4..6: Atomarer Slot
SELECT is(
  public.claim_ingress_slot('g46-test-slot-1', NULL, 'pgtest', 120),
  'ok',
  'Slot-Claim mit freiem Bucket ist ok'
);

SELECT is(
  public.claim_ingress_slot('g46-test-slot-1', NULL, 'pgtest', 120),
  'replay',
  'Slot-Replay derselben Nonce ist replay'
);

SELECT is(
  public.claim_ingress_slot('g46-test-slot-2', NULL, 'pgtest', 0),
  'rate_limited',
  'Slot mit erschöpftem Bucket ist rate_limited'
);

-- ------------------------------------------------- 7..9: Grant-Deny
SET ROLE anon;

-- Als postgres (Tests 1-6) erfolgreich, als anon mit 42501 verweigert.
SELECT throws_ok(
  $$ SELECT public.claim_ingress_nonce('g46-test-anon', NULL, 'pgtest') $$,
  '42501'
);

SELECT throws_ok(
  $$ SELECT public.claim_ingress_slot('g46-test-anon', NULL, 'pgtest', 120) $$,
  '42501'
);

SELECT throws_ok(
  $$ SELECT public.ingress_nonce_count_last_minute('pgtest') $$,
  '42501'
);

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
