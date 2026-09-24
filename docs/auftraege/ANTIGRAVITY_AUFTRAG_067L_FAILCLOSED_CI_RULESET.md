# AUFTRAG 067L / Gate G58 — Fail-closed CI, SHA-Pinning und Ruleset

**Baseline:** `c6d88f3` (G57 freigegeben, Prüfer-Befund committet) ·
**Branch:** `feat/auftrag-067l-ci-ruleset` (von `4fcc404` abzweigen, dort liegt dieser Auftrag;
Baseline für den Schutzbereichs-Diff bleibt `c6d88f3`, dazwischen nur Doku) · **Status:** OFFEN

Teilauftrag 067L des Master-Auftrags 067 (`ANTIGRAVITY_AUFTRAG_067_V2_3_0_PRODUKTIONSREIFE_MASTER.md`).
Diese Datei ist die konkrete Arbeitsanweisung für G58 und ergänzt den Master um die Auflage
aus dem G57-Review sowie das verbindliche Repo-Ziel.

## Maßgebliche Dokumente (Lesereihenfolge)

1. `CLAUDE.md` (Repo-Root)
2. `docs/auftraege/ANTIGRAVITY_AUFTRAG_067_V2_3_0_PRODUKTIONSREIFE_MASTER.md` — Abschnitt
   „067L / G58“ inklusive „Auflage aus dem G57-Review“
3. `docs/superpowers/plans/2026-09-16-v2-3-0-master-implementation-plan.md` — Task 12
4. `docs/reviews/v2.3.0-audit-risk-acceptance.md`
5. `docs/BUILD_LOG.md` — letzter Abschnitt „Gate G57: Unabhängiger Prüfer-Befund zur Nacharbeit“

## Ziel

Release Readiness misst im aktuellen Lauf und beendet sich bei fehlendem Artefakt oder rotem
Unterprozess mit Exit ungleich 0. Alle externen Actions sind auf vollständige 40-stellige
Commit-SHAs gepinnt. `main` besitzt ein aktives Ruleset. Der echte Actions-Lauf ist grün. Die
Sollverträge `PR-CI-18`, `PR-RELEASE-17`, `PR-LICENSE-19` und `PR-BRANCH-20` werden grün.

## Verbindliches Repo-Ziel (von Marc bestätigt, 2026-09-19)

- **Maßgebliches Repo ist `mapoenisch/leadpilot-dashboard-crm-v2`** — identisch mit `origin`
  (`https://github.com/mapoenisch/leadpilot-dashboard-crm-v2.git`). Das aktuelle Repo ist `-v2`.
- Der Plan (Task 12, Step 6) nennt `mapoenisch/leadpilot-dashboard-crm` **ohne `-v2`**. Das ist ein
  **anderes, privates Repo** mit älterer Historie (kein v2.2.0, dort sind Rulesets ohne GitHub Pro
  nicht verfügbar, API-Antwort 403). Es darf **nicht** verwendet werden. Alle `gh api`-Aufrufe aus
  dem Plan sind auf `mapoenisch/leadpilot-dashboard-crm-v2` umzuschreiben.
- `-v2` ist **öffentlich** (Stand 2026-09-19: 0 Rulesets, `main` bei `837967a`). Vor jedem Push
  gilt der Stopp-Punkt unten.
- `origin/main` enthält 1 Commit, der lokal fehlt: `837967a` („test(visual): Baselines nach G39
  nachziehen und Toleranz auf 0.001 (#12)“, 2026-09-15). Vor jedem Push per
  `git log HEAD..origin/main` ansehen und im BUILD_LOG bewerten (Verträglichkeit mit den
  Visual-Baselines nach G52–G57). Nicht stillschweigend mergen oder rebasen.

## Tasks (Task 12 des Plans, Reihenfolge einhalten, rot vor grün)

- [ ] **Step 1:** Tests in `scripts/__tests__/verifyV23ReleaseReadiness.vitest.ts` für fehlende
  Coverage-, Lighthouse-, Audit-, Migration-, E2E- und Bundle-Artefakte sowie roten Unterprozess.
- [ ] **Step 2:** Rotlauf bestätigen: `npm test -- verifyV23ReleaseReadiness`. Erwartung: das alte
  Skript akzeptiert fehlende oder fest eingetragene Werte.
- [ ] **Step 3:** `scripts/verifyV23ReleaseReadiness.ts` als fail-closed Orchestrator. Keine
  hardcodierten Metriken; Fehler propagieren als Exit ungleich 0.
- [ ] **Step 4:** `.github/workflows/ci.yml`: E2E, Axe, Migration, Audit und Readiness bei Pull
  Requests und `main`; alle `uses:` auf vollständige 40-stellige Commit-SHAs pinnen.
- [ ] **Step 5:** `docs/operations/github-main-ruleset.md` schreiben (Pull Request erforderlich,
  direkte Pushes gesperrt, Required Checks aus den CI-Jobnamen, kein stiller Admin-Bypass).
  Das Ruleset selbst **nicht** anlegen (siehe Stopp-Punkte).
- [ ] **Step 6:** Prüfbefehle vorbereiten, gegen das richtige Repo:
  `gh api repos/mapoenisch/leadpilot-dashboard-crm-v2/rulesets` und
  `gh api repos/mapoenisch/leadpilot-dashboard-crm-v2/branches/main/protection`.
  Ausführen erst nach Freigabe (Stopp-Punkte).
- [ ] **Step 7:** Gesamtlauf in GitHub Actions abwarten; G58 erst bei `completed success`
  freigeben. Commit: `ci: enforce fail-closed v2.3.0 release gates`.

## Zieldateien

**Laut Plan** — Create: `scripts/verifyV23ReleaseReadiness.ts`,
`scripts/__tests__/verifyV23ReleaseReadiness.vitest.ts`, `docs/operations/github-main-ruleset.md`.
Modify: `.github/workflows/ci.yml`, `package.json`, `.lighthouserc.json`, `.size-limit.json`.

**Schriftliche Erweiterung für die G57-Auflage** (von Marc am 2026-09-19 erteilt):
`package-lock.json` (nur LHCI-Kette), `src/review/acceptance/qualityRelease.acceptance.ts` (nur
`PR-DEPENDENCY-15`), `src/review/acceptance/findingContract.ts` (nur Passing-Status der
G58-Findings), `docs/reviews/v2.3.0-audit-risk-acceptance.md`,
`docs/reviews/v2.3.0-npm-audit-baseline.json`, `docs/reviews/v2.3.0-known-findings.json`,
`docs/reviews/v2.3.0-finding-register.md`.

Jede weitere Datei: stoppen, Konflikt dokumentieren, auf schriftliche Erweiterung warten.

## Pflicht-Auflage aus G57 (ohne sie ist G58 nicht abnahmefähig)

G57 wurde mit 6 dev-only High-Advisories in der `@lhci/cli@0.15.1`-Kette abgenommen
(`lighthouse`, `puppeteer-core`, `@puppeteer/browsers`, `extract-zip`, `@lhci/cli`, `@lhci/utils`).
Die Ausnahme ist bis zum Abschluss von G58 befristet.

1. LHCI-Kette schließen (neues `@lhci/cli`-Release oder Ersatz) und den LHCI-Lauf im echten
   Actions-Lauf nachweisen.
2. `[PR-DEPENDENCY-15]` in `qualityRelease.acceptance.ts` wieder auf `audit.all.high === 0`
   ohne Risiko-Häkchen zurücksetzen (Aufweichung `<= 6` und Häkchen-Abhängigkeit entfernen).
3. `npm audit --omit=dev` = 0 **und** `npm audit --audit-level=high` = 0.

Lässt sich die Kette nicht sauber schließen: **stoppen und Marc fragen**. Keine neue Ausnahme
selbst abhaken; Risikofreigaben erteilt ausschließlich Marc.

## Bekanntes Problem

`npm run verify:v23:baseline` bricht lokal ab (`E2E_AUTH_EMAIL` nicht gesetzt; Marker-Fehler
`PR-FREEZE-07` und `PR-PERSIST-08`). Fail-closed heißt: das darf nie still als grün durchgehen.
Ursache klären und im BUILD_LOG dokumentieren.

## Stopp-Punkte (Marc muss vorher ausdrücklich freigeben)

- **Jeder `git push`.** Marc hält den Stand bewusst lokal. `origin` ist ein **öffentliches** Repo;
  ein Push veröffentlicht den Code. Vor einem Push zusätzlich den Commit `837967a` bewerten.
- **Anlegen oder Ändern des `main`-Rulesets** auf `mapoenisch/leadpilot-dashboard-crm-v2`
  (wirkt auf das echte Repo).
- **Auslösen des echten GitHub-Actions-Laufs** (braucht Push/PR).

Bis dahin: alles lokal bauen und prüfen, Ruleset-Doku und API-Prüfbefehle vorbereiten und im
BUILD_LOG „G58 lokal fertig, wartet auf Freigabe für Push/Ruleset/Actions“ eintragen. G58 wird
erst bei `completed success` freigegeben.

## Grenzen und Schutzbereiche

067L hat **keine** Freigabe für `src/simulation`, `src/types`, `src/context`,
`src/services/data`, `src/features/resources`. Vor dem Commit muss leer sein:

```
git diff c6d88f3 -- src/simulation src/types src/context src/services/data src/features/resources
```

Das (leere) Ergebnis gehört in den BUILD_LOG-Eintrag. Keine neuen Abhängigkeiten außer der für
die LHCI-Kette nötigen Aktualisierung. Kein Merge, kein Tag, kein Force-Push.

## Pflicht-Verifikation

```
npx tsc --noEmit
npm run lint
npm run format:check
npm run test:coverage
npm run verify
npm test
npm run build
npm audit --omit=dev
npm audit --audit-level=high
git diff --check
```

Golden Run unverändert.

## Abschluss

Gate-Abschlussbericht als neuer Abschnitt am Ende von `docs/BUILD_LOG.md` (Ziel und Kontext,
geänderte Dateien, funktionale Prüfungen, Schutzbereichs-Prüfung, automatisierte Verifikation,
Ergebnis und Freigabestatus). Commit-Message: `ci: enforce fail-closed v2.3.0 release gates`.
Danach **stoppen** und zurück an den Reviewer.

## Akzeptanzkriterien für die Prüfung

- Sollverträge `PR-CI-18`, `PR-RELEASE-17`, `PR-LICENSE-19`, `PR-BRANCH-20` grün;
  `PR-DEPENDENCY-15` grün mit `high === 0` ohne Risiko-Häkchen.
- `verifyV23ReleaseReadiness` beendet sich bei fehlendem Artefakt und bei rotem Unterprozess mit
  Exit ungleich 0; keine hardcodierten Metriken.
- Alle `uses:` in `.github/workflows/` sind auf 40-stellige SHAs gepinnt.
- Ruleset-Prüfung läuft gegen `mapoenisch/leadpilot-dashboard-crm-v2`, nicht gegen das Repo ohne `-v2`.
- Schutzbereichs-Diff leer; Push, Ruleset und Actions-Lauf nur nach ausdrücklicher Freigabe.
