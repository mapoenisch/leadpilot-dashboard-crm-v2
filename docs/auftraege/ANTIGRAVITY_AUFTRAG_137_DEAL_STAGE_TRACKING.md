# Auftrag 137 — Datenbank: Phasenwechsel (RPC, Historie, Verweildauer)

> Teil-Auftrag 2 aus dem verbindlichen Plan `docs/superpowers/plans/2026-11-09-crm-verbindlichkeit-v3-1-plan.md`.
> Builder: OpenCode · Prüfer: Codex (GitHub-App) · Merge und Release: Marc.
> Baseline: `main` nach `v3.0.0` (Tag `v3.0.0` gesetzt am 09.11.2026).

## Ziel

Phasenwechsel von Deals werden dauerhaft in der Datenbank gespeichert: ein serverseitiger RPC
`move_deal_stage` prüft Rolle, Mandant und Konflikt, setzt `stage` und `stage_entered_at`, schreibt
ein unveränderliches Event und einen Audit-Eintrag. Die Verweildauer wird damit erstmals eine echte
Datenbasis. Das Frontend wird in 138 angebunden.

## Globale Grenzen (aus dem Plan, Abschnitt 3)

- Ablauf nach `CLAUDE.md` §4.1.
- Keine neuen npm-Pakete.
- Schutzbereiche unberührt, Diff leer. **Ausnahme:** `src/types/crm.ts` (ein optionales Feld) ist
  hiermit ausdrücklich freigegeben.
- Migrationen additiv: kein `DROP` von Spalten oder Policies mit Daten. Bestehende Migrationen
  werden nicht geändert. `tenant_write_deals` bleibt unverändert.
- Unbekanntes bleibt unbekannt: keine erfundenen Verweildauern, keine rückwirkende Historie.
  Bestandsdaten erhalten `stage_entered_at = NULL`.
- Kanonische Phasen sind genau die sieben deutschen Labels aus `KANBAN_STAGES`.
- Pflicht-Verifikation `CLAUDE.md` §7 und BUILD_LOG-Eintrag. Keine UI-Änderung, keine Screenshots.

## Dateien

- Neu: `supabase/migrations/20261110_deal_stage_tracking.sql`
- Neu: `supabase/tests/deal_stage_tracking.sql`
- Ändern: `supabase/functions/crm-query-export/resourceConfig.ts` (Spalte `stage_entered_at`,
  Item-Feld `stageEnteredAt`)
- Ändern: `supabase/functions/__tests__/crmQueryExport.test.ts` (Deno-Test für `stageEnteredAt`)
- Ändern: `src/types/crm.ts` (`ImportedFunnelDeal.stageEnteredAt?: string`)
- Ändern: `docs/BUILD_LOG.md`
- `.github/workflows/ci.yml` nur, falls pgTAP-Dateien dort einzeln gelistet sind (Stand: nein,
  `supabase test db` führt das Verzeichnis aus).

## Schnittstelle

```sql
ALTER TABLE imported_funnel_deals ADD COLUMN stage_entered_at TIMESTAMPTZ NULL;

CREATE TABLE deal_stage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  deal_id TEXT NOT NULL REFERENCES imported_funnel_deals(id) ON DELETE CASCADE,
  from_stage TEXT NULL,
  to_stage TEXT NOT NULL,
  actor_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

move_deal_stage(p_deal_id TEXT, p_expected_stage TEXT, p_new_stage TEXT)
  RETURNS TABLE (deal_id TEXT, stage TEXT, stage_entered_at TIMESTAMPTZ)
```

## Entscheidungen

- `SECURITY DEFINER`, `SET search_path = public, pg_temp`, Zeile mit `FOR UPDATE` sperren, nur für
  `authenticated` ausführbar.
- Fehlercodes per `ERRCODE`: `LP403` (Rolle nicht `admin`/`manager`), `LP404` (Deal fehlt oder
  fremder Mandant, nicht unterscheidbar), `LP409` (`stage` ≠ `p_expected_stage`), `LP422`
  (`p_new_stage` ist keines der sieben Labels).
- `p_expected_stage` wird mit dem gespeicherten Rohwert verglichen. Gleiche Phase (normalisiert)
  ist ein No-op ohne Event.
- Erfolg: `stage` und `stage_entered_at = NOW()` setzen, Event schreiben, `audit_log`-Eintrag mit
  `action = 'crm.deal.stage_changed'`, `target_type = 'deal'`, `details = {from, to}` nach Muster
  `20261001_run_control.sql`.
- `deal_stage_events`: RLS an, `SELECT` für aktive Mitglieder des Mandanten, keine Schreib-Policy.
  Direkte Schreibversuche werden zusätzlich per `REVOKE` gesperrt.
- Die Normalisierung bildet das Frontend-Mapping aus `crmStageHelper.ts` (`CANONICAL_STAGE_TO_LABEL`)
  in SQL ab: kanonische Identifier und HubSpot-Rohwerte werden auf die sieben Labels gehoben,
  Vergleich case-insensitiv nach `trim`.
- `crm-query-export`: `deals.columns` enthält `stage_entered_at`, `FIELD_MAPPINGS.deals` enthält
  `stageEnteredAt:stage_entered_at`. Der CSV-Export bleibt unverändert.

## pgTAP (je ein Test)

`manager_moves_deal`, `admin_moves_deal`, `viewer_rejected_lp403`, `foreign_tenant_lp404`,
`stale_expected_lp409`, `invalid_stage_lp422`, `same_stage_no_event`, `raw_hubspot_stage_moves`
(`closedwon` als erwartet), `event_and_audit_written`, `direct_event_insert_denied`,
`existing_deals_null_entered_at`.

## Reihenfolge

- [ ] Tests zuerst, rot. Dann Migration, grün mit `supabase test db`.
- [ ] Deno-Test: Antwort von `deals` enthält `stageEnteredAt`. `deno check --frozen-lockfile` und
      `deno test` grün.
- [ ] Verifikation §7, PR. Keine UI-Änderung, keine Screenshots.

## Abnahme

`supabase test db` grün, `npx tsc --noEmit` 0 Fehler, `npm run verify` und `npm run build` grün,
Schutzbereichs-Diff leer (Ausnahme `src/types/crm.ts`), BUILD_LOG-Eintrag vorhanden.
