# Abfragevertrag und Vollbestandsaggregation (P08a)

Dokumentiert die Vereinbarungen und Verträge aus **Auftrag 154 (P08a – Dashboard-Editor: Abfragevertrag und Vollbestandsaggregation)**.

---

## 1. Das kanonische Kachelabfrage-Objekt (`tile.query`)

Die Kachelabfrage `tile.query` ist der **Single Source of Truth** für Metrik, Datenfilter, Zeitbezug, Aggregation und Gruppierung einer Kachel im Dashboard-Editor V2.

```typescript
export interface TileQueryConfig {
  metricId: string;
  pipelineId?: string | null;
  timeframe?: string;
  aggregation?: string;
  groupBy?: string[];
  filters?: Record<string, unknown>;
}
```

### 1.1 Feldbedeutungen und Erbregeln

1. **`metricId`** (erforderlich):
   - Entspricht der Identifikations-ID des aktiven Katalogeintrags (`catalogId`).
   - Mismatch zwischen `tile.catalogId` und `query.metricId` ist unzulässig (`metrik_abweichend`).

2. **`pipelineId`** (optional, nur CRM-Kennzahlen):
   - `undefined`: **Erben** von der globalen Dashboard-Pipeline (`globalPipeline`).
   - `null`: Ausdrücklich **alle Pipelines** (keine Pipeline-Einschränkung).
   - `string`: Feste Zuweisung zu einer spezifischen Pipeline (z. B. `"Standard-Pipeline"`).
   - Für Nicht-CRM-Metriken (Stammdaten, Live, Kombinationen) ist `pipelineId` unzulässig (`filter_unzulaessig`).

3. **`timeframe`** (optional):
   - Zulässige kanonische Werte: `'fest'`, `'aktuell'`, `'live'`.
   - Veraltete Zeiträume aus P07 (z. B. Datumsspannen `'2025-01-01/2025-12-31'`) werden bei der Normalisierung auf den kanonischen Zeitbezug des Katalogs überführt.

4. **`aggregation`** (optional):
   - Bestimmt die Aggregationsform der Metrik (`'letzter_stand'`, `'summe'`, `'verhaeltnis'`, `'keine'`).
   - Ein Bestand (`shape: 'bestand'`) darf niemals über die Zeit aufsummiert werden (`aggregation_unzulaessig`).

5. **`groupBy`** (optional):
   - Aktuell ausschließlich für CRM-Stufenmetriken (`crm.pipeline_stufen_volumen`, `crm.pipeline_stufen_deals`) zulässig mit dem einzigen Wert `['stage']`.

6. **`filters`** (optional):
   - Aktuell reserviert als leeres Objekt `{}` für zukünftige Transformationen (P14). Nicht-leere Filterobjekte werden abgewiesen.

---

## 2. Normalisierung und Rückwärtskompatibilität

- **Legacy-Overrides:** Frühere Felder (`timeframeOverride`, `pipelineOverride`, `aggregationOverride`) werden ausschließlich beim Laden oder Importieren von V1/P07 gelesen und sofort in `query` überführt.
- **Speicherpfad:** `prepareConfigForStorage` und `dashboardMigrationV1V2` schreiben ausschließlich das normalisierte `query`-Feld und entfernen alte Overrides restlos.
- **P07-Migrationsartefakte:** Wurde `pipelineId` bei der initialen P07-Migration nur statisch von der globalen Pipeline kopiert (erkennbar an `metadata.migrated_from_v1` ohne explizites Override), wird es wieder als "erben" (`undefined`) normalisiert.

---

## 3. Grenze zwischen Struktur- und Fachprüfung

| Ebene               | Prüfinstanz                                              | Prüfumfang                                                                                                                                                                                                           |
| ------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Strukturprüfung** | PostgreSQL-Funktion `dashboard_config_v2_invalid_reason` | Validiert JSON-Typen, erlaubte Top-Level-Keys in `query`, maximale Längen, `metricId === catalogId`, `filters === {}`, `groupBy` maximal `['stage']`. Lässt alte P07-Revisionen ohne `query` rückwärtskompatibel zu. |
| **Fachprüfung**     | TypeScript `validateTileQuery` & `getQueryCapabilities`  | Validiert semantische Erlaubnisse gegen die 48 aktiven Katalogeinträge: Darf die Kennzahl Pipelines filtern? Darf sie aggregiert werden? Darf sie gruppiert werden? Welcher Zeitbezug ist fachlich korrekt?          |

### Typisierte Fehlercodes (Client-Validierung)

- `metrik_abweichend`
- `aggregation_unzulaessig`
- `filter_unzulaessig`
- `gruppierung_unzulaessig`
- `zeitraum_unzulaessig`
- `unbekanntes_feld`
- `typ_ungueltig`

---

## 4. Vollbestandsaggregation über PostgreSQL-RPC

### 4.1 RPC-Signatur

```sql
public.dashboard_crm_pipeline_overview(p_pipeline TEXT DEFAULT NULL) RETURNS JSONB
```

- **Modus:** `SECURITY INVOKER`, `STABLE`, `search_path = public, pg_temp`.
- **Rechte:** `REVOKE ALL FROM PUBLIC, anon; GRANT EXECUTE TO authenticated, service_role;`.
- **Mandantensicherheit:** Wirft `LP_NOT_MEMBER` (`ERRCODE '42501'`) bei fehlender aktiver Mitgliedschaft.
- **Datenvalidierung:** Wirft `LP_CRM_INVALID_DEAL` (`ERRCODE '22023'`) bei negativen Deal-Beträgen oder leerer Stufe.

### 4.2 Paritätsregeln mit `getPipelineOverview`

1. Rechnet über den gesamten RLS-sichtbaren Dealbestand ohne Zeilenbegrenzung (bricht die frühere 1.000er-Kappung des Client-Repositories).
2. `amount NULL` wird als 0 gewertet.
3. Klassifizierung:
   - Gewonnen: `lower(btrim(stage)) LIKE '%gewonnen%'`
   - Verloren: `lower(btrim(stage)) LIKE '%verloren%'`
   - Offen: weder gewonnen noch verloren
4. Stufen-Berechnung:
   - `sharePercent = round((volume / totalVolume) * 100)` (0 bei Gesamtsumme 0).
5. **Deterministischer Tie-Break (PostgreSQL & TypeScript identisch):**
   1. Volumen absteigend (`volume DESC`)
   2. Deal-Anzahl absteigend (`count DESC`)
   3. Stufenname aufsteigend nach Byte-Reihenfolge (`stage COLLATE "C" ASC` / `a.stage < b.stage ? -1 : 1`)

---

## 5. Client-Datenpfad und Cache-Vertrag

- **Datenquelle `crmAggregateSource.ts`:**
  - Supabase konfiguriert: Ruft RPC `dashboard_crm_pipeline_overview` auf.
  - Supabase nicht konfiguriert (Offline / Snapshot): Fallback auf `getPipelineOverview` im Browser.
- **Cache-Schlüssel:**
  ```typescript
  dashboardQueryKeys.crmOverview(organizationId, userId, pipeline ?? null);
  ```
  - Kacheln mit identischer effektiver Pipeline teilen sich denselben Abruf (24 Kacheln über 3 Pipelines = genau 3 RPC-Calls).
  - Bei Benutzerwechsel, Organisationswechsel oder Abmeldung wird der Cache invalidiert; keine alten Mandantendaten bleiben sichtbar.

---

## 6. Ausdrückliche Abgrenzung (Out of Scope für P08a)

- **Freie Zeitfenster:** Dynamische Datumsfilterung (z. B. nach `closeDate` oder `stage_entered_at`) ist Gegenstand von **P10**.
- **Erweiterte Transformationen / Benutzerfilter:** Komplexe Filteroperatoren (`filters`) sind Gegenstand von **P14**.
- **Schwellwertalarme:** Alarmierung auf Kacheln ist Gegenstand von **P13**.

---

## 7. Nachtrag (18.11.2026, Auftrag 161/164 – P10): Kachelspezifisches Zeitfenster (`query.window`)

Mit den Aufträgen 161 und 164 (P10b-2 und Restpunkte) wurde der Abfragevertrag um `tile.query.window` erweitert:

- **Konfigurationsstruktur:** `tile.query.window` akzeptiert ein Objekt mit genau den Schlüsseln `count` (Ganzzahl $\ge 1$) und `resolution` (`'stunde' | 'tag' | 'woche' | 'monat'`), beispielsweise `{ count: 7, resolution: 'tag' }` oder `{ count: 12, resolution: 'monat' }`. Reine Stringwerte wie `'7d'` oder zusätzliche Schlüssel sind unzulässig und werden von `validateTileQuery` abgewiesen (`typ_ungueltig`).
- **Fallback-Semantik:** Fehlt `tile.query.window` in der Kachelabfrage, greift der Datenpfad (`timeSeriesWindow`) auf das im Katalog hinterlegte Standardfenster der Kennzahl zurück (`entry.history.defaultWindow`).
- **Analysezeitpunkt:** Im flüchtigen Zeitsteuerungsmodus `zeitpunkt` (`TimeControlState.mode === 'zeitpunkt'`) ist `analysisAt` (UTC-ISO-String) gesetzt. Die Abfrageauflösung berechnet das Zeitfenster dann deterministisch rückblickend ab `analysisAt` statt flüchtig ab `now()`. Pausieren und Analysezeitpunkt sind reine flüchtige Anzeigezustände und werden nie in der Konfiguration persistiert.
- **Validierung & Grenzen:** Höchstgrenzen für `count` je Datenquelle und Auflösung sind in TypeScript (`validateTileQuery`) und serverseitig in SQL (Migration `20261120_dashboard_query_window.sql` via `dashboard_config_v2_invalid_reason`) einheitlich verankert (siehe `ZEITREIHEN_P10B.md` §10: CRM Tag $\le$ 366, Woche $\le$ 260, Monat $\le$ 120; Live Stunde $\le$ 168, Tag $\le$ 366).
