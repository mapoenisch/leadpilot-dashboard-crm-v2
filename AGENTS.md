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
- **Ablauf bis Release `v2.3.0`** (seriell, kein paralleles Arbeiten): **Claude Code baut**
  (schreibt fehlende Detailaufträge selbst) → übergibt an **Codex** → der prüft nur
  (Review + Gates), baut nichts, gibt den Befund zurück an Claude Code → Claude Code baut
  nach. Wiederholung bis alle Gates bestanden sind. Antigravity baut in dieser Phase nicht.
- **Zweite Automatisierung (ab 03.10.2026, Entscheidung Marc):** Auf Branches `antigravity/*`
  baut **Antigravity**, **Claude prüft** automatisch jeden Push (`claude-review.yml`), Antigravity
  arbeitet nach. Gilt für Aufträge, die Marc Antigravity ausdrücklich zuweist. Details:
  `docs/dashboard/REVIEW_WORKFLOW_ANTIGRAVITY.md`, Abschnitt „Handoff-Protokoll“ unten.
- **Ledger**: Ergebnisse in `docs/BUILD_LOG.md`. Claude Code ist der schreibende Builder;
  Codex trägt seinen Befund ein und gibt ihn zurück.
- **Maßgebliche Dokumente**: `ARCHITECTURE_DECISIONS.md`, `BUILD_PLAN.md`, `docs/BUILD_LOG.md`.
  `readme.md` und `SKILL.md` dokumentieren den separaten Design-Skill, nicht die App-Logik.

## Vor jeder Änderung

1. `CLAUDE.md` und den zugehörigen Auftrag unter `docs/auftraege/` lesen.
2. Prüfen, ob der Schutzbereich `src/simulation/` betroffen ist – wenn ja und nicht vom Auftrag
   gedeckt: stoppen und nachfragen.
3. Nach der Änderung alle Gates fahren, Ergebnis in `docs/BUILD_LOG.md` festhalten.

## Kommunikation

Deutsch, Du-Form. Ergebnis zuerst, knapp, keine Floskeln.

## Handoff-Protokoll (Antigravity, zweite Automatisierung)

Gilt nur für Antigravity auf Branches `antigravity/*`. Wenn du mit „weiter“ gestartet wirst:

1. Lies `handoff/inbox.md`. Dort steht der Befund des letzten Claude-Reviews oder, beim ersten
   Start, der Auftrag. Fehlt die Datei: Marc soll `npm run antigravity:inbox` ausführen.
2. Arbeite jeden Befund ab: berechtigte beheben, unberechtigte im BUILD_LOG begründen. Nur die
   Ziel-Dateien des Auftrags ändern, Schutzbereiche aus `CLAUDE.md` §6 nie ohne ausdrücklichen Auftrag.
3. Gates grün fahren: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run verify`, `npm run build`.
4. In `docs/BUILD_LOG.md` den Abschnitt „Nacharbeit Claude-Review Runde N“ ergänzen (Befund,
   Entscheidung, Gates, leerer Schutzbereichs-Diff).
5. Committen und auf denselben Branch `antigravity/*` pushen. Der Push ist das Fertig-Signal: Er
   startet die nächste Review-Runde. Nicht mergen, keine Freigabe, nicht auf andere Branches pushen.
