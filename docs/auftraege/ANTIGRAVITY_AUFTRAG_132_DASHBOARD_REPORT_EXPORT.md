# Auftrag 132 – Executive Report Generator & Druck/PDF-Export

**Builder:** Claude Code · **Prüfer:** Codex (GitHub App) · **Baseline:** `ce21c15` (`main` nach PR #141) · **Branch:** `claude/auftrag-132-dashboard-report-export`

## Anlass & Motivation

Im Rahmen der Plattform-Evolution (Paket 4 von 5 auf dem Weg zu v3.0.0, spezifiziert in `docs/superpowers/plans/2026-11-05-crm-analytics-master-plan.md` und `docs/superpowers/plans/2026-11-05-paket-4-dashboard-report-export-plan.md`) wird das Executive Dashboard um eine vorstandstaugliche Export- und Druckfunktion erweitert.

Das in Auftrag 128 reparierte und gehärtete Dashboard existiert aktuell rein als interaktive Webanwendung. Für Management-Meetings, Board-Präsentationen und Stakeholder-Updates wird jedoch ein standardisiertes, druckfertiges PDF-Dokument benötigt:
- Reines Browserscreenshotting führt zu unschönen Umbrüchen mitten in Kacheln, unleserlichen dunklen Hintergründen (Tintenverbrauch) und fehlendem Branding.
- Das Druck-Layout benötigt ein sauberes A4-Format, gestochen scharfen Schwarz-Weiß-/Graustufen-Kontrast, ein formales Deckblatt mit Kennzahlenzusammenfassung und Management-Kommentar sowie einen barrierefreien Tabellenanhang aller Diagrammwerte.

## Ziel

1. **Toolbar-Erweiterung (`EditorToolbar.tsx`):**
   - Neuer Button **„Bericht exportieren“** mit Drucker-/Export-Icon neben „Dashboard bearbeiten“.
   - Klick öffnet das Konfigurationsmodal `DashboardReportModal`.
   - Barrierefrei mit Tooltip und Tastaturbedienung.

2. **Report-Konfigurationsdialog (`DashboardReportModal.tsx`):**
   - Modales Konfigurationsfenster:
     - **Titel:** Vorbelegt mit *„LeadPilot Executive Management Briefing“* (editierbar).
     - **Zeitraum:** Automatische Übernahme aus den aktiven Dashboard-Filtern (z. B. „FY 2025“).
     - **Kachelauswahl:** Liste aller aktiven Kacheln mit Checkboxen (Standard: alle ausgewählt, einzelne Kacheln an-/abwählbar).
     - **Management-Kommentar:** Optionales Textfeld für Einschätzungen des Vorstands (erscheint auf dem Deckblatt).
     - **Format:** DIN A4 Hochformat (Standard) oder Querformat.
     - **Aktionen:** *„Abbrechen“* und *„Drucken / Als PDF speichern“* (triggert Druckansicht via `window.print()`).

3. **Strukturiertes Druck-DOM (`DashboardPrintView.tsx` & `printReport.css`):**
   - Im Normalzustand unsichtbar (`hidden` bzw. `display: none`), bei `@media print` oder in der Druckvorschau aktiv.
   - **Deckblatt (Seite 1):**
     - LeadPilot-Branding, Berichtstitel, Erstellungsdatum, Mandantenname.
     - Zeitraum und Pipeline-Filter.
     - 4 Kernmetriken als Executive-Summary-Cards (ARR, MRR, Neukunden, Churn).
     - Management-Kommentar (sofern eingegeben).
   - **Kachel-Raster (Seite 2+):**
     - Zweispaltiges harmonisches DIN-A4-Raster.
     - Umbruchschutz: `page-break-inside: avoid` verhindert abgeschnittene Kacheln.
     - Kontrastreiches Print-Styling (weißer Grund `#ffffff`, dunkler Text `#0f172a`, saubere Rahmen `#cbd5e1`).
   - **Wertetabellen-Anhang (Appendix):**
     - Strukturierte Tabelle für jedes Diagramm, damit Werte auch ohne Diagramm schwarz auf weiß lesbar sind.
   - **Kopf- und Fußzeilen:**
     - Vertraulichkeitshinweis (*„Streng vertraulich – nur für interne Zwecke“*), Dokument-ID, Erstellungszeitpunkt.

4. **DashboardWorkspace-Integration (`DashboardWorkspace.tsx`):**
   - State-Verwaltung für Modal und Print-Payload (ausgewählte Kacheln, Kommentar, Format).
   - Reicht Kacheln und Filter an das Modal und das Druck-DOM weiter.

5. **Schutzbereiche & Qualität:**
   - Schutzbereiche (`src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`) bleiben 100 % unberührt (Diff = 0).
   - Alle TS/TSX-Dateien strikt $\le 400$ Zeilen.
   - Alle Gates grün: TypeScript, ESLint, Prettier, Quality-Budget, Unit- und UI-Tests, Screenshot-Harness, Build.

## Ziel-Dateien

| Datei | Art | Verantwortung |
|---|---|---|
| `src/features/dashboard/components/export/DashboardReportModal.tsx` | Neu | Konfigurationsdialog für Reportinhalte, Kachelauswahl und Notizen |
| `src/features/dashboard/components/export/DashboardPrintView.tsx` | Neu | Strukturiertes Druck-DOM (Deckblatt, Kacheln, Wertetabellen-Anhang) |
| `src/features/dashboard/components/export/printReport.css` | Neu | `@media print` Stylesheets (A4, Umbrüche, weiße Hintergründe) |
| `src/features/dashboard/components/EditorToolbar.tsx` | Änderung | Einbindung des Export-Buttons in die Toolbar |
| `src/features/dashboard/components/DashboardWorkspace.tsx` | Änderung | Bereitstellung der Kacheldaten für den Export & Modal-Integration |
| `src/features/dashboard/__tests__/DashboardReport.ui.vitest.tsx` | Neu | Tests für Dialog, Kachelabwahl und Druckvorbereitung |
| `scripts/captureAuftrag132Gate.mjs` | Neu | Screenshot-Gate-Harness für das Druck-Layout |
| `docs/screenshots/auftrag-132/README.md` | Neu | Vorher/Nachher-Screenshot-Matrix |
| `docs/BUILD_LOG.md`, dieser Auftrag | Dokumentation | Nachweis aller Gates |
