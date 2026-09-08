# ANTIGRAVITY_AUFTRAG_018 — KPI-Zeitreihen-Detailseite & Monte-Carlo-Verteilung (Phase 3b)

**Stand:** 01.09.2026  
**Status:** DRAFT / SPEZIFIKATION  
**Gate:** G3b  
**Referenzierte Entscheidungen:** 1274–1323 aus `ARCHITECTURE_DECISIONS.md`  

---

## 1. Ziel & Kontext

In Auftrag 018 wird die **analytische Detail-Ebene (Tier 2)** um eine vollwertige **KPI-Detailseite mit interaktivem Zeitreihen- und Verteilungs-Explorer** ausgebaut:

1. **KPI-Selektor:** Schnelles Umschalten zwischen allen Kern- und Finanz-KPIs (`liveARR`, `liveMRR`, `liveCustomers`, `liveWonDeals`, `ebitda`, `netRevenue`, `netCashFlow`).
2. **Zeitreihen-Chart mit Unsicherheitsband:**
   - Visualisierung von **P50 Median** als Führungslinie.
   - **P10/P90-Unsicherheitskorridor** als dezent schattiertes Band.
   - **Historischer Übergang (Ebene A):** 2025er Baseline als eindeutiger Startpunkt bei Tick 0 markiert.
   - **Zielpfad & Ziellinie:** Dynamischer Zielpfad gemäß `GoalTarget` (z. B. 600.000 € ARR-Ziel) mit Erreichungsstatus (`ACHIEVED`, `AT_RISK`, `MISSED`).
3. **Monte-Carlo-Histogramm:**
   - Häufigkeitsverteilung der validen Simulationsläufe.
   - Explizite Marker für **P10**, **Median (P50)**, **P90** und Mittelwert (**Mean**).
4. **Interaktives Einzel-Run-Overlay:**
   - Selektion von bis zu **5 konkreten Einzel-Runs** aus der Run-Historie zur individuellen Pfadanalyse.
5. **Vergleichsmodi:**
   - Umschaltung zwischen **Absolutwerten**, **Delta zur Baseline (Δ)** und **Prozentualer Abweichung (%)**.
6. **Treiber- & Ursachen-Drilldown:**
   - Top-3-Wachstumstreiber je KPI mit quantifizierter Wirkungsstärke und Filterung relevanter Simulationsevents.
7. **Statistische Aussagekraft:**
   - Transparente Kennzeichnung bei geringer Run-Anzahl (< 3 bzw. < 10 Runs).

---

## 2. Detaillierte Arbeitsschritte

### Schritt 1 — KPI-Zeitreihen- & Histogramm-Komponenten
- Erstellung von [`src/features/simulation/components/KpiTimeSeriesDetailView.tsx`](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/src/features/simulation/components/KpiTimeSeriesDetailView.tsx):
  - KPI-Header mit aktuellem P50-Wert, Baseline-Vergleich, Zielerreichung und Konfidenz-Badge.
  - SVG-basierter interaktiver Zeitreihen-Renderer mit P10/P90-Polygon, Median-Pfad, Zielpfad und Overlays.
  - SVG-basiertes Histogramm mit Bins und statistischen Markern.
- Einbindung in [`src/features/simulation/components/DetailTierView.tsx`](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/src/features/simulation/components/DetailTierView.tsx).

### Schritt 2 — KPI-Semantik & Treiber-Berechnung
- Nutzung der zentralen [`KPIRegistry`](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/src/simulation/kpiRegistry.ts) und des [`GoalTargetEvaluator`](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/src/simulation/goalTargetEvaluator.ts).
- Deterministische Ermittlung der Top-3-Treiber je KPI aus den Parametern und der Event-Historie.

### Schritt 3 — Test-Suite 023 (`src/simulation/__tests__/kpiTimeSeriesIntegrity.test.ts`)
Implementierung von `runKpiTimeSeriesTest()`:
1. **P10/P50/P90-Zeitreihen-Konsistenz:** Für alle Ticks gilt strikt `P10 <= P50 <= P90`.
2. **Historien-Übergang:** Tick 0 bindet exakt an den Ebene-A-Baseline-Wert.
3. **Histogramm-Bucket-Integrität:** Summe aller Histogramm-Bins entspricht exakt der Anzahl valider Runs.
4. **Zielpfad-Evaluierung:** Korrekte Einstufung von Zielwerten (`ACHIEVED` vs. `AT_RISK` vs. `MISSED`) bei unterschiedlichen Verteilungen.
5. **Vergleichsmodi:** Mathematisch exakte Umrechnung von Absolutwerten in Δ-Baseline und Prozent.
6. **Einzel-Run-Begrenzung:** Striktes Limit auf maximal 5 aktive Overlay-Runs.
7. **Regressionsschutz:** Alle bisherigen 22 Test-Suiten bleiben 100% grün.

### Schritt 4 — Registrierung & Dokumentation
- Registrierung in [`scripts/verifyIntegrity.ts`](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/scripts/verifyIntegrity.ts) als Suite 023.
- Aktualisierung von [`ARCHITECTURE_DECISIONS.md`](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/ARCHITECTURE_DECISIONS.md) (Entscheidungen 1274–1323 auf `IMPLEMENTIERT (AUFTRAG 018)`).
- Aktualisierung von [`docs/BUILD_LOG.md`](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/docs/BUILD_LOG.md) und [`BUILD_PLAN.md`](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/BUILD_PLAN.md).

---

## 3. Abnahmekriterien (Gate G3b)

- `npx tsc --noEmit` fehlerfrei (Exit 0).
- `npm run verify` besteht alle 23 Integrity-Suiten.
- `npm run build` baut fehlerfrei.
- Saubere Trennung zwischen Ebene A (Historie) und Ebene B (Simulation).
