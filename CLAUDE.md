# CLAUDE.md — LeadPilot Dashboard-CRM

> Referenziert von `AGENTS.md` ("`CLAUDE.md` im Repo-Root ist die verbindliche Regelquelle") — diese Datei ist damit die Langfassung, `AGENTS.md` die Kurzfassung für alle Agenten. **Bei Abweichungen gilt diese Datei.**
> Repo: `github.com/mapoenisch/leadpilot-dashboard-crm-v2`. Abschnitt 4 zuletzt neu gefasst am 26.10.2026 (Stand `v2.4.0`).

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
4. `docs/auftraege/ANTIGRAVITY_AUFTRAG_XXX_*.md` — die konkrete Arbeitsanweisung. Immer nur einen Auftrag gleichzeitig bearbeiten. Claude Code schreibt fehlende Detailaufträge selbst (siehe Abschnitt 4); der Dateiname behält das Präfix `ANTIGRAVITY_AUFTRAG_` für die Kontinuität.

## 4. Rollen & Ablauf

### 4.1 Gültiger Ablauf ab 26.10.2026 (Entscheidung Marc)

Dieser Abschnitt ersetzt alle früheren Rollen- und Prüfregeln (Historie in 4.3). Bei Widerspruch gilt 4.1.

1. **Claude Code baut.** Er schreibt bei Bedarf den Detailauftrag (`docs/auftraege/ANTIGRAVITY_AUFTRAG_XXX_*.md`), setzt ihn um, fährt die Pflicht-Verifikation (Abschnitt 7), schreibt den Builder-Eintrag in `docs/BUILD_LOG.md` und öffnet den PR. Ein Auftrag je PR, Aufträge nacheinander.
2. **Codex prüft.** Die Codex-App auf GitHub reviewt jeden PR beim Öffnen; nach Nacharbeit erneut per Kommentar `@codex review`. Codex baut nichts.
3. **Claude Code arbeitet nach.** Jeder Codex-Befund wird behoben oder im PR begründet abgelehnt, danach neues `@codex review`.
4. **Gate-Freigabe** liegt vor, wenn alle drei Punkte erfüllt sind:
   - Codex meldet für den aktuellen Head keine offenen Befunde (👍 bzw. Review-Zusammenfassung ohne Befunde),
   - alle Pflicht-Checks sind grün (`lint`, `typecheck`, `test`, `build`, `livekpi-verifiers`, `size-limit`, `e2e`; Ruleset `Main-protection`),
   - alle Review-Konversationen sind gelöst (Ruleset).
5. **Prüfnachweis im BUILD_LOG:** Da Codex auf GitHub nicht in den BUILD_LOG schreibt, trägt Claude Code das Codex-Ergebnis nach dem Review als Nachtrag zum Builder-Eintrag ein (geprüfter Commit, Ergebnis, ggf. behobene Befunde) und pusht ihn als reinen Doku-Commit in denselben PR. Das ist Protokoll, keine Freigabe: Die Freigabe kommt allein von Codex. Ein Doku-Commit ohne Codeänderung braucht kein neues Review.
6. **Merge und Release macht Marc.**

**Ausweichweg, wenn Codex nicht verfügbar ist (Nutzungslimit):** Marc fordert ein Review über `/<agent> review` an (Antigravity, OpenCode, Devin, Proto oder Perplexity; Workflow `agent-review.yml`, Prüferkonto `MarcReview`). Dieses Review ersetzt dann Punkt 2–4 für diesen PR; im BUILD_LOG wird vermerkt, welcher Agent geprüft hat. Sonst gilt der Ablauf unverändert.

**Grundsatz:** Ein Builder prüft nie seine eigene Arbeit. Lokale Vorprüfungen von Claude Code (z. B. Plugin `codex-review`) sind erlaubt und gehören in den Builder-Eintrag, ersetzen aber nicht das Codex-Review auf GitHub.

### 4.2 Workflows (Stand 26.10.2026)

- Aktiv: `ci.yml` (Pflicht-Checks), `update-visual-baselines.yml` (Branches `visual-baselines/**`), `agent-review.yml` (Ausweichweg), CodeQL.
- Abgeschaltet und nicht Teil des Ablaufs: `claude-review.yml`, `claude.yml`, `codex-review-request.yml`, `codex-rework.yml`, `codex-status.yml`. Der Antigravity-Zyklus (Branches `antigravity/*`, `handoff/inbox.md`) ruht.

### 4.3 Historie (nicht mehr maßgeblich, nur zur Nachvollziehbarkeit)

Die folgenden Entscheidungen galten bis 25.10.2026 und sind durch 4.1 abgelöst. Fortgeltend daraus ist nur: Schutzbereiche und Pflichtgates; für Bildseitenwellen das Vorgehen der Aufträge 093–099 (Ergänzung 19.10.2026).

> **Abschnittsspezifische Entscheidung Marc vom 01.10.2026:** Für den Umbau des Executive Dashboards einschließlich der vorgelagerten Testkachel baut Claude Code und schreibt Detailaufträge; Codex prüft unabhängig. Unabhängige Agentenarbeit darf parallel erfolgen, mit koordinierter Integration. Vor dem eigentlichen Umbau muss Marc das Design der Testkachel ausdrücklich freigeben. Der möglichst automatisierte CI-/Review-/Nacharbeitsablauf und Lazy Loading sind im festgelegten Plan `docs/superpowers/plans/2026-10-01-executive-dashboard-plan.md` beschrieben. Diese Entscheidung ersetzt für diesen Abschnitt abweichende Builder- und Serialitätsregeln; Schutzbereiche und Pflichtgates bleiben erhalten.
>
> **Zweite Automatisierung (Ausweichbetrieb), Entscheidung Marc vom 03.10.2026:** Ist das Nutzungslimit von Codex erreicht, ersetzt ein zweiter Zyklus den Zyklus „Claude Code baut, Codex prüft“: Auf Branches `antigravity/*` baut **Antigravity**, **Claude prüft** automatisch jeden neuen Head (`.github/workflows/claude-review.yml`, Befund als PR-Kommentar und Commit-Status `claude-review`), Antigravity arbeitet nach (Rückkanal lokal: `npm run antigravity:inbox` → `handoff/inbox.md`). Marc schaltet um, indem der nächste Auftrag auf einem Branch `antigravity/*` gebaut wird; ist Codex wieder verfügbar, geht es mit Zyklus 1 weiter. Claude baut in diesem Zyklus nichts und prüft nie eigene Arbeit (also keine Claude-gebauten PRs per Label `claude-review`), Codex startet dort keine Nacharbeit; Freigabe und Merge bleiben bei Marc. Schutzbereiche und Pflichtgates gelten unverändert. Details: `docs/dashboard/REVIEW_WORKFLOW_ANTIGRAVITY.md`.
>
> **Aufteilung der Prüfwege, Entscheidung Marc vom 03.10.2026:** Die automatische Nacharbeit auf GitHub (`codex-review-request.yml`, `codex-status.yml`, `codex-rework.yml`, `claude.yml`) ist pausiert. Codex prüft weiter über die Codex-App auf GitHub; Befunde arbeitet der Builder selbst ab. Baut Claude Code lokal bei Marc, kann vorab das Plugin `codex-review` (`/codex-review:code`, `/codex-review:plan`) laufen; dessen Ergebnis gehört als Prüfnachweis in den BUILD_LOG. Die Gate-Freigabe kommt von einem unabhängigen Prüfer, nie vom Builder; **seit 19.10.2026 muss das nicht Codex sein** — auch ein Review von Antigravity, OpenCode, Devin, Proto oder Perplexity genügt (seit 21.10.2026 manuell per `/<agent> review` über das Konto `MarcReview`, `agent-review.yml`; jeder Befund eine lösbare Konversation, Merge erst wenn alle gelöst sind). `ci.yml`, `update-visual-baselines.yml` und `claude-review.yml` (Zyklus 2) bleiben aktiv. Details: `docs/dashboard/REVIEW_WORKFLOW.md`, Abschnitt „Aufteilung ab 03.10.2026“.
>
> **Frontend-Qualität, Entscheidung Marc vom 06.10.2026:** Für den Plan `docs/superpowers/plans/2026-10-06-frontend-qualitaet-plan.md` (Arbeitspakete 0, A–I) baut Claude Code und schreibt die Detailaufträge; Codex prüft unabhängig, Merge durch Marc. Die Pakete laufen seriell; Designmuster (Paket D) und Bildseitenwellen (Paket G) brauchen jeweils Marcs Sichtfreigabe. Schutzbereiche und Pflichtgates bleiben erhalten. **Ergänzung Marc vom 19.10.2026:** Für die weiteren Bildseitenwellen (Paket G2 ab Auftrag 100) entfällt die Sichtfreigabe; Umsetzung exakt nach dem Vorgehen der Aufträge 093–099 (Original-WebP als Vorlage, Faktenblatt-Abgleich, Bildvergleich, begründete Abweichungen). Das Codex-Gate bleibt.
>
> **Rollenwechsel ab 24.09.2026 bis zum Release `v2.3.0` (Entscheidung Marc Poenisch):**
>
> 1. **Claude Code baut** — schreibt bei Bedarf den Detailauftrag, implementiert ihn und ist der schreibende Builder. Ziel: offene Fehler und Qualitätsschulden raus aus dem Code, Masterplan 067Q–067S abschließen.
> 2. **Codex prüft** — unabhängiger Review + Gates, baut nichts selbst. Trägt den Befund in `docs/BUILD_LOG.md` ein und gibt ihn an Claude Code zurück.
> 3. **Claude Code baut nach** — behebt die im Befund genannten Punkte.
> 4. Wiederholung bis alle Gates bestanden sind. Seriell, kein paralleles Arbeiten.
>
> Antigravity baut in dieser Phase nicht. Nach dem Release `v2.3.0` gilt wieder die vorherige Verteilung (Antigravity baut, Codex/Claude Code prüfen), sofern Marc nichts anderes festlegt. Ein Builder prüft nie seine eigene Arbeit: die Gate-Freigabe kommt immer von einem unabhängigen Prüfer (Codex, Antigravity, OpenCode, Devin, Proto oder Perplexity), nie vom Builder.
>
> `docs/BUILD_LOG.md` ist das gemeinsame Ledger: der Builder schreibt Builder-Einträge, der Prüfer seinen Befund.

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
