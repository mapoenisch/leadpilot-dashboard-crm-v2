# Auftrag 070 – Dashboard Teilauftrag 1: KPI-Inventar und Datenvertrag

**Stand:** 02.10.2026

**Basis:** `main` `d8805d9` (nach PR #47). Plan: `docs/superpowers/plans/2026-10-01-executive-dashboard-plan.md`, Teilauftrag 1. Produktentwurf: `docs/superpowers/specs/2026-10-01-executive-dashboard-design.md`.

**Voraussetzung:** Designfreigabe der Testkachel durch Marc am 02.10.2026 (Stand `f779901`, PR #48, protokolliert im BUILD_LOG). Marc hat Teilauftrag 1 am 02.10.2026 freigegeben („Ja beginne mit Teilauftrag 1“).

**Builder:** Claude Code. **Technischer Prüfer:** Codex. **Merge:** nur Marc.

**Branch:** eigener Arbeitsbranch ab `main`, unabhängig von PR #48 (Plan §1: getrennte Branches; keine gemeinsame Datei mit der Testkachel außer dem Ledger).

## Ziel

Ein maschinenprüfbarer Katalog aller Dashboard-Kandidaten mit Status, Quelle, Zeitbasis, Einheit, Definition, Fachseitenziel und Berechtigung, dazu das versionierte Konfigurationsmodell und die Prüfregeln. Keine Datenauflösung (Teilauftrag 2), keine Speicherung (Teilauftrag 3), keine Oberfläche (Teilaufträge 4 und 5).

## Globale Grenzen

- Schutzbereiche unverändert (`CLAUDE.md` §6). Quellmodule (`src/domain/**`, `src/services/liveKpi/**`, `src/app/**`) werden **nur gelesen**, auch in Tests.
- Keine Simulations-KPIs (Plan §1).
- Der Katalog enthält nur Metadaten, **keine Kopien von Kennzahlenwerten** im Produktivcode (Plan §4). Rohwerte werden im Inventar dokumentiert und in Tests gegen die Quelle geprüft.
- Text- und Bildseiten sind keine Datenquelle; keine Werte aus Screenshots oder Fließtext schätzen.
- Keine neue Abhängigkeit (`CLAUDE.md` §8).

## Ziel-Dateien

| Datei | Änderung |
|---|---|
| `docs/dashboard/KPI_CATALOG.md` | Neu: Inventar aller Kandidaten mit Rohwerten, Zeitbasis, Einheit, Definition, Fachseite, Berechtigung, Status und Grund |
| `src/features/dashboard/model/dashboardCatalog.ts` | Neu: Typen, Darstellungs- und Größenregeln, Katalogzugriff |
| `src/features/dashboard/model/catalog/activeEntries.ts` | Neu: aktive Einträge (erste Auswahl laut Plan) |
| `src/features/dashboard/model/catalog/inventoryEntries.ts` | Neu: Einträge mit Status „aufbereiten“ samt Grund |
| `src/features/dashboard/model/catalog/liveEntries.ts` | Neu: die zwölf aktiven Live-KPIs (Wertquelle `liveKpiStreamStore`) |
| `src/features/dashboard/model/catalog/unsuitableEntries.ts` | Neu: Einträge mit Status „nicht geeignet“ samt Grund |
| `src/features/dashboard/model/dashboardConfig.ts` | Neu: versionierte Kachel- und Filterkonfiguration (Format 1) |
| `src/features/dashboard/model/dashboardValidation.ts` | Neu: Prüfung von Katalog und Konfiguration (reine Funktionen) |
| `src/features/dashboard/__tests__/dashboardCatalog.vitest.ts` | Neu: Katalogtests inklusive Quellennachweis gegen die echten Module |
| `src/features/dashboard/__tests__/dashboardValidation.vitest.ts` | Neu: Konfigurationstests |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_070_DASHBOARD_KPI_KATALOG.md` | Diese Datei |
| `docs/BUILD_LOG.md` | Builder-Eintrag |

Die Aufteilung des Katalogs auf fünf Dateien folgt der 400-Zeilen-Grenze je Datei (Lint). Weitere Dateien nur nach Rückfrage (`CLAUDE.md` §5.3).

## Umsetzung

- [x] Alle Kandidaten aus `execData`, `executiveCockpitData`, `finanzenData`, `vertriebData`, `kundenData`, `organisationData`, `produktData`, `marktData`, `strategieData`, `unternehmenData`, `rechtData`, den übrigen `src/domain/`-Modulen und dem Live-Katalog (`LIVE_KPI_DEFINITIONS`) inventarisieren; ungeeignete Einträge mit konkretem Grund.
- [x] Je Kandidat Rohwerte, Zeitbasis, Einheit, Definition, Fachseitenziel und Berechtigung nachweisen.
- [x] Status setzen: aktiv, aufbereiten, nicht geeignet.
- [x] Erste aktive Auswahl laut Plan: bisherige Executive-Zahlen, ARR-Verlauf, MRR-Paketmix, belegte CRM-Pipelinewerte, 12 Live-IDs, bisherige Übersichtskacheln. Produktkandidaten (`CHART_PRODUKT`, `CHART_CHURN`) bewerten und für Teilauftrag 8 vormerken.
- [x] Tests zuerst: eindeutige IDs, Quelle, erlaubte Formen, keine Simulationseinträge, keine Kreisfreigabe für Funnel-Stufen, `GESELLSCHAFTER` ohne Summenzeile exakt 100 %, ARR-Einzelwert ohne Zeitreihe.
- [x] Modell und Prüfung implementieren; Pflichtgates (Plan §9) ausführen.

## Abnahme

Jeder aktive Eintrag ist auf eine lesbare vorhandene Quelle zurückführbar (Test löst die Quelle auf). ARR als Einzelwert bietet keine Zeitreihe an. Größen- und Darstellungsregeln sind maschinenprüfbar. Codex prüft; Merge nur durch Marc.

## Nicht Teil dieses Auftrags

Datenauflösung, Filterauflösung, Live-Abonnements, Speicherung, Oberfläche, Kombinationsregeln (Teilauftrag 6).
