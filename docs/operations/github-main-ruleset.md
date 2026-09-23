# GitHub-Schutz für `main`

**Dokument-ID:** OPS-RULESET-01  
**Repository:** `mapoenisch/leadpilot-dashboard-crm-v2` (öffentlich)  
**Ruleset:** [`main-protection`](https://github.com/mapoenisch/leadpilot-dashboard-crm-v2/rules/23709388), ID `23709388`
**Status:** aktiv; per GitHub-API am 23.09.2026 um 06:45 UTC geprüft.

## Aktive Regeln

Das Branch-Ruleset gilt laut GitHub für `~DEFAULT_BRANCH` und
`refs/heads/main`. Die API meldet `enforcement: active`, eine leere
`bypass_actors`-Liste und `current_user_can_bypass: never`.

| Regel | Tatsächliche Einstellung |
|---|---|
| Pull Request | erforderlich; offene Review-Threads müssen aufgelöst sein |
| Direkter Push | durch Pull-Request-Pflicht gesperrt |
| Statuschecks | `lint`, `typecheck`, `test`, `build`, `livekpi-verifiers`, `size-limit`, `e2e` |
| Aktualität | `strict_required_status_checks_policy: true` |
| Löschen / Force-Push | `deletion` und `non_fast_forward` untersagt |
| Bypass | keine Akteure eingetragen |

Das Ruleset wurde am 19.09.2026 aktiviert. Der erfolgreiche
[`main`-Lauf nach PR #21](https://github.com/mapoenisch/leadpilot-dashboard-crm-v2/actions/runs/35795310797)
prüfte am Commit `11dae9b` alle sieben Jobs. Die CI-Recovery-PR ändert keine
Ruleset-Einstellung und behält alle sieben Jobnamen bei.

## CI-Auslöser und Artefaktfluss

`.github/workflows/ci.yml` prüft Pull Requests und Pushes auf `main` sowie
bewusst gestartete `workflow_dispatch`-Läufe. Ein Feature-Branch-Push ohne PR
startet diesen Workflow nicht. Der Job `test` erzeugt Coverage einmalig; der
abhängige Job `e2e` lädt das Artefakt aus demselben Workflow-Lauf für die
Release-Readiness. Fehlendes Coverage lässt E2E scheitern. Die übrigen sechs
Pflichtjobs und ihre Namen bleiben unverändert.

Die Trigger- und Artefaktänderung ist erst nach einem vollständigen grünen
PR-CI-Lauf in dieser Recovery-PR bestätigt. Bis dahin beschreibt dieser
Abschnitt die vorgesehene Konfiguration des Branches.

## Prüfung und Pflege

Aktiven Zustand des maßgeblichen `-v2`-Repositorys abfragen:

```bash
gh api repos/mapoenisch/leadpilot-dashboard-crm-v2/rulesets
gh api repos/mapoenisch/leadpilot-dashboard-crm-v2/rulesets/23709388
```

Die Detailantwort ist der Nachweis für `enforcement`, Ziel-Branches,
`bypass_actors`, Pull-Request-Regel und die sieben Check-Kontexte. Der
Branch-Protection-Endpunkt allein bildet Repository-Rulesets nicht zuverlässig
ab. Nach jeder Ruleset-Änderung sind API-Detailantwort, diese Dokumentation,
`docs/reviews/v2.3.0-github-ruleset-baseline.json` und die Check-Namen in
`ci.yml` gemeinsam abzugleichen. Die Baseline hält nur die für den
`PR-BRANCH-20`-Vertrag nötigen Felder fest; sie ersetzt keine Live-Abfrage.

Der ursprüngliche Baseline-Eintrag vom 16.09.2026 betraf
`mapoenisch/leadpilot-dashboard-crm` **ohne** `-v2`. Dessen HTTP-403-Befund
ist historisch und belegt nichts über dieses Repository.
