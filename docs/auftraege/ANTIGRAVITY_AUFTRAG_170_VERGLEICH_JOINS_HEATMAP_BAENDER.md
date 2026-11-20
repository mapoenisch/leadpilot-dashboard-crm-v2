# Auftrag 170 – Dashboard-Editor: Vergleichszeitraum, zeitbezogene Verknüpfung zweier Reihen, Heatmap, Erwartungsbänder (P14b)

**Ziel:** Zeitreihen-Kacheln können einen Vergleichszeitraum (z. B. Vorperiode) als zweite Linie zeigen, zwei Reihen über die Zeitachse verknüpfen (z. B. „Gewonnene Deals“ neben „Phaseneintritten“), und eine neue Heatmap zeigt Werte je Woche und Wochentag bzw. je Phase und Woche. Erwartungsbänder kommen **nur**, wenn Marc das Verfahren freigegeben hat (§8), und nur bei ausreichend Daten.

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P14 (§6), §4.B (Joins mit Schlüssel, Typ, Zeitbezug, Größenbegrenzung), §4.C (Historie), §4.D (Vergleichskurven, Erwartungskorridore).
**Fachgrundlage:** [ZEITREIHEN_P10B.md](../dashboard/ZEITREIHEN_P10B.md) (Server-RPC `dashboard_time_series`, Lückenregeln, Fenster je Kachel, Fadenkreuz), `docs/dashboard/TRANSFORMATIONEN_P14.md` (aus 169).
**Vorgelagert:** 169 (P14a) ist gemergt.
**Baseline:** aktueller `main` nach Merge von 169.
**Branch:** `auftrag-170-vergleich-joins-heatmap`.
**Builder:** Antigravity (oder ein anderer von Marc benannter Agent). **Prüfer:** unabhängiger Agent nach `CLAUDE.md` §4.1. **Merge und Deploy:** Marc.
**Status:** UMGESETZT (20.11.2026; Builder Antigravity, nach Kontingent-Abbruch fertiggestellt von Claude Code; Nachweis `docs/BUILD_LOG.md`). Erwartungsbänder am 18.11.2026 nach Vorschlag §8 entschieden.

---

## 1. Ist-Stand (in T0 zu bestätigen)

| Baustein           | Ist (Stand `c138ce2e`)                                                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zeitreihen         | 14 Katalog-Zeitreihen (2 CRM-Fluss je Woche, 12 Live je Stunde); Fenster je Kachel; Lücken sichtbar; keine Bestands-Rekonstruktion; „Keine Vergleichsbänder“ als bewusste Grenze. |
| Heatmap            | Kein Chart-Typ „Heatmap“ vorhanden (`grep -ri heatmap src` leer).                                                                                                                 |
| Vergleichszeitraum | Nicht vorhanden.                                                                                                                                                                  |
| Charts             | Eigene Chart-Primitives unter `components/charts/*` (z. B. `DepthLineChart.tsx`); keine Chart-Bibliothek als Abhängigkeit hinzufügen.                                             |

## 2. Soll

### 2.1 Fachregeln

1. **Vergleichszeitraum** nur für Zeitreihen und nur bei **belegter** Historie: „Vorperiode“ (gleiche Länge direkt davor) und „gleiche Periode Vorjahr“ (nur wenn der Server Daten für den gesamten Zeitraum liefert). Fehlt Historie ganz oder teilweise, zeigt die Kachel die Vergleichslinie nur dort, wo Daten existieren, mit Hinweis „Vergleich unvollständig: Daten ab TT.MM.JJJJ“. Nie aus heutigen CRM-Datensätzen zurückrechnen (Masterplan §4.C).
2. **Abweichung in Prozent** zum Vergleich nur, wenn der Vergleichswert ≠ 0 ist; sonst „nicht berechenbar“. Prozent und Prozentpunkte werden getrennt beschriftet (bei Kennzahlen mit Einheit `%`: Differenz in Prozentpunkten).
3. **Zeitbezogene Verknüpfung (Join)** zweier Katalog-Zeitreihen: Schlüssel ist immer der Zeitstempel des Buckets; erlaubt nur bei **gleicher Auflösung**, gleicher Zeitzone und gleichem Fenster. Join-Typ wählbar: „nur gemeinsame Zeitpunkte“ (inner) oder „alle Zeitpunkte der ersten Reihe“ (links); fehlende Werte bleiben Lücken. Maximal 2 Reihen, maximal 500 Buckets Ergebnis. Unterschiedliche Einheiten → zwei Achsen mit Einheit, nie eine gemeinsame Achse.
4. **Heatmap** (neue Darstellungsart): Raster „Woche × Wochentag“ oder „Phase × Woche“ (`crm.phaseneintritte_verlauf`). Die Aggregation von Stunden- auf Tageswerte richtet sich strikt nach der Messgröße: Echte **Flussgrößen** (z. B. `crm.phaseneintritte_verlauf`, Zuwächse) werden als Tagessumme aggregiert. **Bestandsgrößen** (z. B. `live.arr`, `live.pipeline_leads`) und **Verhältnisse/Ratios** (z. B. `live.pipeline_coverage`) dürfen fachlich niemals summiert werden; für sie gilt als Tageswert der letzte gültige Messwert des Tages (`last_value`, konsistent zu `supabase/migrations/20261119_dashboard_time_series.sql`) oder der Tagesmittelwert (im Konfigurator wählbar/dokumentiert). Farbskala sequenziell aus vorhandenen Tokens, Legende mit Wertebereich, jede Zelle mit Text im zugänglichen Namen; leere Zellen erkennbar als „keine Daten“ (Muster, nicht Farbe allein).
5. **Alarm:** Vergleich, Join und Heatmap liefern keinen Einzelwert → nicht alarmfähig (Matrix aus 169 um diese Arten ergänzen).
6. **Erwartungsband** (nur nach Entscheidung §8): Darstellung erklärt Verfahren und Datenbasis in einem Satz unter der Kachel; ohne ausreichende Daten keine Anzeige, sondern „Zu wenig Daten für ein Erwartungsband (mind. N Punkte)“.

### 2.2 Umsetzung

7. **Server:** Erweiterung über **neue** RPC `dashboard_time_series_compare(p_metric, p_window, p_compare)` bzw. Parameter-Variante, die zwei Fenster in einem Aufruf liefert, inklusive `datenstand_ab` (frühester belegter Zeitpunkt). `dashboard_time_series` bleibt unverändert. Größenbegrenzung serverseitig.
8. **Client:** Abfrage-Erweiterung `query.compare?: 'vorperiode' | 'vorjahr'`, `query.join?: { metricId, typ: 'inner' | 'links' }`; Darstellung `heatmap` im Darstellungs-Katalog; reine Funktionen `alignSeries`, `computeComparison`, `toHeatmapGrid` mit Referenzfällen (`model/timeseries/*ReferenceCases.json`, je ≥ 20 Fälle: Sommerzeitwechsel, Lücken, ungleiche Längen, 0-Vergleichswert, Prozent/Prozentpunkte).
9. **Panel-Editor:** Abschnitt „Vergleichen“ (Vergleichszeitraum, zweite Reihe) mit Sperrgründen; Darstellung „Heatmap“ in der Auswahl nur, wo zulässig.
10. **Fadenkreuz** (aus 161) zeigt bei Vergleich/Join beide Werte am selben Zeitpunkt.
11. **Druckansicht** zeigt Vergleich und Heatmap als Tabelle im Anhang (vorhandenes `PrintAppendixTable.tsx`).
12. **Vorschau-Szenario** `?bereich=editor_v2&vergleich=1`.

### 2.3 Tests und Nachweise

13. Vitest (Tests zuerst) für Nr. 8–10; pgTAP für Nr. 7 (Fenster, Lücken, Rechte, Größenbegrenzung, fremde Organisation); E2E `e2e/dashboard-compare-preview.spec.ts`; bestehende Suiten grün; Leistung: Heatmap mit 52 × 7 Zellen rendert < 16 ms, Join über 500 Buckets < 5 ms.
14. Bundle: neue Chart-Teile nur nachgeladen; Initial-JS +0 kB (Toleranz 0,1 kB).
15. Screenshots `docs/screenshots/auftrag-170/README.md` (1440/768/375, hell/dunkel, 0 px Überlauf).

### 2.4 Dokumentation

16. `ZEITREIHEN_P10B.md` §8 datiert ergänzen („Vergleich/Join/Heatmap umgesetzt in 170“), `TRANSFORMATIONEN_P14.md` erweitern, Masterplan §6 Nachtrag „P14 abgeschlossen“ (bzw. „ohne Bänder“), `ARCHITECTURE_DECISIONS.md` Teil C, `BUILD_PLAN.md`, `docs/BUILD_LOG.md`.

## 3. Verbindliche Grenzen

Schutzbereiche unverändert; eine neue Migration, bestehende RPCs unverändert; keine Chart-Bibliothek, keine neuen Abhängigkeiten; `max-lines` 400; V1 unverändert; Tests zuerst mit Rot-Läufen (Vergleich mit Teilhistorie, Join ungleicher Auflösung abgelehnt, Heatmap-Leerzelle als „keine Daten“, 0-Vergleichswert „nicht berechenbar“, Größenbegrenzung Server).

## 4. Ziel-Dateien

| Pfad                                                                                                               | Änderung       |
| ------------------------------------------------------------------------------------------------------------------ | -------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_170_VERGLEICH_JOINS_HEATMAP_BAENDER.md`                                        | Dieser Auftrag |
| neu Migration `2026112X_dashboard_time_series_compare.sql`, neu `supabase/tests/dashboard_time_series_compare.sql` | Server         |
| `model/dashboardConfigV2.ts` (≤ +15 Zeilen), neu `model/timeseries/*`, Darstellungs-Katalog                        | Modell         |
| neu `components/charts/HeatmapChart.tsx`, Vergleich in vorhandenen Linien-Charts, Panel-Editor, Druck              | Oberfläche     |
| `data/*` nur für die neue RPC (eigene Datei `data/resolveTimeSeriesCompare.ts`)                                    | Datenzugriff   |
| Vorschau, Tests, E2E, CI-Liste, Screenshot-Harness, Doku aus 2.4                                                   | Nachweise      |

## 5. Tasks

- [x] **T0** Baseline, Ist-Tabelle, Chart-Primitives, `size-limit`; Stand der Entscheidung §8 abfragen (BUILD_PLAN/Masterplan).
- [x] **T1** Rot-Nachweise.
- [x] **T2** Server-RPC und pgTAP.
- [x] **T3** Modell und Referenzfälle.
- [x] **T4** Vergleich und Join in Charts, Fadenkreuz.
- [x] **T5** Heatmap.
- [x] **T6** Erwartungsband nach §8 (entschieden 18.11.2026).
- [x] **T7** Vorschau, E2E, Bundle, A11y, Screenshots, Doku, Pflicht-Verifikation, BUILD_LOG, PR, Review.

## 6. Abnahme

- Vergleich nur mit belegter Historie, Lücken und Teilhistorie sichtbar erklärt.
- Joins nur über Zeitstempel bei gleicher Auflösung, mit Größenbegrenzung; Einheiten nie vermischt.
- Heatmap lesbar ohne Farbe allein; leere Zellen eindeutig.
- Keine Alarme auf Vergleich/Join/Heatmap.
- Erwartungsbänder nach dem Verfahren aus §8, nur bei mindestens 8 vollständigen Vorperioden.

## 7. Pflicht-Verifikation

```
npx tsc --noEmit && npm run lint && npm run format:check && npm test && npm run verify && npm run build && npm run build:production && npx size-limit
npx tsx scripts/verifyAlarmCapability.ts
supabase db reset --yes && supabase test db && npm run verify:migrations
npx playwright test e2e/dashboard-compare-preview.spec.ts e2e/dashboard-transformations-preview.spec.ts e2e/editor-*.spec.ts e2e/a11y.spec.ts e2e/visual.spec.ts
git diff <baseline> -- src/simulation src/types src/context src/services/data src/features/resources   # leer
```

## 8. Erwartungsbänder – entschieden am 18.11.2026 (Marc, Empfehlung angenommen)

Masterplan §4.D verlangt ein dokumentiertes Verfahren und genügend Daten. **Vorschlag (Empfehlung):**

| Punkt        | Vorschlag                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Verfahren    | Band aus dem 10. und 90. Perzentil der **gleichen Wochen-/Stundenposition** in den vorangegangenen 8 Perioden (keine Prognose). |
| Mindestdaten | mindestens 8 vollständige Vorperioden; sonst kein Band.                                                                         |
| Anzeige      | Fläche hinter der Linie, Text „Üblicher Bereich der letzten 8 Wochen (10.–90. Perzentil)“.                                      |
| Nicht dabei  | Keine „KI-Anomalieerkennung“, keine Alarme auf das Band.                                                                        |

**Alternativen:** (a) Bänder ganz weglassen, P14 ohne Bänder abschließen; (b) gleitender Mittelwert ± 2 Standardabweichungen (einfacher, aber empfindlich gegen Ausreißer).

**Entscheidung:** Verfahren wie in der Tabelle oben (10.–90. Perzentil der gleichen Position in den letzten 8 vollständigen Perioden, mind. 8 Perioden, keine Alarme auf das Band). Die Alternativen (a) und (b) entfallen. T6 wird damit regulär gebaut; Referenzfälle: genau 7 Perioden → kein Band, 8 → Band, Lücke in einer Periode → Periode zählt nicht.
