# ANTIGRAVITY_AUFTRAG_019 — Szenariovergleich-Tiefe (Phase 3c)

**Stand:** 01.09.2026  
**Status:** DRAFT / SPEZIFIKATION  
**Gate:** G3c  
**Referenzierte Entscheidungen:** 849–873, 1637–1648 aus `ARCHITECTURE_DECISIONS.md`  

---

## 1. Ziel & Kontext

AUFTRAG 019 erweitert den bestehenden A/B-Szenariovergleich (`compareVersions`, Suite 014) zu einer **tiefen Multi-Szenario-Vergleichsanalyse**:

1. **3–4 Szenarien gleichzeitig (Entscheidungen 849–851):**
   - Beliebige Auswahl von bis zu 4 Szenarioversionen (z. B. Base 2026, Aggressiver Vertrieb, Marketing-Fokus, Konservativer Churn-Schutz).
   - Parallele Gegenüberstellung aller Parameter, Maßnahmen und KPI-Ergebnisse (P50 Median + P10/P90 Korridor).
2. **Trade-Off-Hervorhebung in 5 Dimensionen (Entscheidungen 864–868):**
   - **Growth:** ARR, MRR, Wachstumspfad.
   - **Profitability:** EBITDA, operative Marge, Deckungsbeitrag.
   - **Liquidity:** Netto-Cashflow, kumulierter Cashbestand.
   - **Acquisition:** CAC, gewonnene Deals, Konvertierungsrate.
   - **Retention:** Aktiver Kundenbestand, Churn Loss, monatliche Abwanderungsrate.
   - **Kein künstlicher Gesamt-Score (Entscheidung 866).**
3. **Automatische Identifikation relevanter Unterschiede mit Ursache (Entscheidungen 869–871):**
   - Erkennt automatisch die primären Ursachen für festgestellte KPI-Deltas (z. B. mehr Sales FTE treibt ARR, senkt jedoch EBITDA/Cashflow durch Personalkosten).
4. **„Konfiguration aus Vergleich übernehmen" (Entscheidung 872):**
   - Ermöglicht dem Management, eine im Vergleich analysierte Parameterkonfiguration als Basis für eine neue Arbeitsversion zu kopieren.

---

## 2. Detaillierte Arbeitsschritte

### Schritt 1 — Domain-Modell & Service-Erweiterung
- Erweiterung von [`src/types/scenario.ts`](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/src/types/scenario.ts):
  - `TradeOffDimension`: `'GROWTH' | 'PROFITABILITY' | 'LIQUIDITY' | 'ACQUISITION' | 'RETENTION'`
  - `TradeOffEvaluation`: Analyse der relativen Stärken und Trade-offs je Szenario.
  - `MultiVersionComparisonResult`: Enthält `versions: ScenarioVersion[]`, `parameterMatrix: ParameterMatrixRow[]`, `kpiMatrix: KpiMatrixRow[]`, `tradeOffs: TradeOffEvaluation[]`, `keyDifferences: KeyDifferenceItem[]`.
- Implementierung von `scenarioService.compareMultipleVersions(versionIds: string[], targets?)`:
  - Validiert `versionIds.length >= 2 && versionIds.length <= 4`.
  - Berechnet Parameter- und KPI-Matrizen deterministisch.
  - Ermittelt Trade-offs und Schlüsselursachen ohne synthetischen Gesamtscore.
- Implementierung von `scenarioService.adoptConfiguration(sourceVersionId: string, targetScenarioId: string, description?: string)`:
  - Erzeugt eine neue `ScenarioVersion` basierend auf der Quellkonfiguration.

### Schritt 2 — UI-Vergleichskomponente
- Erstellung von [`src/features/simulation/components/MultiScenarioComparisonModal.tsx`](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/src/features/simulation/components/MultiScenarioComparisonModal.tsx):
  - Szenario-Auswahlelemente für 2 bis 4 Versionen.
  - Interaktive Matrix: Parameter-Gegenüberstellung mit Änderungs-Badges.
  - 5-Dimensionen Trade-off-Karten (Growth, Profitability, Liquidity, Acquisition, Retention).
  - Schlüsselursachen-Zusammenfassung („Warum unterscheidet sich Szenario X von Y?“).
  - Button „Konfiguration übernehmen".
- Verdrahtung im [`ManagementTierView.tsx`](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/src/features/simulation/components/ManagementTierView.tsx) und [`SimulationContext.tsx`](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/src/context/SimulationContext.tsx).

### Schritt 3 — Test-Suite 024 (`src/simulation/__tests__/multiScenarioComparisonIntegrity.test.ts`)
Implementierung von `runMultiScenarioComparisonTest()`:
1. **Multi-Szenario-Matrix-Validierung:** Vergleich von 3 und 4 Versionen liefert vollständige Parameter- und KPI-Matrizen.
2. **5-Dimensionen Trade-Off-Integrität:** Jedes Szenario wird in Growth, Profitability, Liquidity, Acquisition und Retention ohne Gesamtscore analysiert.
3. **Schlüsselursachen-Identifikation:** Automatischer Nachweis der Primärursache für KPI-Unterschiede.
4. **Konfigurations-Übernahme (`adoptConfiguration`):** Erzeugt eine neue, unveränderliche Version mit exakten Parametern.
5. **Kein künstlicher Gesamt-Score:** Verifikation, dass kein unzulässiger Composite-Score berechnet wird (Entscheidung 866).
6. **Bounds & Error Handling:** Schutz gegen < 2 oder > 4 Versionen (`MAX_RUNS_EXCEEDED` / `INVALID_VERSION`).
7. **Regressionsschutz:** Alle bisherigen 23 Test-Suiten bleiben 100% grün.

### Schritt 4 — Registrierung & Dokumentation
- Registrierung in [`scripts/verifyIntegrity.ts`](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/scripts/verifyIntegrity.ts) als Suite 024.
- Aktualisierung von [`ARCHITECTURE_DECISIONS.md`](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/ARCHITECTURE_DECISIONS.md) (Entscheidungen 849–873 und 1637–1648 auf `IMPLEMENTIERT (AUFTRAG 019)`, Abschnitt **B25**).
- Aktualisierung von [`docs/BUILD_LOG.md`](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/docs/BUILD_LOG.md) und [`BUILD_PLAN.md`](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/BUILD_PLAN.md).
