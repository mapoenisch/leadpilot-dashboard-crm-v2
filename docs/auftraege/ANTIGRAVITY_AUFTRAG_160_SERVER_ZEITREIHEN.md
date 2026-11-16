# Auftrag 160 – Dashboard-Editor: Belegte Server-Zeitreihen, Historienbeginn und Datenlücken (P10b-1)

**Ziel:** Das Dashboard liest erstmals dauerhafte, belegte Historie vom Server. Ein neuer, mandantengebundener RPC liefert Zeitreihen aus `deal_stage_events` (nur Flussgrößen: Phaseneintritte) und aus `live_kpi_public_feed` (gemessene Live-Werte). Jede Zeitreihe nennt ihren Historienbeginn je Organisation, ihre Auflösung und ihre Lücken. Leere Zeitabschnitte bleiben sichtbar leer, nichts wird interpoliert oder aufgefüllt. Zwei neue CRM-Flusskennzahlen und ein Server-Verlauf für Live-Kennzahlen machen das im Editor nutzbar. Time-Travel, Rolling Windows und Shared Crosshair folgen in P10b-2 (Auftrag 161).

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P10 (§6), §4.C (Live- und Zeitsteuerung), Absatz „Echte CRM-Historie“ (Ereignisse, Flussgrößen, Bestandsgrößen) und „Vorgaben für Auftrag 160“. **Plananpassung (Teil dieses Auftrags, T11):** P10b wird geteilt: 160 = P10b-1 (dieser Auftrag: Server-RPC, Historienbeginn, Auflösung/Punktobergrenze, Lücken, erste Verlaufskacheln), 161 = P10b-2 (Time-Travel `mode: 'zeitpunkt'`, Rolling Windows je Kachel, Shared Crosshair Europe/Berlin). Anlass: `DashboardEditorShellV2.tsx` (399 Zeilen) und `EditorTopBarV2.tsx` (393 Zeilen) stehen an der `max-lines`-Grenze 400, das Initial-Bundle liegt bei 178,77 kB von 180 kB. Server-Schicht und Bedienoberfläche getrennt zu bauen hält beide PRs prüfbar. Die P10-Abnahme gilt erst mit 161.
**Fachgrundlage:** [ZEITSTEUERUNG_P10A.md](../dashboard/ZEITSTEUERUNG_P10A.md) (Historienarten, Zeitsteuerung), [KPI_FAEHIGKEITEN_144.md](../dashboard/KPI_FAEHIGKEITEN_144.md) (Bestands-/Flussregeln), [ABFRAGEVERTRAG_P08A.md](../dashboard/ABFRAGEVERTRAG_P08A.md) §1/§5 (`timeframe`, Cache-Schlüssel), Migrationen `20261110_deal_stage_tracking.sql` (137) und `20261115_live_kpi_tenant_binding.sql` (153), RPC-Muster `dashboard_crm_pipeline_overview` in `20261116_dashboard_query_contract.sql`.
**Vorgelagert:** 159 (P10a, PR #187, gemergt als `d83e3e66`).
**Baseline:** `d83e3e66` (Merge-Commit von Auftrag 159 in `main`).
**Branch:** `auftrag-160-server-zeitreihen`.
**Builder:** Antigravity. **Prüfer:** Codex auf GitHub (oder ein anderer Agent, der nicht gebaut hat) gemäß `CLAUDE.md` §4.1. **Merge und Hosted-Deployment der Migration:** Marc.
**Status:** OFFEN.

---

## 1. Ist-Stand (geprüft auf `main` `d83e3e66`)

| Baustein                | Ist                                                                                                                                                                                                                                                                                 | Fundstelle                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Phasenwechsel-Historie  | `deal_stage_events` (id, `organization_id`, `deal_id`, `from_stage`, `to_stage`, `actor_id`, `occurred_at`), unveränderlich, RLS „eigene Organisation + aktives Mitglied“, Index `(organization_id, occurred_at DESC)`. Schreiben nur über `move_deal_stage`. Kein Dashboard-Leser. | `supabase/migrations/20261110_deal_stage_tracking.sql:19–45`                                               |
| Pipeline je Deal        | `imported_funnel_deals.pipeline TEXT NOT NULL`; Ereignisse tragen keine Pipeline, nur `deal_id`.                                                                                                                                                                                    | `supabase/schema.sql:71`                                                                                   |
| Live-Messwerte          | `live_kpi_public_feed` (`organization_id`, `kpi_id`, `value NUMERIC`, `occurred_at`, `ingested_at`), RLS mandantengebunden, Index `(organization_id, kpi_id, occurred_at DESC, ingested_at DESC)`. Keine Bereinigung: alle Messwerte seit Inbetriebnahme bleiben erhalten.          | `20260907_live_kpi_read_layer.sql:18–28`, `20261115_live_kpi_tenant_binding.sql:74–76, 350–370`            |
| Browser-Puffer          | Initialabruf der letzten 30 Minuten, `RETENTION_MS = 60_000` für Kanal-Abbau, höchstens 30 Punkte je KPI. Keine dauerhafte Historie im Browser.                                                                                                                                     | `src/services/liveKpi/liveKpiStreamStore.ts:98, 302–308`                                                   |
| Historienmatrix         | 48 aktive Einträge: 29 `fest`, 13 `puffer`, 6 `keine`, 0 `ereignisse`. Der Typ `HistoryCapability` kennt `ereignisse` mit `source: 'deal_stage_events' \| 'live_kpi_events'` bereits.                                                                                               | `model/historyCapability.ts`, `__tests__/catalogHistory.vitest.ts`, Fixture `catalogHistory.snapshot.json` |
| Zeitsteuerung           | `TimeControlState { mode: 'live' \| 'pausiert'; analysisAt; resumeToken }`, flüchtig, nicht gespeichert. Pause friert Live, CRM und Stammdaten ein.                                                                                                                                 | `time/timeControl.ts`, `time/useTimeControlledData.ts`                                                     |
| Kacheldaten             | `ResolvedTileData.series: { label: string; value: number }[] \| null`. Kein Zeitstempel je Punkt, keine Lückenangabe, kein Historienbeginn.                                                                                                                                         | `data/dashboardData.ts:36–52`                                                                              |
| Linien-/Flächendiagramm | `DepthLineChart`, `DepthAreaChart`, `DepthSparklineChart` nehmen `DatumInput { label; value }`. Lücken (fehlende Werte) sind nicht darstellbar.                                                                                                                                     | `components/charts/depthGeometry.ts:4–7`, `chartTypes.ts`                                                  |
| Live-Katalog            | 12 Live-Einträge mit `views: ['zahl', 'tabelle']`, `history: HISTORY_PUFFER`.                                                                                                                                                                                                       | `model/catalog/liveEntries.ts:24–47`                                                                       |
| Zeitbezug der Kachel    | `tile.query.timeframe` nur `fest` / `aktuell` / `live` (P08a); `globalTimeframe` ist Text mit Standard `letzte_30_tage`, wird von keinem Datenpfad ausgewertet. Die SQL-Validierung `dashboard_config_v2_invalid_reason` prüft diese Felder.                                        | `model/dashboardConfigV2.ts:44–52, 109, 344`; `20261116_dashboard_query_contract.sql:11–285`               |
| Bundle und Dateigrößen  | Initial-Bundle 178,77 kB (Grenze 180 kB). Shell 399, Top-Bar 393 Zeilen (Grenze 400).                                                                                                                                                                                               | `.size-limit.json`, BUILD_LOG Auftrag 159                                                                  |

Der Builder prüft diese Tabelle in T0 gegen `main` und trägt Abweichungen in den BUILD_LOG ein. In T0 prüft er zusätzlich per `supabase test db` lokal, dass `deal_stage_events` und `live_kpi_public_feed` wie beschrieben angelegt sind.

## 2. Soll

### 2.1 Fachregeln (verbindlich, gehören in die Spezifikation)

1. **Nur Belegtes.** Ein Zeitreihenpunkt existiert nur, wenn im Zeitabschnitt mindestens ein Ereignis bzw. Messwert vorliegt. Abschnitte ohne Beleg sind Lücken (`null`), keine Nullwerte und keine Interpolation.
2. **Flüsse statt Bestände (CRM).** Aus `deal_stage_events` werden ausschließlich Zählungen von Phaseneintritten je Zeitabschnitt gebildet (`count(*)` je `to_stage`). Beträge (`amount`) werden **nicht** summiert, weil sie nachträglich geändert werden können und das Ereignis den damaligen Betrag nicht speichert. Bestände (Pipeline-Volumen, offene Deals zum Zeitpunkt X) bleiben nicht rekonstruierbar.
   - **Ausnahme Nullwert bei CRM-Flüssen:** Nach dem Historienbeginn bedeutet ein Abschnitt ohne Phaseneintritt fachlich „0 Eintritte“, weil jeder Wechsel zwingend über `move_deal_stage` ein Ereignis schreibt. CRM-Flussreihen füllen deshalb Abschnitte **ab** `historyStartAt` mit `0`; Abschnitte **vor** `historyStartAt` sind Lücken. Grenze, in der Spezifikation zu nennen: Deals, die per Import (HubSpot/CSV) angelegt oder verschoben werden, schreiben kein Ereignis und erscheinen daher nicht als Eintritt. Live-Messreihen füllen nie mit `0` (kein Messwert heißt „nicht gemessen“).
3. **Live-Messwerte.** Je Abschnitt gilt der **zuletzt gemessene Wert** (größtes `occurred_at`, bei Gleichstand größtes `ingested_at`). Kein Mittelwert, keine Summe: Live-KPIs sind Zustandsmessungen, keine Zählereignisse. Der Zeitpunkt dieses Messwerts wird mitgeliefert.
4. **Historienbeginn je Organisation und Quelle.** `historyStartAt` = frühestes belegtes `occurred_at` der Quelle (bei CRM: der Organisation, unabhängig vom Pipeline-Filter; bei Live: der Organisation **und** der KPI). Ohne Ereignis ist `historyStartAt = null` und die Kachel zeigt „Noch keine Historie aufgezeichnet“.
5. **Zeitzone.** Abschnitte werden in `Europe/Berlin` gebildet (`date_trunc(<auflösung>, occurred_at AT TIME ZONE 'Europe/Berlin')`), damit Tages- und Wochengrenzen der Anzeige entsprechen, auch über die Sommerzeitumstellung. Ausgegeben werden ISO-Zeitpunkte mit Offset (Abschnittsbeginn als `timestamptz`).
6. **Auflösung und Punktobergrenze.** Erlaubte Auflösungen: `stunde`, `tag`, `woche`, `monat`. Höchstens **400 Punkte** je Antwort. Ein Zeitraum, der bei der gewählten Auflösung mehr Punkte ergäbe, wird vom RPC mit Fehlercode `zu_viele_punkte` abgewiesen (kein stilles Kürzen). Der Client wählt die Auflösung so, dass die Grenze nicht überschritten wird (2.3 Nr. 12).
7. **Zeitraum.** Der RPC bekommt `p_from` und `p_to` (halboffen `[from, to)`), wobei `p_to` höchstens „jetzt“ sein darf (keine Zukunft) und `p_from < p_to`. Liegt `p_from` vor `historyStartAt`, beginnen die gelieferten Punkte trotzdem bei `p_from`, und die Abschnitte vor dem Historienbeginn sind als `vor_historienbeginn` gekennzeichnet (nicht nur `null`), damit die Oberfläche „vor Aufzeichnungsbeginn“ von „Lücke“ unterscheiden kann.

### 2.2 Server: Migration und RPC

8. Neue Migration `supabase/migrations/20261119_dashboard_time_series.sql` (idempotent, re-runnable, Kopfkommentar wie 20261116):
   ```sql
   public.dashboard_time_series(
     p_source     TEXT,         -- 'deal_stage_events' | 'live_kpi'
     p_metric     TEXT,         -- CRM: kanonisches Ziel-Label ('Deal gewonnen', ...) oder '*' für alle Eintritte; Live: kpi_id
     p_resolution TEXT,         -- 'stunde' | 'tag' | 'woche' | 'monat'
     p_from       TIMESTAMPTZ,
     p_to         TIMESTAMPTZ,
     p_pipeline   TEXT DEFAULT NULL  -- nur CRM; NULL = alle Pipelines
   ) RETURNS JSONB
   LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public, pg_temp
   ```
   Antwortform:
   ```json
   {
     "source": "deal_stage_events",
     "metric": "Deal gewonnen",
     "resolution": "woche",
     "from": "…",
     "to": "…",
     "historyStartAt": "… | null",
     "generatedAt": "…",
     "points": [
       { "bucketStart": "…", "value": 3, "status": "belegt", "measuredAt": null },
       { "bucketStart": "…", "value": null, "status": "luecke", "measuredAt": null },
       { "bucketStart": "…", "value": null, "status": "vor_historienbeginn", "measuredAt": null }
     ]
   }
   ```
   `measuredAt` nur bei Live (Zeitpunkt des gewählten Messwerts). `status` ∈ `belegt` | `luecke` | `vor_historienbeginn`. CRM-Abschnitte ab Historienbeginn ohne Eintritt: `value: 0`, `status: 'belegt'` (2.1 Nr. 2).
9. **Mandantenbindung wie `dashboard_crm_pipeline_overview`:** `v_org_id := public.current_organization_id()`; ohne Organisation oder ohne aktive Mitgliedschaft `RAISE EXCEPTION` mit eigenem Code. Zusätzlich filtert jede Abfrage ausdrücklich auf `organization_id = v_org_id` (nicht nur auf RLS verlassen). `SECURITY INVOKER`, damit die bestehenden RLS-Regeln zusätzlich greifen. Kein Parameter für die Organisation.
10. **Eingabeprüfung** mit festen Fehlercodes (Muster `20261114_security_robustness.sql`): unbekannte Quelle, unbekannte Auflösung, `p_from >= p_to`, `p_to` in der Zukunft (Toleranz 60 s), `zu_viele_punkte`, `p_pipeline` bei Live gesetzt, `p_metric` leer. CRM-Metrik wird über `normalize_deal_stage` normalisiert, damit Rohwerte und Labels dasselbe zählen.
11. **Pipeline-Filter (CRM):** Join `deal_stage_events.deal_id → imported_funnel_deals.id` mit `pipeline = p_pipeline`. **Grenze, im Ergebnis ausgewiesen:** Gezählt wird nach der **heutigen** Pipeline des Deals; ein späterer Pipelinewechsel eines Deals verschiebt seine Ereignisse. Die Antwort trägt dafür `"pipelineBasis": "aktuelle_pipeline_des_deals"`, die Oberfläche zeigt den Hinweis im Inspector. Gelöschte Deals fehlen (Kaskade `ON DELETE CASCADE`) – ebenfalls im Hinweis nennen.
12. **Abschnitte erzeugen** mit `generate_series` über die Berlin-Zeit, dann `LEFT JOIN` der Aggregate. Keine Schleife je Punkt. `EXPLAIN` im Test nutzt die vorhandenen Indizes (Nachweis im BUILD_LOG, kein Seq Scan bei 10 000 Ereignissen in Fixtures; ggf. zusätzlicher Index `deal_stage_events (organization_id, to_stage, occurred_at)` in derselben Migration, begründet).
13. **Rechte:** `REVOKE ALL … FROM PUBLIC, anon; GRANT EXECUTE … TO authenticated, service_role;` – ausdrücklich auch `service_role` (Lehre aus der Hosted-Umstellung 14.11.2026, BUILD_LOG). Keine Grants an `n8n_ingest`.
14. **pgTAP-Test** `supabase/tests/dashboard_time_series.sql` (Muster `deal_stage_tracking.sql`, zwei Organisationen, Rollen Manager/Viewer/Fremd): Mandantentrennung (Org B sieht nichts von Org A, auch nicht über `p_metric`/`p_pipeline`), nicht aktive Mitglieder abgewiesen, `anon` ohne Recht, jede Fehlerprüfung aus Nr. 10, Lücken vs. `vor_historienbeginn` vs. `0`, Live „letzter Wert je Abschnitt“ inklusive Gleichstand `occurred_at`, Wochen-/Tagesgrenze über die Zeitumstellung (letzter Sonntag im Oktober 2026), Punktobergrenze 400/401, Pipeline-Filter, `historyStartAt` je Organisation und je KPI.
15. **Nicht anfassen:** bestehende Tabellen, Policies, `move_deal_stage`, Ingest-RPCs, Edge Function, Realtime-Publikation. Die Migration legt **nur** die Funktion (und ggf. den einen begründeten Index) an.

### 2.3 Client: Datenquelle und Datentyp

16. **Typ erweitern, nicht ersetzen:** `ResolvedTileData` bekommt ein optionales Feld
    ```ts
    timeSeries?: {
      source: 'deal_stage_events' | 'live_kpi_events';
      resolution: 'stunde' | 'tag' | 'woche' | 'monat';
      from: string; to: string;
      historyStartAt: string | null;
      points: readonly { at: string; value: number | null; status: 'belegt' | 'luecke' | 'vor_historienbeginn'; measuredAt: string | null }[];
      pipelineBasis?: 'aktuelle_pipeline_des_deals';
    };
    ```
    `series` bleibt für bestehende Kacheln bytegleich. Verlaufskacheln füllen zusätzlich `series` mit den **belegten** Punkten (Label = formatierte Berliner Zeit), damit Tabelle und zugängliche Kurzfassung ohne Sonderweg funktionieren.
17. Neue Datei `data/resolveTimeSeries.ts` (Aufruf des RPC über den bestehenden Supabase-Client, Validierung der Antwort mit einer reinen Funktion `parseTimeSeriesResponse`, die unbekannte Felder ignoriert und jede Abweichung als `fehler` mit verständlicher `message` meldet). Kein direkter Tabellenzugriff aus dem Browser.
18. **Cache-Schlüssel** in `data/dashboardQueryKeys.ts` ergänzen: `timeSeries(organizationId, userId, source, metric, resolution, from, to, pipeline)`. Unter `dashboardQueryKeys.crm(organizationId)` einhängen, damit die Mandantenbereinigung beim Org-/Nutzerwechsel (P08a §5) greift. `from`/`to` werden auf den Abschnittsbeginn gerundet, damit wiederholte Renders denselben Schlüssel treffen.
19. **Zeitraum und Auflösung (fest im Katalog, keine Konfigurationsänderung):** Jeder Verlaufseintrag legt im Katalog ein Standardfenster und eine Auflösung fest (z. B. CRM: letzte 12 Wochen, `woche`; Live: letzte 24 Stunden, `stunde`). Eine reine Funktion `timeSeriesWindow(entry, now)` berechnet `from`/`to` in Berliner Zeit und prüft die 400-Punkte-Grenze. Konfigurierbare Fenster je Kachel (Rolling Windows) folgen in 161 – **160 ändert `DashboardConfigV2`, `tile.query` und `dashboard_config_v2_invalid_reason` nicht.**
20. **Zeitsteuerung (P10a) bleibt wirksam:** Verlaufskacheln laufen über `useTimeControlledData` wie CRM-Kacheln: Pause friert ein, kein Neuladen bei Fokus/Reconnect während der Pause, Fortsetzen invalidiert die Zeitreihen-Schlüssel gezielt mit (Erweiterung von `resumeCrmRefresh.ts` um den neuen Schlüssel, Zähltest). Im Live-Modus lädt eine Live-Verlaufskachel höchstens einmal pro Abschnitt neu (`staleTime` = Abschnittslänge, mindestens 60 s), nicht bei jedem Live-Ereignis.
21. **Eingeklappte Sektionen (157)** fragen keine Zeitreihen ab (bestehende Regel, Test für die neuen Kacheln ergänzen).

### 2.4 Katalog und Historienmatrix

22. Zwei neue aktive CRM-Flusskennzahlen (eigene Datei `model/catalog/historyEntries.ts`, damit bestehende Dateien unter 400 Zeilen bleiben):
    - `crm.phaseneintritte_verlauf` – „Phaseneintritte je Woche“ (alle Ziel-Phasen, `p_metric = '*'`), Ansichten `linie`, `saeulen`, `tabelle`, Filter `pipeline`.
    - `crm.gewonnen_verlauf` – „Gewonnene Deals je Woche (Anzahl)“ (`p_metric = 'Deal gewonnen'`), dieselben Ansichten, Filter `pipeline`. Ausdrücklich **Anzahl**, kein Volumen.
      Beide: `aggregation: 'fluss'`, `history: { kind: 'ereignisse', source: 'deal_stage_events', reconstructable: 'nur_fluesse', note: … }`.
23. **Server-Verlauf für Live-Kennzahlen:** Je bestehendem Live-Eintrag ein zusätzlicher Verlaufseintrag `live.<kpiId>.verlauf` („<Name> – Verlauf 24 h“), erzeugt über die vorhandene Fabrikfunktion in `liveEntries.ts` (keine 12 Hand-Kopien), Ansichten `linie`, `flaeche`, `tabelle`, `history: { kind: 'ereignisse', source: 'live_kpi_events', reconstructable: 'nein', note: 'Gemessene Werte ab Aufzeichnungsbeginn' }`. Die bestehenden `live.<kpiId>`-Einträge bleiben `puffer` und unverändert. `uebersicht.live_aktivitaet` bleibt unverändert. Hinweis: `source: 'live_kpi_events'` ist der bestehende Typwert; gelesen wird fachlich die Projektion `live_kpi_public_feed` – das steht im `note`-Text der Spezifikation, der Typ wird nicht umbenannt.
24. **Integritätstest erweitern** (`catalogHistory.vitest.ts`): Jeder `ereignisse`-Eintrag hat `source` und ein gültiges Standardfenster ≤ 400 Punkte; kein `ereignisse`-Eintrag mit `aggregation: 'bestand'`; CRM-`ereignisse` nur mit `aggregation: 'fluss'`; Snapshot neu erzeugen (alte Verteilung 29/13/6/0 → neue Verteilung im BUILD_LOG). `verifyLiveKpiCatalog.ts` (CI `livekpi-verifiers`) muss grün bleiben; falls er die neuen Verlaufseinträge fälschlich als Live-Einträge zählt, wird er angepasst und der Grund im BUILD_LOG genannt.
25. Bibliothek und Inspector zeigen bei Verlaufskacheln: „Historie: Ereignisse ab <Datum Historienbeginn>“ bzw. „Noch keine Historie aufgezeichnet“, Auflösung („je Woche“), Zeitraum, und bei CRM mit Pipeline-Filter den Hinweis aus 2.2 Nr. 11. Textlich, nicht nur farblich.

### 2.5 Darstellung von Lücken

26. `DatumInput` bekommt **optional** `value: number | null` über einen neuen Typ `TimeDatumInput` (bestehender Typ bleibt unverändert, damit alle anderen Diagramme bytegleich rendern). `DepthLineChart` und `DepthAreaChart` unterbrechen die Linie bzw. Fläche an `null`-Punkten (getrennte Pfadsegmente), statt sie zu verbinden. Abschnitte `vor_historienbeginn` werden als schraffierter oder abgesetzter Bereich mit Beschriftung „vor Aufzeichnungsbeginn“ gezeigt; Lücken danach als „keine Messung“. Kein neues Chart-Paket.
27. Ablesezeile/Tooltip nennt je Punkt: Abschnitt in Berliner Zeit („KW 45/2026“, „16.11.2026, 14:00–15:00 Uhr“), Wert oder „keine Messung“, bei Live „gemessen <Uhrzeit>“.
28. Tabellenansicht zeigt alle Abschnitte inklusive Lücken mit Text („keine Messung“, „vor Aufzeichnungsbeginn“).
29. `TileStandLine` (159) zeigt für Verlaufskacheln „Verlauf <Zeitraum>, Stand <generatedAt>“; im Pausenmodus wie bisher mit Abweichungskennzeichnung.

### 2.6 Leistung und Bundle

30. Neue Diagrammlogik und `resolveTimeSeries.ts` werden nur über den bestehenden `chartLoaders.ts`-/Lazy-Pfad geladen. Das Initial-Bundle bleibt ≤ 180 kB (`size-limit`); Größe vor/nach im BUILD_LOG. Wird die Grenze gerissen: stoppen und im PR begründen, nicht die Grenze anheben.
31. 24 Kacheln mit 6 Verlaufskacheln derselben Quelle/Metrik/Fenster/Pipeline erzeugen genau 1 RPC-Aufruf (Zähltest über den Cache-Schlüssel).

### 2.7 Dokumentation

32. Neue Spezifikation `docs/dashboard/ZEITREIHEN_P10B.md`: Fachregeln 2.1, RPC-Vertrag (Parameter, Antwort, Fehlercodes, Rechte), Lücken-/Nullwert-Regel, Pipeline-Grenze, Zeitzone, Cache-Schlüssel, Verhalten unter Pause, Katalogeinträge, bewusste Grenzen (kein Time-Travel, keine konfigurierbaren Fenster, kein Crosshair bis 161; keine Bestands-Rekonstruktion; keine Alarme bis P13; Vergleichszeiträume/Bänder P14).
33. Datierte Nachträge (nichts umschreiben): `DASHBOARD_EDITOR_MASTERPLAN.md` §6 (Plananpassung P10b-1/P10b-2, Umsetzungsstand P10b-1, **Vorgaben für 161**: `TimeControlState` um `mode: 'zeitpunkt'` mit `analysisAt` erweitern und als `p_to` an den RPC geben; Rolling Windows als neues optionales `tile.query`-Feld mit Schema-Prüfung in TS **und** SQL; Shared Crosshair über alle Verlaufskacheln mit gemeinsamem `at`-Zeitpunkt in Berliner Zeit), `KPI_FAEHIGKEITEN_144.md` (neue Verteilung der Historienmatrix), `ZEITSTEUERUNG_P10A.md` (Verweis auf P10b-1), `ARCHITECTURE_DECISIONS.md` Teil C (nur ergänzen: neuer RPC, Lückenregel).

## 3. Verbindliche Grenzen

1. **Schutzbereiche:** `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**` bleiben unberührt (Diff leer).
2. **Genau eine neue Migration** `20261119_dashboard_time_series.sql`, nur Funktion (+ ggf. ein begründeter Index). Keine Änderung an bestehenden Migrationen, Tabellen, Policies, Grants anderer Objekte, Edge Functions oder `supabase/schema.sql` (außer der Builder belegt, dass `schema.sql` laut Projektkonvention jede Migration spiegeln muss – dann nur die Funktion ergänzen, Begründung im BUILD_LOG). **Kein Zugriff auf die Hosted-Instanz**: Deployment macht Marc nach dem Merge (Hinweis im PR-Text mit Befehlsfolge und Smoke-Abfrage).
3. **Keine Änderung an `DashboardConfigV2`**, `tile.query`, Schema-Version oder `dashboard_config_v2_invalid_reason`.
4. **V1-Pfad unverändert:** V1-Editor, V1-Zweig in `PersonalExecutiveDashboard.tsx`, `DashboardTileDetailPage.tsx`, `dashboardPresets.ts`, `dashboardRollout.ts`.
5. **Live-Dienst unverändert:** `src/services/liveKpi/**` (Store, Adapter, Tenant-Scope, History), Edge Function `live-kpi-ingest`. Der Server-Verlauf geht ausschließlich über den neuen RPC.
6. `crmRepository.ts`, `src/domain/**` und die bestehenden Resolver (`resolveCrm.ts`, `resolveLive.ts`, `resolveBaseline.ts`, `resolveCombination.ts`, `crmAggregateSource.ts`) bleiben unverändert. Neu sind nur `resolveTimeSeries.ts` und die Ergänzungen in `dashboardData.ts` (optionales Feld) und `dashboardQueryKeys.ts` (neuer Schlüssel). Die Weiche zum neuen Resolver kommt in `hooks/useDashboardData.ts`; ohne Verlaufseintrag bleibt das Verhalten bytegleich (Test).
7. **Keine neuen Abhängigkeiten.** React Query, Supabase-Client, Lucide, Design-Tokens, Depth-Charts wiederverwenden.
8. **`max-lines` 400** für alle neuen und geänderten Dateien. `DashboardEditorShellV2.tsx` und `EditorTopBarV2.tsx` werden **nicht** geändert (160 braucht dort nichts; falls doch: stoppen und begründen).
9. **Tests zuerst** (rot vor grün), Rot-Läufe im BUILD_LOG: (a) pgTAP: Aufruf von `dashboard_time_series` scheitert (Funktion fehlt); (b) pgTAP-Mandantentest „Org B sieht keine Ereignisse von Org A“ ist rot, solange die Funktion fehlt, und wird mit der Umsetzung grün; (c) `DepthLineChart` verbindet einen `null`-Punkt mit seinen Nachbarn; (d) ein Katalogeintrag `ereignisse` mit `aggregation: 'bestand'` fällt im Integritätstest nicht auf; (e) eine Verlaufskachel lädt während der Pause bei Fensterfokus neu.

## 4. Ziel-Dateien

| Pfad                                                                                                                                                      | Änderung                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_160_SERVER_ZEITREIHEN.md`                                                                                             | Dieser Auftrag (Checkboxen abhaken, Status)                              |
| `docs/dashboard/ZEITREIHEN_P10B.md`                                                                                                                       | Neu: Spezifikation (2.7 Nr. 32)                                          |
| `supabase/migrations/20261119_dashboard_time_series.sql`                                                                                                  | Neu: RPC (2.2)                                                           |
| `supabase/tests/dashboard_time_series.sql`                                                                                                                | Neu: pgTAP (2.2 Nr. 14)                                                  |
| `src/features/dashboard/data/resolveTimeSeries.ts`                                                                                                        | Neu: RPC-Aufruf, `parseTimeSeriesResponse`, `timeSeriesWindow` (2.3)     |
| `src/features/dashboard/data/dashboardData.ts`                                                                                                            | Nur optionales Feld `timeSeries` (2.3 Nr. 16)                            |
| `src/features/dashboard/data/dashboardQueryKeys.ts`                                                                                                       | Nur neuer Schlüssel `timeSeries` (2.3 Nr. 18)                            |
| `src/features/dashboard/hooks/useDashboardData.ts`                                                                                                        | Weiche für Verlaufseinträge; Standard bytegleich (§3 Nr. 6)              |
| `src/features/dashboard/time/useTimeControlledData.ts`, `time/resumeCrmRefresh.ts`, `time/TileStandLine.tsx`                                              | Pause/Fortsetzen für Zeitreihen, Standzeile (2.3 Nr. 20, 2.5 Nr. 29)     |
| `src/features/dashboard/model/catalog/historyEntries.ts` (neu), `model/catalog/liveEntries.ts`, `model/dashboardCatalog.ts`, `model/historyCapability.ts` | Neue Einträge, Standardfenster-Feld, Texte (2.4)                         |
| `src/features/dashboard/components/charts/depthGeometry.ts`, `DepthLineChart.tsx`, `DepthAreaChart.tsx`, `ChartReadout.tsx`, `chartTypes.ts`              | `TimeDatumInput`, Lücken, Ablesezeile (2.5)                              |
| `src/features/dashboard/components/editor/inspector/**`, `components/editor/WidgetLibraryV2.tsx`                                                          | Historientexte, Pipeline-Hinweis (2.4 Nr. 25)                            |
| `src/features/dashboard/__tests__/resolveTimeSeries.vitest.ts`                                                                                            | Neu: Parser, Fenster, Punktgrenze, Zeitzone                              |
| `src/features/dashboard/__tests__/timeSeriesTiles.vitest.tsx`                                                                                             | Neu: Weiche, Cache-Zähltest, Pause/Fortsetzen, eingeklappte Sektion      |
| `src/features/dashboard/__tests__/catalogHistory.vitest.ts`, Fixture `catalogHistory.snapshot.json`                                                       | Regeln erweitern, Snapshot neu                                           |
| Tests der Depth-Charts (bestehend)                                                                                                                        | Lückenfälle ergänzen; nicht löschen                                      |
| `scripts/verifyLiveKpiCatalog.ts`                                                                                                                         | Nur falls nötig (2.4 Nr. 24)                                             |
| `e2e/editor-time-series.spec.ts`                                                                                                                          | Neu: Verlaufskachel hinzufügen, Lücke sichtbar, Pause friert Verlauf ein |
| `e2e/a11y.spec.ts`, `e2e/a11y-baseline.json`                                                                                                              | Verlaufskachel mit Lücke (Baseline nur erweitern)                        |
| `scripts/captureAuftrag160GateScreenshots.mjs`, `docs/screenshots/auftrag-160/README.md`                                                                  | Neu: Harness und Ergebnis-Matrix (nur README committen)                  |
| `docs/dashboard/DASHBOARD_EDITOR_MASTERPLAN.md`, `KPI_FAEHIGKEITEN_144.md`, `ZEITSTEUERUNG_P10A.md`, `ARCHITECTURE_DECISIONS.md`                          | Datierte Nachträge (2.7 Nr. 33)                                          |
| `BUILD_PLAN.md`, `docs/BUILD_LOG.md`                                                                                                                      | Status, Builder-Eintrag, Prüfnachweis                                    |

Bei Bedarf außerhalb dieser Liste: stoppen und im PR begründen (`CLAUDE.md` §5.3).

## 5. Tasks

Reihenfolge je Block: Tests zuerst, dann Umsetzung.

- [ ] **T0 Einstieg:** Branch von `main` `d83e3e66`. Masterplan P10/§4.C, `ZEITSTEUERUNG_P10A.md`, `KPI_FAEHIGKEITEN_144.md`, `ABFRAGEVERTRAG_P08A.md` §1/§5 und diesen Auftrag lesen. Ist-Tabelle §1 prüfen, lokale Supabase starten (`supabase start`, `supabase db reset`). Schutzbereichs-Diff leer.
- [ ] **T1 Rot-Nachweise:** §3 Nr. 9 (a)–(e). Ergebnisse im BUILD_LOG.
- [ ] **T2 Migration und pgTAP:** RPC nach 2.1/2.2, alle Testfälle aus 2.2 Nr. 14 grün, `EXPLAIN`-Nachweis.
- [ ] **T3 Client-Datenquelle:** `resolveTimeSeries.ts`, Typ, Cache-Schlüssel, Weiche in `useDashboardData`, `timeSeriesWindow`; Parser- und Zeitzonentests.
- [ ] **T4 Katalog:** zwei CRM-Flusskennzahlen, Live-Verlaufseinträge per Fabrik, Integritätstest, Snapshot, `verifyLiveKpiCatalog` grün.
- [ ] **T5 Lückendarstellung:** `TimeDatumInput`, getrennte Segmente, „vor Aufzeichnungsbeginn“, Ablesezeile, Tabelle; bestehende Diagramme bytegleich (Snapshot-/Pfadtest).
- [ ] **T6 Zeitsteuerung:** Pause/Fortsetzen für Zeitreihen, `staleTime`, Zähltests (2.3 Nr. 20, 2.6 Nr. 31), eingeklappte Sektion.
- [ ] **T7 Texte:** Inspector, Bibliothek, `TileStandLine`, Pipeline-Hinweis.
- [ ] **T8 E2E, a11y, Screenshots:** Playwright-Ablauf (mit gemocktem RPC, Fixtures mit Lücke und Historienbeginn mitten im Fenster); a11y-Ergänzung; Harness (Vorher: kein Verlaufseintrag in der Bibliothek; Nachher: CRM-Verlauf mit Historienbeginn mitten im Fenster, Live-Verlauf mit Lücke, Tabellenansicht, pausiert; jeweils 1440/768/375, hell und dunkel), SHA-256 unterschiedlich, 0 px Overflow.
- [ ] **T9 Leistung:** Bundle-Größe vor/nach, RPC-Zähltest, `EXPLAIN` im BUILD_LOG.
- [ ] **T10 V1-Gegenprobe:** V1-Editor und Kachel-Detailseite unverändert (Tests grün, Diff der V1-Dateien leer).
- [ ] **T11 Doku:** Spezifikation, Nachträge, Plananpassung P10b-1/P10b-2 und Vorgaben für 161 (2.7); `BUILD_PLAN.md` „Aktueller Auftrag“ auf 160.
- [ ] **T12 Abschluss:** Pflicht-Verifikation (§7), Schutzbereichs-Diff, BUILD_LOG-Builder-Eintrag inklusive Deployment-Anleitung für Marc (Migration anwenden, Grants prüfen, Smoke-Aufruf als `authenticated`), PR öffnen, Review anfordern.

## 6. Abnahme

- `dashboard_time_series` liefert für CRM-Phaseneintritte und Live-Messwerte belegte Zeitreihen, nur für die eigene Organisation; fremde Organisationen, inaktive Mitglieder und `anon` werden abgewiesen (pgTAP).
- Jede Zeitreihe nennt `historyStartAt`; Abschnitte vor dem Historienbeginn, Lücken und echte Nullwerte sind in Antwort, Diagramm und Tabelle unterscheidbar. Nichts wird interpoliert.
- Keine Beträge aus Ereignissen, keine Bestands-Rekonstruktion; die Pipeline-Grenze ist im Inspector benannt.
- Tages-/Wochengrenzen stimmen in Berliner Zeit auch über die Zeitumstellung; mehr als 400 Punkte werden abgewiesen, nicht gekürzt.
- Pause friert Verlaufskacheln ein, Fortsetzen lädt sie gezielt neu; gleiche Abfragen teilen einen RPC-Aufruf.
- Bestehende Kacheln, Diagramme und der V1-Pfad verhalten sich bytegleich; keine Config-Änderung; Schutzbereichs-Diff leer; keine neuen Abhängigkeiten; `size-limit` grün.
- 1440/768/375 ohne horizontalen Overflow; Lücken und Historienbeginn per Text und Screenreader verständlich; keine neuen a11y-Verstöße.

## 7. Pflicht-Verifikation

```
npx tsc --noEmit
npm run lint
npm run format:check
npm test
npm run verify
npm run build
npm run build:production      # mit gültiger Beispielkonfiguration
npm run size-limit
supabase test db              # lokal, inkl. dashboard_time_series.sql
npx tsx scripts/verifyLiveKpiCatalog.ts
git diff d83e3e66 -- src/simulation src/types src/context src/services/data src/features/resources   # muss leer sein
git diff d83e3e66 -- src/services/liveKpi supabase/functions src/services/db/crmRepository.ts src/domain src/features/dashboard/model/dashboardPresets.ts src/features/dashboard/model/dashboardConfigV2.ts   # muss leer sein
git diff d83e3e66 -- src/features/dashboard/data/resolveCrm.ts src/features/dashboard/data/resolveLive.ts src/features/dashboard/data/crmAggregateSource.ts src/features/dashboard/components/editor/DashboardEditorShellV2.tsx src/features/dashboard/components/editor/EditorTopBarV2.tsx   # muss leer sein
git diff --stat d83e3e66 -- supabase/migrations   # nur 20261119_dashboard_time_series.sql neu
```

Zusätzlich: Playwright `e2e/editor-time-series.spec.ts` und `e2e/a11y.spec.ts` lokal, CI-Checks `lint`, `typecheck`, `test`, `build`, `livekpi-verifiers`, `size-limit`, `e2e` grün.

## 8. Offene Punkte und Risiken

- **Hosted-Deployment:** Die Migration geht erst nach dem Merge durch Marc online. Bis dahin zeigen Verlaufskacheln gegen die Hosted-Instanz den Zustand `fehler` mit verständlichem Text („Verlauf auf dem Server noch nicht verfügbar“), nicht einen technischen Fehler. Test dafür (RPC antwortet mit „function does not exist“).
- **Dünne Datenlage:** `deal_stage_events` gibt es erst seit 137; HubSpot-Importe erzeugen keine Ereignisse. Der Historienbeginn wird daher für die meisten Organisationen nah an der Gegenwart liegen. Das ist gewollt und wird angezeigt, nicht kaschiert.
- **Live-Testdaten auf Hosted:** Laut BUILD_LOG (14.11.2026) sind die vorhandenen `live_kpi_events` Test-/Probe-Daten. Der Verlauf zeigt sie wie echte Messwerte; Bereinigung ist nicht Teil dieses Auftrags (Entscheidung bei Marc, im PR-Text erwähnen).
- **Pipeline-Basis:** Zählung nach heutiger Pipeline des Deals (2.2 Nr. 11). Eine historisch exakte Pipeline-Zuordnung bräuchte eine Pipeline-Spalte im Ereignis; das ist ein eigener Auftrag, nur im Masterplan-Nachtrag als offene Frage vermerken.
- **Nicht Teil dieses Auftrags:** Time-Travel (`mode: 'zeitpunkt'`), konfigurierbare Rolling Windows je Kachel, Shared Crosshair (alle 161), Alarme (P13), Vergleichszeiträume und Erwartungsbänder (P14), Bestands-Snapshots.
