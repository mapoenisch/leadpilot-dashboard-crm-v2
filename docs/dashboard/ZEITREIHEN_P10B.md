# Server-Zeitreihen für das Executive Dashboard (P10b-1)

**Stand:** 16.11.2026 (Auftrag 160)  
**Status:** Aktiv / Umgesetzt  
**Bezug:** [DASHBOARD_EDITOR_MASTERPLAN.md](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/docs/dashboard/DASHBOARD_EDITOR_MASTERPLAN.md) (Meilenstein P10b-1), [ZEITSTEUERUNG_P10A.md](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/docs/dashboard/ZEITSTEUERUNG_P10A.md), [KPI_FAEHIGKEITEN_144.md](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/docs/dashboard/KPI_FAEHIGKEITEN_144.md).

---

## 1. Fachregeln und Invarianten

1. **Keine Erfindung von Vergangenheitswerten:** Historien werden nur aus tatsächlich aufgezeichneten Tabellenzeilen (`deal_stage_events`, `live_kpi_events`) gebildet.
2. **Flüsse vs. Bestände:** Nur Flüsse (Phaseneintritte, Abschlüsse) können rückwirkend aggregiert werden. Bestände vergangener Zeitpunkte werden niemals aus heutigen Zeilen rekonstruiert.
3. **Explizite Lückensemantik:** Jeder Datenpunkt im Zeitfenster trägt einen diskreten Status:
   - `vor_historienbeginn`: Abschnitt liegt vor dem ersten jemals für diesen Mandanten/Metrik aufgezeichneten Ereignis (`value: null`).
   - `luecke`: Liegt nach Historienbeginn, aber es liegt kein Messwert vor (nur bei Live-Metriken; `value: null`).
   - `belegt`: Ein echter Messwert liegt vor (bei CRM-Flüssen ist auch `value: 0` nach Historienbeginn ein belegter Messwert).
4. **Berliner Kalenderzeit:** Abschnitte (`stunde`, `tag`, `woche`, `monat`) werden strikt in der Zeitzone `Europe/Berlin` geschnitten (inkl. Sommer-/Winterzeit-Umstellung).
5. **Punktgrenze:** Maximale Punktzahl je Abfrage ist 400 Punkte. Mehr Punkte werden fail-closed mit Fehlercode `zu_viele_punkte` abgewiesen.
6. **Mandantenbindung:** Mandantentrennung über `public.current_organization_id()`. Kein Parameter für die Organisation. `SECURITY INVOKER` mit aktiver RLS-Absicherung.

---

## 2. Server-Schnittstelle: RPC `dashboard_time_series`

### 2.1 Signatur

```sql
public.dashboard_time_series(
  p_source text,                      -- 'deal_stage_events' | 'live_kpi'
  p_metric text,                      -- Metrikname, '*' für alle CRM-Phasen oder Live-KPI-ID
  p_resolution text,                  -- 'stunde' | 'tag' | 'woche' | 'monat'
  p_from timestamp with time zone,    -- Startzeitpunkt (inklusive)
  p_to timestamp with time zone,      -- Endzeitpunkt (exklusive)
  p_pipeline text DEFAULT NULL        -- Pipeline-Filter (nur CRM)
) RETURNS jsonb
```

### 2.2 Antwort-Schema

```json
{
  "source": "deal_stage_events",
  "metric": "*",
  "resolution": "woche",
  "from": "2026-08-24T00:00:00+02:00",
  "to": "2026-11-16T00:00:00+01:00",
  "historyStartAt": "2026-09-01T00:00:00+02:00",
  "points": [
    {
      "at": "2026-08-24T00:00:00+02:00",
      "value": null,
      "status": "vor_historienbeginn",
      "measuredAt": null
    },
    {
      "at": "2026-09-21T00:00:00+02:00",
      "value": 14,
      "status": "belegt",
      "measuredAt": null
    }
  ],
  "pipelineBasis": "aktuelle_pipeline_des_deals",
  "generatedAt": "2026-11-16T10:00:00+01:00"
}
```

### 2.3 Fehlercodes

| Fehlercode | Ursache |
|---|---|
| `unbekannte_quelle` | `p_source` nicht in `('deal_stage_events', 'live_kpi')` |
| `unbekannte_aufloesung` | `p_resolution` nicht in `('stunde', 'tag', 'woche', 'monat')` |
| `ungueltiges_zeitfenster` | `p_from >= p_to` |
| `zeitfenster_in_zukunft` | `p_to > now() + interval '60 seconds'` |
| `zu_viele_punkte` | Zeitfenster und Auflösung ergeben > 400 Punkte |
| `pipeline_filter_unzulaessig` | `p_pipeline` bei Live-Quelle gesetzt |
| `metrik_fehlt` | `p_metric` ist leer oder Whitespace |
| `keine_organisation` | Aufruf ohne aktive Mandantensitzung |

### 2.4 Berechtigungen

```sql
REVOKE ALL ON FUNCTION public.dashboard_time_series FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_time_series TO authenticated, service_role;
```

---

## 3. Pipeline-Filter und Kaskadierungsregel (CRM)

1. **Aktuelle Pipeline:** Das Ereignis in `deal_stage_events` verweist auf `deal_id`. Die Zuordnung zur Pipeline erfolgt über `imported_funnel_deals.pipeline`. Ein nachträglicher Pipelinewechsel des Deals verschiebt alle seine historischen Ereignisse in die neue Pipeline. Die Antwort weist dies über `"pipelineBasis": "aktuelle_pipeline_des_deals"` aus.
2. **Kaskadierende Löschung:** Wird ein Deal gelöscht (`ON DELETE CASCADE`), entfallen auch seine historischen Stage-Events.
3. **Transparenz:** Der Inspector weist beide Eigenschaften für den Anwender verständlich aus (`inspector-pipeline-hint`).

---

## 4. Client-Architektur und Cache-Schlüssel

- **Modul:** [resolveTimeSeries.ts](file:///Users/marcpoenisch/Projekte/LeadPilot%20Dashboard-CRM/src/features/dashboard/data/resolveTimeSeries.ts)
- **Cache-Schlüssel:**
  `dashboardQueryKeys.timeSeries(organizationId, userId, source, metric, resolution, from, to, pipeline)`
- **Deduplizierung:** 6 Verlaufskacheln derselben Abfrage auf einem Dashboard erzeugen genau 1 RPC-Aufruf (geprüft in `timeSeriesTiles.vitest.tsx`).
- **Bereinigung:** Bei Organisations- oder Nutzerwechsel werden alle Zeitreihen-Queries ungültig gemacht und entfernt.

---

## 5. Visualisierung: Unterbrochene Pfade & Zonen

- **Keine Interpolation:** `null`-Werte verbinden sich niemals mit benachbarten Punkten.
- **Linienchart (`DepthLineChart`):** `linePath` segmentiert den SVG-Pfad über `M`-Befehle bei `null`-Werten. Gappunkte erhalten gestrichelte Marker an der Nulllinie (`depth-line-point-gap`).
- **Flächenchart (`DepthAreaChart`):** Geschlossene Polygone je zusammenhängendem Segment.
- **Zone „vor Aufzeichnungsbeginn“:** Schraffierter Bereich mit zentriertem Text (`depth-history-zone`).
- **Tabellenansicht (`TileTable`):** Zeigt Textwerte („vor Aufzeichnungsbeginn“, „keine Messung“).
- **Ablesezeile (`ChartReadout`):** Nennt Zeitabschnitt in Berliner Zeit, Messwert oder Erklärung, bei Live-Messwerten den Messzeitpunkt (`measuredAt`).

---

## 6. Zeitsteuerung und Pause (P10a-Integration)

- Verlaufskacheln nehmen an der gemeinsamen Pause teil (`useTimeControlledData`).
- Unter Pause wird die Anzeige eingefroren; automatische Neuladungen bei Fensterfokus und Reconnect sind unterdrückt.
- Fortsetzen invalidiert gezielt die Zeitreihen-Queries der eigenen Organisation (`resumeCrmRefresh.ts`).
- `TileStandLine` zeigt: `Verlauf <Zeitraum>, Stand <Zeitpunkt>`.

---

## 7. Katalogeinträge

| ID | Name | Ebene | Aggregation | Standardfenster |
|---|---|---|---|---|
| `crm.phaseneintritte_verlauf` | Phaseneintritte je Woche | CRM | fluss | 12 Wochen, je Woche |
| `crm.gewonnen_verlauf` | Gewonnene Deals je Woche (Anzahl) | CRM | fluss | 12 Wochen, je Woche |
| `live.<kpiId>.verlauf` (12×) | `<Name> – Verlauf 24 h` | Live | fluss | 24 Stunden, je Stunde |

---

## 8. Bewusste Grenzen

- **Kein Time-Travel in P10b-1:** Feste Fenster laut Katalog; frei konfigurierbare Rolling Windows folgen in Auftrag 161.
- **Kein synchrones Crosshair:** Folgt in Auftrag 161.
- **Keine Bestands-Rekonstruktion:** Historische Bestände bleiben nicht rekonstruierbar.
- **Keine Alarme:** Schwellenwert-Alarme und Benachrichtigungen folgen in P13.
- **Keine Vergleichsbänder:** Vorjahres- oder Budget-Bänder folgen in P14.
