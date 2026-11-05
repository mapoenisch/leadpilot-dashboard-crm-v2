# LeadPilot – Paket 4: Executive Report Generator & Druck/PDF-Export

> **Kontext:** Teil 4 des Master-Plans `2026-11-05-crm-analytics-master-plan.md`.  
> **Auftrag:** `docs/auftraege/ANTIGRAVITY_AUFTRAG_132_DASHBOARD_REPORT_EXPORT.md`  
> **Branch:** `claude/auftrag-132-dashboard-report-export`  
> **Ziel-Route:** `/dashboard`

---

## 1. Motivation & Ausgangslage

Das neue, in Auftrag 128 reparierte und gehärtete Executive Dashboard existiert derzeit ausschließlich als interaktive Webansicht. Für Management-Meetings, Vorstandssitzungen und Investoren-Updates wird jedoch regelmäßig ein exportierbares, druckfertiges PDF-Dokument benötigt.

Standard-Browserscreenshots sind hierfür ungeeignet, da sie dunkle Hintergründe drucken (hoher Tintenverbrauch), interaktive Schaltflächen enthalten, Kacheln an Seitenumbrüchen abschneiden und keine formatierte Kopf- und Fußzeile besitzen.

---

## 2. Fachliche & Technische Spezifikation

### 2.1 Report-Konfigurationsdialog (`DashboardReportModal.tsx`)
- In der Dashboard-Toolbar wird ein neuer Button **„Bericht exportieren“** (Drucker-/PDF-Icon) integriert.
- Klick öffnet ein modales Konfigurationsfenster:
  - **Berichtstitel:** Standard: *„LeadPilot Executive Management Briefing“* (anpassbar)
  - **Berichtszeitraum:** Automatisch aus den aktuellen Dashboard-Filtern übernommen
  - **Kachelauswahl:** Liste der Kacheln mit Checkboxen (Standard: alle ausgewählt, einzelne Kacheln können abgewählt werden)
  - **Management-Kommentar:** Optionales Textfeld für strategische Einschätzungen oder Erläuterungen (erscheint auf dem Deckblatt)
  - **Format:** DIN A4 Hochformat (Standard) oder Querformat
  - **Aktion:** *„Drucken / Als PDF speichern“* (startet optimierten Druckdialog)

### 2.2 Spezielles Druck- und Export-Layout (`@media print`)
- **Tinte- und kontrastschonendes Print-Theme:**
  - Schaltet im Druckmodus automatisch auf weißen Hintergrund und tiefschwarzen/dunkelgrauen Text um (`color: #0f172a`, `background: #ffffff`).
  - Diagramme verwenden klare, kontraststarke Linien und Füllungen ohne schwere Verläufe.
- **Seitenumbruch-Optimierung (`page-break-inside: avoid`):**
  - Kacheln brechen niemals mitten im Diagramm um.
  - Zweispaltiges, harmonisches 6/6-Raster auf DIN A4.
- **Kopf- und Fußzeilen:**
  - Kopf: LeadPilot-Wortmarke, Mandantenname, Berichtsdatum.
  - Fuß: Vertraulichkeitshinweis (*„Streng vertraulich – nur für interne Zwecke“*), Revisions-ID und Seitennummerierung (*„Seite X von Y“*).

### 2.3 Deckblatt & Anhang
- **Deckblatt (Seite 1):**
  - Großer Titel, Datum, gewählter Filterzeitraum, Ersteller-Rolle.
  - Zusammenfassung der 4 wichtigsten Kernkennzahlen (z. B. ARR, MRR, Neukunden, Churn).
  - Der eingegebene Management-Kommentar.
- **Daten-Anhang (Appendix):**
  - Am Ende des Berichts wird für jedes Diagramm eine strukturierte, barrierefreie Wertetabelle ausgegeben, damit Zahlen auch ohne Diagramminteraktion schwarz auf weiß nachlesbar sind.

---

## 3. Ziel-Dateien

| Datei | Art | Verantwortung |
|---|---|---|
| `src/features/dashboard/components/export/DashboardReportModal.tsx` | Neu | Konfigurationsdialog für Reportinhalte und Notizen |
| `src/features/dashboard/components/export/DashboardPrintView.tsx` | Neu | Strukturiertes Druck-DOM (Deckblatt, Kacheln, Wertetabellen) |
| `src/features/dashboard/components/export/printReport.css` | Neu | `@media print` Stylesheets (A4, Umbrüche, weiße Hintergründe) |
| `src/features/dashboard/components/EditorToolbar.tsx` | Änderung | Einbindung des Export-Buttons in die Toolbar |
| `src/features/dashboard/components/DashboardWorkspace.tsx` | Änderung | Bereitstellung der Kacheldaten für den Export |
| `src/features/dashboard/__tests__/DashboardReport.ui.vitest.tsx` | Neu | Tests für Dialog, Kachelabwahl und Druckvorbereitung |
| `scripts/captureAuftrag132Gate.mjs` | Neu | Screenshot-Gate für das Druck-Layout |
| `docs/screenshots/auftrag-132/README.md` | Neu | Ergebnis-Matrix |
| `docs/BUILD_LOG.md` | Änderung | Nachweis aller Gates |

---

## 4. Definition of Done & Verifikation

- [ ] Export-Button öffnet zuverlässig den Report-Konfigurationsdialog.
- [ ] Kacheln lassen sich gezielt für den Ausdruck selektieren/deselektieren.
- [ ] Druckansicht druckt auf weißem Grund mit gestochen scharfem Text und sauberen Vektor-Charts.
- [ ] Seitenumbrüche schneiden keine Kacheln durch; Deckblatt und Tabellenanhang vorhanden.
- [ ] Alle Tests, `tsc`, `lint`, `verify` und `build` grün. Schutzbereiche unberührt.
