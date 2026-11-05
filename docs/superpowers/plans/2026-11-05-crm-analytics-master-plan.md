# LeadPilot – Master-Plan: CRM-, Vertriebs- & Analytics-Evolution (Pakete 1–5)

> **Regelwerk & Rollen gemäß `CLAUDE.md`:**
> - **Builder:** Claude Code baut, schreibt die Detailaufträge und arbeitet Reviews ab.
> - **Prüfer:** Codex (GitHub App) prüft unabhängig je PR auf GitHub.
> - **Seriell:** Ein PR je Paket. Merge und Release verbleiben bei Marc.
> - **Schutzbereiche:** `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**` bleiben zu 100 % unberührt (Diff = 0).
> - **Pflichtgates:** Jeder Teilauftrag durchläuft `tsc`, `lint`, `verify`, `test`, `build` und Screenshot-Nachweis (1440/768/375 px, dark/light, 0 px Überlauf).

---

## 1. Übersicht & Zielsetzung

Mit dem Abschluss von Auftrag 128 ist der Dashboard-Editor stabilisiert, barrierefrei und mit direkter Größenwahl ausgestattet. Die nächste Entwicklungsphase baut das LeadPilot CRM und die Fachanalysen von statischen Anzeigen zu einem vollwertigen, operativen Management-System aus.

Die 5 Pakete bauen logisch aufeinander auf:

```
Paket 1: CRM Deals Kanban       (Operatives Pipeline-Management, Drag & Drop)
   ↓
Paket 2: CRM Lead Scoring       (Qualifizierung, ICP-Fit & 1-Klick-Konvertierung)
   ↓
Paket 3: Live-Funnel Analytics  (Vergleich Plan 2025 vs. Live-CRM, Bottlenecks)
   ↓
Paket 4: Dashboard PDF/Report   (Vorstandstaugliches Reporting & Druckansichten)
   ↓
Paket 5: What-If Hebelrechner   (Interaktive Sensitivitätsanalyse ARR/Churn/Cycle)
```

---

## 2. Die 5 Pakete im Überblick

### Paket 1: CRM Deals – Interaktive Kanban-Pipeline (`/crm/deals`)
- **Detailplan:** `docs/superpowers/plans/2026-11-05-paket-1-crm-deals-kanban-plan.md`
- **Auftrag:** `docs/auftraege/ANTIGRAVITY_AUFTRAG_129_CRM_DEALS_KANBAN.md`
- **Ziel:** Umschalter zwischen der bisherigen Tabelle und einem interaktiven Kanban-Board.
- **Kern:** Spalten für alle 7 Vertriebsstufen mit Summen in €, Deal-Karten mit Priorität/Betrag, Drag & Drop zwischen Phasen mit Tastatur-Fallback, URL-Synchronisation (`?ansicht=kanban`).

### Paket 2: CRM Leads – Lead-Scoring & Qualifizierungs-Cockpit (`/crm/leads`)
- **Detailplan:** `docs/superpowers/plans/2026-11-05-paket-2-crm-lead-scoring-plan.md`
- **Auftrag:** `docs/auftraege/ANTIGRAVITY_AUFTRAG_130_CRM_LEAD_SCORING.md`
- **Ziel:** Intelligente Qualifizierung von Leads anhand der Kundensegmente und des ICP.
- **Kern:** ICP-Fit-Score (0–100 %) basierend auf Unternehmensgröße, Branche und Region; Einstufung in Hot/Warm/Cold; 1-Klick-Aktion *„In Deal umwandeln“* mit Phasen- und Betragsdialog.

### Paket 3: Vertriebs-Funnel – Live-CRM vs. Plan-Vergleich (`/vertrieb/funnel`)
- **Detailplan:** `docs/superpowers/plans/2026-11-05-paket-3-vertrieb-funnel-live-plan.md`
- **Auftrag:** `docs/auftraege/ANTIGRAVITY_AUFTRAG_131_VERTRIEB_FUNNEL_LIVE.md`
- **Ziel:** Schließen der Lücke zwischen der statischen FY-2025-Funnel-Seite und der operativen CRM-Pipeline.
- **Kern:** Ansichtsumschalter *„Plan 2025“*, *„Live-CRM“* und *„Vergleich (Delta)“*; Konversionsraten-Gegenüberstellung; Bottleneck-Erkennung (Deals mit Verweildauer > 30 Tage).

### Paket 4: Executive Report Generator & Druck/PDF-Export (`/dashboard`)
- **Detailplan:** `docs/superpowers/plans/2026-11-05-paket-4-dashboard-report-export-plan.md`
- **Auftrag:** `docs/auftraege/ANTIGRAVITY_AUFTRAG_132_DASHBOARD_REPORT_EXPORT.md`
- **Ziel:** Vorstandstaugliche, browserübergreifende Export- und Druckfunktion für das Executive Dashboard.
- **Kern:** Konfigurations-Modal zur Auswahl von Zeitraum, Notizen und Kacheln; spezielles `@media print`-Layout im 2-Spalten-DIN-A4-Format mit Deckblatt, LeadPilot-Branding und barrierefreien Wertetabellen.

### Paket 5: Interaktiver „What-If“-Hebelrechner (Finanzen & Vertrieb)
- **Detailplan:** `docs/superpowers/plans/2026-11-05-paket-5-what-if-hebelrechner-plan.md`
- **Auftrag:** `docs/auftraege/ANTIGRAVITY_AUFTRAG_133_WHAT_IF_HEBELRECHNER.md`
- **Ziel:** Schnelle Entscheidungshilfe für das Management zur Abschätzung von Hebelwirkungen ohne vollen 50-Tick-Simulationslauf.
- **Kern:** Schieberegler für Churn, Sales Cycle, Marketing-Budget und Win-Rate mit Sofort-Projektion auf ARR, Runway und Cashflow; Tornado-Sensitivitätsdiagramm; Integration auf Finanz-/Vertriebsseiten und als Dashboard-Kachel.

---

## 3. Architektur- & Qualitätsgrenzen

1. **Keine neuen externen Pakete:** Sämtliche Drag-and-Drop-, Chart- und Berechnungsfunktionen werden mit bestehenden React-, SVG-, HTML5-Drag-and-Drop- und Recharts-Mitteln umgesetzt.
2. **Schutzbereiche intakt:** `src/simulation/**` wird nicht angetastet. Alle Berechnungen für What-If und Scoring laufen in fachspezifischen Services (`src/features/*/services/` bzw. `domain/`).
3. **URL-Synchronität & Persistenz:** Ansichten (z. B. Kanban vs. Tabelle) und Filter werden stets über URL-Parameter synchronisiert, sodass Links teilbar und lesbar bleiben.
4. **Theme & Barrierefreiheit:** Vollständige Unterstützung von Dark- und Light-Theme (`[data-theme='light']`), semantisches HTML, ARIA-Attribute und Screenreader-getestete Alternativtabellen.
5. **Testabdeckung:** Für jede Komponente wird ein UI-Test (`.ui.vitest.tsx`) und für Berechnungslogik ein isolierter Unit-Test geschrieben.

---

## 4. Release-Ziel

- **Angepeilte Version:** `v3.0.0` (Major Release nach vollständigem Abschluss und Merge aller 5 Pakete).
- **Begründung für v3.0.0:** Der Sprung von reiner Berichts- und Auswertungsanzeige zu einem interaktiven, operativen Vertriebs- und CRM-Steuerungssystem (Kanban-Pipeline, Lead-Scoring, Live-Funnel, Vorstandsexport, What-If-Hebel) begründet den nächsten Hauptversionsschritt.
- **Release-Auftrag:** `ANTIGRAVITY_AUFTRAG_134_RELEASE_V3_0_0.md` (analog zu den bisherigen Major/Minor-Releases mit Versionszeilen-Aktualisierung, Release Notes `docs/releases/V3.0.0.md`, Login-Screenshot-Matrix und annotiertem Git-Tag `v3.0.0` auf dem finalen Merge-Commit durch Marc).

