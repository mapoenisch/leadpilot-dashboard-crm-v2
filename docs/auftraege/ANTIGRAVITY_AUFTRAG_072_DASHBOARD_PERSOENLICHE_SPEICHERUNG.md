# Auftrag 072 – Dashboard Teilauftrag 3: Persönliche Speicherung

**Stand:** 04.10.2026

**Basis:** `main` `86a31bb` (nach PR #55). Plan: `docs/superpowers/plans/2026-10-01-executive-dashboard-plan.md`, Teilauftrag 3 und §6 (Speicherung und Berechtigungen). Konfigurationsformat und Prüfung: Auftrag 070 (`model/dashboardConfig.ts`, `model/dashboardValidation.ts`).

**Voraussetzung:** Teilauftrag 1 (Auftrag 070) ist gemergt. Teilauftrag 2 (Auftrag 071, PR #54) ist laut Plan keine Voraussetzung; beide berühren keine gemeinsame Datei außer `docs/BUILD_LOG.md`.

**Builder:** Claude Code (Zyklus 1, Entscheidung Marc vom 04.10.2026: „wir kehren zur ursprünglichen Automatisierung ohne Antigravity zurück und du schreibst den nächsten Auftrag und Codex prüft“). **Prüfer:** Codex. **Merge:** nur Marc.

**Branch:** `claude/auftrag-072-persoenliche-speicherung` ab `main`.

## Ziel

Jeder Benutzer speichert sein persönliches Dashboard je Organisation in Supabase. Laden, Speichern mit Revision, Konflikterkennung, Standardansicht ohne gespeicherte Konfiguration und Cachebereinigung bei Benutzerwechsel. **Keine Oberfläche** (Teilaufträge 4 und 5), **keine Datenauflösung** (Teilauftrag 2).

## Globale Grenzen

- Schutzbereiche (`CLAUDE.md` §6) unverändert: `src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources`. Dieser Auftrag nennt als einzige Persistenz-Ausnahme die **neue** Tabelle `executive_dashboard_preferences` mit ihrer Migration und ihrem Repository. Run-/Simulations-Persistenz, `crmRepository.ts` und bestehende Policies bleiben unverändert.
- Nur lesen: `src/auth/**`, `src/services/db/**`, `src/app/**`, `supabase/schema.sql`, bestehende Migrationen.
- Konfiguration speichert nur IDs und Einstellungen, keine Kennzahlenwerte, keine SQL-Fragmente, keine Formeln (Plan §6).
- Keine neue Abhängigkeit (`CLAUDE.md` §8).
- Kein Hintergrund-Autosave, keine Cloud-Erfolgsmeldung bei nur lokalem Zustand (Plan §6).

## Ziel-Dateien

| Datei | Änderung |
|---|---|
| `supabase/migrations/20261004_executive_dashboard_preferences.sql` | Neu: Tabelle, RLS, atomare Speicherfunktion mit Revision |
| `supabase/tests/executive_dashboard_preferences.sql` | Neu: pgTAP-Tests |
| `src/features/dashboard/model/defaultDashboard.ts` | Neu: Standardansicht und Formatbehandlung beim Laden |
| `src/features/dashboard/data/dashboardPreferencesRepository.ts` | Neu: Laden und Speichern über Supabase |
| `src/features/dashboard/hooks/useDashboardPreferences.ts` | Neu: Abfrage, Speichern, Konflikt, Cachebereinigung |
| `src/features/dashboard/__tests__/defaultDashboard.vitest.ts` | Neu |
| `src/features/dashboard/__tests__/dashboardPreferencesRepository.vitest.ts` | Neu |
| `src/features/dashboard/__tests__/useDashboardPreferences.ui.vitest.tsx` | Neu |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_072_DASHBOARD_PERSOENLICHE_SPEICHERUNG.md` | Checkboxen abhaken |
| `docs/BUILD_LOG.md` | Builder-Eintrag |

Jede Datei unter 400 Zeilen. Weitere Dateien nur nach Rückfrage (`CLAUDE.md` §5.3). Die Migrationskennung `20261004` folgt auf die letzte vorhandene `20261003_tenant_schema_convergence.sql` (Plan §7).

## Belegte Grundlagen

- Eine Organisation je Benutzer: `organization_members` mit `UNIQUE (user_id)`; Rollen `admin | manager | viewer` (`supabase/schema.sql`).
- Hilfsfunktionen `public.current_organization_id()`, `public.is_active_member()` (SECURITY DEFINER, `search_path` fest).
- Muster für atomare Schreibfunktionen mit RLS-Tabelle ohne direkte Schreibrechte: `supabase/migrations/20261001_run_control.sql` (`REVOKE INSERT, UPDATE, DELETE … FROM authenticated, anon`, Funktion `SECURITY DEFINER`, `GRANT EXECUTE … TO authenticated`).
- pgTAP-Muster mit zwei Organisationen und allen Rollen: `supabase/tests/tenant_isolation.sql` (eigene UUID-Präfixe, `BEGIN … ROLLBACK`, `set_config('request.jwt.claims', …)`).
- CI: `supabase test db` im Job `e2e` lädt alle Dateien unter `supabase/tests/`. `scripts/verifyMigrationUpgrade.mjs` führt dieselben Suiten gegen die hochgezogene Datenbank aus und vergleicht das Schema aus leerer DB und Upgrade.
- Frontend: `supabase` und `isSupabaseConfigured` aus `src/services/db/supabaseClient.ts`; `useOrganization()` liefert `session { userId, organizationId, role }`.

## Vorgaben

### Datenbank (Migration)

- Tabelle `public.executive_dashboard_preferences`: `organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`, `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `config JSONB NOT NULL`, `schema_version INTEGER NOT NULL`, `revision INTEGER NOT NULL CHECK (revision >= 1)`, `created_at`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`; Primärschlüssel `(organization_id, user_id)`.
- RLS aktiv. Einzige Policy: `SELECT` für `authenticated` mit `user_id = auth.uid() AND organization_id = public.current_organization_id()`. Kein `USING (true)`. `REVOKE INSERT, UPDATE, DELETE` für `authenticated` und `anon`; `anon` erhält auch kein `SELECT`.
- Funktion `public.save_dashboard_preferences(p_config JSONB, p_expected_revision INTEGER) RETURNS TABLE (revision INTEGER, updated_at TIMESTAMPTZ)`, `SECURITY DEFINER`, `SET search_path = public, pg_temp`, `GRANT EXECUTE` nur an `authenticated`:
  - Organisation und Benutzer kommen **nur** aus `public.current_organization_id()` und `auth.uid()`, nie aus Parametern. Ohne aktive Mitgliedschaft: Fehler `LP_DASHBOARD_NO_MEMBERSHIP`.
  - Alle aktiven Rollen dürfen speichern, auch `viewer` (Plan §6). Die Funktion schreibt ausschließlich die eigene Zeile; sie berührt keine CRM- oder Organisationsdaten.
  - Servervalidierung, Fehler `LP_DASHBOARD_INVALID` mit Grund im Detail: `jsonb_typeof(p_config) = 'object'`; nur die Schlüssel `version`, `filters`, `tiles`; `version = 1`; `tiles` ist ein Array mit höchstens 24 Einträgen; jede Kachel ist ein Objekt mit Text-Feldern `tileId` und `catalogId`; Gesamtgröße `octet_length(p_config::text) <= 32768`. Die fachliche Prüfung (Katalog, Darstellung, Größe) bleibt im Client (`validateDashboardConfig`, Plan §6).
  - Revision: `p_expected_revision = 0` legt an (`revision = 1`); existiert die Zeile schon, Fehler `LP_DASHBOARD_CONFLICT`. Sonst `UPDATE … WHERE revision = p_expected_revision`, neue Revision `+1`; trifft das `UPDATE` keine Zeile, Fehler `LP_DASHBOARD_CONFLICT`. Zwei gleichzeitige Erstanlagen: die zweite scheitert am Primärschlüssel und wird ebenfalls als `LP_DASHBOARD_CONFLICT` gemeldet.
  - `schema_version` wird aus `p_config->>'version'` übernommen.
- Keine Änderung an bestehenden Tabellen, Policies oder Funktionen.

### pgTAP (`supabase/tests/executive_dashboard_preferences.sql`)

Eigene UUID-Präfixe, `BEGIN … ROLLBACK`, Stil wie `tenant_isolation.sql`. Fälle:

1. Erstanlage mit `p_expected_revision = 0` liefert Revision 1; erneutes Laden zeigt die Zeile.
2. Speichern mit aktueller Revision liefert Revision 2.
3. Veraltete Revision → `LP_DASHBOARD_CONFLICT`; die gespeicherte Konfiguration bleibt unverändert.
4. Zweite Erstanlage mit `0` → `LP_DASHBOARD_CONFLICT`.
5. Benutzer A sieht die Zeile von Benutzer B derselben Organisation nicht und kann sie nicht überschreiben (die Funktion schreibt immer die eigene).
6. Organisation A sieht keine Zeile aus Organisation B.
7. `viewer` kann speichern; ein Benutzer ohne Mitgliedschaft und ein gesperrtes Mitglied erhalten `LP_DASHBOARD_NO_MEMBERSHIP`.
8. Direktes `INSERT`/`UPDATE`/`DELETE` als `authenticated` scheitert; `anon` sieht nichts.
9. Ungültige Konfigurationen → `LP_DASHBOARD_INVALID`: kein Objekt, fremder Schlüssel, `version = 2`, 25 Kacheln, Kachel ohne `tileId`, Größe über 32768 Byte.
10. Eine gespeicherte Kachel mit unbekannter `catalogId` wird angenommen und unverändert zurückgeliefert (Plan TA3, Load-/Migrationsvertrag).

### Frontend

- **`defaultDashboard.ts`:** `DEFAULT_DASHBOARD_CONFIG` (Format 1) aus aktiven Katalogeinträgen der bisherigen Executive-Ansicht: die acht Stammdaten-Einzelwerte als `zahl`/`klein`, `baseline.arr_verlauf` als `linie`/`mittel`, `baseline.mrr_paketmix` als `ring`/`mittel`, die CRM-Pipelinewerte und die Übersichten Team/HR und Roadmap. Die Standardansicht muss `validateDashboardConfig` ohne Befund bestehen (Test). Dazu `interpretStoredConfig(row)`: liefert `{ kind: 'gespeichert', config, revision }`, `{ kind: 'zukuenftige_version', schemaVersion }` (Version > 1: nicht überschreiben, sichere Standardansicht anzeigen, Speichern gesperrt) oder `{ kind: 'ungueltig', issues }`. Kacheln mit unbekannter oder inaktiver ID bleiben erhalten (kein Verwerfen, kein stiller Rückfall auf den Standard).
- **`dashboardPreferencesRepository.ts`:** `loadPreferences()` liest die eigene Zeile über `supabase.from('executive_dashboard_preferences').select(...).maybeSingle()`; keine Zeile ist kein Fehler. `savePreferences(config, expectedRevision)` ruft die RPC. Fehler werden strukturiert zurückgegeben: `{ kind: 'konflikt' }`, `{ kind: 'ungueltig', detail }`, `{ kind: 'keine_mitgliedschaft' }`, `{ kind: 'sitzung_abgelaufen' }` (PostgREST-/Auth-Fehler 401/JWT), `{ kind: 'nicht_konfiguriert' }` (kein Supabase), `{ kind: 'technisch' }` (Rohfehler nur intern, keine technische Meldung nach außen).
- **`useDashboardPreferences.ts`:** React Query mit Schlüssel `['dashboard', 'preferences', organizationId, userId]`; ohne Sitzung keine Abfrage. Ohne gespeicherte Zeile liefert der Hook die Standardansicht mit `revision = 0` und legt **nichts** an. `save(config)` prüft vorher mit `validateDashboardConfig`, sendet die erwartete Revision und meldet Erfolg erst nach Serverbestätigung. Bei `konflikt` bleibt der Entwurf des Aufrufers unangetastet; der Hook bietet `reloadServerVersion()`. Wechselt `userId` oder `organizationId` oder endet die Sitzung, werden alle Abfragen mit Präfix `['dashboard', 'preferences']` außer der aktuellen aus dem Cache entfernt.

## Umsetzung

- [x] pgTAP-Tests zuerst (Fälle 1–10), dann Migration.
- [x] Tests zuerst für `defaultDashboard.ts` (Standard besteht die Validierung; zukünftige Version; unbekannte IDs bleiben erhalten), dann implementieren.
- [x] Tests zuerst für das Repository mit gemocktem Supabase-Client (jede Fehlerart, keine Zeile, Erfolg), dann implementieren.
- [x] Tests zuerst für den Hook: Erstanlage nicht beim bloßen Öffnen; Reload liefert gespeicherte Konfiguration; zwei konkurrierende Saves → zweiter `konflikt`, Entwurf bleibt; abgelaufene Sitzung; Benutzerwechsel räumt den Cache; zukünftige Version sperrt Speichern. Dann implementieren.
- [x] Pflicht-Verifikation (`CLAUDE.md` §7) mit Exit-Codes: `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm test`, `npm run verify`, `npm run build`; Schutzbereichs-Diff leer.
- [x] Datenbanknachweise, soweit lokal ein Supabase läuft: `supabase test db`, `node scripts/verifyMigrationUpgrade.mjs` (Upgrade aus v2.2.0 und Schemagleichheit), `node scripts/verifyBackupRestore.mjs` (die neue Tabelle wird mitgesichert und wiederhergestellt). Läuft lokal kein Supabase, im BUILD_LOG festhalten; dann gilt der CI-Job `e2e` (`supabase test db`) als Nachweis, und die beiden Skripte bleiben für Marc offen.
- [x] BUILD_LOG-Eintrag, Push, PR gegen `main`.

## Abnahme

Benutzer A kann die Konfiguration von Benutzer B weder lesen noch schreiben, auch nicht organisationsübergreifend. Nach erneutem Login ist das gespeicherte Layout verfügbar. Veraltete Revisionen überschreiben nichts. Unbekannte KPI-IDs gehen beim Laden nicht verloren. Codex prüft; Merge nur durch Marc.

## Nicht Teil dieses Auftrags

Editor, Arbeitskopie, Speichern-/Abbrechen-Oberfläche (Teilauftrag 5), Kacheln und Raster (Teilauftrag 4), Datenauflösung (Teilauftrag 2), Live-Mandantentrennung, E2E-Ablauf `e2e/personal-dashboard.spec.ts` (mit der Oberfläche).
