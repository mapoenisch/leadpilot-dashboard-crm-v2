# Kachel-Transformationen im Executive Dashboard (P14a / Auftrag 169)

## 1. Übersicht & Prinzipien

1. **Kette statt Formel:** Eine Kachel hat höchstens **drei** Transformationsschritte in fester Reihenfolge der Eingabe. Freie Formeln oder unkontrolliertes JavaScript existieren nicht (Masterplan §4.B).
2. **Drei erlaubte Transformationsarten:**
   - `umbenennen`: Ändert ausschließlich den Anzeigenamen einer Serie oder des Werts (1–60 Zeichen). Herkunfts- und Aktualitätsmetadaten bleiben unverändert sichtbar.
   - `einheit_umrechnen`: Nur Paare aus einer festen, begründeten Positivliste mit Faktor und Zielformat. Server-Parität via Tabelle `dashboard_unit_conversions`.
   - `gleitender_durchschnitt`: Ausschließlich bei Zeitreihen (Ereignisverlauf), Fenster 2–30 Datenpunkte, nachlaufend.
3. **Lückenregel (§2.1 Nr. 2):**
   - Fehlende Punkte werden **nicht** interpoliert oder erfunden.
   - Ein Durchschnittswert entsteht nur, wenn alle Punkte im nachlaufenden Fenster belegt sind.
   - Tritt im Fenster mindestens eine Lücke auf, ist der resultierende Punkt ebenfalls eine Lücke (`status: 'luecke'`, `value: null`).
   - Die ersten `Fenster - 1` Punkte bleiben systembedingt leer.
4. **Einheit folgt der Kette:**
   - Die Kachel zeigt die Einheit nach der letzten Umrechnung an.
   - Schwellenwerte werden in **dieser** transformierten Einheit eingegeben und gespeichert (`threshold.einheit`).
   - Wechselt die Kette so, dass sich die Zieleinheit ändert, wechselt die Schwellenwert-Regel deterministisch zu `regel_ungueltig` (Verhalten aus Auftrag 166). Nichts wird still falsch weitergerechnet.
5. **Alarmfähigkeit je Transformation:**
   - `umbenennen`: Erbt die Alarmfähigkeit der zugrundeliegenden Kennzahl.
   - `einheit_umrechnen`: Alarmfähig dank deterministischer Server-Parität (`alarm_apply_transformations`).
   - `gleitender_durchschnitt`: Nicht alarmfähig („Geglättete Verläufe haben keinen einzelnen Wert für einen Alarm.“).
   - Unbekannte/zukünftige Arten sind standardmäßig nicht alarmfähig.
6. **Bestehende Alarme schützen (§2.1 Nr. 5):**
   - Wird an einer Kachel mit aktivem Alarm eine Transformation hinzugefügt, die die Alarmfähigkeit aufhebt (z. B. gleitender Durchschnitt), warnt der Inspector vorab: *„Der Alarm dieser Kachel wird pausiert.“*
   - Beim Speichern setzt der Trigger `trg_dashboard_alarm_transformations` den Alarmstatus automatisch auf `pausiert` mit `pause_grund = 'kennzahl_nicht_alarmfaehig'`.

---

## 2. Feste Positivliste der Einheitenumrechnungen

Liegt synchron im Client (`model/transformations/unitConversions.ts`) und in SQL (`dashboard_unit_conversions`):

| Ausgangseinheit | Zieleinheit | Operation | Operand | Faktor | Begründung |
|---|---|---|---|---|---|
| `EUR` | `Tsd. EUR` | divide | 1.000 | 0.001 | Übersichtlichere Darstellung hoher Euro-Beträge in Tausend Euro. |
| `EUR` | `Mio. EUR` | divide | 1.000.000 | 0.000001 | Übersichtlichere Darstellung großer Euro-Beträge in Millionen Euro. |
| `Anzahl` | `Tsd.` | divide | 1.000 | 0.001 | Kompakte Darstellung großer Stückzahlen in Tausend. |
| `Anteil 0–1` | `%` | multiply | 100 | 100 | Umrechnung von Dezimalanteilen (0.0 bis 1.0) in lesbare Prozentwerte. |

*Hinweis:* Es gibt bewusst keine Umrechnung zwischen Prozent und Prozentpunkten und keine Währungsumrechnungen.

---

## 3. Alarmfähigkeits-Matrix

| Art | Alarmfähig? | Begründung / Verhalten |
|---|---|---|
| `umbenennen` | Ja (geerbt) | Ändert den Kennzahlenwert nicht. |
| `einheit_umrechnen` | Ja | Server rechnet denselben Faktor in `alarm_apply_transformations`. |
| `gleitender_durchschnitt` | Nein | Geglättete Verläufe haben keinen einzelnen Wert für einen Alarm. |
| *unbekannt* | Nein | Standardmäßig nicht alarmfähig. |
| Vergleich (`query.compare`, Auftrag 170) | Nein | Zwei Reihen statt eines Einzelwerts. Trigger pausiert aktive Regeln. |
| Zweite Reihe (`query.join`, Auftrag 170) | Nein | Zwei Reihen statt eines Einzelwerts. Trigger pausiert aktive Regeln. |
| Darstellung `heatmap` (Auftrag 170) | Nein | Raster statt Einzelwert. Trigger pausiert aktive Regeln. |
| Erwartungsband (`query.bands`, Auftrag 170) | Kein Alarm auf das Band | Das Band ist eine Lesehilfe, keine Schwelle (Auftrag 170 §8). |

---

## 4. Server-Architektur & Trigger-Schutz

- **Tabelle:** `public.dashboard_unit_conversions` mit RLS (`auth.uid() IS NOT NULL`, `authenticated, service_role`).
- **Trigger:** `trg_dashboard_alarm_transformations` auf `public.dashboards`:
  - Prüft bei jedem `UPDATE` oder `INSERT` der Dashboard-Konfiguration V2, ob Kacheln mit Alarmen nicht alarmfähige Transformationen enthalten.
  - Pausiert betroffene Regeln in `public.dashboard_alarm_rules` atomar mit `pause_grund = 'kennzahl_nicht_alarmfaehig'`.
- **Worker:** `evaluate_dashboard_alarms` wendet kachelspezifische Transformationen über `alarm_apply_transformations` vor dem Schwellenwert-Vergleich an. Zwei Kacheln mit gleicher Kennzahl, aber unterschiedlichen Einheiten (z. B. EUR vs. Tsd. EUR) werden deterministisch und unabhängig korrekt ausgewertet.

---

## 5. Vergleich, zweite Reihe, Heatmap und Erwartungsband (Auftrag 170 / P14b, 20.11.2026)

**Abfrage:** `query.compare?: 'vorperiode' | 'vorjahr'`, `query.join?: { metricId, typ: 'inner' | 'links' }`, `query.bands?: { type: 'percentile_10_90', periodCount: 8 }`. Nur für Zeitreihen. Client (`model/timeseries/timeSeriesQuery.ts`, `validateTileQuery`) und Server (`dashboard_config_v2_invalid_reason`) prüfen dieselben Regeln. Beim Speichern bleiben die Angaben erhalten (`normalizeTileQuery`).

**Kombinationsregel:** Vergleich, zweite Reihe und Band sind nicht mit `einheit_umrechnen` oder `gleitender_durchschnitt` kombinierbar, weil sonst Basis und Vergleich in verschiedenen Einheiten oder Glättungen gezeichnet würden. `umbenennen` bleibt erlaubt. Der Inspector zeigt den Sperrgrund, Client und Server lehnen die Kombination ab.

**Server:**
- `dashboard_time_series_compare(p_source, p_metric, p_resolution, p_from, p_to, p_compare, p_pipeline)` liefert Basis und Vergleichsfenster in einem Aufruf, dazu `datenstand_ab`, `is_partial` und `partial_reason` („Vergleich unvollständig: Daten ab TT.MM.JJJJ“). Vorperiode = gleiche Anzahl Abschnitte direkt vor dem Fenster (kalendergenau in Europe/Berlin), Vorjahr = gleiches Fenster ein Jahr früher.
- `dashboard_time_series_phases(p_resolution, p_from, p_to, p_pipeline)` liefert Phaseneintritte je Phase (sieben normalisierte Phasen) für die Heatmap „Phase × Woche“.
- Beide rufen das unveränderte `dashboard_time_series` auf: gleiche Rechte (aktive Mitgliedschaft, eigene Organisation), gleiche Lückenregeln, höchstens 400 Punkte je Fenster. Nie Rückrechnung aus heutigen CRM-Daten.

**Rechenkern (reine Funktionen, je ≥ 20 Referenzfälle in `model/timeseries/*ReferenceCases.json`):**
- `computeComparison`: Abweichung absolut und in Prozent; Prozent nur bei Vergleichswert ≠ 0, sonst „nicht berechenbar“. Bei Einheit `%` wird die Differenz in Prozentpunkten (`Pp.`) beschriftet.
- `alignSeries`: Schlüssel ist der Zeitstempel (als Zeitpunkt, nicht als Text), nur gleiche Auflösung, Typ „nur gemeinsame Zeitpunkte“ oder „alle Zeitpunkte der ersten Reihe“, höchstens 500 Abschnitte. Andere Einheit der zweiten Reihe → eigene rechte Achse, nie gemeinsame Achse.
- `toHeatmapGrid`: Kalender in Europe/Berlin, unabhängig von der Rechner-Zeitzone. Flussgrößen als Tagessumme, Bestände und Verhältnisse als letzter gültiger Wert des Tages (`last_value`, wie der Server bei Tagesauflösung). Leere Zellen „Keine Daten“ mit Schraffur (Muster, nicht Farbe allein).
- `calculateExpectationBands`: 10. und 90. Perzentil der gleichen Position in den letzten 8 vollständigen Vorperioden; Perioden mit Lücke zählen nicht; Periode je Auflösung: Stunde → Tag (24 Positionen), Tag → Woche (7), Woche → Woche (1), Monat → Monat (1). Geladen werden 12 Vorperioden über `dashboard_time_series`.

**Heatmap-Daten:** „Woche × Wochentag“ lädt 84 abgeschlossene Tage in Tagesauflösung; „Phase × Woche“ (nur `crm.phaseneintritte_verlauf`) zwölf Wochen über die Phasen-RPC. Für die Heatmap sind Vergleich, zweite Reihe und Band gesperrt.

**Anzeige:** Vergleich gestrichelt (Token `neutral`), zweite Reihe gepunktet (Token `secondary`), Band als Fläche (Token `glow`/`border`), Heatmap in fünf Stufen der vorhandenen Türkis-Abstufung (`SERIES_COLORS`). Das Fadenkreuz nennt beide Werte am selben Zeitpunkt. Druckansicht: Vergleich, zweite Reihe und Heatmap als Tabellenzeilen im Anhang.
