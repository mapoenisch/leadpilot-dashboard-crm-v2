# Review-Zyklus: Claude baut, Codex prüft, Claude arbeitet nach

Stand: 01.10.2026. Auftrag: `docs/auftraege/ANTIGRAVITY_AUFTRAG_CI_CODEX_NACHARBEIT.md`.

## Ablauf

1. Claude Code baut auf einem PR-Branch und pusht.
2. Die CI läuft. Codex prüft den Head-Commit. Codex ist auf „Team-PRs“ und „Bei jedem Push“
   eingestellt, „Alle PRs“ lässt sich nicht speichern.
3. Schickt der Codex-Bot (`chatgpt-codex-connector[bot]`, ID `199175422`) einen Review mit
   Inline-Befunden, startet `codex-rework.yml` genau eine Nacharbeitsrunde. Claude bearbeitet
   dabei alle Befunde zum aktuellen Head-SHA gemeinsam. Berechtigte Befunde behebt Claude,
   unberechtigte begründet Claude im PR-Kommentar. Danach laufen die Gates, ein BUILD_LOG-Eintrag
   entsteht und Claude pusht auf denselben Branch.
4. Der neue Push startet CI und Codex-Review erneut. Gibt es keine Befunde mehr, endet der
   Kreislauf von selbst.
5. Freigabe und Merge bleiben bei Marc (Codex-Freigabe des aktuellen Head, CI grün,
   `CLAUDE.md` §9).

## Schutzmechanismen

| Risiko | Gegenmaßnahme |
|---|---|
| Fremder Bot oder Mensch löst Nacharbeit aus | Job-Bedingung und Skript prüfen Login, Typ `Bot` und ID von Codex; `allowed_bots` nur `chatgpt-codex-connector` |
| Start pro Einzelkommentar | Auslöser ist nur `pull_request_review: submitted`; Inline-Kommentare starten nichts |
| Veralteter Review | Review-SHA muss dem live gelesenen Head-SHA entsprechen, sonst Abbruch |
| Doppelte Ausführung | `concurrency` je PR; Rundenmarkierung je Head-SHA und Review, nur von `github-actions[bot]` gezählt |
| Endlosschleife | Höchstens 3 Runden pro PR, danach einmalig `@mapoenisch` im PR; fehlgeschlagene Runden zählen mit |
| Schutzbereiche, Workflows, Force-Push | `pre-push`-Hook im Runner und Prüfung des Remote-Branches nach dem Lauf |
| Merge oder Freigabe durch Claude | Keine Werkzeuge dafür (`gh pr merge`, `gh pr review`, `gh api` gesperrt) |
| Manipulierte Entscheidungslogik im PR | Das Skript wird immer vom Default-Branch geladen |

## Review anfordern

- **Automatisch:** Codex prüft bei jedem Push von sich aus.
- **Rückfall alle 15 Minuten:** `codex-review-request.yml` schreibt `@codex review`, wenn
  20 Minuten nach dem Head-Commit weder ein Review noch eine Reaktion von Codex vorliegt.
- **Sofort per Label:** Marc setzt im PR das Label `codex-review`.
- In allen drei Fällen gilt: je Head-SHA höchstens eine Anforderung.
- **Manuell durch Marc:** Marc schreibt `@codex review` als Kommentar in den PR. Das geht immer
  und ist der Rückfall, falls Codex auf den Bot-Kommentar nicht reagiert. Ergebnis des
  Funktionstests: siehe `docs/BUILD_LOG.md`, Eintrag „CI-Auftrag Codex-Nacharbeit“.

## Eingreifen

- **Nacharbeit für einen PR stoppen:** den PR in den Entwurf zurücksetzen hilft nicht, weil Codex
  dann trotzdem reviewen kann. Stattdessen den Workflow „Codex Rework“ unter Actions
  deaktivieren oder den PR schließen.
- **Nach dem Rundenlimit:** Marc entscheidet. Weitere Nacharbeit läuft dann manuell (Claude-Code-
  Sitzung oder `@claude` im PR).
