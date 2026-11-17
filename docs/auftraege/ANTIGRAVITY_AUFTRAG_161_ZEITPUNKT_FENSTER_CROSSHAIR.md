# Auftrag 161 – Dashboard-Editor: Analysezeitpunkt, Zeitfenster je Kachel und gemeinsames Fadenkreuz (P10b-2)

**Ziel:** Nutzer können das Dashboard auf einen vergangenen Zeitpunkt stellen („Wie sah der Verlauf bis Ende Oktober aus?“), für jede Verlaufskachel ein eigenes Zeitfenster wählen („letzte 30 Tage, je Tag“) und beim Überfahren einer Verlaufskachel denselben Zeitpunkt in allen Verlaufskacheln ablesen. Alles bleibt ehrlich: Kacheln ohne belegte Historie zeigen für einen vergangenen Zeitpunkt keinen heutigen Wert, sondern einen klaren Hinweis. Mit diesem Auftrag ist P10 abgeschlossen.

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P10 (§6), §4.C; Vorgaben für 161 aus Auftrag 160 (§2.3 Nr. 19, §2.7 Nr. 33, §8).
**Fachgrundlage:** [ZEITREIHEN_P10B.md](../dashboard/ZEITREIHEN_P10B.md) (RPC, Lückenregel, Berliner Zeit), [ZEITSTEUERUNG_P10A.md](../dashboard/ZEITSTEUERUNG_P10A.md) (Zeitsteuerung, Pause), [ABFRAGEVERTRAG_P08A.md](../dashboard/ABFRAGEVERTRAG_P08A.md) (`tile.query`), [KPI_FAEHIGKEITEN_144.md](../dashboard/KPI_FAEHIGKEITEN_144.md) (Historienmatrix).
**Vorgelagert:** 160 (P10b-1, PR #194, gemergt als `5f9a4b75`) und der separate Auftrag [DEPS_DEPENDABOT_CI](ANTIGRAVITY_AUFTRAG_DEPS_DEPENDABOT_CI.md) (PR #195 und Builder-PR).
**Baseline:** Merge-Commit des Deps-Auftrags in `main`. Ist er bei Start noch nicht gemergt: `5f9a4b75`, und der Builder rebased vor PR-Öffnung auf den Merge-Commit. Die Baseline wird im BUILD_LOG genannt.
**Branch:** `auftrag-161-zeitpunkt-fenster-crosshair`.
**Builder:** Antigravity (oder ein anderer von Marc benannter Agent). **Prüfer:** Codex auf GitHub oder ein anderer Agent, der nicht gebaut hat (`CLAUDE.md` §4.1). **Merge und Hosted-Deployment der Migration:** Marc.
**Status:** OFFEN.

---

## 1. Ist-Stand (geprüft auf `main` `5f9a4b75`)

| Baustein           | Ist                                                                                                                                                                                                                                        | Fundstelle                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Zeitsteuerung      | `TimeControlState { mode: 'live' \| 'pausiert'; analysisAt; resumeToken }`, Aktionen `pause`/`resume`/`reset`. Flüchtig, nicht in Config, Entwurf oder Undo.                                                                               | `time/timeControl.ts` (59 Zeilen), `time/TimeControlProvider.tsx`                                                                   |
| Pause im Datenpfad | `useTimeControlledData` friert bei `pausiert` den zuletzt angezeigten Stand ein, unterdrückt Fokus-/Reconnect-Neuladen.                                                                                                                    | `time/useTimeControlledData.ts:111`                                                                                                 |
| Zeitfenster        | `timeSeriesWindow(entry, now)` nimmt nur `entry.history.defaultWindow` (CRM 12 Wochen/`woche`, Live 24 Stunden/`stunde`). `to` = Beginn des laufenden Abschnitts in Berliner Zeit (laufender Abschnitt ausgeschlossen). Grenze 400 Punkte. | `data/resolveTimeSeries.ts:166–188`; Aufrufer `hooks/useDashboardData.ts:158`, `time/useEditorLiveStatus.ts:199`                    |
| RPC                | `dashboard_time_series(p_source, p_metric, p_resolution, p_from, p_to, p_pipeline)`; Fehler `zeitfenster_in_zukunft` bei `p_to > now() + 60 s`, `zu_viele_punkte` > 400.                                                                   | `supabase/migrations/20261119_dashboard_time_series.sql`, `ZEITREIHEN_P10B.md` §2                                                   |
| Kachel-Abfrage     | `tile.query` mit Schlüsseln `metricId`, `pipelineId`, `timeframe`, `aggregation`, `groupBy`, `filters`; unbekannte Schlüssel → `unbekanntes_feld` (TS) bzw. „unbekanntes Feld in Kachel-query“ (SQL).                                      | `model/tileQuery.ts:36–43` (331 Zeilen), `model/dashboardConfigV2.ts:44–52`; SQL zuletzt in `20261117_dashboard_sections.sql:7–390` |
| Fadenkreuz         | `ChartReadout` zeigt den Wert eines Punktes je Kachel; keine kachelübergreifende Kopplung.                                                                                                                                                 | `components/charts/ChartReadout.tsx` (271), `DepthLineChart.tsx` (303)                                                              |
| Bedienung          | Live/Pause-Knopf in der Top-Bar.                                                                                                                                                                                                           | `components/editor/EditorTopBarV2.tsx:296–300`                                                                                      |
| Dateigrößen        | Shell 399, Top-Bar 393 Zeilen (Grenze `max-lines` 400). `InspectorDataTab.tsx` 299, `useDashboardData.ts` 374.                                                                                                                             | –                                                                                                                                   |
| Bundle             | Initial 178,79 kB von 180 kB (nach 160). Spielraum ≈ 1,2 kB.                                                                                                                                                                               | BUILD_LOG Auftrag 160, `.size-limit.json`                                                                                           |
| Doku-Lücke aus 160 | Die in 160 T11 verlangten „Vorgaben für 161“ stehen **nicht** im Masterplan (nur `ZEITREIHEN_P10B.md` §8 verweist auf 161).                                                                                                                | `DASHBOARD_EDITOR_MASTERPLAN.md`                                                                                                    |

Der Builder prüft diese Tabelle in T0 gegen die Baseline und meldet Abweichungen im BUILD_LOG.

## 2. Soll

### 2.1 Fachregeln (verbindlich, gehören in die Spezifikation)

1. **Analysezeitpunkt ist eine Ansicht, keine Einstellung.** Er wird nie gespeichert (nicht in `DashboardConfigV2`, nicht im Entwurf, nicht im Undo-Verlauf, nicht in der URL).
2. **Nur belegte Historie reist mit.** Kacheln mit Historie `ereignisse` (Verlaufskacheln) zeigen das Fenster bis zum Analysezeitpunkt. Kacheln mit `fest` (zeitunabhängige Plan-/Stammwerte) zeigen unverändert ihren Wert mit Hinweis „zeitunabhängiger Wert“. Kacheln mit `puffer` oder `keine` zeigen **keinen Wert**, sondern „Für <Zeitpunkt> ist kein Stand gespeichert“. Nie wird ein heutiger Wert als vergangener ausgegeben.
3. **Abschnittsgrenze:** Im Zeitpunkt-Modus endet das Fenster am Beginn des Abschnitts, in dem der Analysezeitpunkt liegt (gleiche Regel wie heute für „jetzt“). Damit ist `p_to` nie in der Zukunft und das Fenster enthält nur abgeschlossene Abschnitte.
4. **Zeitfenster je Kachel** gilt nur für Verlaufskacheln. Fehlt es, gilt das Standardfenster des Katalogs (bytegleiches Verhalten zu 160).
5. **Fadenkreuz** zeigt in jeder Verlaufskachel den Abschnitt, der den gemeinsamen Zeitpunkt enthält (Abschnittsbeginn ≤ Zeitpunkt < nächster Abschnittsbeginn). Liegt der Zeitpunkt außerhalb des Kachelfensters, zeigt die Kachel kein Fadenkreuz, sondern nichts. Fadenkreuz ist flüchtig.
6. Alle Zeitangaben in der Oberfläche in `Europe/Berlin`, mit Zeitzonenkürzel, wenn ein Abschnitt die Zeitumstellung berührt.

### 2.2 Zeitsteuerung: Modus `zeitpunkt`

7. `TimeControlMode` wird `'live' | 'pausiert' | 'zeitpunkt'`. Neue Aktion `{ type: 'zeitpunkt'; at: string; now: string }`.
   - `at` muss gültiges ISO sein und `at <= now`; sonst bleibt der Zustand unverändert (reine Funktion, Test).
   - Übergänge: `live|pausiert → zeitpunkt` setzt `analysisAt = at`; `zeitpunkt → zeitpunkt` ersetzt `analysisAt`; `resume` aus `zeitpunkt` → `live` mit `resumeToken + 1`; `pause` im Modus `zeitpunkt` ist folgenlos.
   - Bestehende Tests für `live`/`pausiert` bleiben unverändert grün.
8. **Datenpfad:** Im Modus `zeitpunkt` gilt alles aus `pausiert` (kein Live-Strom, kein automatisches Neuladen) für Nicht-Verlaufskacheln. Verlaufskacheln laden mit `now = analysisAt` (siehe 2.3 Nr. 11). `useEditorLiveStatus` zeigt „Zeitpunkt <Datum Uhrzeit>“ statt „Live“/„Pausiert“.
9. **Bedienung:** Der Live/Pause-Bereich der Top-Bar wird zuerst **ohne Verhaltensänderung** in eine eigene Komponente `components/editor/TimeControlMenuV2.tsx` ausgelagert (Top-Bar danach deutlich unter 400 Zeilen; Test: gleiche Rollen, Namen, `aria-pressed` wie vorher). Danach erhält das Menü:
   - Auswahl „Zeitpunkt wählen…“ mit Vorgaben „Ende gestern“, „Ende letzte Woche“, „Ende letzter Monat“ (jeweils Berliner Mitternacht) und einem Eingabefeld Datum + Uhrzeit (`input type="datetime-local"`, interpretiert als Berliner Zeit, `max` = jetzt),
   - im Modus `zeitpunkt` ein deutlich sichtbares Band „Ansicht zum <Zeitpunkt>“ mit Knopf „Zurück zu Live“,
   - Tastatur vollständig bedienbar, Fokus kehrt nach Auswahl auf den Auslöser zurück, `Escape` schließt.
   - Der Auswahl-Dialog wird per `React.lazy` erst beim Öffnen geladen (Bundle, 2.6).
10. `DashboardEditorShellV2.tsx` wird möglichst nicht geändert. Ist eine Änderung unvermeidbar, darf sie die Datei nicht über 400 Zeilen bringen; Begründung im BUILD_LOG.

### 2.3 Zeitfenster je Kachel (Rolling Windows)

11. `timeSeriesWindow(entry, now, window?)`: optionales drittes Argument `{ count, resolution }` überschreibt `entry.history.defaultWindow`. `now` ist im Live-Modus die aktuelle Zeit, im Modus `zeitpunkt` `analysisAt`. Beide Aufrufer (`useDashboardData.ts`, `useEditorLiveStatus.ts`) übergeben Fenster und Zeitpunkt. Der Cache-Schlüssel enthält `from`/`to` bereits und bleibt unverändert aufgebaut.
12. **Neues optionales Feld** `tile.query.window: { count: number; resolution: 'stunde' | 'tag' | 'woche' | 'monat' }`.
    - `count` ganzzahlig, `1 ≤ count`, und je Auflösung höchstens: `stunde` 168, `tag` 366, `woche` 260, `monat` 120 (alle ≤ 400). Diese Strukturgrenze prüfen TS und SQL.
    - Nur zulässig, wenn der Katalogeintrag `history.kind === 'ereignisse'` hat. Zusätzlich gilt je Quelle (nur TS, katalogabhängig):

      | Quelle                    | erlaubte Auflösungen und Höchstwerte                           |
      | ------------------------- | -------------------------------------------------------------- |
      | CRM (`deal_stage_events`) | `tag` ≤ 366, `woche` ≤ 260, `monat` ≤ 120; `stunde` unzulässig |
      | Live (`live_kpi`)         | `stunde` ≤ 168, `tag` ≤ 90; `woche`/`monat` unzulässig         |

      Die Tabelle gehört in die Spezifikation und wird je Zeile getestet.

    - Neuer TS-Fehlercode `fenster_unzulaessig` in `TileQueryValidationErrorCode`; `ALLOWED_QUERY_KEYS` um `window` ergänzt; `normalizeTileQuery` lässt ein fehlendes `window` weg (kein Standardwert in der Config schreiben – sonst ändern sich gespeicherte Dashboards).
    - Keine Erhöhung der Schema-Version: Das Feld ist optional, alte Konfigurationen bleiben gültig und bytegleich.
13. **SQL:** Neue Migration `supabase/migrations/20261120_dashboard_query_window.sql` mit `CREATE OR REPLACE FUNCTION public.dashboard_config_v2_invalid_reason(p_config JSONB)`. Grundlage ist die vollständige letzte Fassung aus `20261117_dashboard_sections.sql`, ergänzt nur um: `window` als erlaubter Schlüssel und die Strukturprüfung aus Nr. 12 (Objekt, genau die Schlüssel `count`/`resolution`, Ganzzahl, Auflösung aus der Liste, Höchstwerte je Auflösung). Die Katalogbindung („nur Verlaufskacheln“) bleibt TS-seitig, wie bei `metricId`. Grants und `REVOKE` exakt wie bisher wiederholen. Keine anderen Objekte ändern.
14. **pgTAP** `supabase/tests/dashboard_query_window.sql`: gültiges Fenster angenommen; fehlendes Fenster angenommen; je ein Fall für falschen Typ, Kommazahl, `count = 0`, Überschreitung je Auflösung, unbekannte Auflösung, Zusatzschlüssel; bestehende Konfigurationen der vorhandenen Tests bleiben gültig (Regressionsfall).
15. **Inspector:** Im Daten-Reiter erscheint für Verlaufskacheln der Abschnitt „Zeitfenster“: Vorgaben (CRM: 4 Wochen, 12 Wochen, 26 Wochen, 12 Monate; Live: 6 Stunden, 24 Stunden, 7 Tage je Tag, 30 Tage je Tag) plus „Eigenes Fenster“ (Zahl + Auflösung, Fehlermeldung im Klartext bei Überschreitung, wird nicht übernommen). „Standard (<Katalogfenster>)“ entfernt das Feld wieder. Änderungen laufen über den Entwurf und sind rückgängig machbar. `InspectorDataTab.tsx` bleibt unter 400 Zeilen; bei Bedarf eigene Komponente `inspector/TimeWindowField.tsx`.
16. `TileStandLine` zeigt das tatsächliche Fenster, z. B. „Verlauf letzte 30 Tage, je Tag, Stand 16.11.2026 00:00“; im Modus `zeitpunkt` „… bis 31.10.2026 24:00“.

### 2.4 Gemeinsames Fadenkreuz

17. Neuer kleiner Store `time/crosshairStore.ts` (`useSyncExternalStore`, keine neue Abhängigkeit) mit `{ at: string | null; sourceTileId: string | null }`. Bereitgestellt innerhalb des vorhandenen `TimeControlProvider` (keine Shell-Änderung). Gilt je Dashboard-Ansicht, wird beim Dashboard-Wechsel und beim Wechsel des Zeitmodus geleert.
18. Überfahren, Tippen oder Tastatur-Fokus eines Punktes in einer Verlaufskachel setzt `at` = Abschnittsbeginn dieses Punktes. Pfeiltasten links/rechts wandern im fokussierten Diagramm, `Escape` und Verlassen leeren. Aktualisierung höchstens einmal je Animationsframe.
19. Jede andere sichtbare Verlaufskachel zeichnet eine senkrechte Linie am passenden Abschnitt (Regel 2.1 Nr. 5) und zeigt in ihrer Ablesezeile Wert oder Lückentext dieses Abschnitts. Nur die auslösende Kachel kündigt per `aria-live="polite"` an; die übrigen nicht (keine Screenreader-Flut).
20. **Leistung:** Ein Fadenkreuz-Wechsel rendert nur die Diagramm-Ebenen der Verlaufskacheln neu, keine anderen Kacheln (Render-Zähltest mit 1 auslösenden, 3 mitlaufenden und 3 Nicht-Verlaufskacheln). Eingeklappte Sektionen rendern nichts.
21. Bestehende Diagramme ohne Zeitachse (`DatumInput { label; value }`) bleiben bytegleich (vorhandene Pfad-/Snapshot-Tests).

### 2.5 Fehler und Grenzfälle

22. Fenster + Zeitpunkt ergeben mehr als 400 Punkte: kann wegen Nr. 12 nicht auftreten; trotzdem fängt `timeSeriesWindow` es mit `RangeError` ab und die Kachel zeigt den Klartextfehler (Test).
23. Zeitpunkt vor dem Historienbeginn: Die Kachel zeigt die vom Server gelieferten Abschnitte „vor Aufzeichnungsbeginn“ (keine Sonderlogik im Client).
24. Hosted-Instanz noch ohne Migration 20261120: Speichern eines Dashboards mit `window` scheitert serverseitig an „unbekanntes Feld in Kachel-query“. Der Speichern-Fehler erscheint verständlich („Server noch nicht auf dem Stand, Zeitfenster kann noch nicht gespeichert werden“); andere Änderungen gehen nicht verloren (Entwurf bleibt). Deployment-Reihenfolge im BUILD_LOG: erst Migration, dann App.

### 2.6 Leistung und Bundle

25. Initial-Bundle bleibt ≤ 180 kB, größter Chunk ≤ 250 kB. Zeitpunkt-Dialog und Fenster-Editor werden nachgeladen. Reicht der Spielraum trotzdem nicht: stoppen, Zahlen im PR nennen, Marc entscheidet. Die Grenze wird nicht eigenmächtig angehoben.
26. Gleiche Verlaufsabfragen (gleiches Fenster, gleicher Zeitpunkt) teilen weiterhin genau einen RPC-Aufruf; zwei Kacheln mit verschiedenen Fenstern erzeugen zwei (Zähltest).

### 2.7 Dokumentation

27. `ZEITREIHEN_P10B.md`: neue Abschnitte „Analysezeitpunkt“, „Zeitfenster je Kachel“ (Tabelle Höchstwerte je Quelle/Auflösung), „Gemeinsames Fadenkreuz“; §8 „Bewusste Grenzen“ aktualisieren (nichts löschen, Überholtes als „erledigt mit 161“ markieren).
28. `ABFRAGEVERTRAG_P08A.md`: datierter Nachtrag zu `query.window`.
29. `ZEITSTEUERUNG_P10A.md`: datierter Nachtrag Modus `zeitpunkt`.
30. `DASHBOARD_EDITOR_MASTERPLAN.md` §6: datierter Nachtrag „Umsetzungsstand P10b-2, P10 abgeschlossen“ und Nachholung der in 160 fehlenden „Vorgaben für 161“ als Hinweis (nichts umschreiben).
31. `ARCHITECTURE_DECISIONS.md` Teil C: nur ergänzen (Migration 20261120, Zeitpunkt-Regel 2.1 Nr. 2).
32. `BUILD_PLAN.md` „Aktueller Auftrag“ auf 161.

## 3. Verbindliche Grenzen

1. **Schutzbereiche** unverändert: `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`.
2. **Genau eine neue Migration** `20261120_dashboard_query_window.sql`, nur `dashboard_config_v2_invalid_reason`. RPC `dashboard_time_series`, Tabellen, Policies, Edge Functions und bestehende Migrationen bleiben unverändert.
3. **Keine Bestands-Rekonstruktion**, keine Interpolation, keine Werte aus `puffer`/`keine` für vergangene Zeitpunkte.
4. **V1-Pfad unverändert** (V1-Editor, V1-Zweig in `PersonalExecutiveDashboard.tsx`, `DashboardTileDetailPage.tsx`, `dashboardPresets.ts`, `dashboardRollout.ts`).
5. **Live-Dienst unverändert:** `src/services/liveKpi/**`, `crmRepository.ts`, `src/domain/**`, Resolver `resolveCrm.ts`, `resolveLive.ts`, `resolveBaseline.ts`, `resolveCombination.ts`, `crmAggregateSource.ts`.
6. **Keine neuen Abhängigkeiten.** Kein Datepicker-Paket; natives `datetime-local`.
7. **`max-lines` 400** für alle neuen und geänderten Dateien.
8. **Tests zuerst**, Rot-Läufe im BUILD_LOG: (a) Reducer-Test `zeitpunkt` rot; (b) `timeSeriesWindow` mit Fenster + Zeitpunkt rot; (c) pgTAP gültiges `window` wird abgelehnt (rot) vor der Migration; (d) Fadenkreuz-Kopplungstest rot; (e) Test „`puffer`-Kachel zeigt im Zeitpunkt-Modus keinen Wert“ rot.

## 4. Ziel-Dateien

| Pfad                                                                                                                                                                                                              | Änderung                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_161_ZEITPUNKT_FENSTER_CROSSHAIR.md`                                                                                                                                           | Dieser Auftrag (Checkboxen, Status)                                                                       |
| `src/features/dashboard/time/timeControl.ts`, `TimeControlProvider.tsx`, `useTimeControlledData.ts`, `useEditorLiveStatus.ts`, `TileStandLine.tsx`, `resumeCrmRefresh.ts`                                         | Modus `zeitpunkt`, Datenpfad, Statustext, Standzeile (2.2, 2.3 Nr. 16)                                    |
| `src/features/dashboard/time/crosshairStore.ts` (neu)                                                                                                                                                             | Fadenkreuz-Store (2.4)                                                                                    |
| `src/features/dashboard/data/resolveTimeSeries.ts`                                                                                                                                                                | `timeSeriesWindow` mit Fenster/Zeitpunkt (2.3 Nr. 11)                                                     |
| `src/features/dashboard/hooks/useDashboardData.ts`                                                                                                                                                                | Fenster und Zeitpunkt durchreichen; Nicht-Verlaufskacheln im Zeitpunkt-Modus (2.1 Nr. 2)                  |
| `src/features/dashboard/model/tileQuery.ts`, `model/dashboardConfigV2.ts`                                                                                                                                         | `query.window`, Fehlercode, Normalisierung (2.3 Nr. 12)                                                   |
| `src/features/dashboard/components/editor/EditorTopBarV2.tsx`, `components/editor/TimeControlMenuV2.tsx` (neu), `components/editor/TimePointDialogV2.tsx` (neu, lazy)                                             | Auslagerung und Zeitpunkt-Bedienung (2.2 Nr. 9)                                                           |
| `src/features/dashboard/components/editor/inspector/InspectorDataTab.tsx`, `inspector/TimeWindowField.tsx` (neu)                                                                                                  | Zeitfenster im Inspector (2.3 Nr. 15)                                                                     |
| `src/features/dashboard/components/charts/DepthLineChart.tsx`, `DepthAreaChart.tsx`, `ChartReadout.tsx`, `depthGeometry.ts`, `chartTypes.ts`                                                                      | Fadenkreuz-Linie und Ablesung (2.4)                                                                       |
| Kachelrahmen der V2-Ansicht (Datei, die Wert/Fehler einer Kachel rendert)                                                                                                                                         | Hinweis „kein Stand für <Zeitpunkt>“ / „zeitunabhängiger Wert“ (2.1 Nr. 2); Builder nennt die Datei in T0 |
| `supabase/migrations/20261120_dashboard_query_window.sql` (neu), `supabase/tests/dashboard_query_window.sql` (neu)                                                                                                | SQL-Prüfung (2.3 Nr. 13–14)                                                                               |
| `src/features/dashboard/__tests__/timeControl*.vitest.ts`, `resolveTimeSeries.vitest.ts`, `tileQuery*.vitest.ts`, `timeSeriesTiles.vitest.tsx`, `crosshair.vitest.tsx` (neu), `timePointMode.ui.vitest.tsx` (neu) | Tests (Bestehendes ergänzen, nichts löschen)                                                              |
| `e2e/editor-time-point.spec.ts` (neu), `e2e/a11y.spec.ts`, `e2e/a11y-baseline.json`                                                                                                                               | Ablauf und a11y (Baseline nur erweitern)                                                                  |
| `scripts/captureAuftrag161GateScreenshots.mjs`, `docs/screenshots/auftrag-161/README.md`                                                                                                                          | Harness und Matrix (nur README committen)                                                                 |
| `docs/dashboard/ZEITREIHEN_P10B.md`, `ABFRAGEVERTRAG_P08A.md`, `ZEITSTEUERUNG_P10A.md`, `DASHBOARD_EDITOR_MASTERPLAN.md`, `ARCHITECTURE_DECISIONS.md`                                                             | Datierte Nachträge (2.7)                                                                                  |
| `BUILD_PLAN.md`, `docs/BUILD_LOG.md`                                                                                                                                                                              | Status, Builder-Eintrag, Prüfnachweis                                                                     |

Bei Bedarf außerhalb dieser Liste: stoppen und im PR begründen (`CLAUDE.md` §5.3).

## 5. Tasks

Reihenfolge je Block: Tests zuerst, dann Umsetzung.

- [ ] **T0 Einstieg:** Baseline festlegen (siehe Kopf), Ist-Tabelle §1 prüfen, Kachelrahmen-Datei benennen, lokale Supabase starten (`supabase start`, `supabase db reset`).
- [ ] **T1 Rot-Nachweise:** §3 Nr. 8 (a)–(e), Ergebnisse im BUILD_LOG.
- [ ] **T2 Auslagerung Top-Bar:** `TimeControlMenuV2` ohne Verhaltensänderung, bestehende Tests grün, Zeilenzahlen vorher/nachher.
- [ ] **T3 Modus `zeitpunkt`:** Reducer, Provider, Datenpfad, Statustext, Hinweise für `fest`/`puffer`/`keine` (2.1 Nr. 2, 2.2).
- [ ] **T4 Zeitpunkt-Bedienung:** Dialog (lazy), Vorgaben, Eingabe Berliner Zeit inkl. Zeitumstellung (Test 29.03. und 25.10.), Band „Zurück zu Live“.
- [ ] **T5 Zeitfenster:** `timeSeriesWindow`, `query.window` in TS, Migration + pgTAP, Inspector-Feld, Standzeile.
- [ ] **T6 Fadenkreuz:** Store, Kopplung, Tastatur, Touch, a11y, Render-Zähltest.
- [ ] **T7 Grenzfälle:** 2.5 Nr. 22–24.
- [ ] **T8 E2E, a11y, Screenshots:** Playwright mit gemocktem RPC: Zeitpunkt „Ende letzter Monat“ wählen → Verlauf endet dort, `puffer`-Kachel zeigt Hinweis, „Zurück zu Live“; Fenster auf 30 Tage stellen und speichern; Fadenkreuz über zwei Verlaufskacheln. Harness 1440/768/375 (Vorher: Live-Ansicht; Nachher: Zeitpunkt-Band, Inspector-Zeitfenster, Fadenkreuz in zwei Kacheln), 0 px Overflow.
- [ ] **T9 Leistung:** Bundle vorher/nachher, RPC-Zähltest, Render-Zähltest im BUILD_LOG.
- [ ] **T10 V1-Gegenprobe:** V1-Tests grün, V1-Diff leer.
- [ ] **T11 Doku:** 2.7.
- [ ] **T12 Abschluss:** Pflicht-Verifikation (§7), Schutzbereichs-Diff, BUILD_LOG-Eintrag inklusive Deployment-Anleitung für Marc (Migration 20261120 vor dem App-Deploy anwenden, Smoke: Dashboard mit `window` als `authenticated` speichern), PR öffnen, Review anfordern.

## 6. Abnahme

- Ein vergangener Analysezeitpunkt lässt alle Verlaufskacheln bis zu diesem Zeitpunkt enden; `puffer`-/`keine`-Kacheln zeigen keinen Wert, sondern den Hinweis; `fest`-Kacheln sind als zeitunabhängig gekennzeichnet. Nichts davon wird gespeichert.
- „Zurück zu Live“ stellt den Live-Zustand her und lädt gezielt neu.
- Jede Verlaufskachel kann ein eigenes Fenster haben; ungültige Fenster lehnen TS **und** SQL ab; Konfigurationen ohne Fenster bleiben bytegleich.
- Das Fadenkreuz koppelt alle sichtbaren Verlaufskacheln, auch mit unterschiedlicher Auflösung, mit Tastatur und Touch bedienbar, ohne andere Kacheln neu zu rendern.
- Berliner Zeit stimmt über die Zeitumstellung; keine Interpolation.
- Schutzbereichs-Diff leer, V1 unverändert, keine neuen Abhängigkeiten, `size-limit` grün, 0 px Overflow, keine neuen a11y-Verstöße.

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
supabase test db              # lokal, inkl. dashboard_query_window.sql und dashboard_time_series.sql
npx tsx scripts/verifyLiveKpiCatalog.ts
git diff <baseline> -- src/simulation src/types src/context src/services/data src/features/resources   # leer
git diff <baseline> -- src/services/liveKpi supabase/functions src/services/db/crmRepository.ts src/domain src/features/dashboard/model/dashboardPresets.ts src/features/dashboard/data/resolveCrm.ts src/features/dashboard/data/resolveLive.ts src/features/dashboard/data/crmAggregateSource.ts   # leer
git diff --stat <baseline> -- supabase/migrations   # nur 20261120_dashboard_query_window.sql neu
```

Zusätzlich Playwright `e2e/editor-time-point.spec.ts`, `e2e/editor-time-series.spec.ts` und `e2e/a11y.spec.ts` lokal; CI-Checks `lint`, `typecheck`, `test`, `build`, `livekpi-verifiers`, `size-limit`, `e2e` grün.

## 8. Offene Punkte und Risiken

- **Bundle-Spielraum** von ≈ 1,2 kB ist knapp. Nachladen ist Pflicht; reicht es nicht, entscheidet Marc (Grenze anheben oder Funktion kürzen).
- **Deployment-Reihenfolge:** Migration 20261120 vor dem App-Deploy, sonst scheitert das Speichern von Fenstern (2.5 Nr. 24).
- **Dünne Historie:** Wegen des späten Historienbeginns (137, 153) zeigen frühe Analysezeitpunkte überwiegend „vor Aufzeichnungsbeginn“. Gewollt.
- **Live-Testdaten auf Hosted** werden weiterhin wie Messwerte gezeigt (Entscheidung Marc offen, aus 160 übernommen).
- **Nicht Teil dieses Auftrags:** Zeitpunkt in der URL teilen, Vergleichszeiträume und Erwartungsbänder (P14), Alarme (P13), Bestands-Snapshots, historisch exakte Pipeline-Zuordnung.
