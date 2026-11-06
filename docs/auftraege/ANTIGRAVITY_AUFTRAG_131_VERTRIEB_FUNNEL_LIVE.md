# Auftrag 131 – Vertriebs-Funnel: Live-CRM vs. Plan-Vergleich & Bottleneck-Erkennung

**Builder:** Claude Code · **Prüfer:** Codex (GitHub App) · **Baseline:** `b8fe084` (`main` nach PR #140) · **Branch:** `claude/auftrag-131-vertrieb-funnel-live`

## Anlass & Motivation

Im Rahmen der Plattform-Evolution (Paket 3 von 5 auf dem Weg zu v3.0.0, spezifiziert in `docs/superpowers/plans/2026-11-05-crm-analytics-master-plan.md` und `docs/superpowers/plans/2026-11-05-paket-3-vertrieb-funnel-live-plan.md`) wird die Funnel-Seite unter `/vertrieb/funnel` erweitert.

Bisher visualisiert die Seite ausschließlich den statischen Funnel des Geschäftsjahres 2025 aus dem Faktenblatt (`FUNNEL` in `vertriebData.ts`). Für das Management und die Vertriebsleitung ist jedoch der unmittelbare Vergleich zwischen den **geplanten historischen Konversionsraten** und der **aktuellen operativen CRM-Pipeline** entscheidend:

- Wo bricht die Konversion im laufenden Quartal ein?
- Welche Pipeline-Stufen sind überlastet (Bottlenecks / lange Liegezeiten)?
- Werden die Zielwerte für MQL-zu-SQL und Win-Rates erreicht?

Paket 3 führt einen 3-Wege-Datenquellen-Umschalter, eine dynamische CRM-Funnel-Aggregation, eine visuelle Trichter-Gegenüberstellung mit Delta-Pills und einen automatischen Stagnations- und Bottleneck-Detektor ein.

## Ziel

1. **Datenquellen-Umschalter (`FunnelSourceToggle.tsx`):**
   - Barrierefreie Segmented Control im Seitenkopf mit 3 Modi:
     - `Plan 2025` (`plan`): Bewährte Faktenblatt-Vorlage (FY 2025) mit 5 Stufen und Quartalsbalken.
     - `Live-Pipeline` (`live`): Dynamische Aggregation der operativen CRM-Leads und CRM-Deals.
     - `Vergleich` (`vergleich`): Parallele Gegenüberstellung Plan vs. Ist mit farbigen Delta-Pills (`+X %` grün, `-X %` koralle).
   - URL-Synchronisation via Parameter `?daten=plan | ?daten=live | ?daten=vergleich` (Standard `plan` für vollständige Abwärtskompatibilität).

2. **Dynamische CRM-Funnel-Aggregation (`funnelAnalyticsService.ts`):**
   - Aggregiert Leads und Deals aus dem CRM-Bestand zu den 5 kanonischen Stufen:
     - Stufe 1: Leads gesamt (CRM Contacts / Leads)
     - Stufe 2: Marketing Qualified Leads (MQL)
     - Stufe 3: Sales Qualified Leads (SQL) (Deals in Erstgespräch / Bedarfsanalyse und Folgephasen)
     - Stufe 4: Angebote (Deals in Angebot erstellt / Verhandlung und Folgephasen)
     - Stufe 5: Neukunden (Won) (Deals in Deal gewonnen)
   - Berechnet für jede Stufe:
     - Anzahl Einheiten (`count`)
     - Gesamtwert in € (`amountEuro`)
     - Stufen-Konversionsrate (`Stufe N / Stufe N-1`)
     - End-to-End Konversionsrate (`Won / Leads`)
     - Delta-Werte gegenüber Plan (`deltaCount`, `deltaQuotePercent`)
   - Unterstützt lokale Deal-Stage-Overrides aus Kanban/SessionStorage für nahtlose Live-Aktualisierung.

3. **Bottleneck- & Stagnations-Detektor (`FunnelBottleneckAlert.tsx`):**
   - Analysiert die Liegedauer von Deals in kritischen Vertriebsphasen (`Angebot erstellt`, `Bedarfsanalyse`).
   - Identifiziert Engpässe bei Überschreitung des Schwellenwerts (> 25 Tage durchschnittliche Verweildauer).
   - Zeigt eine auffällige Warn-Card mit betroffener Stufe, Anzahl Deals, Verweildauer und konkreter Handlungsempfehlung.

4. **Trichter- & Tabellen-Erweiterung (`FunnelStufenChart.tsx`, `FunnelPage.tsx`):**
   - Trichter visualisiert im Vergleichsmodus beide Werte (Plan vs. Live) mit visueller Differenzierung.
   - Tabelle erhält im Vergleichsmodus Spalten für `Plan %`, `Live %` und `Delta`.
   - Modulare Auslagerung der Trichter-Tabelle (`FunnelDeltaTable.tsx`), um das $\le 400$-Zeilenbudget aller Dateien strikt einzuhalten.

5. **Schutzbereiche & Qualität:**
   - Schutzbereiche (`src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`) bleiben 100 % unberührt (Diff = 0).
   - Alle TS/TSX-Dateien strikt $\le 400$ Zeilen.
   - Alle Gates grün: TypeScript, ESLint, Prettier, Quality-Budget, Unit-Tests, UI-Tests, Screenshot-Harness (18/18 Diffs, 0 px Überlauf), Build.

## Ziel-Dateien

| Datei                                                                            | Art           | Verantwortung                                                            |
| -------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------ |
| `src/features/vertrieb/services/funnelAnalyticsService.ts`                       | Neu           | Aggregationslogik für CRM-Daten zu Funnel-Stufen, Deltas & Bottlenecks   |
| `src/features/vertrieb/components/FunnelSourceToggle.tsx`                        | Neu           | Segmented Control für Datenquellen-Umschaltung (Plan / Live / Vergleich) |
| `src/features/vertrieb/components/FunnelBottleneckAlert.tsx`                     | Neu           | Engpass-Erkennung und Stagnations-Warnungen                              |
| `src/features/vertrieb/components/FunnelDeltaTable.tsx`                          | Neu           | Modulare Tabelle mit Plan-, Live- und Delta-Spalten ($\le 400$ Zeilen)   |
| `src/features/vertrieb/components/FunnelStufenChart.tsx`                         | Änderung      | Unterstützung von Vergleichs- und Live-Werten im Trichter                |
| `src/features/vertrieb/pages/FunnelPage.tsx`                                     | Änderung      | Integration von Toggle, Alert, Chart und Delta-Tabelle                   |
| `src/features/vertrieb/services/__tests__/funnelAnalyticsService.unit.vitest.ts` | Neu           | Unit-Tests für Konversionsraten, Deltas und Bottleneck-Erkennung         |
| `src/features/vertrieb/pages/__tests__/FunnelPage.live.ui.vitest.tsx`            | Neu           | UI- und Integrationstests für alle 3 Modi und URL-Synchronisation        |
| `scripts/captureAuftrag131Gate.mjs`                                              | Neu           | Screenshot-Gate-Harness für Funnel-Modi (1440/768/375 px, dark/light)    |
| `docs/screenshots/auftrag-131/README.md`                                         | Neu           | Vorher/Nachher-Screenshot-Matrix                                         |
| `docs/BUILD_LOG.md`, dieser Auftrag                                              | Dokumentation | Nachweis aller Gates                                                     |
