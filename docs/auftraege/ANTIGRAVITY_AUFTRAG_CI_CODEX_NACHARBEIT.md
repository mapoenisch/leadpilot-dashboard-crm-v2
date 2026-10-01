# Separater CI-Auftrag: Automatische Nacharbeit von Codex-Befunden

**Stand:** 01.10.2026

**Basis:** `main` nach PR #40 (`9d5eed3`); Claude-GitHub-Anbindung in Issue #41 erfolgreich getestet

**Builder:** Claude Code. **Prüfer:** Codex (Diff und CI). **Merge:** nur Marc.

**Abgrenzung:** Kein Dashboard-Umbau, keine Produktionslogik, kein Deploy. Keine Änderung an
`ci.yml`, an den sieben Ruleset-Jobs, an `claude.yml`, an der Vitest-Konfiguration oder an den
Schutzbereichen aus `CLAUDE.md` §6.

## Ziel

Der Kreislauf läuft ohne manuelles Weiterreichen:

1. Claude baut auf einem PR-Branch und pusht.
2. Codex reviewt den Head-Commit.
3. Claude bearbeitet die berechtigten Befunde dieses Reviews gesammelt in einer Runde.
4. Der neue Push löst CI und einen neuen Codex-Review aus.

Höchstens drei automatische Runden pro PR. Danach und bei Widersprüchen informiert der Workflow
Marc im PR. Claude merged nie und gibt nie frei.

## Ziel-Dateien

| Datei | Änderung |
|---|---|
| `.github/workflows/codex-rework.yml` | Neu: Nacharbeit nach einem Codex-Review. |
| `.github/workflows/codex-review-request.yml` | Neu: Review-Anforderung `@codex review` als Rückfallebene. |
| `scripts/codexReviewCycle.mjs` | Neu: Entscheidungslogik und GitHub-Aufrufe (ohne Abhängigkeiten). |
| `scripts/__tests__/codexReviewCycle.vitest.ts` | Neu: Tests der Entscheidungslogik und der Workflow-Verträge. |
| `docs/dashboard/REVIEW_WORKFLOW.md` | Neu: Ablauf, Grenzen, manueller Auslöser durch Marc. |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_CI_CODEX_NACHARBEIT.md` | Diese Auftragsdatei. |
| `docs/BUILD_LOG.md` | Builder-Nachweis. |

Die neuen Tests liegen im vorhandenen Include-Muster `scripts/__tests__/**/*.vitest.ts` und
laufen damit im bestehenden CI-Job `test` mit. Die Vitest-Konfiguration bleibt unverändert.

## Anforderungen und Umsetzung

- [x] **Nur der verifizierte Codex-Bot:** Ein Review zählt nur, wenn `login`
  `chatgpt-codex-connector[bot]`, `type` `Bot` und die numerische ID `199175422` übereinstimmen.
  Die ID stammt aus dem Review auf PR #40. Der Workflow prüft das schon in der Job-Bedingung und
  das Skript prüft es noch einmal über die API. Die Claude-Action lässt nur diesen Bot zu
  (`allowed_bots`).
- [x] **Gesammelt statt pro Kommentar:** Auslöser ist `pull_request_review: submitted`, also der
  ganze Review. Inline-Kommentare (`pull_request_review_comment`) starten nichts. Das Skript
  sammelt alle verifizierten Codex-Reviews zum Head-SHA samt Inline-Befunden in eine Datei. Claude
  bearbeitet sie in einem Lauf.
- [x] **Veraltete Reviews:** Bezieht sich ein Review nicht auf den aktuellen Head-SHA (live über
  die API gelesen), wird er übersprungen.
- [x] **Keine Doppelausführung:** `concurrency` je PR ohne Abbruch laufender Läufe. Vor dem Start
  schreibt der Workflow eine Markierung `<!-- codex-review-cycle:rework round=N sha=… review=… -->`
  in den PR. Gibt es für den SHA schon eine, wird übersprungen. Es zählen nur Markierungen von
  `github-actions[bot]`.
- [x] **Höchstens drei Runden:** Die Runden werden über die Markierungen gezählt. Kommt danach
  ein weiterer Codex-Review, schreibt der Workflow einmalig einen Hinweis an `@mapoenisch` und
  startet nichts mehr.
- [x] **Review-Anforderung ohne Dopplung:** Codex steht auf „Team-PRs“ und „Bei jedem Push“.
  `codex-review-request.yml` fordert deshalb nur nach, wenn 20 Minuten nach dem Head-Commit
  weder ein Codex-Review noch eine Codex-Reaktion zu diesem Stand vorliegt (Abgleich alle
  15 Minuten). Über das Label `codex-review` fordert Marc sofort an. Je Head-SHA wird höchstens
  einmal angefordert (Markierung `<!-- codex-review-cycle:request sha=… -->`).
- [x] **Pflichtgates und Schutzbereiche:** Claude muss vor dem Push `tsc`, Lint, Vitest,
  `verify` und Build grün haben und einen BUILD_LOG-Eintrag schreiben. Ein `pre-push`-Hook im
  Runner blockiert Änderungen an `src/simulation`, `src/types`, `src/context`,
  `src/services/data`, `src/features/resources` und `.github`. Ein Prüfschritt nach dem Lauf
  vergleicht dieselben Pfade auf dem Remote-Branch. Bei einem Treffer schlägt der Job fehl und
  Marc wird informiert. Die CI läuft auf dem neuen Push wie bei jedem PR.
- [x] **SHA-Pinning:** Alle `uses:` auf 40-stellige SHAs, gleiche Versionen wie in `ci.yml`
  bzw. `claude.yml`.
- [x] **Kein Merge, keine Freigabe:** Claude bekommt nur Datei-, Git- (ohne Force) und
  Gate-Werkzeuge sowie `gh pr comment`. `gh pr merge`, `gh pr review` und `gh api` sind nicht
  freigegeben. Das Branch-Ruleset auf `main` bleibt unverändert.
- [x] Lokal prüfen: Tests der Entscheidungslogik, `tsc`, Lint, Vitest, `verify`, Build,
  Schutzbereichs-Diff, SHA-Pinning, YAML-Syntax.
- [ ] Funktionstest Bot-Auslöser: Im PR das Label `codex-review` setzen und prüfen, ob Codex auf
  den Kommentar von `github-actions[bot]` reagiert. Label erneut setzen und prüfen, dass für
  denselben SHA kein zweiter Kommentar entsteht.
- [ ] PR-CI grün; Codex prüft Diff und CI; Befund im BUILD_LOG.
- [ ] Nach dem Merge durch Marc: Ende-zu-Ende-Test an einem Test-PR (siehe Grenzen).

## Bekannte Grenzen

- `claude-code-action` läuft nur mit einer Workflow-Datei, die identisch auf `main` liegt
  (siehe Lauf `36838469680`). `codex-rework.yml` lässt sich deshalb erst nach dem Merge
  Ende-zu-Ende testen. Vorher sind nur die Entscheidungslogik und die Review-Anforderung prüfbar.
- Geplante Workflows (`schedule`) laufen nur vom Default-Branch. Der 15-Minuten-Abgleich wirkt
  erst nach dem Merge und kann sich bei GitHub um einige Minuten verzögern.
- Wenn zwei Codex-Reviews zum selben SHA kurz hintereinander eintreffen, kann der zweite nach
  dem Start der Runde ankommen. Er wird dann übersprungen. Seine Befunde meldet Codex beim
  nächsten Head erneut, falls sie noch gelten.
- Bricht eine Runde ab, zählt sie trotzdem. So entstehen keine Endlosschleifen bei
  wiederholten Fehlern.
