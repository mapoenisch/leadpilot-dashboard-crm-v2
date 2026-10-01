# Folgeauftrag Codex-Nacharbeit: Marc nach jedem Nacharbeits-Push anpingen

**Stand:** 01.10.2026

**Basis:** `main` nach PR #42 (`7646d81`). Vorgänger: `ANTIGRAVITY_AUFTRAG_CI_CODEX_NACHARBEIT.md`.

**Entscheidung Marc (01.10.2026):** Variante A.

**Builder:** Claude Code. **Prüfer:** Codex. **Merge:** nur Marc.

## Anlass

Ende-zu-Ende-Test auf PR #43: Codex prüft einen neu geöffneten PR von selbst. Die automatische
Nacharbeit lief vollständig durch. Danach blieb der Kreislauf stehen:

- Codex prüft Pushes des Workflow-Tokens nicht von selbst, trotz „Bei jedem Push“.
- Codex reagiert nicht auf `@codex review` von `github-actions[bot]`.
- GitHub hält den `pull_request`-CI-Lauf zu diesem Push als „action_required“ zurück.

Verworfen sind Variante B (Codex-GitHub-Action mit OpenAI-API-Key) und Variante C (Push mit Marcs
persönlichem Token).

## Ziel-Dateien

| Datei | Änderung |
|---|---|
| `.github/workflows/codex-rework.yml` | Job `publish`: nach einem Push Hinweis an `@mapoenisch` mit den zwei Handgriffen |
| `scripts/__tests__/codexReviewCycle.vitest.ts` | Vertragstest für den Hinweis |
| `docs/dashboard/REVIEW_WORKFLOW.md` | Ablauf und Auslöser nach dem Testergebnis |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_CI_CODEX_NACHARBEIT_HINWEIS.md` | Diese Datei |
| `docs/BUILD_LOG.md` | Ergebnis des Ende-zu-Ende-Tests und Builder-Nachweis |

## Umsetzung

- [x] `publish` hängt nach einem erfolgreichen Push an die Zusammenfassung an: „@mapoenisch Du
  bist dran“, die CI mit „Approve and run workflows“ freigeben, `@codex review` kommentieren.
  Ohne Push kommt kein Hinweis. Eskalationen meldet Claude dann selbst in der Zusammenfassung.
- [x] Ablaufbeschreibung an das Testergebnis anpassen.
- [x] Gates: `tsc`, Lint, Vitest, `verify`, Build; Schutzbereichs-Diff leer.
- [ ] PR-CI und Codex-Prüfung.

## Nicht in diesem Auftrag

Die neue `basic-ftp`-Advisory (GHSA-c475-qrg2-pj4r, high, Dev-Abhängigkeit über `@lhci/cli`)
lässt den Audit-Schritt auf allen Branches scheitern, auch hier. Die Behebung braucht einen
`overrides`-Eintrag in `package.json`, denn `get-uri` verlangt `^5`, behoben ist die Lücke erst in
6.2.1. Dafür gibt es einen eigenen Auftrag mit Marcs Freigabe.
