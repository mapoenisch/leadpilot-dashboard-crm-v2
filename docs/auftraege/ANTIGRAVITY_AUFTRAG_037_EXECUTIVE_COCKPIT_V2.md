# ANTIGRAVITY AUFTRAG 037: Executive-Cockpit V2 – visuelle Grundarchitektur und Management-Visualisierungen

> **Status:** IN BEARBEITUNG (NACHARBEIT P1)
> **Phase:** 5 – Vertriebs- und Management-Visualisierung
> **Gate:** G21
> **Baseline:** `3f1f9b4`
> **Branch:** `codex/v2.0.0`
> **Builder:** Antigravity
> **Reviewer:** Codex

---

## 1. Ziel und Kontext

Das Executive Dashboard `/dashboard` wird grundlegend zu einem integrierten LeadPilot-V2-Führungscockpit umgebaut.

Die visuelle Leitlinie orientiert sich an den Referenzen in `reference/leadpilot-v2-style/`:
- Dunkles, technisch präzises Enterprise-Cockpit.
- Tiefes Blaugrün als gestalterische Grundlage (`#030C0B`, `#081716`, `#0B1E1C`).
- Feine Cyan-/Türkis-Lichtkanten (`#00D9C6`) und kontrollierte, zurückhaltende Glow-Effekte.
- Orange (`#FF7A3D`) ausschließlich für Risiken, Warnungen oder negative Entwicklungen (z.B. negatives EBITDA).
- Hohe Informationsdichte, aber klare hierarchische Ordnung.
- Räumlich wirkende Visualisierungen: Für statische Datenbereiche (Teamstruktur und Produkt-Roadmap) kommen zweckgebundene dekorative Visual-Assets (`team-structure-backdrop.webp`, `roadmap-backdrop.webp`) als atmosphärische Tiefenebene zum Einsatz, während alle echten Werte, Namen, Rollen, Meilensteine und Status als semantisches, responsives DOM darüber liegen.
- Kein fotorealistischer Monitorrahmen, keine Berge und keine KI-Bildattrappen als angebliche Produktdaten.
- Bestehende App-Shell, linke Navigation und Routen bleiben vollständig intakt.

---

## 2. Informationsarchitektur

Auf Desktop entsteht ein integriertes Führungscockpit mit folgendem hierarchischen Aufbau:

```text
Header und bestehende App-Navigation
│
├─ Executive-KPI-Leiste (CockpitKpiRail)
│  ARR (411.840 €) · Umsatz (336.000 €) · EBITDA (−309.000 €) · Kunden (66)
│
├─ Hauptbereich (Finanz & Portfolio)
│  ├─ Finanzentwicklung / ARR-Trend (ManagementChart: Area)
│  └─ MRR- bzw. Paketverteilung (ManagementChart: Bar)
│
├─ Operativer Überblick
│  ├─ Teamstruktur & HR-Snapshot (TeamHrSnapshot mit szenischem Backdrop)
│  ├─ Produkt-Roadmap & nächste Meilensteine (RoadmapSnapshot mit szenischem Backdrop)
│  └─ Live-KPI-Status Ebene C (LiveKpiCard)
│
└─ Vertriebsüberblick
   └─ Pipeline-Snapshot (PipelineSnapshot, aggregiert aus 40 CRM-Deals)
```

### Responsive Priorisierung
- **1440 px:** Vollständige Cockpit-Ansicht in klar strukturierten Spalten.
- **768 px:** Zwei Spalten, rechte Nebeninformationen unterhalb des Hauptbereichs.
- **375 px:** Eine Spalte in exakter Reihenfolge:
  1. Executive-KPIs
  2. Live-KPI-Status (Ebene C)
  3. Finanzentwicklung
  4. MRR-Verteilung
  5. Pipeline-Snapshot
  6. Team & HR
  7. Roadmap

**Anforderung:** 0 px horizontaler Overflow bei allen Zielauflösungen. Keine abgeschnittenen Badges, Tooltips oder Tabellen.

---

## 3. Datenregeln — Keine Scheinwerte & Single Source of Truth

Alle angezeigten Werte stammen ohne Ausnahme und ohne künstliche Ersatzwerte aus unveränderten, bestehenden LeadPilot-Datenquellen:
- `EXEC_KPIS_1`: ARR (`411.840 €`), Umsatz (`336.000 €`), EBITDA (`−309.000 €`), Kunden (`66`). Keine künstlich erfundenen Zusatzwerte.
- `CHART_ARR`: Zeitreihe 120 k€ bis 411,8 k€. Keine `|| 0`-Ersatzwerte; bei Defekt greift der Empty-State.
- `CHART_MRR`: Starter (10.045 €), Growth (19.580 €), Pro (4.695 €).
- `getOrganisationStructure()`, `HEADCOUNT`, `HR`, `TEAM` aus `src/domain/organisationData.ts`.
- `ROADMAP.releases` aus `src/domain/produktData.ts`.
- Reale CRM-Deal-Aggregationen über `CRMRepository.getImportedFunnelDeals()`.
- Bestehende `LiveKpiCard` für Ebene-C-Telemetrie.
- **Aktivitäten-Status:** Da `src/features/crm/**` geschützt ist und keine separate kanonische Exportquelle für Aktivitäten außerhalb dieses Bereichs existiert, wird der Aktivitätenbereich ehrlich weggelassen, um keine Datenkopien anzulegen.

---

## 4. Ziel-Dateien

| Datei | Status | Aufgabe |
|---|---|---|
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_037_EXECUTIVE_COCKPIT_V2.md` | Modifiziert | Diese Spezifikation mit P1-Nacharbeit |
| `src/domain/executiveCockpitData.ts` | Modifiziert | Exakte Datenableitung aus EXEC_KPIS_1 ohne Duplikate |
| `src/components/executiveCockpit/ExecutiveCockpit.tsx` | Modifiziert | Fachlicher Hauptcontainer und Responsive-Layout |
| `src/components/executiveCockpit/CockpitPanel.tsx` | Neu | V2-Panel-Komponente mit Glas-/Glow-Effekt und Ebenen-Badge |
| `src/components/executiveCockpit/CockpitKpiRail.tsx` | Neu | Executive-KPI-Leiste (ARR, Umsatz, EBITDA, Kunden) |
| `src/components/executiveCockpit/TeamHrSnapshot.tsx` | Modifiziert | Semantisches Organigramm mit szenischem WebP-Backdrop |
| `src/components/executiveCockpit/RoadmapSnapshot.tsx` | Modifiziert | Semantische Timeline mit szenischem WebP-Backdrop |
| `src/components/executiveCockpit/PipelineSnapshot.tsx` | Neu | Stage- und Volumenverteilung aus 40 realen Deals |
| `src/components/executiveCockpit/index.ts` | Modifiziert | Barrel-Export ohne ActivitySnapshot |
| `public/assets/roadmap/roadmap-backdrop.webp` | Neu | Zweckgebundenes dekoratives Roadmap-Asset (< 320 KB) |
| `public/assets/roadmap/ASSET_SOURCE.md` | Neu | Vollständiger Asset-Nachweis |
| `src/components/ui/charts/managementChartTheme.ts` | Neu | Recharts-V2-Theme mit LeadPilot-Design-Tokens |
| `src/components/ui/charts/ManagementChart.tsx` | Neu | Flexibler Recharts-Renderer (Area, Line, Bar, keine Animation, linear) |
| `src/components/ui/charts/ManagementChartTooltip.tsx` | Neu | Hochwertiger Management-Tooltip mit Quellenebene |
| `src/components/ui/charts/ManagementChartState.tsx` | Neu | Ehrlicher Empty- und Error-State |
| `src/components/ui/charts/index.ts` | Modifiziert | Export der neuen Management-Chart-Komponenten |
| `src/features/overview/pages/ExecutiveDashboardPage.tsx` | Modifiziert | Dashboard auf Cockpit umgestellt |
| `scripts/verifyExecutiveCockpitV2.ts` | Modifiziert | G21-Audit mit strikten Wert- und Provenienzprüfungen |
| `scripts/captureAuftrag037GateScreenshots.mjs` | Neu | Screenshot-Harness für 1440, 768, 375 px |
| `scripts/generateAuftrag037ScreenshotMatrix.mjs` | Neu | Screenshot-Matrix mit SHA-256-Prüfung |
| `docs/screenshots/auftrag-037/**` | Neu | Bildnachweise und Matrix |
| `docs/BUILD_LOG.md` | Modifiziert | Chronologischer Builder-Eintrag für Gate G21 |
