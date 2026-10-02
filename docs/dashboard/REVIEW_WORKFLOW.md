# Review-Zyklus: Claude baut, Codex prüft, Claude arbeitet nach

Stand: 01.10.2026. Auftrag: `docs/auftraege/ANTIGRAVITY_AUFTRAG_CI_CODEX_NACHARBEIT.md`.

## Ablauf

1. Claude Code baut auf einem PR-Branch und pusht.
2. Die CI läuft. Codex prüft den Head-Commit. Codex ist auf „Team-PRs“ und „Bei jedem Push“
   eingestellt, „Alle PRs“ lässt sich nicht speichern.
3. Liefert der Codex-Bot (`chatgpt-codex-connector[bot]`, ID `199175422`) ein Ergebnis mit
   Befunden, startet `codex-rework.yml` genau eine Nacharbeitsrunde. Das Ergebnis kann ein Review
   mit Inline-Befunden sein oder ein Ergebnis-Kommentar mit P-Befunden. Claude bearbeitet dabei
   alle Befunde zum aktuellen Head-SHA gemeinsam. Berechtigte Befunde behebt Claude,
   unberechtigte begründet Claude. Danach laufen die Gates, ein BUILD_LOG-Eintrag entsteht und
   Claude committet lokal, in einem Job nur mit Leserechten. Ein getrennter Job prüft die Commits
   und pusht sie auf denselben Branch. Er veröffentlicht auch Claudes Zusammenfassung.
4. Nach dem Push startet die CI per `workflow_dispatch`. Den nächsten Codex-Review stößt Marc an:
   Im PR erscheint ein Kommentar „@mapoenisch Du bist dran“ mit zwei Handgriffen.
   - die von GitHub zurückgehaltene PR-CI mit „Approve and run workflows“ freigeben
   - `@codex review` kommentieren

   Codex prüft Pushes des Workflow-Tokens nicht von selbst und reagiert nicht auf Kommentare von
   `github-actions[bot]` (Ende-zu-Ende-Test PR #43). Mit dem neuen Codex-Ergebnis startet die
   nächste Runde wieder automatisch. Gibt es keine Befunde mehr, endet der
   Kreislauf von selbst.
5. Freigabe und Merge bleiben bei Marc (Codex-Freigabe des aktuellen Head, CI grün,
   `CLAUDE.md` §9).

## Schutzmechanismen

| Risiko | Gegenmaßnahme |
|---|---|
| Fremder Bot oder Mensch löst Nacharbeit aus | Job-Bedingung und Skript prüfen Login, Typ `Bot` und ID von Codex; `allowed_bots` nur `chatgpt-codex-connector` |
| Start pro Einzelkommentar | Auslöser ist nur der ganze Review oder der Ergebnis-Kommentar von Codex; Inline-Kommentare starten nichts |
| Veraltetes Ergebnis | Geprüfter SHA (Review-Commit bzw. eindeutiger SHA der Dateilinks) muss dem live gelesenen Head-SHA entsprechen, sonst Abbruch |
| Doppelte Ausführung | `concurrency` je PR; Rundenmarkierung je Head-SHA und Review, nur von `github-actions[bot]` gezählt |
| Endlosschleife | Höchstens 3 Runden pro PR, danach einmalig `@mapoenisch` im PR; fehlgeschlagene Runden zählen mit |
| PR-Code mit Schreibrechten (z. B. `postinstall`) | PR-Code läuft nur im Job `rework` mit Leserechten, ohne gespeicherte Zugangsdaten und mit `npm ci --ignore-scripts` |
| Schutzbereiche, Workflows, Force-Push | Job `publish` (ohne PR-Code) pusht nur einen Fast-Forward ohne Änderungen an Schutzbereichen, `.github` und Arbeitsdateien |
| Merge oder Freigabe durch Claude | Lese-Token; keine Werkzeuge für Push, Merge, Review, Kommentar oder `gh api` |
| Gefälschte Markierungen über Claudes Text | `<!--` und `@claude` werden vor dem Veröffentlichen entschärft |
| Manipulierte Entscheidungslogik im PR | Das Skript wird immer vom Default-Branch geladen |

## Review anfordern

- **Neuer PR und Pushes von Menschen:** Codex prüft von sich aus („Team-PRs“, „Bei jedem Push“).
- **Nach einem Nacharbeits-Push (Entscheidung Marc, Variante A):** Marc gibt die CI mit
  „Approve and run workflows“ frei und schreibt `@codex review` als Kommentar in den PR. Ohne
  diese beiden Schritte bleibt die Schleife stehen. Grund: Codex reagiert weder auf den Push des
  Workflow-Tokens noch auf einen Bot-Kommentar (PR #43, siehe `docs/BUILD_LOG.md`).
- **Label `codex-review`:** Kein Ersatz für den Kommentar von Marc. Das Label löst denselben
  Pfad wie der Zeitplan aus (`codex-review-request.yml`), also einen `@codex review`-Kommentar
  von `github-actions[bot]`, den Codex ignoriert. Es startet daher keinen Review.
- **Rückfall alle 15 Minuten:** `codex-review-request.yml` schreibt `@codex review`, wenn
  20 Minuten nach dem Head-Commit weder ein Review noch eine Reaktion von Codex vorliegt. Da
  Codex Bot-Kommentare nicht beachtet, ersetzt das den Kommentar von Marc nicht.
- In allen Fällen gilt: je Head-SHA höchstens eine Anforderung; jedes Ergebnis zählt nur für den
  Head-SHA, auf den es sich bezieht.

## Eingreifen

- **Nacharbeit für einen PR stoppen:** den PR in den Entwurf zurücksetzen hilft nicht, weil Codex
  dann trotzdem reviewen kann. Stattdessen den Workflow „Codex Rework“ unter Actions
  deaktivieren oder den PR schließen.
- **Nach dem Rundenlimit:** Marc entscheidet. Weitere Nacharbeit läuft dann manuell (Claude-Code-
  Sitzung oder `@claude` im PR).
