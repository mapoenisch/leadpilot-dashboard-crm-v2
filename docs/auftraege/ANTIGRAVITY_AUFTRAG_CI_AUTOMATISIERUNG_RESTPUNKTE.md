# Folgeauftrag Automatisierung: Restpunkte aus Plan Abschnitt 11

**Stand:** 02.10.2026

**Basis:** `main` nach PR #46 (`843675b`). Vorgänger: `ANTIGRAVITY_AUFTRAG_CI_CODEX_NACHARBEIT.md`, `ANTIGRAVITY_AUFTRAG_CI_CODEX_NACHARBEIT_HINWEIS.md`.

**Entscheidungen Marc (02.10.2026):** Vorschau ohne Hosting als CI-Artefakt. Das Referenzbild für die Testkachel liefert Marc nach.

**Builder:** Claude Code. **Prüfer:** Codex. **Merge:** nur Marc.

## Anlass

Plan `docs/superpowers/plans/2026-10-01-executive-dashboard-plan.md`, Abschnitt 11, „Stand der Automatisierung“, nennt sechs offene Punkte. Dieser Auftrag setzt fünf davon um. Punkt 5 (Nachweis des Ablaufs an der Testkachel) hängt am Teilauftrag 0 und bleibt offen.

## Ziel-Dateien

| Datei | Änderung |
|---|---|
| `scripts/codexReviewCycle.mjs` | Punkt 3: reine Funktion `decideCodexStatus` und Befehl `status` |
| `.github/workflows/codex-status.yml` | Punkt 3: neuer Workflow, setzt den Commit-Status `codex-review` |
| `scripts/__tests__/codexReviewCycle.vitest.ts` | Punkt 3: Tests für Statuslogik und Workflow-Vertrag |
| `scripts/__tests__/e2eSpecsListed.vitest.ts` | Punkt 4: neuer Test, jede `e2e/*.spec.ts` steht in `ci.yml` |
| `.github/workflows/ci.yml` | Punkt 6: Job `build` lädt `dist/` als Artefakt `dashboard-preview` hoch |
| `docs/dashboard/REVIEW_WORKFLOW.md` | Punkt 1: Abgleich mit den Workflows; Punkt 3 und 6 beschreiben |
| `docs/dashboard/AGENT_SETUP.md` | Punkt 2: Befund zu Zugängen und Vorschauhosting |
| `docs/superpowers/plans/2026-10-01-executive-dashboard-plan.md` | Restliste aktualisieren |
| `BUILD_PLAN.md` | Restliste aktualisieren |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_CI_AUTOMATISIERUNG_RESTPUNKTE.md` | Diese Datei |
| `docs/BUILD_LOG.md` | Builder-Nachweis |

Schutzbereiche bleiben unverändert (`CLAUDE.md` §6).

## Umsetzung

- [x] **Punkt 1, Abgleich:** Aussagen in `REVIEW_WORKFLOW.md` (Auslöser, Zeiten, Rundenlimit, Label, Rückfall) gegen `codex-rework.yml` und `codex-review-request.yml` prüfen; Abweichungen im Dokument korrigieren und im BUILD_LOG nennen.
- [x] **Punkt 2, Zugänge und Vorschauhosting:** Befund festhalten: genutzte Secrets, Token-Rechte je Workflow, kein Hosting im Repo; Entscheidung Marc „CI-Artefakt“.
- [x] **Punkt 3, Codex-Status:** Commit-Status `codex-review` je Head-SHA: `pending` ohne Ergebnis, `failure` bei Befunden zum Head, `success` bei „Didn't find any major issues“ zum Head. Nur verifizierte Codex-Identität (Login, Typ, ID). Workflow läuft auf `pull_request_target`, `pull_request_review` und `issue_comment` vom Default-Branch, ohne PR-Code, nur mit `statuses: write` und Leserechten. Er ersetzt keine Freigabe durch Marc und macht keinen Review.
- [x] **Punkt 4, E2E-Liste:** Test, der fehlschlägt, wenn eine `e2e/*.spec.ts` nicht in `ci.yml` steht. Die künftige `e2e/personal-dashboard.spec.ts` muss damit zwingend aufgenommen werden.
- [x] **Punkt 6, Vorschau:** `dist/` als Artefakt `dashboard-preview` (7 Tage). Anleitung zum lokalen Öffnen ohne neue Abhängigkeit (`npx vite preview`).
- [x] Gates: `tsc`, Lint, Vitest, `verify`, Build; Schutzbereichs-Diff leer.
- [ ] PR-CI und Codex-Prüfung.

## Nicht Teil dieses Auftrags

- Punkt 5 (Ablaufnachweis an der Testkachel) und die Testkachel selbst (Teilauftrag 0, wartet auf das Referenzbild).
- Branch-Schutz („Required status checks“): Einstellung durch Marc im Repository, nicht per Datei.
