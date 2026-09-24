# CI-Recovery nach PR #21

**Freigabe:** Marc, 23.09.2026. **Basis:** `11dae9b` (`origin/main`).
**Geltungsbereich:** eine eigenständige Recovery-PR zu Issue #5 und zur veralteten
Roadmap. Kein Teil von 067Q/G63, kein Deploy.

## Befund und Ziel

Der Workflow `ci.yml` startet für jeden Feature-Push sowohl einen `push`- als auch
einen `pull_request`-Lauf. Innerhalb jedes Laufs führt `test` Vitest mit Coverage aus;
`e2e` wiederholt dieselbe Suite nach Lighthouse für den Readiness-Bericht. PR #21
zeigte, dass diese zweite Ausführung ein eigenes Flake-Risiko schafft. Der
Readiness-Orchestrator erwartet lediglich `coverage/coverage-summary.json` und
prüft fehlende, veraltete oder unzureichende Werte fail-closed.

Der aktive GitHub-Ruleset `main-protection` (ID `23709388`) erzwingt sieben
Statuschecks und Pull Requests für `main`. Die gespeicherte Baseline stammt noch
aus dem anderen Repository ohne `-v2` und behauptet, kein Ruleset sei vorhanden.
`BUILD_PLAN.md` bildet G44–G62 noch als offen beziehungsweise gesperrt ab.

## Entwurf

1. `push` triggert `CI` ausschließlich auf `main`; `pull_request` bleibt für PRs
   aktiv, `workflow_dispatch` für bewusste manuelle Läufe.
2. Die sieben Jobnamen bleiben unverändert. `e2e` erhält `needs: test` und lädt
   das im selben Workflow-Lauf von `test` hochgeladene `coverage`-Artefakt mit
   einer auf volle SHA gepinnten `actions/download-artifact@v4` nach
   `coverage/`. Eine explizite Dateiprüfung steht vor Readiness. Der zweite
   `npm run test:coverage`-Aufruf entfällt.
3. Ein CI-Vertragstest hält Trigger, genau einen Coverage-Aufruf und den
   Artefaktfluss fest. Die bestehende Readiness-Suite prüft bereits fehlende,
   veraltete und unzureichende Coverage.
4. Ruleset-Dokumentation und Baseline werden anhand der GitHub-API aktualisiert.
   Der frühere Baseline-Befund bleibt als Historie kenntlich. Der unveränderliche
   Finding-Titel und seine Gate-Zuordnung bleiben bestehen; nur der erlaubte
   Statuswechsel `PR-BRANCH-20` von `failing` zu `passing` wird im TS-Vertrag,
   JSON-Register und Markdown-Register synchron vorgenommen.
5. `BUILD_PLAN.md` führt G44–G62 mit den tatsächlich integrierten Commits auf.
   Nächster Fachauftrag ist 067Q/G63, gefolgt von 067R/G64 und 067S/G65.

## Abnahme

- Die CI-Vertragstests sind vor der Workflow-Änderung rot und danach grün.
- TypeScript, Lint, Format, `npm run verify`, vollständige Coverage und Build
  bestehen unter Node `>=22.18.0 <23`; `git diff --check` ist leer.
- Der Schutzbereichs-Diff seit `11dae9b` ist leer.
- Ein PR-CI-Lauf mit sieben grünen Jobs auf dem finalen HEAD bestätigt den
  Artefaktfluss vor dem Merge. Issue #5 bleibt bis nach dem Merge und einem
  grünen `main`-CI-Lauf mit allen sieben Jobs offen. Merge und Deploy werden
  durch diese Spezifikation nicht freigegeben.
