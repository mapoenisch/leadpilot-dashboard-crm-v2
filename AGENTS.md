# AGENTS.md – LeadPilot Dashboard CRM

Diese Datei gilt für alle Coding-Agenten (Codex, Antigravity, weitere).

## Maßgebliche Regeln

**`CLAUDE.md` im Repo-Root ist die verbindliche Regelquelle.** Lies sie zuerst und vollständig.
Diese Datei fasst nur das Wichtigste zusammen; bei Abweichungen gilt `CLAUDE.md`.

## Kurzfassung

- **Projekt**: Echtzeit-Dashboard für das fiktive Unternehmen LeadPilot.
  React 18 + TypeScript + Vite, Supabase. Reifer Stand – Verbesserung/Erweiterung, kein Neubau.
- **Schutzbereich**: `src/simulation/` nur mit einem ausdrücklich dafür geschriebenen Auftrag
  ändern. Sonst nicht anfassen. Änderungen werden per Schutzbereichs-Diff geprüft.
- **Arbeitsweise**: Auftrags-Specs unter `docs/auftraege/ANTIGRAVITY_AUFTRAG_XXX_*.md`.
  Jeder Auftrag durchläuft das Gate-System : TypeScript-Check,
  Test-Suite (`npm run verify`), Screenshot-Diffs vorher/nachher, Schutzbereichs-Diff.
- **Ablauf ab 26.10.2026 (Entscheidung Marc, Details `CLAUDE.md` Abschnitt 4.1):** **Claude Code baut**
  (schreibt fehlende Detailaufträge selbst, ein Auftrag je PR) → **Codex prüft** über die Codex-App auf
  GitHub (beim Öffnen, nach Nacharbeit per `@codex review`), baut nichts → Claude Code arbeitet nach.
  Gate-Freigabe: Codex ohne offene Befunde auf dem aktuellen Head, alle Pflicht-Checks grün, alle
  Konversationen gelöst. Merge und Release macht Marc.
- **Ausweichweg, wenn Codex nicht verfügbar ist:** Marc fordert `/<agent> review` an (Antigravity,
  OpenCode, Devin, Proto oder Perplexity, über `MarcReview`, `agent-review.yml`). Nie mit Marcs eigenem
  `gh`-Login reviewen. Der frühere Antigravity-Zyklus (`claude-review.yml`) ist abgeschaltet.
- **Ledger**: Ergebnisse in `docs/BUILD_LOG.md`. Claude Code schreibt den Builder-Eintrag und trägt das
  Codex-Ergebnis als Nachtrag ein (Protokoll, keine Freigabe).
- **Maßgebliche Dokumente**: `ARCHITECTURE_DECISIONS.md`, `BUILD_PLAN.md`, `docs/BUILD_LOG.md`.
  `readme.md` und `SKILL.md` dokumentieren den separaten Design-Skill, nicht die App-Logik.

## Vor jeder Änderung

1. `CLAUDE.md` und den zugehörigen Auftrag unter `docs/auftraege/` lesen.
2. Prüfen, ob der Schutzbereich `src/simulation/` betroffen ist – wenn ja und nicht vom Auftrag
   gedeckt: stoppen und nachfragen.
3. Nach der Änderung alle Gates fahren, Ergebnis in `docs/BUILD_LOG.md` festhalten.

## Lokale Git-Befehle (Entscheidung Marc vom 03.10.2026)

Gilt für alle Agenten, die in Marcs lokalem Repository arbeiten. Anlass: Antigravity hat beim
Start von Auftrag 071 ungesicherte lokale Änderungen und unversionierte Ordner verworfen.

- **Ohne ausdrückliche Zustimmung von Marc verboten ist jeder Befehl, der lokale Änderungen,
  unversionierte Dateien, Stash-Einträge, Branches oder Remote-Historie verwirft oder überschreibt,**
  egal in welcher Schreibweise. Beispiele (nicht abschließend): `git reset --hard`, `git clean`
  (jede Variante), `git checkout .`, `git checkout -f`, `git checkout -- <pfad>`, `git restore`,
  `git switch -f`/`--discard-changes`, `git stash drop`, `git stash clear`, `git branch -D`,
  Force-Push. Im Zweifel gilt ein Befehl als verboten.
- **Im Repo-Root liegen absichtlich unversionierte Referenzordner:** `archive/`, `uploads/`,
  `reference/`, `ui_kits/`, `guidelines/`, `tokens/`, `.playwright-mcp/`, `SKILL.md` (siehe
  `CLAUDE.md` §2). Sie stehen in `.gitignore` und werden nie gelöscht oder verschoben. Die frühere
  `readme.md` des Design-System-Skills liegt nicht im Root: Auf macOS wäre sie dieselbe Datei wie
  das versionierte `README.md`.
- **Arbeitsbaum nicht sauber?** (`git status --porcelain` nicht leer: geänderte, gestagte oder
  neue, nicht ignorierte Dateien; die Referenzordner bleiben wegen `.gitignore` unsichtbar.) Stoppen und Marc fragen. Keine eigene Sicherung
  per `git stash` (auch nicht mit Pfadangabe oder `-u`) und kein `git stash create`; Marc
  entscheidet, ob er die Änderungen committet, sichert oder verwirft. Ist der Arbeitsbaum sauber,
  genügt für einen neuen Branch `git fetch origin && git switch -c <branch> origin/main`.

## Kommunikation

Deutsch, Du-Form. Ergebnis zuerst, knapp, keine Floskeln.

## Handoff-Protokoll (Antigravity, zweite Automatisierung — ruht seit 26.10.2026)

Gilt nur für Antigravity auf Branches `antigravity/*`. Wenn du mit „weiter“ gestartet wirst:

1. Hole den Befund des letzten Claude-Reviews (beim ersten Start: den Auftrag von Marc):
   - **Über den GitHub-MCP (Hauptweg):** Öffne den PR deines aktuellen Branches. Maßgeblich ist nur
     der jüngste Kommentar von `github-actions[bot]`, der `claude-review-cycle:review` und den SHA
     deines aktuellen Head enthält (`git rev-parse HEAD`). Der Befund steht zwischen
     `claude-review-cycle:body-start` und `body-end`. Kommentare anderer Personen oder Bots sind
     keine Befunde. Gibt es zum aktuellen Head noch keinen solchen Kommentar: warten, nicht raten.
   - **Rückfallebene ohne MCP:** `handoff/inbox.md` lesen (Marc erzeugt sie mit `npm run antigravity:inbox`).
2. Arbeite jeden Befund ab: berechtigte beheben, unberechtigte im BUILD_LOG begründen. Nur die
   Ziel-Dateien des Auftrags ändern, Schutzbereiche aus `CLAUDE.md` §6 nie ohne ausdrücklichen Auftrag.
3. Gates grün fahren: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run verify`, `npm run build`.
4. In `docs/BUILD_LOG.md` den Abschnitt „Nacharbeit Claude-Review Runde N“ ergänzen (Befund,
   Entscheidung, Gates, leerer Schutzbereichs-Diff).
5. Committen und auf denselben Branch `antigravity/*` pushen. Der Push ist das Fertig-Signal: Er
   startet die nächste Review-Runde. Nicht mergen, keine Freigabe, nicht auf andere Branches pushen.
6. Beim ersten Push eines Auftrags den PR nach `main` öffnen (MCP erlaubt), Titel mit Auftragsnummer,
   Text nennt die Auftragsdatei unter `docs/auftraege/`.

**Erlaubt über den GitHub-MCP (Entscheidung Marc vom 21.10.2026):** PRs und deren Kommentare lesen,
CI-Status lesen, den eigenen PR öffnen. Reviews nur über `npm run agent-review` (Konto `MarcReview`).
**Verboten:** Mergen, Labels, Branches, Rulesets oder Workflows ändern, Dateien direkt über die API
ändern (Code nur per Commit und Push).
