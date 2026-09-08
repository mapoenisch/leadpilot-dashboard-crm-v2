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
- **Ablauf** (seriell, kein paralleles Arbeiten): Antigravity baut → übergibt an Codex
  oder Claude Code → der prüft nur (Review + Gates), baut nichts, gibt den Befund zurück
  an Antigravity → Antigravity baut nach. Wiederholung bis alle Gates bestanden sind.
- **Ledger**: Ergebnisse in `docs/BUILD_LOG.md`. Antigravity ist der schreibende Builder;
  Prüfer tragen ihren Befund ein und geben ihn zurück.
- **Maßgebliche Dokumente**: `ARCHITECTURE_DECISIONS.md`, `BUILD_PLAN.md`, `docs/BUILD_LOG.md`.
  `readme.md` und `SKILL.md` dokumentieren den separaten Design-Skill, nicht die App-Logik.

## Vor jeder Änderung

1. `CLAUDE.md` und den zugehörigen Auftrag unter `docs/auftraege/` lesen.
2. Prüfen, ob der Schutzbereich `src/simulation/` betroffen ist – wenn ja und nicht vom Auftrag
   gedeckt: stoppen und nachfragen.
3. Nach der Änderung alle Gates fahren, Ergebnis in `docs/BUILD_LOG.md` festhalten.

## Kommunikation

Deutsch, Du-Form. Ergebnis zuerst, knapp, keine Floskeln.
