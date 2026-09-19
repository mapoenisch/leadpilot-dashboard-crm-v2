# AUFTRAG 067L / Gate G58 — Nacharbeit 2 (Prüfer-Befund zu Nacharbeit 1)

**Baseline:** `262d8f1` + Prüfer-Commit dieses Auftrags · **Branch:** `feat/auftrag-067l-ci-ruleset`
(weiterarbeiten) · **Status:** OFFEN

Grundlage: Abschnitt „Gate G58: Unabhängiger Prüfer-Befund zu Nacharbeit 1“ am Ende von
`docs/BUILD_LOG.md`. Alles aus `ANTIGRAVITY_AUFTRAG_067L_FAILCLOSED_CI_RULESET.md` und
`ANTIGRAVITY_AUFTRAG_067L_NACHARBEIT_1.md` gilt weiter (Repo-Ziel, Stopp-Punkte, Schutzbereiche,
Pflicht-Verifikation), soweit unten nichts anderes steht.

Die Punkte P1-1 bis P2-4 aus Nacharbeit 1 sind vom Prüfer nachgeprüft und **erfüllt**. Hier
geht es nur um drei neue Befunde.

## [P1-4] Zugangsdaten können über das Playwright-Report-Artefakt öffentlich werden

Ist-Stand: `playwright.config.ts` hat `trace: 'on-first-retry'` bei `retries: 1` in der CI;
`ci.yml` lädt `playwright-report/` mit `if: always()` als Artefakt hoch. Die Specs tippen die
Test-Passwörter per `page.fill(...)` (`e2e/auth.spec.ts`, `e2e/tenant-isolation.spec.ts`).
Ein Playwright-Trace enthält die ausgeführten Aktionen samt Werten und die Netzwerk-Requests
(u. a. den Auth-Request mit dem Passwort im Body). GitHub maskiert Secrets nur in Logs, nicht
in Artefakt-Dateien. `mapoenisch/leadpilot-dashboard-crm-v2` ist **öffentlich**: schlägt ein
Test beim ersten Versuch fehl, würden die Zugangsdaten des Testprojekts in einem öffentlich
herunterladbaren Artefakt liegen.

Erwartet:
- `playwright.config.ts`: in der CI kein Trace, kein Video, keine Screenshots, z. B.
  `trace: process.env.CI ? 'off' : 'on-first-retry'`. Lokal darf alles bleiben.
- `ci.yml`: beide Report-Uploads mit `retention-days: 7`.
- Ein automatischer Test, der das absichert (rot vor grün): z. B. in
  `scripts/__tests__/` oder `qualityRelease.acceptance.ts` prüfen, dass
  `playwright.config.ts` in der CI weder `trace` noch `video` noch `screenshot` aktiviert.
  Nachweis rot, indem der Trace-Wert temporär auf `'on'` gesetzt wird (nicht committen).
- `docs/operations/ci-secrets.md`: Hinweis ergänzen, dass die Test-Konten Wegwerf-Konten mit
  eigenen, nirgends sonst verwendeten Passwörtern sein müssen, und bei Verdacht sofort rotiert
  werden.

Zusätzlich erlaubte Dateien: `playwright.config.ts`.

## [P2-5] Aussagen im Nacharbeit-1-Eintrag, die nicht belegt sind

- „**Bekanntes Problem gelöst**“: Das Fehlen von `E2E_AUTH_EMAIL` erklärt nur den
  Playwright-Report-Fehler. `PR-FREEZE-07` (`.toMatch()` erhält `undefined`) und `PR-PERSIST-08`
  („keine ID-gebundene Produktassertion“) sind eigene Marker-Fehler von
  `npm run verify:v23:baseline`; dass sie behoben sind, wurde nicht gezeigt. Entweder
  `npm run verify:v23:baseline` mit Marcs lokalen `E2E_AUTH_*` erneut fahren und das Ergebnis
  eintragen, oder die Aussage auf „Ursache Playwright-Fehler geklärt; Marker-Fehler offen“
  ändern.
- **Lokaler LHCI-Nachweis fehlt.** Nacharbeit 1 verlangte einen lokalen Lauf mit echtem Login
  (`CHROME_PATH=... npx lhci autorun`) und Scores im Eintrag, oder Stopp und Meldung an Marc.
  Im Eintrag steht nur „`lhci healthcheck` erfolgreich“. Nachholen (Scores nennen, keine
  Zugangsdaten) oder ausdrücklich eintragen: „lokal nicht nachgewiesen, Nachweis erfolgt im
  Actions-Lauf“ und Marc informieren. Ist lokal kein Login möglich: stoppen und melden.

## [P3] Workflow-Berechtigungen begrenzen

`ci.yml` hat keinen `permissions:`-Block; der `GITHUB_TOKEN` bekommt damit die
Repository-Standardrechte. Bei einem öffentlichen Repo mit Secrets im Workflow: auf Workflow-Ebene
`permissions: contents: read` setzen. Prüfen, dass kein Job mehr braucht (Artefakt-Upload und
Cache brauchen keine Token-Rechte). Danach `PR-CI-18` und Actions-Lauf erneut betrachten.

## Reihenfolge und Stopp-Punkte (unverändert)

1. P1-4, P2-5, P3 lokal umsetzen; Nacharbeit-2-Abschnitt am Ende von `docs/BUILD_LOG.md`.
2. Marc legt die Secrets an und bestätigt.
3. **Nur mit ausdrücklicher Freigabe von Marc:** Push des Feature-Branches. Achtung:
   Der Job `e2e` läuft nur bei `pull_request`, `workflow_dispatch` oder Push auf `main`
   (nicht bei einem reinen Push auf den Feature-Branch). Für den Nachweis braucht es einen PR
   oder einen `workflow_dispatch`-Lauf auf dem Branch; das entscheidet Marc.
4. **Erst nach grünem Lauf und weiterer Freigabe von Marc:** Ruleset anlegen,
   `v2.3.0-github-ruleset-baseline.json` aktualisieren (`PR-BRANCH-20`).

Kein Merge, kein Tag, kein Force-Push. Schutzbereichs-Diff
`git diff c6d88f3 -- src/simulation src/types src/context src/services/data src/features/resources`
muss leer bleiben.

## Akzeptanzkriterien

- In der CI wird weder Trace noch Video noch Screenshot aufgezeichnet; ein Test sichert das ab
  und ist nachweislich rot, wenn es aktiviert wird.
- Report-Artefakte haben `retention-days: 7`.
- `ci.yml` hat `permissions: contents: read`.
- Der Eintrag enthält nur belegte Aussagen zum „Bekannten Problem“ und zum LHCI-Nachweis.
- Pflicht-Verifikation grün, Schutzbereichs-Diff leer.
