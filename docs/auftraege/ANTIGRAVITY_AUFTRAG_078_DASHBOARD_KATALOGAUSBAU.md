# Auftrag 078 – Dashboard Teilauftrag 8a: Katalogausbau

**Stand:** 06.10.2026

**Basis:** `main` `90e530d` (Merge von PR #61, Auftrag 077, am 06.10.2026). Baseline für den Schutzbereichs-Diff ist `90e530d`. Plan: `docs/superpowers/plans/2026-10-01-executive-dashboard-plan.md`, Teilauftrag 8, §4 „Daten und Eignung“. Datenverträge: Aufträge 070 (Katalog), 071 (Datenauflösung), 073 (Kachelrahmen), 077 (Details).

**Builder:** Claude Code (Zyklus 1). **Prüfer:** Codex. **Merge:** nur Marc.

**Branch:** `claude/auftrag-078-katalogausbau`, PR gegen `main`.

## Aufteilung von Teilauftrag 8

Teilauftrag 8 hat zwei unabhängig prüfbare Hälften. Sie werden in zwei Aufträgen gebaut, damit jeder PR klein und nachvollziehbar bleibt (`CLAUDE.md` §8, „Kein Big-Bang“):

| Auftrag | Inhalt                                                                                                                                                      |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **078** | Katalogausbau: belegte, bereits strukturiert vorliegende KPIs freischalten, jede Auslassung mit Grund im Inventar (Plan TA 8, Punkte 1–2).                  |
| 079     | Gesamtabnahme: Mehrsitzungs-/Benutzerwechsel-, Realtime-, Lazy-Loading-, Accessibility- und Screenshot-Nachweise, Sichtprüfung Marc, Rollout (Punkte 3–10). |

079 setzt den Katalog aus 078 voraus, weil die Abnahme alle Darstellungen über den vollständigen Katalog prüft.

## Ziel

Der Katalog wächst um die Kennzahlen, die in `src/domain/` schon als strukturierte Zahlen vorliegen und fachlich belegt sind. Jede neue Kachel löst über denselben Datenweg auf (`resolveBaseline`), ohne Schätzwert und ohne Änderung an der Simulation. Was nicht freigeschaltet wird, behält oder bekommt im Inventar einen konkreten Grund und die nötige spätere Aufbereitung.

## Auswahl (aus dem Inventar „aufbereiten“)

| Neue ID                       | Quelle                                              | Datenform  | Prüfung im Test                                       |
| ----------------------------- | --------------------------------------------------- | ---------- | ----------------------------------------------------- |
| `baseline.erloesmix`          | `finanzenData.CHART_ERLOESE.datasets[0].data`       | Anteile    | Summe 336.000 = `baseline.umsatz`                     |
| `baseline.arr_nach_segment`   | `kundenData.CHART_SEGMENT.datasets[0].data`         | Anteile    | Summe 411.840 = `baseline.arr`                        |
| `baseline.kunden_nach_region` | `kundenData.REGIONEN.rows` (`region`, `kunden`)     | Anteile    | Summe 66 = `baseline.kunden_aktiv` = `REGIONEN.total` |
| `baseline.kanal_mix`          | `vertriebData.KANAELE.chartKanal.datasets[0].data`  | Anteile    | Summe 100 %                                           |
| `baseline.kanal_cac`          | `vertriebData.KANAELE.chartRoi.datasets[0].data`    | Kategorien | Verhältnis, nie Kreis; Werte wie Tabellenspalte       |
| `baseline.leads_quartal`      | `vertriebData.FUNNEL.chart.datasets[0].data`        | Zeitreihe  | Summe 1.776 = FY-Spalte                               |
| `baseline.neukunden_quartal`  | `vertriebData.FUNNEL.chart.datasets[3].data`        | Zeitreihe  | Summe 47 = FY-Spalte = `CHART_QUARTAL`                |
| `baseline.headcount_verlauf`  | `organisationData.HEADCOUNT.chart.datasets[0].data` | Zeitreihe  | letzter Punkt 10 = `baseline.headcount`               |
| `baseline.aktivierungsrate`   | `produktData.CHART_PRODUKT.datasets[0].data`        | Zeitreihe  | Prozent je Quartal, nicht aufsummierbar               |
| `baseline.ki_scoring_nutzung` | `produktData.CHART_PRODUKT.datasets[1].data`        | Zeitreihe  | Prozent je Quartal, nicht aufsummierbar               |
| `baseline.gesellschafter`     | `rechtData.GESELLSCHAFTER.rows` (Spalte 0, 2)       | Anteile    | Summenzeile ausgeschlossen, exakt 100 %               |
| `uebersicht.meilensteine`     | `unternehmenData.HISTORIE.events`                   | Übersicht  | fünf Ereignisse in Quellreihenfolge                   |

Der bisherige Inventareintrag `baseline.produkt_nutzung` (zwei Reihen in einer Quelle) wird durch die zwei Einzelreihen ersetzt. Der bisherige Inventareintrag `baseline.neukunden_quartal` (`execData.CHART_QUARTAL`) heißt künftig `baseline.quartal_neukunden_kosten` und bleibt „aufbereiten“, weil er zwei Einheiten mischt; Neukunden je Quartal kommen aus `FUNNEL`.

## Bewusst nicht freigeschaltet (Grund im Inventar)

| ID                                                                                                                                                                                                     | Grund                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `baseline.funnel_2025`                                                                                                                                                                                 | Vier Reihen in einer Quelle; das Kachelmodell zeigt eine Reihe. Leads und Neukunden sind einzeln aktiv.                           |
| `baseline.kuendigungsgruende`                                                                                                                                                                          | Zeitraum der Zählung fehlt in der Quelle.                                                                                         |
| `baseline.marktanteile`                                                                                                                                                                                | LeadPilot-Wert ist eine Obergrenze („< 0,1 %“); als Istwert nicht belegt.                                                         |
| `baseline.kostenstruktur`, `baseline.guv`, `baseline.unit_economics`, `baseline.bilanz`, `baseline.kunden_nach_branche`, `baseline.top_kunden`, `baseline.hr_kennzahlen`, `baseline.produkt_qualitaet` | Werte nur als Text. Strukturierte Werte in den Quellmodulen brauchen einen eigenen Auftrag (`src/domain/` wird hier nur gelesen). |
| `baseline.kosten_vergleich`                                                                                                                                                                            | Vorzeichen uneinheitlich; vor der Darstellung normalisieren.                                                                      |
| `baseline.customer_success`, `baseline.marketing_budget`, `baseline.reichweite`                                                                                                                        | Fachseite nicht geroutet.                                                                                                         |
| `live.arr_mix`, `live.funnel`, `live.verlauf`                                                                                                                                                          | Kein gemeinsamer bestätigter Snapshot bzw. keine vollständige Zeitreihe (Plan §4).                                                |
| Strategie (`CHART_OKR`, `CHART_TREIBER`)                                                                                                                                                               | Plan-/Zielwerte und Schätzungen, nicht als Istwerte anbieten (bleibt „nicht geeignet“).                                           |

## Globale Grenzen

- **Schutzbereiche** (`CLAUDE.md` §6) bleiben unverändert: `src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources`. Keine Migration, keine Änderung an `supabase/`.
- **Nur lesen:** `src/domain/**` (keine Quelländerung), `src/app/**`, Editor-, Speicher- und Navigationshooks.
- **Kein neuer Abhängigkeits-Eintrag.** Keine neue Darstellung, kein neuer Chart-Typ.
- **Gespeicherte Konfigurationen** bleiben gültig: keine aktive ID wird umbenannt oder entfernt.
- **Startbundle** (`Initial JS bundle`, `npx size-limit`): kein Katalog- und kein zusätzlicher Domain-Code im Startbundle; die zusätzlichen Domain-Module landen nur in Lazy-Chunks. Zulässig ist allein das Wachstum der Vorladelisten der vorhandenen Lazy-Importe (unter 0,2 kB gzip).
- **Jede Datei unter 400 physischen Zeilen** (`wc -l`).

## Ziel-Dateien

| Datei                                                                           | Änderung                                                                                                                                                                                              |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/dashboard/model/catalog/extendedEntries.ts` (neu)                 | aktive Einträge aus 078                                                                                                                                                                               |
| `src/features/dashboard/model/catalog/inventoryEntries.ts`                      | freigeschaltete Kandidaten entfernen, Umbenennung `quartal_neukunden_kosten`, Gründe schärfen                                                                                                         |
| `src/features/dashboard/model/dashboardCatalog.ts`                              | `CatalogSource.table` (Zeilentabelle: Beschriftung, Wert, ausgeschlossene Zeilen); `EXTENDED_ENTRIES` in `DASHBOARD_CATALOG` (statt in `activeEntries.ts`, sonst Zirkelimport über `BASELINE_ACCESS`) |
| `src/features/dashboard/model/dashboardValidation.ts`                           | Prüfung: `table` nur bei Ebene `baseline`                                                                                                                                                             |
| `src/features/dashboard/model/dashboardCombinations.ts`                         | `blockedPartnersFor`: nur Einzelwerte und Verhältnisse als naheliegende Partner (Befund beim Bau, siehe unten)                                                                                        |
| `src/features/dashboard/data/baselineSources.ts` (neu)                          | Modulregister der Stammdaten, verschachtelte Datensätze, Zeilentabellen, Prozentwerte                                                                                                                 |
| `src/features/dashboard/data/resolveBaseline.ts`                                | nutzt `baselineSources.ts`; Übersicht `meilensteine`                                                                                                                                                  |
| `src/features/dashboard/data/dashboardData.ts`                                  | `TileOverview` um `meilensteine`                                                                                                                                                                      |
| `src/features/dashboard/components/TileOverview.tsx`                            | Darstellung `meilensteine`                                                                                                                                                                            |
| `src/features/dashboard/__tests__/dashboardCatalog.vitest.ts`                   | Auswahl, Summenprüfungen, Gründe                                                                                                                                                                      |
| `src/features/dashboard/__tests__/dashboardData.vitest.ts`                      | Auflösung der neuen Einträge, Fehlerfälle                                                                                                                                                             |
| `src/features/dashboard/__tests__/dashboardCatalogExtended.vitest.ts` (neu)     | Summen- und Konsistenzprüfungen, Leser in `baselineSources.ts`                                                                                                                                        |
| `src/features/dashboard/__tests__/dashboardCatalogExtended.ui.vitest.tsx` (neu) | jede neue Kachel rendert über `DashboardTile` (Tabelle bzw. Übersicht)                                                                                                                                |
| `src/features/dashboard/__tests__/TileOverview.ui.vitest.tsx`                   | Darstellung `meilensteine`                                                                                                                                                                            |
| `docs/dashboard/KPI_CATALOG.md`                                                 | aktive Einträge, Inventar, Abschnitt „Katalogausbau (Auftrag 078)“                                                                                                                                    |
| `docs/BUILD_LOG.md`, `BUILD_PLAN.md`, dieser Auftrag                            | Ledger und Stand                                                                                                                                                                                      |

## Befund beim Bau

`blockedPartnersFor` bot jede aktive Kennzahl gleicher Einheit und Ebene als „gesperrten“ Kombinationspartner an, auch Reihen. Kombinationen rechnen aber nur mit zwei Einzelwerten. Mit dem Ausbau wären u. a. „Headcount-Verlauf“ bei Headcount und „Marketing-CAC nach Kanal“ bei Marketing-CAC als gesperrt erschienen, mit irreführendem Grund („Unterschiedliche Zeitbasis“); vorher betraf es schon den ARR-Verlauf bei den Umsatzerlösen. Die Funktion berücksichtigt deshalb nur noch Einzelwerte und Verhältnisse. Die freigegebene Positivliste der Kombinationen (Auftrag 076) ist unverändert.

## Tasks

- [x] T1 `baselineSources.ts`: Register `src/domain/<modul>.ts` → Modul, Auflösung `…datasets[i].data` mit beliebigem Präfix, Zeilentabellen (Objekt- und Array-Zeilen), Prozentstrings. Unbekanntes Modul/Export, ungleiche Längen, nicht endliche Werte → `fehler` mit verständlicher Meldung.
- [x] T2 `CatalogSource.table` ergänzen; Katalogprüfung: `table` nur bei Ebene `baseline`.
- [x] T3 Neue aktive Einträge (`extendedEntries.ts`) mit Definition, Einheit, Zeitbasis, Darstellungen, Fachseite, Berechtigung. Anteile mit Kreis/Ring, Kategorien und Zeitreihen ohne Kreis.
- [x] T4 Inventar bereinigen; jede Auslassung behält einen konkreten Grund.
- [x] T5 Übersicht `meilensteine` in Datentyp, Resolver und `TileOverview`; Detailseite zeigt sie über die vorhandene Übersichtsdarstellung.
- [x] T6 Tests: jede neue Kachel löst mit dem dokumentierten Rohwert auf; Summen gegen die Einzelwerte; Fehlerfälle von `baselineSources`.
- [x] T7 `KPI_CATALOG.md` nachziehen.
- [x] T8 Verifikation (`CLAUDE.md` §7, Plan §9), Schutzbereichs-Diff, Zeilenprüfung, BUILD_LOG-Eintrag.

## Gates

- `npx tsc --noEmit`, `npm run verify`, `npm run build`, `npm test`, `npm run lint`, `npm run format:check`, `npm run verify:quality-budget`, `npx size-limit` grün.
- `git diff 90e530d -- src/simulation src/types src/context src/services/data src/features/resources` leer.
- Katalogprüfung (`validateCatalog`) ohne Befund; jede aktive Fachseite existiert in `APP_ROUTES`.
- Keine neue Darstellung, daher keine neue Screenshot-Matrix in 078; die Bildnachweise aller Darstellungen über den ausgebauten Katalog folgen in 079.
