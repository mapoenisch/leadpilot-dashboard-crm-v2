---
description: Reicht ein formales GitHub-Review mit Inline-Kommentaren für einen PR ein.
agent: pr-reviewer
---

Prüfe PR $ARGUMENTS gegen den zugehörigen Auftrag unter `docs/auftraege/`, CLAUDE.md und die Gates.

Reiche den Befund als formales GitHub-Review mit Inline-Kommentaren nach den Regeln des
`pr-reviewer`-Agenten ein: ein `POST /pulls/<n>/reviews`-Call mit `commit_id` = aktueller Head-SHA,
`event: "COMMENT"` und `comments`. Kein `gh pr comment`, kein Review ohne `event`.
