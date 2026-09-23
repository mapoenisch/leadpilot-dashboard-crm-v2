# Bestandsprüfung nach CI-Recovery

**Stand:** 23.09.2026 · **Referenz:** `main` auf `dec0aa5` (PR #22) ·
**Methode:** PR-Diffs einzeln gegen den aktuellen `main`-Inhalt prüfen;
Issue-Akzeptanzkriterien mit Code und Gate-Nachweisen abgleichen;
Remote-Branches über `git rev-list origin/main..origin/<branch>` prüfen.
Alter allein ist kein Schließ- oder Löschgrund.

## Pull Requests

| PR | Entscheidung | Einzelbeleg |
|---|---|---|
| [#1](https://github.com/mapoenisch/leadpilot-dashboard-crm-v2/pull/1) | offen lassen | `API.md` und `CONTEXT.md` fehlen auf `main`; der PR beschreibt noch v2.2.0. Nicht als vollständig übernommen belegt; vor Merge inhaltlich aktualisieren. |
| [#10](https://github.com/mapoenisch/leadpilot-dashboard-crm-v2/pull/10) | offen lassen | `docs/agents/*` fehlen auf `main`; der PR verweist auf die nicht integrierten Dateien aus #1 und behauptet noch null GitHub-Issues. Eigenständiger Inhalt, aber revisionsbedürftig. |
| [#11](https://github.com/mapoenisch/leadpilot-dashboard-crm-v2/pull/11) | geschlossen, Branch `chore/ci-gates-007-008` gelöscht | Beide aktuellen Workflows verwenden für jede `uses:`-Referenz einen 40-stelligen SHA mit Versionskommentar; der alte Workflow-Diff ist überholt. |
| [#14](https://github.com/mapoenisch/leadpilot-dashboard-crm-v2/pull/14) | geschlossen, Branch `docs/out-of-scope-kb` gelöscht | Der PR dokumentiert `MAX_LINES_BASELINE=4` als dauerhafte Ausnahme; auf `main` steht die Baseline bei `0`, Issue #6 ist geschlossen. Sein Dokument wäre sachlich falsch. |
| [#15](https://github.com/mapoenisch/leadpilot-dashboard-crm-v2/pull/15) | geschlossen, Branch `fix/lighthouse-chrome-pfad` gelöscht | `ci.yml` setzt `CHROME_PATH` aus Playwright-Chromium, `.lighthouserc.json` hat keinen macOS-Pfad mehr; Lighthouse im grünen `main`-Lauf `35834951857` bestätigt. |

Die drei entfernten PR-Branches waren keinem lokalen Worktree zugeordnet.
Ihre Commits bleiben über die geschlossenen PRs identifizierbar; es gab keinen
Force-Push und keinen Merge der veralteten Diffs.

## Issues

| Issue | Entscheidung | Noch zu prüfen / belegter Abschluss |
|---|---|---|
| [#2](https://github.com/mapoenisch/leadpilot-dashboard-crm-v2/issues/2) | offen lassen | G45 hat `SupabaseAuthAdapter` zum Default gemacht und `LocalAuthAdapter` zu einem harten Stub. Die ursprünglichen Kriterien zu Session-Ablauf und manipulierter lokaler Session brauchen vor dem Schließen eine aktuelle sicherheitsbezogene Einzelabnahme. |
| [#3](https://github.com/mapoenisch/leadpilot-dashboard-crm-v2/issues/3) | offen lassen | G45/G60 brachten `organization_id`, tenantgebundene CRM-RLS und reaktivierte Cross-Tenant-E2E-Tests. Produktions-Grants und sämtliche Akzeptanzkriterien müssen vor Schließung frisch gegen den finalen Stand geprüft werden. |
| [#5](https://github.com/mapoenisch/leadpilot-dashboard-crm-v2/issues/5) | geschlossen | PR #22 und der anschließende `main`-Lauf `35834951857`: sieben Pflichtjobs einschließlich E2E, Coverage-Artefakt und Readiness grün. |
| [#7](https://github.com/mapoenisch/leadpilot-dashboard-crm-v2/issues/7) | offen lassen | Alle vier CI-Baselines stehen jetzt auf `0`; die später korrigierte Issue-Diskussion zu erklärenden Variablen und Inline-Style-Ausnahmen ist noch nicht als eigener Abschluss bewertet. |
| [#8](https://github.com/mapoenisch/leadpilot-dashboard-crm-v2/issues/8) | geschlossen | Alle `uses:`-Referenzen in beiden Workflows sind SHA-gepinnt; aktueller `main`-CI-Lauf grün. |
| [#9](https://github.com/mapoenisch/leadpilot-dashboard-crm-v2/issues/9) | offen lassen | `All Rights Reserved` ist im Masterauftrag entschieden; die Root-`LICENSE`, README-/Release-Notizen und Drittanbieterprüfung sind erst 067S/G65. GitHubs SPDX-Erkennung ist für diese individuelle Lizenz kein Abschlusskriterium. |

## Remote-Branches ohne offenen PR

| Branch | Einzigartige Commits gegenüber `main` | Entscheidung |
|---|---:|---|
| `codex/g28-supabase-live-inbetriebnahme` | 8 | behalten: eigenständige G28-/Auftrag-068-Arbeit, nicht integriert. |
| `codex/g28-supabase-live-operation-design` | 1 | behalten: eigenständige Designentscheidung, nicht integriert. |
| `fix/visual-baselines-nach-g39` | 3 | behalten: Funktionsteile ähneln späterer Arbeit auf `main`, aber Commit-/Diff-Gleichheit ist nicht belegt. |
| `visual-baselines/regen-nach-g43` | 1 | behalten: Commit-/Diff-Gleichheit mit `main` ist nicht belegt. |

Zusätzlich liegen `feat/auftrag-067n-crm-query-export`,
`fix/pr19-visual-admina-logout-nacharbeit` und `codex/ci-recovery` als
gemergte Remote-Branches ohne einzigartige Commits gegenüber `main` vor.
`fix/pr19-visual-admina-logout-nacharbeit` ist jedoch im ursprünglichen
Projekt-Worktree ausgecheckt; auch diese Branches wurden hier nicht gelöscht.

## Nächste Grenze

Diese Bestandsprüfung schließt keine offenen Sicherheits-Issues und ersetzt
keinen Detailauftrag für 067Q/G63. Die verbleibenden PRs und Branches werden
nicht aus bloßer Ähnlichkeit gelöscht. 067R/G64 muss alle dann noch offenen
Review-Befunde und Issues mit frischen Akzeptanznachweisen erfassen.
