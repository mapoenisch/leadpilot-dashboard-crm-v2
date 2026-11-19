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

---

## 4. Server-Architektur & Trigger-Schutz

- **Tabelle:** `public.dashboard_unit_conversions` mit RLS (`auth.uid() IS NOT NULL`, `authenticated, service_role`).
- **Trigger:** `trg_dashboard_alarm_transformations` auf `public.dashboards`:
  - Prüft bei jedem `UPDATE` oder `INSERT` der Dashboard-Konfiguration V2, ob Kacheln mit Alarmen nicht alarmfähige Transformationen enthalten.
  - Pausiert betroffene Regeln in `public.dashboard_alarm_rules` atomar mit `pause_grund = 'kennzahl_nicht_alarmfaehig'`.
- **Worker:** `evaluate_dashboard_alarms` wendet kachelspezifische Transformationen über `alarm_apply_transformations` vor dem Schwellenwert-Vergleich an. Zwei Kacheln mit gleicher Kennzahl, aber unterschiedlichen Einheiten (z. B. EUR vs. Tsd. EUR) werden deterministisch und unabhängig korrekt ausgewertet.
