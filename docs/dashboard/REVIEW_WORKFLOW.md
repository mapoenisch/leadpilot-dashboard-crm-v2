# Review-Zyklus: Claude baut, Codex prüft, Claude arbeitet nach

Stand: 01.10.2026. Auftrag: `docs/auftraege/ANTIGRAVITY_AUFTRAG_CI_CODEX_NACHARBEIT.md`.

> **Zweite Automatisierung:** Für Branches `antigravity/*` gilt der umgekehrte Zyklus (Antigravity baut, Claude prüft), beschrieben in `docs/dashboard/REVIEW_WORKFLOW_ANTIGRAVITY.md`. Dort fordert dieser Codex-Zyklus kein Review an und startet keine Nacharbeit durch Claude.

> **Neue Aufteilung ab 03.10.2026 (Entscheidung Marc):** Die automatische Nacharbeit auf GitHub ist pausiert; Schritte 3 und 4 unten entfallen, solange das gilt. Vorrangig gilt der Abschnitt „Aufteilung ab 03.10.2026“ am Ende.

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

## Status `codex-review` (serverseitig prüfbar)

`codex-status.yml` setzt für den Head-SHA eines PR den Commit-Status `codex-review`:

| Status | Bedeutung |
|---|---|
| `pending` | zum aktuellen Head liegt kein verwertbares Codex-Ergebnis vor |
| `failure` | Codex meldet zum aktuellen Head Befunde (Inline-Befunde oder P-Befunde im Kommentar) |
| `success` | Codex meldet für genau diesen Head „Didn't find any major issues“ |

- Der Status gilt nur für den Head, auf den sich das Ergebnis bezieht; ein neuer Push setzt ihn auf `pending`.
- Nur die verifizierte Codex-Identität (Login, Typ, ID) zählt. Menschen und andere Bots können den Status nicht auf `success` bringen.
- Der Workflow macht keinen Review und gibt nichts frei. Die Freigabe zum Merge bleibt bei Marc.
- Der Workflow läuft vom Default-Branch ohne PR-Code und darf nur Status schreiben. Er wirkt erst, nachdem er auf `main` liegt.
- **Entscheidung für Marc:** Soll `codex-review` im Branch-Schutz („Required status checks“) Pflicht werden? Das ist eine Repository-Einstellung und steht in keiner Datei.

## Vorschau ohne Hosting

Entscheidung Marc (02.10.2026): kein Vorschau-Hosting. Der CI-Job `build` lädt die gebaute Anwendung als Artefakt `dashboard-preview` hoch (7 Tage).

1. Im PR unter Actions den CI-Lauf öffnen und das Artefakt `dashboard-preview` herunterladen und entpacken.
2. Im Repository: `npx vite preview --outDir <entpackter-Ordner>` und die angezeigte Adresse öffnen.

Für die Testkachel genügt das, weil sie feste, gekennzeichnete Beispieldaten nutzt und keinen Zugang zu Produktivdaten braucht.

## Abgleich mit den Workflows (Stand 02.10.2026)

Geprüft gegen `codex-rework.yml`, `codex-review-request.yml` und `codex-status.yml`: Auslöser, Codex-Identität, Rundenlimit 3, Rundenmarkierungen je Head-SHA, `concurrency` je PR, Wartezeit 20 Minuten, Abgleich alle 15 Minuten, Label `codex-review`, Leserechte für PR-Code (`npm ci --ignore-scripts`) und der blockierte Push bei Änderungen an Schutzbereichen, `.github` und Arbeitsdateien. Es gab keine Abweichung zum Dokument. Folge für Aufträge: Eine automatische Nacharbeit darf keine Dateien unter `.github` ändern; solche Befunde bearbeitet Claude Code manuell.

## Eingreifen

- **Nacharbeit für einen PR stoppen:** den PR in den Entwurf zurücksetzen hilft nicht, weil Codex
  dann trotzdem reviewen kann. Stattdessen den Workflow „Codex Rework“ unter Actions
  deaktivieren oder den PR schließen.
- **Nach dem Rundenlimit:** Marc entscheidet. Weitere Nacharbeit läuft dann manuell (Claude-Code-
  Sitzung oder `@claude` im PR).

## Aufteilung ab 03.10.2026 (Entscheidung Marc)

Anlass: Die automatische Nacharbeit lief am 03.10. auf einem veralteten Head und brach mit
„Branch hat sich seit dem Review bewegt“ ab (PR #52), während der Builder die Befunde schon
selbst behoben hatte. Marc hat zusätzlich das Claude-Code-Plugin `codex-review`
(`LuD1161/codex-review-skill`) lokal installiert.

| Prüfweg | Wo | Wann | Status |
|---|---|---|---|
| CI (`ci.yml`) | GitHub | jeder Push | aktiv |
| Codex-App (`chatgpt-codex-connector[bot]`) | GitHub | PR geöffnet und jeder Push (Einstellung in ChatGPT, kein Workflow) | aktiv |
| Claude-Review (`claude-review.yml`) | GitHub | nur `antigravity/*`, Label `claude-review` oder manuell | aktiv, solange Antigravity baut |
| Plugin `/codex-review:code`, `/codex-review:plan` | lokal bei Marc in Claude Code | auf Aufruf, vor dem Push | nach Bedarf |
| `codex-review-request.yml`, `codex-status.yml`, `codex-rework.yml`, `claude.yml` | GitHub | – | pausiert |

Ablauf für Claude Code als Builder (Zyklus 1):

1. Claude Code baut und pusht. Die CI läuft, die Codex-App prüft den neuen Head.
2. Befunde der Codex-App arbeitet der Builder selbst ab (Fix, Antwort im Thread, Thread auflösen,
   BUILD_LOG-Eintrag). Es gibt keine automatische Nacharbeitsrunde mehr.
3. Baut Claude Code lokal bei Marc, kann vor dem Push `/codex-review:code` laufen. Das Ergebnis
   (Runden, letzte Codex-Aussage) gehört als Prüfnachweis in den BUILD_LOG-Eintrag.
4. Freigabe und Merge bleiben bei Marc. Die Gate-Freigabe kommt weiterhin von Codex (App-Review
   ohne Befund oder Plugin-Zustimmung zum aktuellen Stand), nie vom Builder selbst.

Grenzen des Plugins: Es läuft nur in Claude Code auf Marcs Rechner, nicht in Cloud-Sitzungen und
nicht für Antigravity. Es braucht die Codex-CLI und einen OpenAI-Zugang. Den Status `codex-review`
setzt es nicht.

Folge des Pausierens: Ohne `codex-status.yml` erscheint kein Status `codex-review` mehr. Ist er im
Branch-Schutz als Pflicht-Check eingetragen, muss Marc ihn dort entfernen, sonst sind Merges
blockiert. Ohne `claude.yml` reagiert Claude nicht mehr auf `@claude` in PRs.

Zurückschalten: die vier Workflows unter Actions wieder aktivieren; die Abschnitte oben gelten dann
unverändert.
