# Auftrag 145 – Dashboard-Editor: UX-Konzept und Fachverträge (P02)

**Ziel:** Verbindliche Spezifikation der Benutzeroberfläche, Bedienabläufe, Rechtematrix, Revisions- und Schwellenwertverträge für den neuen Dashboard-Editor erstellen, sodass das Datenmodell und die Rasterengine in P03 ohne ungeklärte Fragen implementiert werden können.

**Masterplan:** [Dashboard-Editor-Masterplan, Revision 2](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), insbesondere P02 sowie Abschnitte 1, 3, 4, 5.1 und 5.3.

**Baseline:** `main`, Commit `779052bddd64f21ecf00b8711b1fcb7061a0fda7` (nach Merge von PR #168).

**Builder:** Antigravity. **Prüfer:** Codex (chatgpt-codex-connector auf GitHub) gemäß `CLAUDE.md` §4.1. **Merge und Release:** Marc.

**Status:** VOLLSTÄNDIG UMGESETZT UND DURCH CODEX ABGENOMMEN — BEREIT FÜR MERGE DURCH MARC (PR #169).

---

## 1. Ergebnis dieses Auftrags

Dieser Auftrag legt die konzeptionellen und vertraglichen Grundlagen für den Dashboard-Editor fest (P02 aus dem Masterplan). Er verändert keinen Produktcode in `src/`.

Am Ende liegen vor:

- Ein umfassendes Spezifikationsdokument (`docs/dashboard/EDITOR_UX_FACHVERTRAEGE_145.md`), das die Anforderungen aus P02 und die Befunde aus P01 (Auftrag 144) vollständig integriert:
  1. **UX-Architektur Haupt-Editor:** 4-Zonen-Shell (Top-Bar, Widget-Bibliothek, 12-Spalten-Canvas, Inspector, Statusleiste), Interaktionsflüsse, Kachelauswahl, Drag & Drop, Auto-Reflow und Undo/Redo.
  2. **Panel-Editor:** Fokusansicht für Einzel-Kachel-Bearbeitung mit visueller Vorschau, geführtem Baukasten und deklarativem Abfragemodus.
  3. **Responsive & A11y:** Layouts für 1440 px, 768 px und 375 px, Tastatur-Navigationskonzept, Fokuswiederherstellung und Screenreader-Ansagen.
  4. **Rechte- und Eigentumsmodell:** Trennung persönlicher vs. Team-Dashboards, Freigabegruppen ohne Auswirkung auf Mandantentrennung, Rollenmatrix (`admin`, `manager`, `viewer`).
  5. **Revisions- & Konfliktmodell:** Optimistisches Locking (`expected_revision`), Behandlung von Mehrbenutzer-Konflikten, Entwurfs- und Wiederherstellungsregeln.
  6. **Alarm- & Schwellenwert-Modell:** Schwellenwert-Definition auf Kachelebene, visuelle Alarmzustände (In-App) und Entkopplung für die spätere Serverauswertung.
  7. **Vorgaben für P03:** Exakte TypeScript-Schnittstellen und Anforderungen an das V2-Tabellenmodell und die Migration.
- Ein vollständiger Builder-Eintrag im `docs/BUILD_LOG.md`.
- Aktualisierung des Status in `BUILD_PLAN.md`.

---

## 2. Verbindliche Grenzen

1. `CLAUDE.md` strikt beachten. Schutzbereiche (`src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`) bleiben unangetastet (Diff = 0 Bytes).
2. Ausschließlich LeadPilot-/CRM-Kennzahlen gemäß Fähigkeitsmatrix aus Auftrag 144 (`docs/dashboard/KPI_FAEHIGKEITEN_144.md`). Keine externen Datenquellen, keine freien SQL-Konsolen.
3. Teams sind reine Freigabe- und Zugriffsgruppen innerhalb einer Organisation, keine Datenbereiche für Deals oder Kontakte.
4. Kein Produktcode, keine Datenbankmigrationen, keine neuen NPM-Pakete in diesem Schritt. Reine Spezifikation und Dokumentation als Baugrundlage.

---

## 3. Ziel-Dateien

| Pfad                                                                          | Erlaubte Änderung / Zweck                                            |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_145_DASHBOARD_EDITOR_UX_FACHVERTRAEGE.md` | Dieser Auftrag                                                       |
| `docs/dashboard/EDITOR_UX_FACHVERTRAEGE_145.md`                               | Neu: Vollständiges UX- und Fachvertrags-Spezifikationsdokument (P02) |
| `docs/BUILD_LOG.md`                                                           | Builder-Eintrag für Auftrag 145 und Prüfnachweis                     |
| `BUILD_PLAN.md`                                                               | Statusaktualisierung auf Auftrag 145                                 |

---

## 4. Aufgaben in Reihenfolge

### T1 – UX-Architektur für Haupt- und Panel-Editor spezifizieren

- [x] 4-Zonen-Shell mit Maßen, Breakpoints, Zuständen und Interaktionsregeln definieren.
- [x] Top-Bar, Widget-Bibliothek, Canvas, Inspector und Statusleiste im Detail ausarbeiten.
- [x] Panel-Editor mit visuellem Baukasten (Kennzahl → Aggregation → Filter → Gruppe → Zeitraum → Darstellung) und deklarativem Modus festlegen.
- [x] Undo/Redo-Verhalten mit Debouncing für Textfelder und Transaktionsgrenzen spezifizieren.

### T2 – Responsive-, Touch- und Barrierefreiheitskonzept festlegen

- [x] Verhalten bei 1440 px, 768 px und 375 px (Single-Column, alternative Aktionen statt horizontalem Drag) ausarbeiten.
- [x] Vollständige Tastaturbedienung für das Raster und Konfiguratoren definieren.
- [x] A11y-Kriterien: Rollen, Fokusfallen-Vermeidung, Live-Regions und Motion-Präferenzen festschreiben.

### T3 – Rechte-, Freigabe- und Revisionsmodell ausarbeiten

- [x] Mandanten- und Organisationstrennung absichern.
- [x] Teams als Freigabegruppen modellieren (kein Owner-Bezug an CRM-Entitäten).
- [x] Rollenrechte (`admin`, `manager`, `viewer`) für persönliche und Team-Dashboards tabellarisch matrixieren.
- [x] Revisions- und Konfliktbehandlung bei paralleler Bearbeitung (`expected_revision`) formalisieren.

### T4 – Schwellenwert- und In-App-Alarmkonzept spezifizieren

- [x] Kachelspezifische Schwellenwerte (Warnung, Kritisch) und visuelle Indikatoren definieren.
- [x] Entkopplung von lokaler UI-Auswertung und späterem Server-Scheduler (P13) dokumentieren.

### T5 – Baugrundlage für P03 (Schema & Engine) vorbereiten

- [x] V2-Datenstrukturen (TypeScript-Interfaces für DashboardConfigV2, GridTile, ThresholdRule, etc.) exakt beschreiben.
- [x] Anforderungen an das relationale Supabase-Schema für P03/P07 definieren.

### T6 – Verifizieren und PR öffnen

- [x] Pflichtprüfungen (`tsc`, `lint`, `prettier`) ausführen.
- [x] Schutzbereichs-Diff prüfen (strikt 0 Bytes gegen `779052b`).
- [x] PR auf GitHub öffnen, Codex-Review einholen und Nacharbeiten durchführen (PR #169, 0 Befunde, CI grün).
