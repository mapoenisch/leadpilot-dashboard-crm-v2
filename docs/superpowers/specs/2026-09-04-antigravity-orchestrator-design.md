# Design: Orchestrator für die Codex ↔ Antigravity-Schleife

**Datum:** 2026-09-04
**Status:** Entwurf zur Review
**Repo:** `/Users/marcpoenisch/Projekte/LeadPilot Dashboard-CRM`

## Problem

Der in `AGENTS.md` beschriebene serielle Ablauf – Antigravity baut → Prüfer
(Codex) prüft inkl. Gates → Befund zurück an Antigravity → Wiederholung, bis
alle Gates bestanden sind – wird derzeit von Hand betrieben: Marc kopiert jede
Nachricht zwischen der Codex-App und der Antigravity-IDE hin und her, pro Runde
rund vier Copy-&-Paste-Aktionen. Das kostet Zeit, bindet Aufmerksamkeit und ist
fehleranfällig (falsche Zwischenablage, ausgelassene Korrektur).

## Ziel

Ein Orchestrator auf dem Mac fährt die Schleife selbst: befragt Codex per CLI,
stellt dessen Anweisung für Antigravity bereit, wartet auf Antigravitys Bericht
als Datei, gibt ihn an Codex zurück – bis Codex das Abschluss-Signal meldet.
Endzustand: hands-off bis auf gelegentliche Aufsicht (Ausbaustufe 3). Zwischen-
zustände: ein Handgriff pro Runde (Stufe 1–2).

## Rahmenbedingungen

- **Antigravity** ist eine reine GUI (VS-Code-Fork). Kein CLI, kein Headless-
  Modus. Nur über GUI-Fokus + Tastatur ansprechbar. Schreibt aber Dateien im
  Repo – das ist der Rückkanal.
- **Codex** ist als CLI vorhanden: `codex` v0.149.1 unter `~/.local/bin/codex`,
  gleicher ChatGPT-Login wie die Codex-App. `codex exec` fährt einen nicht-
  interaktiven Turn. Damit Codex in diesem Turn tatsächlich `npm run verify`
  u. Ä. ausführen darf, braucht `codex exec` einen nicht-interaktiven
  Approval-/Sandbox-Modus (z. B. `--full-auto` bzw. die entsprechende
  `--sandbox` / `--ask-for-approval never`-Kombination). Der exakte Flag-Satz
  wird beim Bau festgelegt und in `orchestrator.zsh` als Konstante gehalten.
- **n8n** läuft in Docker und kommt damit nicht an Host-CLI, Zwischenablage oder
  GUI. Es wird für diese Automatisierung nicht verwendet.
- **Betriebssystem:** macOS, zsh. Werkzeuge: `osascript` (Notifications +
  AppleScript), `pbcopy`, optional `cliclick` (Stufe 2-Fallback).
- Der Ablauf ist **seriell**: nie zwei Runden oder zwei Sessions gleichzeitig.

## Architektur

### Komponente 1: Nachrichtenbus `handoff/`

Neuer Ordner im Repo-Root, komplett in `.gitignore` (reiner Laufzeitzustand,
wird nicht committet).

| Datei | Richtung | Inhalt |
|---|---|---|
| `inbox.md` | Codex → Antigravity | nächste Anweisung bzw. Korrekturen; bei Bedarf mit Handoff-Protokoll-Kopf |
| `outbox.md` | Antigravity → Codex | Bericht der letzten Runde; allerletzte Zeile exakt `--- ENDE BERICHT ---` |
| `transcript.md` | Protokoll | vollständiger Verlauf, wächst monoton, menschenlesbar, pro Runde zwei Blöcke (`## Runde N — Codex`, `## Runde N — Antigravity`) |
| `state.json` | Zustand | `{ "iteration": N, "status": "running|paused|done|error", "last_outbox_mtime": <epoch>, "started_at": <iso>, "updated_at": <iso> }` |
| `PAUSE` | Marc → Skript | Existenz der Datei = Loop hält nach der laufenden Runde sauber an |
| `.lock` | Skript | verhindert zweite parallele Session; enthält PID + Startzeit |

Initialzustand beim Start: `transcript.md` leer oder mit Kickoff-Text,
`outbox.md` mit einem Platzhalter-Bericht (`Session-Start, noch kein Bericht.`
+ Endmarker), `state.json` mit `iteration: 0`, `status: running`.

### Komponente 2: `scripts/orchestrator.zsh`

Das Motor-Skript. Liegt unter `scripts/` im Repo, wird committet. Eine
`while`-Schleife mit hartem Deckel `MAX_ITER=80`.

Ablauf pro Runde N:

```
 1. handoff/PAUSE vorhanden?
       → state.status = paused; Notification "Loop pausiert nach Runde N-1"; Ende (Exit 0)
 2. Prompt zusammenbauen nach handoff/codex_prompt.md:
       PREAMBLE
       + "\n\n===== BISHERIGER VERLAUF =====\n" + Inhalt transcript.md
       + "\n\n===== NEUESTER BERICHT VON ANTIGRAVITY =====\n" + Inhalt outbox.md
 3. C = Ausgabe von:  codex exec --cd "<repo>" <approval-flags> - < handoff/codex_prompt.md
       (Codex fährt in diesem Turn selbst die Gates: npm run verify, tsc, Schutzbereichs-Diff)
       Exit-Code != 0  → state.status = error; Notification "Codex-CLI Fehler Runde N"; Ende (Exit 1)
 4. C an transcript.md anhängen als "## Runde N — Codex"
 5. C (getrimmt) == "ALLE AUFTRÄGE FERTIG"?
       → state.status = done; Erfolgs-Notification; Ende (Exit 0)
 6. C nach handoff/inbox.md schreiben; pbcopy < handoff/inbox.md
 7. Antigravity antriggern:
       Stufe 1: osascript -e 'display notification "Antigravity ist dran — weiter + Enter" ...'
       Stufe 2: AppleScript — Antigravity aktivieren, Chat fokussieren, "weiter" + Return tippen
 8. Auf Antigravity-Bericht warten (Poll-Schleife, Intervall 5 s):
       Bedingung erfüllt, wenn   mtime(outbox.md) > state.last_outbox_mtime
                          UND    letzte nicht-leere Zeile von outbox.md == "--- ENDE BERICHT ---"
       nach 30 min ohne Erfüllung: einmalige Notification "Runde N hängt seit 30 min";
       danach weiter pollen (kein Abbruch)
 9. outbox.md an transcript.md anhängen als "## Runde N — Antigravity"
10. state.last_outbox_mtime = mtime(outbox.md); state.iteration = N; state.updated_at = jetzt; state.json schreiben
    → nächste Runde
```

Sauberes Beenden (Trap auf `INT`/`TERM`): `.lock` entfernen, `state.status` auf
`paused` setzen, kurze Log-Zeile.

### Komponente 3: Codex-Preamble

Konstante im Skript, wird jedem Prompt vorangestellt:

> Du bist der Prüfer der seriellen LeadPilot-Schleife (siehe `AGENTS.md`,
> Abschnitt „Ablauf"). Die Aufträge stehen in
> `docs/superpowers/plans/2026-09-03-facelift-antigravity-auftraege.md`
> (Auftrag 1–12). Unten folgt der bisherige Verlauf, danach der neueste Bericht
> von Antigravity (dem ausführenden Builder).
>
> Deine Aufgabe: Antigravitys letztes Ergebnis prüfen. Fahre die Gates
> (`npm run verify`, TypeScript-Check, Screenshot-Diffs soweit möglich,
> Schutzbereichs-Diff für `src/simulation/`).
>
> Antworte mit GENAU EINEM von beidem:
> - **Korrekturen**: konkrete, umsetzbare Änderungswünsche an Antigravitys
>   letztem Ergebnis (nummeriert, mit Datei-/Stellenbezug).
> - **Abnahme + nächster Auftrag**: „ABGENOMMEN — weiter mit Auftrag N:
>   \<knappe Beschreibung des nächsten Auftrags für Antigravity\>".
>
> Ist der letzte Auftrag (12) abgenommen, antworte ausschließlich mit dem
> Wortlaut `ALLE AUFTRÄGE FERTIG` — nichts sonst.
>
> Trage deinen Befund pro Runde zusätzlich in `docs/BUILD_LOG.md` ein, wie in
> `AGENTS.md` („Ledger") vorgesehen.
>
> Adressiere alle Ausgaben an Antigravity. Keine Meta-Kommentare an mich, keine
> Rückfragen — triff die Entscheidung.

Damit schreibt Codex das Projekt-Ledger `docs/BUILD_LOG.md` als normale
Datei-Änderung in seinem Turn selbst. Das Skript fasst `BUILD_LOG.md` nicht an;
`transcript.md` (Rohprotokoll der Automation) und `BUILD_LOG.md` (Projekt-Ledger
in gewohnter Form) bleiben getrennt.

### Komponente 4: `AGENTS.md` — Abschnitt „Handoff-Protokoll"

Neuer Abschnitt, wird angehängt:

> ## Handoff-Protokoll (automatisierte Schleife)
>
> Wenn du mit dem Wort „weiter" oder „next" getriggert wirst:
> 1. Lies `handoff/inbox.md` — dort steht dein aktueller Auftrag bzw. die
>    Korrekturen des Prüfers.
> 2. Arbeite ihn vollständig ab, inklusive der in dieser Datei vorgeschriebenen
>    eigenen Gate-Läufe.
> 3. Schreibe deinen Bericht nach `handoff/outbox.md` (überschreiben, nicht
>    anhängen). Die allerletzte Zeile muss exakt `--- ENDE BERICHT ---` lauten.
> 4. Schreibe `handoff/outbox.md` erst, wenn du komplett fertig bist — die Datei
>    ist das Fertig-Signal für den Orchestrator.

Fällt Antigravity das automatische Lesen von `AGENTS.md` nicht zuverlässig, baut
das Skript denselben Wortlaut als Kopfzeilen in `inbox.md` ein; „weiter" bleibt
in jedem Fall der einzige Trigger, den Marc tippt.

### Komponente 5: Trigger-Mechanik nach Stufen

| Stufe | Schritt 7 | Discovery nötig | Rest-Handarbeit pro Runde |
|---|---|---|---|
| **1** | `osascript` Notification „Antigravity ist dran" (+ Ton) | — | zu Antigravity wechseln, „weiter" + Return, Genehmigungs-Popups wegklicken, gelegentlicher Blick |
| **2** | AppleScript: `tell application "Antigravity" to activate` → Chat-Eingabe fokussieren → `keystroke "weiter"` → `key code 36` | Antigravitys Shortcut für „Chat-Eingabe fokussieren" (Kandidaten testen: ⌘L, ⌘I, ⌘⇧L). Fallback: `cliclick c:<x>,<y>` auf feste Bildschirmkoordinate des Eingabefelds | Genehmigungs-Popups, gelegentlicher Blick |
| **3** | wie Stufe 2 | In Antigravity-Einstellungen prüfen, ob „alle Befehle im Workspace erlauben" / Auto-Run existiert. Falls ja: aktivieren, Popups entfallen. Falls nein: AppleScript sucht per System-Events-Accessibility einen Button mit Titel „Allow"/„Run"/„Zulassen" und klickt ihn (kein Koordinatenraten) | nur noch gelegentlicher Blick |

Baureihenfolge: Stufe 1 vollständig, produktiv über mindestens eine echte
Session testen, dann Stufe 2, dann Stufe 3. Jede Stufe ändert nur Schritt 7 des
Skripts, der Rest bleibt unangetastet.

### Komponente 6: Start / Stop

- **Start (empfohlen):** `./scripts/orchestrator.zsh` in einem Terminal-Tab.
  Live-Log sichtbar, direktes Ctrl-C.
- **Start (optional, „fire and forget"):** LaunchAgent-plist
  `~/Library/LaunchAgents/com.marc.antigravity-orchestrator.plist`, per
  `launchctl start` on demand angestoßen. **Kein** `KeepAlive` — der Loop soll
  bei `done` oder `error` enden und nicht neu starten. Das Skript ist so oder so
  standalone lauffähig; die plist ist nur Komfort.
- **Stop, geplant:** `touch handoff/PAUSE` → der Loop beendet die laufende Runde
  und hält dann an. `PAUSE` wieder löschen und neu starten setzt fort (Verlauf
  bleibt in `transcript.md`).
- **Stop, sofort:** Ctrl-C bzw. `launchctl stop`. Trap räumt `.lock` ab.

## Fehlerfälle

| Fall | Verhalten |
|---|---|
| `codex exec` liefert Exit != 0 (kein Login, Netzfehler, Quota) | `state.status = error`, Notification, Skript endet. Marc behebt, startet neu — `transcript.md` trägt den Kontext. |
| Antigravity schreibt `outbox.md` 30 min nicht | einmalige „hängt"-Notification, Loop pollt weiter (Antigravity braucht bei großen Aufträgen evtl. lange; kein Abbruch). |
| Endlos-Pingpong (Codex und Antigravity werden sich nicht einig) | `MAX_ITER = 80` greift, `state.status = error`, Notification. |
| Zweite Session versehentlich gestartet | `.lock` vorhanden → neues Skript beendet sich sofort mit Hinweis. Stale Lock (PID tot) wird erkannt und überschrieben. |
| Antigravity schreibt `outbox.md` unvollständig / ohne Endmarker | Poll-Bedingung nicht erfüllt → Skript wartet weiter, bis der Endmarker da ist. |
| Marc will mittendrin eine Runde manuell korrigieren | `touch handoff/PAUSE`, `transcript.md` / `inbox.md` von Hand anpassen, `PAUSE` löschen, neu starten. |

## Nicht im Scope

- n8n-Integration (Docker-Grenze, kein Nutzen hier).
- Vollständig unbeaufsichtigter Dauerbetrieb ohne jede Aufsicht — Stufe 3
  reduziert die Aufsicht auf „gelegentlicher Blick", eliminiert sie nicht.
- Bildschirm-Scraping des Antigravity-Chatpanes — der Rückkanal läuft
  ausschließlich über `outbox.md`.
- Skript-seitige Pflege von `docs/BUILD_LOG.md` — das Ledger schreibt Codex
  selbst in seinem Turn (Preamble-Anweisung); das Skript verändert es nicht.
- Parallelisierung mehrerer Aufträge — der Ablauf bleibt bewusst seriell.
- Ersetzen von Codex durch einen anderen Prüfer (Claude Code o. ä.) — bleibt
  möglich, ist aber eigener Auftrag.

## Offene Punkte (Discovery in Stufe 2/3, kein Blocker für die Umsetzung von Stufe 1)

1. Antigravitys Shortcut zum Fokussieren der Chat-Eingabe — wird beim Bau von
   Stufe 2 experimentell bestimmt.
2. Antigravitys Einstellung „alle Befehle im Workspace erlauben" — Marc prüft
   das bei Gelegenheit in den Settings; entscheidet, ob Stufe 3 per Setting oder
   per Accessibility-Klick umgesetzt wird.

## Dateien (Anlegen / Ändern)

| Datei | Aktion |
|---|---|
| `scripts/orchestrator.zsh` | neu, committen |
| `AGENTS.md` | Abschnitt „Handoff-Protokoll" anhängen |
| `.gitignore` | Zeile `handoff/` ergänzen |
| `handoff/` (+ Startdateien) | zur Laufzeit vom Skript angelegt |
| `~/Library/LaunchAgents/com.marc.antigravity-orchestrator.plist` | optional, Stufe 1 |
