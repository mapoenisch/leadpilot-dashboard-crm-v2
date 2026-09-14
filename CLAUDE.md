# CLAUDE.md — LeadPilot Dashboard-CRM

> Referenziert von `AGENTS.md` ("`CLAUDE.md` im Repo-Root ist die verbindliche Regelquelle") — diese Datei ist damit die Langfassung, `AGENTS.md` die Kurzfassung für alle Agenten. **Bei Abweichungen gilt diese Datei.**
> Basiert auf Repo-Stand `github.com/mapoenisch/leadpilot-dashboard-crm` (Commit `3cc981e`, v1.2.0).

## 1. Projekt

Echtzeit-Dashboard für das fiktive Unternehmen LeadPilot. React 18 + TypeScript + Vite, Supabase. Reifer Stand — Verbesserung/Erweiterung, kein Neubau.

## 2. Projektordner

- Arbeitsverzeichnis: Repo-Root (enthält `package.json`, `src/`, `docs/`).
- Aktiver Code: `src/`, `supabase/schema.sql`, `tools/n8n/`, `scripts/`.
- Nur zur Referenz, nicht bearbeiten: `archive/`, `docs/archiv/`, `docs/screenshots/` (nur `README.md`-Nachweis-Matrizen committen, Bilddateien per `.gitignore` ausgeschlossen), `uploads/`, `reference/`, `ui_kits/`, `guidelines/`, `assets/`, `tokens/`. Diese gehören zum separaten Design-System-Skill (Branding/UI-Kits, dokumentiert in `readme.md`/`SKILL.md` im Root) — **nicht** zur App-Logik. `readme.md`/`SKILL.md` sind trotz "Root"-Lage keine App-Dokumentation.
- Nie einlesen oder committen: `node_modules/`, `dist/`, `.env`, `.DS_Store`, `.codex/`.

## 3. Maßgebliche Dokumente (Reihenfolge beim Einstieg)

1. `ARCHITECTURE_DECISIONS.md` — Entscheidungs-Historie (Teil A), Ziel-Architektur (Teil B), Implementierungsstand/Audit (Teil C).
2. `BUILD_PLAN.md` — aktueller Phasenplan, welcher Auftrag als Nächstes ansteht, welche Gates erfüllt sind.
3. `docs/BUILD_LOG.md` — chronologisches Protokoll jedes abgeschlossenen Gates.
4. `docs/auftraege/ANTIGRAVITY_AUFTRAG_XXX_*.md` — die konkrete Arbeitsanweisung. Immer nur den zuletzt übergebenen Auftrag bearbeiten, nie mehrere gleichzeitig, nie einen selbst ausgedachten.

## 4. Rollen & Ablauf (aus `AGENTS.md`)

Seriell, kein paralleles Arbeiten:

1. **Antigravity baut** — implementiert den Auftrag, ist der schreibende Builder.
2. **Codex oder Claude Code prüft** — nur Review + Gates, baut nichts selbst. Trägt den Befund in `docs/BUILD_LOG.md` ein und gibt ihn an Antigravity zurück.
3. **Antigravity baut nach** — behebt die im Befund genannten Punkte.
4. Wiederholung bis alle Gates bestanden sind.

`docs/BUILD_LOG.md` ist das gemeinsame Ledger: Antigravity schreibt Builder-Einträge, Prüfer schreiben ihren Befund.

## 5. Wie ein Auftrag abgearbeitet wird

1. `ANTIGRAVITY_AUFTRAG_XXX_*.md` vollständig lesen, inklusive "Globale Grenzen" und Ziel-Dateien-Tabelle.
2. Tasks in vorgegebener Reihenfolge abarbeiten (`- [ ]`-Checkboxen abhaken).
3. Ausschließlich die im Auftrag genannten Ziel-Dateien ändern. Bei Bedarf außerhalb dieser Liste: stoppen, Konflikt dokumentieren statt eigenmächtig zu erweitern.
4. Nach Abschluss: Verifikation fahren (Abschnitt 7), Gate-Abschlussbericht als neuen Abschnitt ans Ende von `docs/BUILD_LOG.md` (Ziel & Kontext, geänderte Dateien, funktionale Prüfungen, Schutzbereichs-Prüfung, automatisierte Verifikation, Screenshot-Matrix, Ergebnis & Freigabestatus).
5. Ein Auftrag ist erst fertig, wenn Verifikation grün ist und der BUILD_LOG-Eintrag steht — nicht schon nach dem letzten Commit.

## 6. Schutzbereiche — niemals ohne dafür geschriebenen Auftrag ändern

`AGENTS.md` nennt zusammenfassend `src/simulation/`. Vollständig, wie in den Aufträgen 022–026 tatsächlich per Diff geprüft:

- `src/simulation/**` — Simulations-Engine (State-Machine, Event-Rules, KPI-Registry, Monte-Carlo, Financial-Model-Manager, Web-Worker).
- `src/types/**`, `src/context/**`, `src/services/data/**` — Datenmodell, Kontext, DataSource-Abstraktion.
- `src/features/resources/**` — Internal Resources (bewusst eingefroren).
- RNG/Seed-Verhalten, Run-/Versionsmodell, Persistenzlogik, `crmRepository.ts`-Schreibpfade.

Vor jedem Commit: `git diff <baseline-commit> -- src/simulation src/types src/context src/services/data src/features/resources` muss leer sein, außer der aktuelle Auftrag nennt einen dieser Pfade explizit als Ziel. Der leere Diff gehört in den BUILD_LOG-Eintrag.

## 7. Pflicht-Verifikation vor "fertig"

```
npx tsc --noEmit    # 0 Fehler
npm run verify       # = npm test — alle Integrity-Suiten in scripts/verifyIntegrity.ts müssen grün sein
npm run build         # Produktions-Build muss durchlaufen
```

Bei UI-Änderungen zusätzlich: Screenshot-Harness nach Vorbild von `scripts/captureAuftragXXXGateScreenshots.mjs`, Vorher/Nachher-Paare auf 1440/768/375px, SHA-256-Hashes müssen sich unterscheiden, 0px horizontaler Overflow. **Screenshot-Ablage-Policy (ab Auftrag 066 / Kennzahl #21):** Screenshots werden weiterhin lokal erzeugt und geprüft (SHA-256-Vergleich, Overflow-Check), aber ausschließlich die textuelle Ergebnis-Matrix (`docs/screenshots/auftrag-XXX/README.md`) wird committet — Bilddateien (`*.png`, `*.jpg`, etc.) sind per `.gitignore` ausgeschlossen und verbleiben nicht im Git-Verlauf.

## 8. Arbeitsweise

- Kein Big-Bang: kleine, nachvollziehbare Schritte je Auftrag.
- Keine neuen Abhängigkeiten (npm-Pakete, UI-/Chart-/CSS-/Test-Bibliotheken) ohne ausdrückliche Freigabe im Auftrag.
- Bestehende Design-Tokens, Komponenten, Chart-Primitives wiederverwenden statt neu erfinden.
- Bei Unklarheiten oder Zielkonflikten: stoppen und Rückfrage dokumentieren statt zu raten.

## 9. Harte Verbote

- Keine Secrets/Keys committen; `.env`, Supabase-Keys, HubSpot-Zugangsdaten bleiben außerhalb des Repos (`.env.example` ist die einzige erlaubte Vorlage).
- Kein Force-Push, kein Überschreiben von `main`-Historie.
- Kein Löschen/Umschreiben von `ARCHITECTURE_DECISIONS.md`-Historie (Teil A) — nur ergänzen/als Revision markieren.
- Keine Erfindung "belegter" Architekturentscheidungen für dokumentierte Quellenlücken (siehe `ARCHITECTURE_DECISIONS.md` Regel 4).
- Kein Merge/Release-Tag ohne dass alle Gates des aktuellen Auftrags grün sind und im BUILD_LOG dokumentiert sind.

## 10. Kommunikation

Deutsch, Du-Form. Ergebnis zuerst, knapp, keine Floskeln.
