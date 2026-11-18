# Auftrag 169 – Dashboard-Editor: Transformationen je Kachel (Umbenennen, Einheit umrechnen, gleitender Durchschnitt) mit Alarmfähigkeit (P14a)

**Ziel:** Im Panel-Editor lässt sich das Ergebnis einer Kennzahl in wenigen, sicheren Schritten umformen: Anzeigenamen von Serien ändern, Einheit nach einer festen Liste umrechnen (z. B. EUR → Tsd. EUR) und Zeitreihen glätten (gleitender Durchschnitt). Jede Transformation sagt ausdrücklich, ob ein Server-Alarm darauf möglich ist. Alarm ist nur erlaubt, wenn der Server dieselbe Transformation mit demselben Ergebnis rechnet (Paritätstest).

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P14 (§6), §4.B (Transformationen), §4.D (Alarmfähigkeit je Transformation).
**Fachgrundlage:** [ZEITREIHEN_P10B.md](../dashboard/ZEITREIHEN_P10B.md), [SCHWELLENWERTE_P13A.md](../dashboard/SCHWELLENWERTE_P13A.md), `docs/dashboard/ALARME_P13B.md`, [KPI_FAEHIGKEITEN_144.md](../dashboard/KPI_FAEHIGKEITEN_144.md).
**Vorgelagert:** 168 (P13c) ist gemergt; P13 abgeschlossen.
**Baseline:** aktueller `main` nach Merge von 168.
**Branch:** `auftrag-169-transformationen`.
**Builder:** Antigravity (oder ein anderer von Marc benannter Agent). **Prüfer:** unabhängiger Agent nach `CLAUDE.md` §4.1. **Merge und Deploy:** Marc.
**Status:** ENTWURF (wartet auf Merge von 168; Ist-Stand in T0 prüfen).

---

## 0. Aufteilung von P14

| Teil | Auftrag | Inhalt                                                                                                      | Server              |
| ---- | ------- | ----------------------------------------------------------------------------------------------------------- | ------------------- |
| P14a | **169** | Transformationskette je Kachel, drei Transformationsarten, Alarmfähigkeit je Transformation, Server-Parität | ja (Alarmwert)      |
| P14b | 170     | Zeitbezogene Joins zweier Reihen, Vergleichszeitraum, Heatmap, Erwartungsbänder (nach Entscheidung)         | ja (Zeitreihen-RPC) |

## 1. Ist-Stand (in T0 zu bestätigen)

| Baustein      | Ist (geprüft auf `main` = `c138ce2e`, vor 167/168)                                                                                                      | Fundstelle                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Abfragemodell | `TileQueryConfig { metricId, pipelineId, timeframe, aggregation, groupBy, filters, window }`; keine Transformationen.                                   | `model/dashboardConfigV2.ts:49` (391 Zeilen) |
| Zeitreihen    | Server-RPC `dashboard_time_series`; Katalog `crm.phaseneintritte_verlauf`, `crm.gewonnen_verlauf`, 12× `live.<id>.verlauf`; Fenster je Kachel seit 161. | `ZEITREIHEN_P10B.md` §7, §10                 |
| Kombinationen | Positivliste `catalog/combinationRules.ts`, Formeln `combinationEntries.ts`; keine freien Ausdrücke.                                                    | `model/dashboardCombinations.ts`             |
| Alarmwert     | `alarm_kpi_value(p_org, p_catalog_id, p_pipeline)` aus 167 kennt keine Transformation.                                                                  | Migration `20261124_dashboard_alarms.sql`    |
| Formatierung  | `tileFormat.ts` formatiert nach Katalogeinheit, `%` als 0–100.                                                                                          | `components/tileFormat.ts`                   |

## 2. Soll

### 2.1 Fachregeln

1. **Kette statt Formel.** Eine Kachel hat höchstens **drei** Transformationsschritte in fester Reihenfolge der Eingabe. Freie Formeln oder JavaScript gibt es nicht (Masterplan §4.B).
2. **Arten:**
   - `umbenennen`: ändert nur den Anzeigenamen einer Serie oder des Werts (max. 60 Zeichen). Herkunfts- und Aktualitätshinweise bleiben sichtbar und werden nie überschrieben.
   - `einheit_umrechnen`: nur Paare aus einer **festen Liste** mit Faktor und Zielformat, z. B. `EUR → Tsd. EUR` (÷ 1.000), `EUR → Mio. EUR` (÷ 1.000.000), `Anzahl → Tsd.` (÷ 1.000), `Anteil 0–1 → %` (× 100, nur wenn der Katalog die Kennzahl als Anteil 0–1 führt). Keine Umrechnung zwischen `%` und Prozentpunkten, keine Währungsumrechnung. Die Liste liegt in `model/transformations/unitConversions.ts` mit Begründung je Paar.
   - `gleitender_durchschnitt`: nur bei Zeitreihen, Fenster 2–30 Punkte, Ausrichtung „nachlaufend“. Fehlende Punkte werden **nicht** aufgefüllt: Ein Durchschnittspunkt entsteht nur, wenn alle Punkte im Fenster vorhanden sind; sonst Lücke (sichtbar wie in P10b). Die ersten `Fenster − 1` Punkte bleiben leer.
3. **Einheit folgt der Kette.** Die Kachel zeigt die Einheit nach der letzten Umrechnung. Schwellenwerte werden in **dieser** Einheit eingegeben; `threshold.einheit` speichert sie. Ändert sich die Kette so, dass die Einheit wechselt, wird die Regel `regel_ungueltig` (Verhalten aus 166) – nichts wird still umgerechnet.
4. **Alarmfähigkeit je Transformation** (Matrix im Code `model/transformations/transformationAlarm.ts`):
   - `umbenennen`: ändert den Wert nicht → übernimmt die Alarmfähigkeit der Kennzahl.
   - `einheit_umrechnen`: `alarmfaehig`, sobald der Server dieselbe Umrechnung rechnet und der Paritätstest besteht (2.2 Nr. 8).
   - `gleitender_durchschnitt`: Ergebnis ist eine Zeitreihe → kein Einzelwert → kein Alarm (Grund: „Geglättete Verläufe haben keinen einzelnen Wert für einen Alarm.“).
   - Unbekannte oder zukünftige Arten sind standardmäßig **nicht** alarmfähig.
5. **Bestehende Alarme schützen.** Wer an einer Kachel mit aktivem Alarm eine Transformation hinzufügt, die die Alarmfähigkeit aufhebt, sieht vor dem Übernehmen den Hinweis „Der Alarm dieser Kachel wird pausiert.“ Beim Speichern pausiert der Server die Regel (`pause_grund = 'kennzahl_nicht_alarmfaehig'`, vorhanden seit 167). Kein stilles Weiterlaufen mit falschem Wert.
6. **Rechenort.** Transformationen laufen außerhalb des Renderpfads in einer reinen Funktion `applyTransformations(ergebnis, kette)`; bei Zeitreihen über 2.000 Punkte im vorhandenen Worker-Muster, sonst synchron in `useMemo` mit stabilem Schlüssel.
7. **Abwärtskompatibel.** Kacheln ohne Kette verhalten sich unverändert. Das Feld `transformations` ist optional; `formatVersion` des Dashboards bleibt 2. Export/Import (165) übernimmt die Kette; unbekannte Arten beim Import → Ablehnung mit Grund.

### 2.2 Modell, Server, Oberfläche

8. **Server:** neue Migration `supabase/migrations/2026112X_dashboard_transformations.sql` (Nummer nach letzter Migration): Server-Formprüfung von `query.transformations` in `dashboard_config_v2_invalid_reason` (nur Form, Arten aus der Positivliste, max. 3); `alarm_kpi_value` liest die Kette der Kachel und wendet **nur** `einheit_umrechnen` an (gleiche Faktoren als SQL-Tabelle `dashboard_unit_conversions`, Inhalt per Generator aus `unitConversions.ts` erzeugt und mit `--check` geprüft, Muster `generateAlarmParitySql.ts` aus 167). Bestehende Funktionssignaturen bleiben.
9. **Client-Modell:** `TileQueryConfig.transformations?: TileTransformation[]`; Typen, Validierung und `applyTransformations` in `model/transformations/*` (je Datei ≤ 400 Zeilen; `dashboardConfigV2.ts` wächst höchstens um 15 Zeilen).
10. **Referenzfälle** `model/transformations/transformationReferenceCases.json` (mind. 30): jede Umrechnung inkl. Rundung, negative Werte, `0`, große Zahlen; gleitender Durchschnitt mit Lücken, kurzer Reihe, Fenster = Länge, Fenster > Länge; Kette mit drei Schritten; Einheitenwechsel → Schwellenwert ungültig. pgTAP prüft die Umrechnungsfälle gegen den Server.
11. **Panel-Editor:** Abschnitt „Umformen“ mit „Schritt hinzufügen“ (Auswahl der Art, je Art ein Satz Erklärung), Reihenfolge per Tastatur und Ziehen änderbar, Entfernen; Vorschau zeigt vorher/nachher; neben jedem Schritt ein Hinweis „Alarm möglich“ / „Kein Alarm möglich: …“. Gesperrte Arten (z. B. Durchschnitt bei Einzelwert) sind sichtbar, aber deaktiviert mit Grund.
12. **Kachel und Detail:** Ein dezenter Hinweis „umgeformt“ mit Tooltip der Kette; Druckansicht nennt die Kette in der Fußnote.
13. **Vorschau-Szenario** `?bereich=editor_v2&transformationen=1` mit je einer Kachel pro Art und einer Kachel mit pausiertem Alarm nach Transformation.

### 2.3 Tests und Nachweise

14. Vitest (Tests zuerst): Referenzfälle; Validierung (Art, Anzahl, Parameter, Reihenfolge); Einheit folgt Kette und Schwellenwert wird ungültig; Matrix vollständig (jede Art hat Eintrag); Hinweis vor Pausieren; Import lehnt unbekannte Art ab; Leistung: Durchschnitt über 2.000 Punkte < 5 ms, keine zusätzlichen Renders bei unveränderter Kette.
15. pgTAP: Formprüfung; Umrechnung gegen Referenzfälle; `alarm_kpi_value` mit Umrechnung gleich Client; Speichern einer nicht alarmfähigen Kette pausiert die Regel.
16. E2E `e2e/dashboard-transformations-preview.spec.ts` (1440/768/375) und bestehende Editor-, Schwellenwert-, Alarm-, Versions-, A11y- und Visual-Suiten grün.
17. Bundle: Panel-Editor-Teile nur im nachgeladenen Chunk; Initial-JS +0 kB (Toleranz 0,1 kB) und unter 180 kB.
18. Screenshots `docs/screenshots/auftrag-169/README.md`: Abschnitt „Umformen“, Kachel mit Hinweis, Sperrgrund – 1440/768/375, hell/dunkel, 0 px Überlauf.

### 2.4 Dokumentation

19. Neu `docs/dashboard/TRANSFORMATIONEN_P14.md` (Arten, Liste der Umrechnungen mit Begründung, Alarmmatrix, Lückenregel); Masterplan §6 Nachtrag; `ARCHITECTURE_DECISIONS.md` Teil C ergänzen; `BUILD_PLAN.md`, `docs/BUILD_LOG.md`.

## 3. Verbindliche Grenzen

1. Schutzbereiche unverändert. 2. Eine neue Migration; bestehende Migrationen und Funktionssignaturen unverändert. 3. Keine freien Formeln, keine neuen Abhängigkeiten. 4. `max-lines` 400. 5. V1 unverändert. 6. Tests zuerst, Rot-Läufe: (a) Referenzfall `EUR → Tsd. EUR` 1.234.567 → 1.234,567; (b) Durchschnitt mit Lücke im Fenster → Lücke; (c) Schwellenwert nach Einheitenwechsel `regel_ungueltig`; (d) pgTAP Umrechnung im Alarmwert; (e) Kette mit Durchschnitt pausiert aktiven Alarm.

## 4. Ziel-Dateien

| Pfad                                                                                                                                                              | Änderung                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_169_TRANSFORMATIONEN.md`                                                                                                      | Dieser Auftrag             |
| neu `src/features/dashboard/model/transformations/*`, `model/dashboardConfigV2.ts`                                                                                | Modell (2.2 Nr. 9–10)      |
| neu Migration `2026112X_dashboard_transformations.sql`, neu `supabase/tests/dashboard_transformations.sql`, neu Generator `scripts/generateUnitConversionsSql.ts` | Server (2.2 Nr. 8)         |
| Panel-Editor-Komponenten (Fundstelle T0), Kachel-Hinweis, Druck-Fußnote (`components/export/PrintTileCard.tsx`)                                                   | Oberfläche (2.2 Nr. 11–12) |
| `preview/*`, Tests, `e2e/dashboard-transformations-preview.spec.ts`, `.github/workflows/ci.yml` (nur Listen)                                                      | Vorschau, Tests            |
| `scripts/captureAuftrag169GateScreenshots.mjs`, `docs/screenshots/auftrag-169/README.md`, Doku-Dateien aus 2.4                                                    | Nachweise, Doku            |

## 5. Tasks

- [ ] **T0** Baseline, Ist-Tabelle, Fundstellen Panel-Editor, `size-limit`.
- [ ] **T1** Rot-Nachweise §3 Nr. 6.
- [ ] **T2** Modell, Umrechnungsliste, Referenzfälle, `applyTransformations`.
- [ ] **T3** Server: Formprüfung, Umrechnungstabelle per Generator, Alarmwert, Pausieren.
- [ ] **T4** Panel-Editor „Umformen“, Kachel-Hinweis, Druck-Fußnote.
- [ ] **T5** Vorschau, E2E, Bundle, A11y, Screenshots.
- [ ] **T6** Doku, Pflicht-Verifikation, Schutzbereichs-Diff, BUILD_LOG (Smoke für Marc: Pipeline-Volumen in Tsd. EUR umrechnen, Schwellenwert in Tsd. EUR setzen, Alarm einschalten), PR, Review.

## 6. Abnahme

- Drei Transformationsarten, höchstens drei Schritte, keine freien Formeln.
- Einheiten werden nur nach belegter Liste umgerechnet; Prozent/Prozentpunkte nie vermischt.
- Lücken bleiben Lücken; geglättete Verläufe erfinden keine Werte.
- Alarm nur auf Transformationen mit Server-Parität; ein Alarm wird pausiert statt falsch weitergerechnet.
- Bestehende Dashboards unverändert, Bundle im Budget.

## 7. Pflicht-Verifikation

```
npx tsc --noEmit && npm run lint && npm run format:check && npm test && npm run verify && npm run build && npm run build:production && npx size-limit
npx tsx scripts/verifyAlarmCapability.ts && npx tsx scripts/generateAlarmParitySql.ts --check && npx tsx scripts/generateUnitConversionsSql.ts --check
supabase db reset --yes && supabase test db && npm run verify:migrations
npx playwright test e2e/dashboard-transformations-preview.spec.ts e2e/dashboard-alarms*.spec.ts e2e/dashboard-thresholds-preview.spec.ts e2e/editor-*.spec.ts e2e/dashboard-versions*.spec.ts e2e/a11y.spec.ts e2e/visual.spec.ts
git diff <baseline> -- src/simulation src/types src/context src/services/data src/features/resources   # leer
```

## 8. Offene Punkte

- Weitere Umrechnungspaare nur mit Begründung und Referenzfall; jede Erweiterung ist ein eigener kleiner Auftrag.
- Zentrierter gleitender Durchschnitt, Median, Perzentile: bewusst nicht enthalten (Masterplan §4.B: Perzentile brauchen mehr als eine Übersichtszahl).
