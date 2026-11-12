-- Auftrag 153 (T1): Mandantenisolation für Live-KPI-Feed.
-- Prüft:
-- (a) anon liest 0 Zeilen bzw. permission denied (42501)
-- (b) Mitglied A sieht nur A-Zeilen, nie B
-- (c) deaktivierte Mitgliedschaft sieht nichts
-- (d) deaktivierte Organisation sieht nichts
-- (e) keine Zeile in live_kpi_events / live_kpi_public_feed mit organization_id IS NULL
-- (f) EXECUTE auf ingest_live_kpi_event(TEXT, JSONB) nur n8n_ingest / service_role, alte Signatur existiert nicht
-- (g) gleiche sourceSystem:eventId in A und B ergibt zweimal accepted
-- (h) unbekannter oder inaktiver Absender ergibt rejected (INGEST_SENDER_UNKNOWN)

BEGIN;

SELECT plan(15);

-- 1. Setup Testdaten
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('8e000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin-a@kpi-test.local', 'x', now()),
  ('8e000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'member-b@kpi-test.local', 'x', now()),
  ('8e000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'suspended-a@kpi-test.local', 'x', now()),
  ('8e000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'member-c@kpi-test.local', 'x', now());

INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('8e0a0000-0000-0000-0000-00000000000a', 'Org A (KPI Test)', 'synthetic', 'active'),
  ('8e0b0000-0000-0000-0000-00000000000b', 'Org B (KPI Test)', 'synthetic', 'active'),
  ('8e0c0000-0000-0000-0000-00000000000c', 'Org C (Suspended KPI Test)', 'synthetic', 'suspended');

INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES
  ('8e000000-0000-0000-0000-000000000001', '8e0a0000-0000-0000-0000-00000000000a', 'admin', 'active'),
  ('8e000000-0000-0000-0000-000000000002', '8e0b0000-0000-0000-0000-00000000000b', 'viewer', 'active'),
  ('8e000000-0000-0000-0000-000000000003', '8e0a0000-0000-0000-0000-00000000000a', 'viewer', 'suspended'),
  ('8e000000-0000-0000-0000-000000000004', '8e0c0000-0000-0000-0000-00000000000c', 'viewer', 'active');

-- Ingest-Sender anlegen (falls Tabelle bereits existiert; falls nicht, schlägt der Test rot fehl)
INSERT INTO public.live_kpi_ingest_senders (sender_id, organization_id, active)
VALUES
  ('sender-a', '8e0a0000-0000-0000-0000-00000000000a', true),
  ('sender-b', '8e0b0000-0000-0000-0000-00000000000b', true),
  ('sender-inactive', '8e0a0000-0000-0000-0000-00000000000a', false);

-- (f) Prüfe Funktionen: alte Ein-Parameter-Signatur darf nicht mehr existieren
SELECT hasnt_function(
  'public',
  'ingest_live_kpi_event',
  ARRAY['jsonb'],
  'Alte Funktion ingest_live_kpi_event(jsonb) existiert nicht mehr'
);

-- Neue Signatur mit p_sender_id TEXT, p_event JSONB muss existieren
SELECT has_function(
  'public',
  'ingest_live_kpi_event',
  ARRAY['text', 'jsonb'],
  'Neue Funktion ingest_live_kpi_event(text, jsonb) existiert'
);

-- Prüfe Rechte auf neue Funktion: anon und authenticated dürfen NICHT ausführen
SELECT throws_ok(
  $$
    SET ROLE anon;
    SELECT public.ingest_live_kpi_event('sender-a', '{}'::jsonb);
  $$,
  '42501',
  NULL,
  'anon hat kein EXECUTE auf ingest_live_kpi_event(text, jsonb)'
);

SELECT throws_ok(
  $$
    SET ROLE authenticated;
    SELECT public.ingest_live_kpi_event('sender-a', '{}'::jsonb);
  $$,
  '42501',
  NULL,
  'authenticated hat kein EXECUTE auf ingest_live_kpi_event(text, jsonb)'
);
RESET ROLE;

-- (h) Unbekannter oder inaktiver Absender ergibt rejected
SELECT is(
  (public.ingest_live_kpi_event('unknown-sender', '{"contractVersion":"1.0","provenance":"live","qualityStatus":"valid","sourceSystem":"ext","eventId":"ev-unk","kpiId":"arr","value":100,"unit":"EUR","correlationId":"c1","occurredAt":"2026-11-12T12:00:00Z"}'::jsonb))->>'status',
  'rejected',
  'Unbekannter Absender wird rejected'
);

SELECT is(
  (public.ingest_live_kpi_event('sender-inactive', '{"contractVersion":"1.0","provenance":"live","qualityStatus":"valid","sourceSystem":"ext","eventId":"ev-inact","kpiId":"arr","value":100,"unit":"EUR","correlationId":"c1","occurredAt":"2026-11-12T12:00:00Z"}'::jsonb))->>'status',
  'rejected',
  'Inaktiver Absender wird rejected'
);

-- (g) Gleiche sourceSystem:eventId in A und B ergibt zweimal accepted (Idempotenz je Organisation)
SELECT is(
  (public.ingest_live_kpi_event('sender-a', '{"contractVersion":"1.0","provenance":"live","qualityStatus":"valid","sourceSystem":"ext-sys","eventId":"shared-id-1","kpiId":"arr","value":1000,"unit":"EUR","correlationId":"c1","occurredAt":"2026-11-12T12:00:00Z"}'::jsonb))->>'status',
  'accepted',
  'Event shared-id-1 in Org A wird accepted'
);

SELECT is(
  (public.ingest_live_kpi_event('sender-b', '{"contractVersion":"1.0","provenance":"live","qualityStatus":"valid","sourceSystem":"ext-sys","eventId":"shared-id-1","kpiId":"arr","value":2000,"unit":"EUR","correlationId":"c2","occurredAt":"2026-11-12T12:01:00Z"}'::jsonb))->>'status',
  'accepted',
  'Event shared-id-1 in Org B wird ebenfalls accepted (keine Kollision)'
);

-- (e) Keine Zeile in live_kpi_events oder live_kpi_public_feed mit organization_id IS NULL
SELECT is(
  (SELECT count(*) FROM public.live_kpi_events WHERE organization_id IS NULL),
  0::bigint,
  'Keine Zeile in live_kpi_events mit organization_id IS NULL'
);

SELECT is(
  (SELECT count(*) FROM public.live_kpi_public_feed WHERE organization_id IS NULL),
  0::bigint,
  'Keine Zeile in live_kpi_public_feed mit organization_id IS NULL'
);

-- (a) anon liest 0 Zeilen bzw. permission denied
SELECT throws_ok(
  $$
    SET ROLE anon;
    SELECT * FROM public.live_kpi_public_feed;
  $$,
  '42501',
  NULL,
  'anon erhält permission denied auf live_kpi_public_feed'
);
RESET ROLE;

-- (b) Mitglied A sieht nur A-Zeilen, nie B
SELECT set_config('request.jwt.claims', '{"sub":"8e000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT ok(
  (SELECT count(*) FROM public.live_kpi_public_feed WHERE kpi_id = 'arr') >= 1,
  'Mitglied Org A sieht eigene Feed-Zeilen'
);

SELECT is(
  (SELECT count(*) FROM public.live_kpi_public_feed WHERE organization_id = '8e0b0000-0000-0000-0000-00000000000b'),
  0::bigint,
  'Mitglied Org A sieht keine Zeilen von Org B'
);

-- (c) deaktivierte Mitgliedschaft sieht nichts
SELECT set_config('request.jwt.claims', '{"sub":"8e000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM public.live_kpi_public_feed),
  0::bigint,
  'Deaktivierte Mitgliedschaft sieht 0 Feed-Zeilen'
);

-- (d) deaktivierte Organisation sieht nichts
SELECT set_config('request.jwt.claims', '{"sub":"8e000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM public.live_kpi_public_feed),
  0::bigint,
  'Mitglied einer deaktivierten Organisation sieht 0 Feed-Zeilen'
);

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
