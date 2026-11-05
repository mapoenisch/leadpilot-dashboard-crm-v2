# LeadPilot – Paket 3: Vertriebs-Funnel Live-CRM vs. Plan-Vergleich

> **Kontext:** Teil 3 des Master-Plans `2026-11-05-crm-analytics-master-plan.md`.  
> **Auftrag:** `docs/auftraege/ANTIGRAVITY_AUFTRAG_131_VERTRIEB_FUNNEL_LIVE.md`  
> **Branch:** `claude/auftrag-131-vertrieb-funnel-live`  
> **Ziel-Route:** `/vertrieb/funnel`

---

## 1. Motivation & Ausgangslage

Die Seite `/vertrieb/funnel` visualisiert bisher exklusiv den statischen Funnel des Geschäftsjahres 2025 aus dem Faktenblatt (`FUNNEL` in `vertriebData.ts`). 

Für das Management ist jedoch der Vergleich zwischen den **geplanten historischen Konversionsraten** und der **aktuellen operativen CRM-Pipeline** entscheidend:
- Wo bricht die Konversion im laufenden Quartal ein?
- Welche Pipeline-Stufen sind überlastet (Bottlenecks / lange Liegezeiten)?
- Werden die Zielwerte für MQL-zu-SQL erreicht?

---

## 2. Fachliche & Technische Spezifikation

### 2.1 Datenquellen-Umschalter (`FunnelSourceToggle.tsx`)
Ein Segmented-Control-Schalter im Seitenkopf erlaubt drei Modi:
1. **Plan / Faktenblatt (FY 2025):** Die bewährte Vorlage mit den 5 Stufen und Quartalsbalken.
2. **Live-Pipeline (CRM Echtzeit):** Dynamische Aggregation der tatsächlichen Leads und Deals aus dem CRM-Bestand.
3. **Vergleichsmodus (Delta Plan vs. Ist):** Parallele Gegenüberstellung mit farbigen Abweichungs-Pills (`+4,2 %` in Grün, `-3,1 %` in Koralle).

Gesteuert über URL-Parameter `?daten=plan | ?daten=live | ?daten=vergleich`.

### 2.2 Dynamische Funnel-Aggregation (`funnelAnalyticsService.ts`)
- Liest die vorhandenen CRM-Daten:
  - Stufe 1: Leads gesamt (`crmRepository.getLeads()`)
  - Stufe 2: Qualifizierte MQLs
  - Stufe 3: Vertriebs-SQLs (`Deals in Phasen Erstgespräch / Bedarfsanalyse`)
  - Stufe 4: Angebote (`Deals in Phase Angebot / Verhandlung`)
  - Stufe 5: Gewonnene Neukunden (`Deals in Phase Deal gewonnen`)
- Berechnet für jede Stufe:
  - Anzahl Einheiten
  - Gesamtwert in €
  - Stufen-Konversionsrate (`Stufe N / Stufe N-1`)
  - Gesamte End-to-End Konversionsrate (`Won / Leads`)

### 2.3 Bottleneck- & Stagnations-Detektor (`FunnelBottleneckAlert.tsx`)
- Berechnet die durchschnittliche Verweildauer (Tage) von Deals in den Phasen.
- Wenn Deals im Schnitt länger als 25 Tage in `Angebot erstellt` oder `Bedarfsanalyse` verweilen, wird ein auffälliger Hinweis eingeblendet:
  - ⚠️ *„Engpass identifiziert: 12 Deals verweilen seit über 28 Tagen in Phase ‚Angebot erstellt‘ (Plan: 14 Tage). Handlungsbedarf im Sales-Follow-up.“*

### 2.4 Erweiterung des Trichters & Charts (`FunnelStufenChart.tsx`)
- Im Vergleichsmodus werden im Trichter zwei Balken/Werte je Stufe angezeigt (Plan 2025 vs. Ist Live).
- Die Tabelle darunter erhält Delta-Spalten (`Plan %`, `Live %`, `Delta`).

---

## 3. Ziel-Dateien

| Datei | Art | Verantwortung |
|---|---|---|
| `src/features/vertrieb/services/funnelAnalyticsService.ts` | Neu | Aggregationslogik für CRM-Daten zu Funnel-Stufen & Deltas |
| `src/features/vertrieb/components/FunnelSourceToggle.tsx` | Neu | Segmented Control für Plan / Live / Vergleich |
| `src/features/vertrieb/components/FunnelBottleneckAlert.tsx` | Neu | Engpass-Erkennung und Verweildauer-Warnungen |
| `src/features/vertrieb/components/FunnelStufenChart.tsx` | Änderung | Unterstützung von Vergleichs- und Live-Werten |
| `src/features/vertrieb/pages/FunnelPage.tsx` | Änderung | Integration des Umschalters, der Live-Daten und Delta-Tabelle |
| `src/features/vertrieb/__tests__/funnelAnalytics.unit.vitest.ts` | Neu | Unit-Tests für Konversionsraten und Deltarechnung |
| `src/features/vertrieb/__tests__/FunnelPage.ui.vitest.tsx` | Neu | UI-Tests für alle 3 Modi |
| `scripts/captureAuftrag131Gate.mjs` | Neu | Screenshot-Gate-Harness |
| `docs/screenshots/auftrag-131/README.md` | Neu | Ergebnis-Matrix |
| `docs/BUILD_LOG.md` | Änderung | Nachweis aller Gates |

---

## 4. Definition of Done & Verifikation

- [ ] Seite bietet nahtlose Umschaltung zwischen Plan, Live-CRM und Vergleichsmodus.
- [ ] Live-Zahlen aggregieren echte CRM-Bestände mathematisch korrekt.
- [ ] Bottleneck-Callout warnt bei überdurchschnittlich langen Liegezeiten.
- [ ] 0 Fehler bei allen Gates (`tsc`, `lint`, `verify`, `build`).
- [ ] Schutzbereichs-Diff 100 % leer.
