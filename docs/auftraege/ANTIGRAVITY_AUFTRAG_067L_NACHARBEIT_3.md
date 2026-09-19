# AUFTRAG 067L / Gate G58 — Nacharbeit 3 (E2E-Backend: lokales Supabase in der CI statt Secrets)

**Baseline:** aktueller Stand von `feat/auftrag-067l-ci-ruleset` · **Status:** OFFEN

## Entscheidung (Marc, 2026-09-19)

Es gibt **kein** gehostetes Supabase-Testprojekt. Das einzige Projekt (`leadpilot-crm`, `main`)
ist kein Testprojekt und darf nicht für E2E genutzt werden (die Tests legen Mandanten an und
schreiben Datensätze). Der bisherige Weg „9 GitHub-Secrets, gehostetes Testprojekt“ aus
Nacharbeit 1 (P1-3 Teil A) ist **verworfen**. Es werden keine Secrets angelegt.

Ersatz: Der Job `e2e` startet in der CI ein **temporäres lokales Supabase**
(`supabase start`, Docker auf `ubuntu-latest`), das die Migrationen aus `supabase/migrations/`
anwendet und Testdaten aus einem Seed lädt. URL und anon-Key kommen aus `supabase status`
zur Laufzeit. Das Backend existiert nur innerhalb des Runners; es gibt nichts, was in einem
öffentlichen Repo leaken könnte.

Baseline-Fakten (vom Prüfer geprüft): `supabase` CLI 2.117.0 und Docker sind lokal vorhanden;
13 Migrationen ohne Extension-Abhängigkeit (`create extension`, `pg_cron`, `pg_net`, `vault`:
keine Treffer); E2E braucht keine Edge Functions; `supabase/config.toml` hat
`[db.seed] enabled = true` mit `sql_paths = ["./seed.sql"]`, `supabase/seed.sql` existiert
**nicht**; die pgTAP-Datei `supabase/tests/tenant_isolation.sql` legt Nutzer nur mit dem
Fake-Passwort `x` in einer zurückgerollten Transaktion an und ist für Logins unbrauchbar.

## Aufgaben

### 1. Seed für Logins: `supabase/seed.sql` (neu)
- Idempotent, nur für lokale Datenbanken (`supabase start` / `supabase db reset`). Niemals
  gegen das gehostete Projekt ausführen; das im Kopfkommentar der Datei so vermerken.
- Nutzer mit **echten, loginfähigen** Passwörtern (`auth.users` mit `crypt(..., gen_salt('bf'))`
  **und** passender `auth.identities`-Zeile, sonst kein E-Mail-Login). Rollen und Mitgliedschaften
  so, wie die E2E-Specs sie brauchen: Admin in Org A, ein Nutzer in Org B, ein Nutzer ohne
  Mitgliedschaft. Organisationen und die erwarteten Datensätze (`Firma A1` in Org A,
  `Firma B1` in Org B) vorab aus `e2e/*.spec.ts` und `supabase/tests/tenant_isolation.sql`
  ableiten, nicht raten.
- E-Mail-Domain **nicht** `@tenant-test.local` (die pgTAP-Datei löscht diese Nutzer). Eigene
  Domain, z. B. `@e2e.local`. Die Passwörter sind bekannte Wegwerfwerte, die nur in der
  lokalen Runner-Datenbank gelten; sie dürfen im Repo stehen, müssen aber als solche
  gekennzeichnet sein.
- `supabase/migrations/**` und `supabase/schema.sql` bleiben **unverändert**.

### 2. `ci.yml`, Job `e2e`
- Neue externe Action `supabase/setup-cli`: mit Übergabe dieses Auftrags von Marc freigegeben.
  Auf eine vollständige 40-stellige Commit-SHA pinnen (Tag→SHA per `gh api` verifizieren,
  Versionskommentar), CLI-Version fest (z. B. `2.117.0`).
- Schritte: CLI installieren, `supabase start` (nicht benötigte Dienste per `-x` ausschließen,
  Liste zur CLI-Version prüfen und belegen), Seed anwenden falls `start` ihn nicht lädt,
  URL und anon-Key aus `supabase status -o env` lesen und für Build, Playwright und
  Lighthouse als Umgebungsvariablen setzen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, `E2E_AUTH_*` mit den Seed-Werten).
  Reihenfolge: Backend starten, Build, Playwright, Lighthouse, Coverage, Readiness.
  `supabase stop` mit `if: always()`.
- **Alle** `secrets.*`-Referenzen aus `ci.yml` entfernen. Die Trace-/Video-/Screenshot-
  Absicherung, `retention-days: 7` und `permissions: contents: read` aus Nacharbeit 2 bleiben.
- `site_url`/Redirect-URLs in `supabase/config.toml` nur anpassen, falls der Login gegen
  `http://127.0.0.1:4321` (Playwright) und `http://localhost:4173` (Lighthouse) sonst scheitert.

### 3. Dokumentation
- `docs/operations/ci-secrets.md` durch `docs/operations/ci-e2e-backend.md` ersetzen:
  Ablauf des temporären Backends, Herkunft der Testnutzer, dass keine Secrets nötig sind, und
  die lokale Reproduktion (`supabase start`, `supabase db reset`, Umgebungsvariablen,
  `npx playwright test`).
- BUILD_LOG (Nacharbeit-3-Abschnitt) und `docs/reviews/v2.3.0-audit-risk-acceptance.md`
  sachlich anpassen. Nirgends „Testprojekt“ oder „Secrets“ als Voraussetzung stehen lassen.

### 4. Lokaler Nachweis (Pflicht, Docker ist vorhanden)
`supabase start`, Seed, Build mit den Werten aus `supabase status`, `npx playwright test`
und `CHROME_PATH=... npx lhci autorun`. Im Eintrag nur Ergebnisse nennen (Testzahlen, Scores),
keine Schlüsselwerte. Schlägt ein Schritt fehl: Ursache dokumentieren und stoppen, nicht
umgehen. Danach `supabase stop`.

## Erweiterte Zieldateien (schriftlich)
`supabase/seed.sql` (neu), `supabase/config.toml` (nur Auth-URL-Anpassung falls nötig),
`.github/workflows/ci.yml`, `docs/operations/ci-e2e-backend.md` (neu),
`docs/operations/ci-secrets.md` (löschen), `scripts/lighthouse-auth.cjs` (nur falls
Variablennamen betroffen), `package.json` (nur falls ein Hilfsscript nötig).

## Stopp-Punkte (unverändert)
Kein Push, kein Ruleset, kein Actions-Lauf ohne ausdrückliche Freigabe von Marc. Der Job
`e2e` läuft nur bei `pull_request`, `workflow_dispatch` und Push auf `main`; für den Nachweis
entscheidet Marc zwischen PR und `workflow_dispatch`. Kein Merge, kein Tag, kein Force-Push.

## Verifikation
Pflicht-Verifikation aus dem Auftrag 067L, zusätzlich:
`git diff c6d88f3 -- src/simulation src/types src/context src/services/data src/features/resources`
und `git diff c6d88f3 -- supabase/migrations supabase/schema.sql` müssen leer sein.
`grep -n "secrets\." .github/workflows/ci.yml` darf nichts finden.

## Akzeptanzkriterien
- Der Job `e2e` braucht keine GitHub-Secrets und kein gehostetes Supabase.
- Ein Login mit den Seed-Nutzern funktioniert lokal und ist im Eintrag belegt (Playwright-
  und Lighthouse-Ergebnis).
- Neue Action ist auf eine verifizierte SHA gepinnt; `PR-CI-18` bleibt grün.
- Migrationen und Schema unverändert, Schutzbereichs-Diff leer.
- Erst danach: Push-Freigabe durch Marc, grüner Actions-Lauf, dann Ruleset.
