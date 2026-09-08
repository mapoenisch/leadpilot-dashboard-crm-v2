# Auftrag 030: Executive Dashboard und Unternehmensübersicht Implementation Plan

> **Für ausführende Agenten:** Diesen Auftrag seriell und taskweise abarbeiten. Nach jedem Task müssen die dort genannten Nachweise erbracht sein. Änderungen außerhalb der Ziel-Dateien sind nicht zulässig, außer sie wurden vorab als Abweichung im Build-Log begründet und freigegeben.

**Phase:** Phase 3 – V2-Redesign der Kernbereiche (Statische Daten) · **Gate:** G14

**Status:** IN ARBEIT

**Goal:** Visuelle Modernisierung der vier zentralen Overview-Pages (`ExecutiveDashboardPage`, `CompanyProfilePage`, `YearHighlightsPage`, `DataBasisPage`) zur Etablierung des V2-Designsystems (Glassmorphism, Card-Hierarchie, typografische Tiefe, responsive Grids). Alle vier Seiten nutzen ausschließlich vorhandene statische Daten aus `src/domain/execData.ts` und weisen sichtbare Zeitebenen- und Quellenkennzeichnungen auf („Ebene A Baseline / Stand 31.12.2025“). Keine vorgetäuschten Live-Daten. 12 Screenshot-Paare (4 Pages × 3 Viewports) weisen das visuelle V2-Redesign nach (`DISTINCT`), bei strikt 0 px horizontalem Überlauf.

**Architecture & Design:**
- **Executive Dashboard (`ExecutiveDashboardPage.tsx` / `/dashboard`)**:
  - Kontext-Banner: Stand 31.12.2025 · Ebene A Baseline · Faktenblatt v1.1.
  - Primäre KPI-Karten (ARR, Gesamtumsatz, EBITDA, Aktive Kunden): V2-GlassCard (`Card variant="glass"` oder semantisch akzentuiert), große Display-Zahlen, klare Trend- und Subtitel-Hierarchie.
  - Sekundäre Effizienz-Karten (ARPA, Marketing-CAC, Fully-Loaded CAC, Headcount): Kompakte V2-Karten.
  - Historische Charts: 4 `ChartFrame`s mit dezentem Surface-Glass, klaren Achsenbeschriftungen und Source-Labels.
  - Executive Summary: Strukturierte V2-Callout-Karte.
- **Unternehmenssteckbrief (`CompanyProfilePage.tsx` / `/company/profile`)**:
  - Strukturierte Gliederung der Stammdaten in modulare V2-Karten (Basisdaten, Gesellschafterkreis, Management) anstelle einer monotonen Flachtabelle.
  - Saubere Key-Value-Hierarchien und Badges.
- **Jahres-Highlights 2025 (`YearHighlightsPage.tsx` / `/company/highlights`)**:
  - Gegenüberstellung von „Top Erfolge 2025“ und „Operative Herausforderungen“ in zwei V2-Cards.
  - Semantische Statusbadges (Erfolg / Handlungsbedarf) mit Text/Icons (nicht rein farbcodiert).
- **Datenbasis & Konsistenz (`DataBasisPage.tsx` / `/company/data-basis`)**:
  - Saubere V2-Tabelle/Kartenübersicht der Systemschnittstellen strikt basierend auf den vorhandenen `BRIDGES_ROWS` („Datenbank/CRM“, „Finanzbuchhaltung“, „Analytics“ etc.). Keine Erfindung unbelegter Vendor-Namen.
- **Schutzbereiche (Zero-Diff)**: Exakt 0 Zeilen Unterschied gegen `067ff0e` in:
  - `src/simulation/**`
  - `src/types/**`
  - `src/context/**`
  - `src/services/data/**`
  - `src/features/resources/**`
- **Screenshot- & Viewport-Prüfung**:
  - 12 Vorher-/Nachher-Paare für die 4 Pages über 3 Viewports (1440px Desktop, 768px Tablet, 375px Mobile).
  - Erwartungsgemäß `DISTINCT` (visueller Fortschritt nachweisbar).
  - 0 px horizontaler Überlauf bei allen Viewports.
  - Deep-Link-Harness für alle 41 Routen bleibt grün.

**Tech Stack:** React 18, TypeScript, Vite, CSS-Tokens (`--color-surface-glass`, `--color-surface-glass-raised`, etc.), CDP-Screenshot-Harness.

**Referenzen:** `CLAUDE.md`; `AGENTS.md`; `docs/BUILD_PLAN_V2.0.0.md` Phase 3 (Gate G14); Gate G13 (`067ff0e`).

---

## Ziel-Dateien

| Datei / Bereich | Verantwortung |
|---|---|
| `src/features/overview/pages/ExecutiveDashboardPage.tsx` | V2-Grid des Executive Dashboards mit KPI-Karten, Charts, Summary und Zeitebenen-Header |
| `src/features/overview/pages/CompanyProfilePage.tsx` | Strukturierte V2-Unternehmensübersicht mit Stammdaten, Gesellschaftern & Management |
| `src/features/overview/pages/YearHighlightsPage.tsx` | V2-Karten für Jahres-Highlights (Erfolge vs. Herausforderungen) mit semantischen Badges |
| `src/features/overview/pages/DataBasisPage.tsx` | V2-Systemschnittstellen-Übersicht auf Basis von `BRIDGES_ROWS` |
| `scripts/captureAuftrag030GateScreenshots.mjs` | Gate-Harness zur Erfassung der 12 Screenshots & 41-Route-Deep-Link-Verifikation |
| `scripts/generateAuftrag030ScreenshotMatrix.mjs` | Matrix-Generator mit Prüfung auf `DISTINCT` und 0px Overflow |
| `docs/screenshots/auftrag-030/` | Screenshot-Artefakte Vorher / Nachher |
| `docs/BUILD_LOG.md` | Protokollierung von Gate G14 |
