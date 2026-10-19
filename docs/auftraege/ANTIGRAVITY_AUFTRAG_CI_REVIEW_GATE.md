# Auftrag CI – Review-Gate für alle PRs (Antigravity, OpenCode, Devin)

Stand: 19.10.2026 · Auftraggeber: Marc Poenisch · Builder: Claude Code · Prüfer: Codex

## Ziel

Reviews von Antigravity, OpenCode und Devin hinterlassen einen sichtbaren „Reviewed“-Status am Head-Commit. Ihre Inline-Befunde sind Review-Konversationen, die vor dem Merge gelöst sein müssen. Gilt für alle PRs im Repo, nicht nur für `antigravity/*`.

## Umsetzung

| Datei | Zweck |
|---|---|
| `.github/workflows/review-gate.yml` | Setzt Status bei PR-Öffnung/Push, Review, Review-Kommentar, PR-Kommentar; manuell per `workflow_dispatch` (PR-Nummer). |
| `scripts/reviewGate.mjs` | Setzt `agent-review` (success = Review auf dem Head oder PR-Kommentar nach Eintreffen des Heads (Serverzeit des frühesten Status, nicht das manipulierbare Commit-Datum) von einem gelisteten Prüfer) und `review-conversations` (failure, solange Konversationen offen sind). |
| `.github/review-agents.json` | Prüferliste (Name → GitHub-Logins). |

## Regel (Marc 19.10.2026)

Ein Codex-Review ist nicht zwingend. Das Gate akzeptiert jeden Prüfer aus der Liste; Freigabe = `agent-review` grün und `review-conversations` grün. Verankert in `AGENTS.md` und `CLAUDE.md`.

## Grenzen und bekannte Einschränkungen

- Skript und Prüferliste kommen immer vom Default-Branch, PR-Code wird nie ausgeführt; der Job schreibt nur Status.
- **Das Lösen einer Konversation löst keinen Workflow aus** (`pull_request_review_thread` ist kein Actions-Ereignis). Nach dem Lösen: Actions → Review Gate → Run workflow mit PR-Nummer. Marc hat am 19.10.2026 entschieden, dass manuelles Auslösen reicht.
- **Fork-PRs:** Review- und Kommentar-Ereignisse erhalten dort nur ein schreibgeschütztes Token; der Status wird per manuellem Lauf gesetzt. Das Repo nutzt keine Forks, ein privilegierter Folgelauf entfällt bewusst.
- Merge-Blockade entsteht erst durch Branch-Schutz auf `main` (Pflicht-Checks `agent-review`, `review-conversations`, Konversationen lösen). Er wird erst nach dem Merge dieses Auftrags und einem ersten Lauf auf `main` gesetzt.
- Der PR-Autor zählt nie als Prüfer (kein Selbst-Review). Kommentar-Reviews prüfen nur Autorschaft und Zeit, nicht den Inhalt (OpenCode setzt keinen Marker); ein Fortschritts-Kommentar kann daher als Review zählen, bekannte Einschränkung.
- `marcs-pr-reviewer` steht bei OpenCode und Antigravity (Eintrag von Marc); ein Review dieses Kontos zählt für beide.

## Schutzbereiche

Unberührt (`src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources`).
