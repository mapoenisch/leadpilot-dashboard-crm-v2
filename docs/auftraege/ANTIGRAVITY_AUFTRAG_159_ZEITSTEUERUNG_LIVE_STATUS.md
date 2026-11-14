# Auftrag 159 – Dashboard-Editor: Historienmatrix, gemeinsame Zeitsteuerung, echte Pause und ehrlicher Live-Status (P10a)

**Ziel:** Der V2-Editor bekommt eine gemeinsame Zeitsteuerung. „Pause“ friert erstmals wirklich die sichtbaren Daten aller Kacheln auf einen gemeinsamen Analysezeitpunkt ein. Die Statusleiste zeigt den echten Zustand des Live-Feeds statt eines fest verdrahteten „Live“. Für jede Kennzahl ist im Katalog festgelegt und sichtbar, welche Historie belegt ist und ab wann. Es wird keine Historie erfunden. Zeitreihen aus dem Server, Rolling Windows, Time-Travel und Shared Crosshair folgen in P10b (Auftrag 160).

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P10 (§6), §4.C (Live- und Zeitsteuerung), §3.1 (Top-Bar: „Live/Pause“). **Plananpassung (Teil dieses Auftrags, T11):** P10 wird geteilt: 159 = P10a (dieser Auftrag, ohne Migration), 160 = P10b (belegte Server-Historie, Rolling Windows, Time-Travel, Crosshair). Die P10-Abnahme gilt erst mit 160.
**Fachgrundlage:** [KPI_FAEHIGKEITEN_144.md](../dashboard/KPI_FAEHIGKEITEN_144.md) (Fähigkeitsmatrix, Bestands-/Flussregeln, Live-Puffer), [EDITOR_UX_FACHVERTRAEGE_145.md](../dashboard/EDITOR_UX_FACHVERTRAEGE_145.md) §2.1 (Live/Pause-Schalter), [ABFRAGEVERTRAG_P08A.md](../dashboard/ABFRAGEVERTRAG_P08A.md) §1 (`timeframe`: `fest`/`aktuell`/`live`) und §5 (Cache-Schlüssel), [EDITOR_KERN_P04.md](../dashboard/EDITOR_KERN_P04.md) (Undo-Grenzen).
**Vorgelagert:** 158 (P09b Vorlagen und Dashboard-Auswahl). 159 startet erst, wenn 158 gemergt ist.
**Nachgelagert:** 160 (P10b belegte Historie und Time-Travel), danach P11.
**Baseline:** `<BASELINE>` = Merge-Commit von Auftrag 158 in `main` (Builder trägt den Hash in T0 ein).
**Branch:** `auftrag-159-zeitsteuerung-live-status`.
**Builder:** Antigravity. **Prüfer:** Codex auf GitHub (oder ein anderer Agent, der nicht gebaut hat) gemäß `CLAUDE.md` §4.1. **Merge:** Marc.
**Status:** GEPLANT.

---

## 1. Ist-Stand (geprüft auf `main` `e92429bd`, vor 158)

| Baustein             | Ist                                                                                                                                                                                                                                                                                                     | Fundstelle                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Pause-Knopf          | **Ohne Wirkung.** Die Shell hält `isLivePaused` als lokalen `useState`, die Top-Bar schaltet ihn um. Kein Datenpfad liest den Wert. Live-Kacheln laufen weiter, CRM-Abfragen werden weiter neu geladen. Einzige Wirkung: Die Statusleiste zeigt „Pausiert“.                                             | `components/editor/DashboardEditorShellV2.tsx:63, 218–219, 309`; `EditorTopBarV2.tsx:289–310`                      |
| Live-Status          | **Fest verdrahtet.** `connectionStatus` ist ein Prop mit Vorgabe `'connected'`. Der Container übergibt nichts, die Vorschau übergibt `"connected"`. Die Statusleiste zeigt deshalb „Live“, auch ohne Supabase, ohne Feed und ohne Live-Kachel. Das verletzt Masterplan §4.C („keine erfundenen Werte“). | `DashboardEditorShellV2.tsx:30, 49`; `EditorStatusBarV2.tsx:10, 59–85`; `preview/DashboardEditorPreviewV2.tsx:256` |
| Feed-Zustand         | Der Store kennt den echten Feed-Zustand (`connecting`, `live`, `reconnecting`, `offline`) über `getFeedConnectionState()`. Er ist laut Kommentar „nicht an die UI verdrahtet“. Es gibt keine Abo-Möglichkeit für Änderungen dieses Zustands.                                                            | `src/services/liveKpi/liveKpiStreamStore.ts` (Interface `LiveKpiStreamStore`, G34)                                 |
| Live-Puffer          | Initialer Abruf der letzten 30 Minuten, danach FIFO mit höchstens 30 Punkten, keine zeitbasierte Bereinigung. Einzel-KPIs liefern `series: null`.                                                                                                                                                       | `KPI_FAEHIGKEITEN_144.md` (Live-Abschnitt), `services/liveKpi/liveKpiStreamHistory.ts`                             |
| Kacheldaten          | `useDashboardData(tile, filters, options)` löst Stammdaten und Kombinationen synchron, CRM über React Query (`dashboardQueryKeys.crmOverview`), Live über `useSyncExternalStore` auf dem Live-Store. Die V2-Shell bekommt den Hook als `useData`-Prop injiziert.                                        | `hooks/useDashboardData.ts:59–223`; `pages/PersonalExecutiveDashboard.tsx:100` (V2), `:174` (V1)                   |
| Datenstand je Kachel | `ResolvedTileData` hat `timeBasis` (Katalogtext) und `asOf` (nur Live: `occurredAt`, sonst `null`). Für CRM gibt es keinen sichtbaren Abrufzeitpunkt.                                                                                                                                                   | `data/dashboardData.ts:36–45`                                                                                      |
| Historie im Katalog  | Die Historienlage steht nur als Freitext in `KPI_FAEHIGKEITEN_144.md`. Katalogeinträge haben `timeBasis` (Text) und `timeframe` (`fest`/`aktuell`/`live`), aber kein maschinenlesbares Historienfeld.                                                                                                   | `model/dashboardCatalog.ts:103–160`, `model/catalog/*.ts`                                                          |
| Belegte Ereignisse   | `deal_stage_events` (seit 137, Migration `20261110`) speichert jeden Phasenwechsel unveränderlich, organisationsgebunden. `live_kpi_events` ist seit 153 mandantengebunden. Beide werden vom Dashboard noch nicht als Zeitreihe gelesen.                                                                | `supabase/migrations/20261110_deal_stage_tracking.sql:19–45`, `20261115_live_kpi_tenant_binding.sql`               |
| Konfiguration        | `DashboardConfigV2.globalTimeframe: string` (Standard-Zeitraum) existiert. Ein Analysezeitpunkt oder Pausenzustand gehört nicht in die gespeicherte Konfiguration.                                                                                                                                      | `model/dashboardConfigV2.ts:109`                                                                                   |

Der Builder prüft diese Tabelle in T0 gegen den Stand nach 158 (Zeilennummern können sich verschoben haben, insbesondere in `EditorTopBarV2.tsx` und `DashboardEditorShellV2.tsx`). Abweichungen kommen in den BUILD_LOG.

## 2. Soll

### 2.1 Historienmatrix im Katalog

1. Neuer Typ in `model/dashboardCatalog.ts` (oder neue Datei `model/historyCapability.ts`, falls `dashboardCatalog.ts` über 400 Zeilen wächst):
   ```ts
   export type HistoryKind =
     | 'keine' // nur aktueller Stand, keine Historie gespeichert
     | 'fest' // feste Referenzreihe im Bundle (Stammdaten), kein Zeitwechsel möglich
     | 'puffer' // flüchtiger Live-Puffer im Browser (max. 30 Punkte), keine dauerhafte Historie
     | 'ereignisse'; // dauerhafte, belegte Ereignisse auf dem Server (Auswertung folgt in P10b)
   export interface HistoryCapability {
     kind: HistoryKind;
     source?: 'deal_stage_events' | 'live_kpi_events'; // nur bei 'ereignisse'
     reconstructable: 'nein' | 'nur_fluesse'; // Bestände aus heutigen Datensätzen sind nie rekonstruierbar
     note: string; // kurzer Satz für Inspector und Bibliothek
   }
   ```
2. **Jeder aktive Katalogeintrag** (48 laut P08a) bekommt `history: HistoryCapability`. Pflichtzuordnung:
   - `baseline.*` und `uebersicht.*` ohne Live-Bezug → `fest`, `reconstructable: 'nein'`.
   - `crm.*` → `keine`, `reconstructable: 'nein'`. **Ausnahme:** Kennzahlen, die reine Phaseneintritte zählen, dürfen `ereignisse` mit `source: 'deal_stage_events'` und `reconstructable: 'nur_fluesse'` tragen, aber nur wenn der Builder in T2 am Code belegt, dass sich der Wert vollständig aus `deal_stage_events` ergibt. Sonst bleibt es bei `keine`. Bestände wie `crm.pipeline_volumen`, `crm.pipeline_deals` und `crm.pipeline_gewonnen` bleiben `keine` (Begründung aus `KPI_FAEHIGKEITEN_144.md`: kumulativer Snapshot, nachträglich geänderte Beträge).
   - `live.*` und `uebersicht.live_aktivitaet` → `puffer`. Die serverseitige Historie aus `live_kpi_events` wird erst in P10b als `ereignisse` freigeschaltet; 159 ändert diese Zuordnung nicht vorab.
   - Kombinationen → `fest`, wenn alle Bestandteile `fest` sind, sonst `keine`. Als reine Funktion `deriveCombinationHistory` (keine Rangfolge der Arten, nur diese eine Regel).
3. Ein Integritätstest erzwingt: jeder aktive Eintrag hat `history`; `source` nur bei `ereignisse`; kein Bestand (`shape: 'bestand'`) mit `reconstructable: 'nur_fluesse'`; Kombinationsregel. Neuer Eintrag ohne `history` lässt den Test scheitern.
4. **Sichtbar:** Inspector (Abschnitt Daten) und Bibliothek (Detailzeile oder Tooltip einer Kennzahl) zeigen einen Text je Art, z. B. „Historie: nur aktueller Stand“, „Historie: feste Referenzwerte“, „Historie: flüchtig im Browser, letzte 30 Punkte“, „Historie: Ereignisse ab Aufzeichnungsbeginn (Auswertung folgt)“. Nur Text, keine neue Farbe als einziges Merkmal.
5. `KPI_FAEHIGKEITEN_144.md` bekommt einen datierten Nachtrag mit der Tabelle Katalog-ID → `history.kind` (aus dem Code erzeugt, nicht von Hand; Skript oder Test-Snapshot, Muster Fixtures aus 154/157).

### 2.2 Gemeinsame Zeitsteuerung (flüchtig, nicht gespeichert)

6. Neues Modul `src/features/dashboard/time/` (nicht `src/context/`, das ist Schutzbereich):
   - `timeControl.ts`: reiner Zustand und Übergänge.
     ```ts
     export type TimeControlMode = 'live' | 'pausiert';
     export interface TimeControlState {
       mode: TimeControlMode;
       analysisAt: string | null; // ISO-Zeitpunkt der Pause, null im Live-Modus
       resumeToken: number; // steigt bei jeder Wiederaufnahme
     }
     ```
     Übergänge `pause(now)`, `resume()`. Doppeltes Pausieren ändert `analysisAt` nicht. Tabellentest.
   - `TimeControlProvider.tsx` und `useTimeControl()` (React-Kontext innerhalb des Features).
7. Der Zustand gehört **nicht** in `DashboardConfigV2`, nicht in den Entwurf und nicht in den Undo-Verlauf. Er wird nicht gespeichert, beim Neuladen und beim Dashboard-Wechsel (158) startet der Editor im Live-Modus. Kein Speichern-Hinweis durch Pause (`isDirty` bleibt unverändert, Test).
8. Die Shell ersetzt ihren lokalen `isLivePaused`-State durch den Provider. Top-Bar-Knopf und Tastenkürzel (falls vorhanden) rufen `pause`/`resume`. Der Knopf trägt `aria-pressed` und einen Text („Pausieren“/„Fortsetzen“), nicht nur ein Symbol.

### 2.3 Echte Pause im Datenpfad

9. Neuer Hook `time/useTimeControlledData.ts` mit derselben Signatur wie `useDashboardData`. Die V2-Shell bekommt ihn als `useData` (Einbindung in `PersonalExecutiveDashboard.tsx` V2-Pfad und in der V2-Vorschau). **Der V1-Pfad (`PersonalExecutiveDashboard.tsx:174`) und `DashboardTileDetailPage.tsx` bleiben auf `useDashboardData` und verhalten sich unverändert (Test).**
10. Verhalten im Modus `pausiert`:
    - Jede Kachel zeigt den Stand, den sie beim Pausieren hatte. Der Hook hält das zuletzt gelieferte `TileData` je Kachel fest und gibt es unverändert zurück, solange `mode = 'pausiert'`.
    - **Live-Kacheln:** Das Abo im Store bleibt bestehen (kein `release`), damit der Puffer weiterläuft. Nur die Anzeige ist eingefroren. Neue Ereignisse während der Pause lösen keinen sichtbaren Wertwechsel aus (Test mit simuliertem Event).
    - **CRM-Kacheln:** Kein automatisches Neuladen während der Pause (kein Refetch bei Fensterfokus, Reconnect oder Intervall für die betroffenen Abfragen). Umsetzung über die Optionen der bestehenden `useQuery`-Abfrage oder über einen Schalter in `UseDashboardDataOptions` (z. B. `frozen: true`). Ändert der Builder dafür `useDashboardData.ts`, bleibt das Standardverhalten ohne die neue Option bytegleich (Test).
    - **Stammdaten und Kombinationen:** ändern sich ohnehin nicht; sie werden trotzdem über denselben Mechanismus geführt.
    - **Kachel während der Pause hinzugefügt** (oder Sektion aufgeklappt, 157): lädt einmal, friert dann ein und zeigt sichtbar „Stand: <Uhrzeit> (nach Pausenbeginn geladen)“, weil ihr Stand vom gemeinsamen Analysezeitpunkt abweicht. Keine stille Mischung (Test).
    - **Filter- oder Pipelinewechsel während der Pause:** betroffene CRM-Kacheln laden einmal neu und werden wie oben gekennzeichnet. Alternative, falls einfacher und klarer: Pipelinewechsel ist während der Pause deaktiviert mit Grund „Zum Ändern zuerst fortsetzen“. Der Builder wählt eine Variante, begründet sie im BUILD_LOG und testet sie.
11. **Wiederaufnahme:** `resume()` gibt die Anzeige frei, setzt einmalig ein Invalidieren der aktuell sichtbaren CRM-Abfragen über `dashboardQueryKeys` ab (nur die eigenen Cache-Schlüssel mit Organisation und Nutzer, keine fremden) und übernimmt für Live-Kacheln den aktuellen Store-Stand. Ergebnis: ein konsistenter aktueller Stand ohne Doppelzählung. Zähltest: 24 Kacheln über 3 Pipelines erzeugen beim Fortsetzen genau 3 CRM-Abrufe.
12. Eingeklappte Sektionen (157) bleiben auch während der Pause ohne Datenabruf. Undo, Redo, Layoutänderungen und Speichern funktionieren während der Pause normal; die Pause betrifft nur Daten.
13. Server-Alarme gibt es erst ab P13. Die Statusleiste zeigt während der Pause keinen Hinweis auf Alarme. Die Spezifikation hält fest: Pause wirkt nur auf die Browseranzeige, nie auf künftige Serverprüfungen.

### 2.4 Ehrlicher Live-Status

14. Der Live-Store bekommt eine Abo-Möglichkeit für den Feed-Zustand, z. B. `subscribeFeedConnection(listener): () => void`. `getFeedConnectionState()` bleibt. Der Kommentar „nicht an die UI verdrahtet“ wird angepasst. Keine Änderung an Adapter, Puffergröße, Aufbewahrungsfenster (`RETENTION_MS`) oder Mandantenbindung. Bestehende Store-Tests bleiben grün, neue Tests für das Abo.
15. Neuer Hook `time/useEditorLiveStatus.ts` leitet **drei getrennte Angaben** ab (Masterplan §4.C „Live-Status“):
    - **Verbindung:** `nicht_konfiguriert` (kein Supabase), `kein_live_inhalt` (keine Live-Kachel sichtbar, Feed nicht angefordert), `verbindet`, `verbunden`, `wiederverbinden`, `offline`. Quelle: `isLiveKpiReadConfigured()`, Anzahl sichtbarer Live-Kacheln, `getFeedConnectionState()`.
    - **Letzte neue Daten:** Zeitpunkt des jüngsten tatsächlich empfangenen Live-Ereignisses (`occurredAt` des jüngsten Snapshots aller sichtbaren Live-Kacheln). Ohne Ereignis: „noch keine Daten empfangen“.
    - **Datenstand:** im Live-Modus der älteste `asOf` bzw. CRM-Abrufzeitpunkt (`dataUpdatedAt` der Abfrage) der sichtbaren Kacheln mit aktuellem Bezug; im Modus `pausiert` „Angehalten seit <Uhrzeit>“.
      Keine Ping-, Latenz- oder Durchsatzwerte (es gibt keine Messung dafür).
16. `EditorStatusBarV2.tsx` zeigt diese drei Angaben als Text. Der Prop `connectionStatus` mit Vorgabe `'connected'` entfällt; Shell und Vorschau übergeben nichts Erfundenes mehr. Die Vorschau (`DashboardEditorPreviewV2.tsx`) bekommt einen kontrollierbaren Store-Zustand für den Screenshot-Harness (verbunden, offline, nicht konfiguriert).
17. Statuswechsel werden über die bestehende Live-Region angesagt, aber gedrosselt: nur Wechsel der **Verbindung** und Pause/Fortsetzen, nicht jedes neue Ereignis. Beispiele: „Live-Verbindung unterbrochen, verbinde neu“, „Anzeige angehalten um 14:32“, „Anzeige fortgesetzt“.

### 2.5 Kennzeichnung je Kachel

18. Jede Kachel im V2-Editor und in der V2-Vorschau zeigt ihren Datenstand als kurze Zeile oder Tooltip, abgeleitet aus `history.kind` und dem tatsächlichen Stand:
    - `fest`: „Referenzwert, Stand <timeBasis>“
    - `keine` (CRM): „Aktueller Stand, abgerufen <Uhrzeit>“
    - `puffer` (Live): „Live, zuletzt <Uhrzeit>“ bzw. „noch keine Live-Daten“
    - Abweichung vom gemeinsamen Analysezeitpunkt (2.3 Nr. 10) zusätzlich gekennzeichnet.
      Bestehende Kachel-Badges werden wiederverwendet, keine neue Komponentenbibliothek. Kachelgrößen aus P06 dürfen sich nicht ändern (Layout-Integritätstest und Screenshot-Vergleich).
19. Kacheln mit `tile.filterMode: 'fester_stand'` (V1-Erbe) bleiben unverändert und zeigen ihren festen Stand; sie zählen nicht als Abweichung.

### 2.6 Leistung

20. Pausieren und Fortsetzen erzeugen keinen zusätzlichen Live-Feed-Kanal und keine verwaisten Abos (Zähltest über `acquire`/`release` und Feed-Abo bei 10× Pause/Fortsetzen mit 24 Kacheln).
21. Der Live-Status-Hook rendert die Statusleiste nicht bei jedem Live-Ereignis neu, sondern höchstens einmal pro Sekunde (Drossel, Test mit Fake-Timern).
22. `size-limit` bleibt grün; Größe vor/nach im BUILD_LOG.

### 2.7 Dokumentation

23. Neue Spezifikation `docs/dashboard/ZEITSTEUERUNG_P10A.md`: Historienarten mit Zuordnungsregeln und Begründung (Ereignis, Fluss, Bestand), Zustandsmodell der Zeitsteuerung, Verhalten je Quellschicht bei Pause und Fortsetzen, Live-Status mit den drei Angaben und ihren Quellen, Kennzeichnung je Kachel, bewusste Grenzen (keine gespeicherte Pause, keine Zeitreihen vom Server, kein Time-Travel, kein Rolling Window, kein Crosshair bis P10b; keine Alarme bis P13).
24. Datierte Nachträge (nichts umschreiben): `DASHBOARD_EDITOR_MASTERPLAN.md` §6 (Plananpassung P10a/P10b und Umsetzungsstand P10a), `KPI_FAEHIGKEITEN_144.md` (2.1 Nr. 5), `EDITOR_UX_FACHVERTRAEGE_145.md` §2.1 (Live/Pause umgesetzt; Pause friert alle Datenquellen ein, nicht nur Live-Streams).
25. **Vorgabe für 160 (P10b) im Masterplan-Nachtrag festhalten**, damit der nächste Detailauftrag darauf aufbaut: Server-RPC für Zeitreihen aus `deal_stage_events` (nur Flussgrößen) und `live_kpi_events`, ausgewiesener Historienbeginn je Organisation als frühester belegter Zeitpunkt, Auflösung und Punktobergrenze, sichtbare Datenlücken, Rolling Windows über belegte Zeitstempel, Time-Travel als absoluter Analysezeitpunkt (erweitert `TimeControlState` um `mode: 'zeitpunkt'`), Shared Crosshair mit Zeitzone Europe/Berlin.

## 3. Verbindliche Grenzen

1. **Schutzbereiche:** `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**` bleiben unberührt (Diff leer). Der neue Kontext liegt unter `src/features/dashboard/time/`.
2. **Keine Migration**, keine RPC, keine Änderung an Tabellen, RLS oder Grants. `supabase/` bleibt unverändert. Kein Zugriff auf die Hosted-Instanz.
3. **Keine Änderung an `DashboardConfigV2`**, keine neue Schema-Version, keine neuen gespeicherten Felder. Zeitsteuerung ist flüchtig.
4. **V1-Pfad unverändert:** V1-Editor, `PersonalExecutiveDashboard.tsx` V1-Zweig, `DashboardTileDetailPage.tsx`, `dashboardPresets.ts`, Rollout-Schalter `dashboardRollout.ts`.
5. **Live-Store nur ergänzen** (2.4 Nr. 14): kein geändertes Verhalten von `acquire`, `release`, Puffer, Aufbewahrung, Mandanten-Reset. `liveKpiReadAdapter.ts`, `liveKpiTenantScope.ts`, `liveKpiStreamHistory.ts` und die Edge Function bleiben unverändert.
6. **`data/**`** (`resolveCrm.ts`, `resolveLive.ts`, `crmAggregateSource.ts`, `dashboardQueryKeys.ts` usw.) bleibt unverändert. `useDashboardData.ts` darf nur eine optionale Option bekommen, deren Fehlen das bisherige Verhalten bytegleich lässt (2.3 Nr. 10).
7. `crmRepository.ts` und `src/domain/**` bleiben unverändert.
8. **Keine neuen Abhängigkeiten.** React Query, Lucide, Design-Tokens und bestehende Badges wiederverwenden.
9. **`max-lines` 400** für alle neuen und geänderten Dateien. `DashboardEditorShellV2.tsx` und `EditorTopBarV2.tsx` werden durch den Umbau nicht länger als nach 158 (Zeilenzahl vorher/nachher im BUILD_LOG).
10. **Tests zuerst** (rot vor grün), Rot-Läufe im BUILD_LOG: (a) Ein Live-Ereignis während „Pause“ ändert den angezeigten Wert einer Live-Kachel; (b) die Statusleiste zeigt „Live“ ohne konfiguriertes Supabase; (c) ein Katalogeintrag ohne `history` fällt im Integritätstest nicht auf; (d) eine CRM-Abfrage lädt während der Pause bei Fensterfokus neu.

## 4. Ziel-Dateien

| Pfad                                                                                                                                       | Änderung                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_159_ZEITSTEUERUNG_LIVE_STATUS.md`                                                                      | Dieser Auftrag (Checkboxen abhaken, Status)                                            |
| `docs/dashboard/ZEITSTEUERUNG_P10A.md`                                                                                                     | Neu: Spezifikation (2.7 Nr. 23)                                                        |
| `src/features/dashboard/model/dashboardCatalog.ts` bzw. `model/historyCapability.ts` (neu, falls nötig)                                    | Typ `HistoryCapability`, `deriveCombinationHistory` (2.1)                              |
| `src/features/dashboard/model/catalog/activeEntries.ts`, `extendedEntries.ts`, `liveEntries.ts`, `combinationEntries.ts`                   | Feld `history` je aktivem Eintrag (2.1 Nr. 2)                                          |
| `src/features/dashboard/time/timeControl.ts`, `TimeControlProvider.tsx`, `useTimeControlledData.ts`, `useEditorLiveStatus.ts`              | Neu (2.2–2.4)                                                                          |
| `src/features/dashboard/hooks/useDashboardData.ts`                                                                                         | Nur optionale Einfrier-Option, Standard bytegleich (2.3 Nr. 10)                        |
| `src/services/liveKpi/liveKpiStreamStore.ts`                                                                                               | Nur `subscribeFeedConnection` ergänzen (2.4 Nr. 14)                                    |
| `src/features/dashboard/components/editor/DashboardEditorShellV2.tsx`                                                                      | Provider statt lokalem Pause-State, `connectionStatus`-Prop entfernen                  |
| `src/features/dashboard/components/editor/EditorTopBarV2.tsx` bzw. ausgelagerte Teilkomponente unter `components/editor/topbar/`           | Pause-Knopf an Zeitsteuerung, `aria-pressed`, Text                                     |
| `src/features/dashboard/components/editor/EditorStatusBarV2.tsx`                                                                           | Drei Statusangaben (2.4 Nr. 16)                                                        |
| `src/features/dashboard/components/editor/canvas/CanvasTileCard.tsx` (oder die Stelle, die den Kachelkopf rendert)                         | Datenstand-Kennzeichnung (2.5)                                                         |
| `src/features/dashboard/components/editor/inspector/**`, `WidgetLibraryV2.tsx`                                                             | Historientext (2.1 Nr. 4)                                                              |
| `src/features/dashboard/pages/PersonalExecutiveDashboard.tsx`                                                                              | Nur V2-Zweig: `useTimeControlledData` einbinden                                        |
| `src/features/dashboard/preview/DashboardEditorPreviewV2.tsx`                                                                              | Hook einbinden, steuerbarer Store-Zustand für den Harness                              |
| `src/features/dashboard/__tests__/timeControl.vitest.ts`                                                                                   | Neu: Zustandsübergänge                                                                 |
| `src/features/dashboard/__tests__/useTimeControlledData.vitest.tsx`                                                                        | Neu: Einfrieren je Quellschicht, nach Pause hinzugefügte Kachel, Fortsetzen, Zähltests |
| `src/features/dashboard/__tests__/useEditorLiveStatus.vitest.tsx`                                                                          | Neu: drei Angaben, Drossel, keine erfundenen Werte                                     |
| `src/features/dashboard/__tests__/catalogHistory.vitest.ts`                                                                                | Neu: Integrität der Historienmatrix, Kombinationsregel, Snapshot der Zuordnung         |
| `src/services/liveKpi/__tests__/` (bestehende Store-Tests)                                                                                 | Abo-Test ergänzen; nicht löschen                                                       |
| bestehende Tests (`EditorTopBarV2`, `EditorStatusBarV2`, `DashboardEditorShellV2`, `useDashboardData`, `PersonalExecutiveDashboard`)       | Erwartungen anpassen/ergänzen; nicht löschen                                           |
| `e2e/editor-time-control.spec.ts`                                                                                                          | Neu: pausieren, Kachel hinzufügen, fortsetzen, neu laden startet live                  |
| `e2e/a11y.spec.ts`, `e2e/a11y-baseline.json`                                                                                               | Zustand „pausiert“ und Statusleiste „offline“ (Baseline nur erweitern)                 |
| `scripts/captureAuftrag159GateScreenshots.mjs`, `docs/screenshots/auftrag-159/README.md`                                                   | Neu: Harness und Ergebnis-Matrix (nur README committen)                                |
| `docs/dashboard/DASHBOARD_EDITOR_MASTERPLAN.md`, `docs/dashboard/KPI_FAEHIGKEITEN_144.md`, `docs/dashboard/EDITOR_UX_FACHVERTRAEGE_145.md` | Datierte Nachträge (2.7 Nr. 24–25)                                                     |
| `BUILD_PLAN.md`, `docs/BUILD_LOG.md`                                                                                                       | Status, Builder-Eintrag, Prüfnachweis                                                  |

Bei Bedarf außerhalb dieser Liste: stoppen und im PR begründen (`CLAUDE.md` §5.3).

## 5. Tasks

Reihenfolge je Block: Tests zuerst, dann Umsetzung.

- [ ] **T0 Einstieg:** Nach dem Merge von 158 Branch von aktuellem `main` anlegen, `<BASELINE>` eintragen. Masterplan P10/§4.C, `KPI_FAEHIGKEITEN_144.md`, `ABFRAGEVERTRAG_P08A.md` §1/§5, `EDITOR_UX_FACHVERTRAEGE_145.md` §2.1 und diesen Auftrag lesen. Ist-Tabelle §1 gegen den Stand nach 158 prüfen. Schutzbereichs-Diff leer.
- [ ] **T1 Rot-Nachweise:** §3 Nr. 10 (a)–(d). Ergebnisse im BUILD_LOG.
- [ ] **T2 Historienmatrix:** Typ, Zuordnung aller aktiven Einträge, Belegprüfung für etwaige `ereignisse`-Einträge bei CRM (2.1 Nr. 2), Integritätstest, erzeugte Tabelle.
- [ ] **T3 Zeitsteuerung:** `timeControl.ts`, Provider, Einbindung in der Shell; Pause ohne `isDirty` und ohne Undo-Eintrag.
- [ ] **T4 Einfrieren im Datenpfad:** `useTimeControlledData`, ggf. Option in `useDashboardData`; Live, CRM, Stammdaten, Kombination; Kachel nach Pausenbeginn; gewählte Variante für Filterwechsel (2.3 Nr. 10).
- [ ] **T5 Fortsetzen:** gezieltes Invalidieren, Live-Übernahme, Zähltests (2.3 Nr. 11, 2.6 Nr. 20).
- [ ] **T6 Live-Status:** Store-Abo, `useEditorLiveStatus`, Statusleiste, Vorschau ohne erfundenen Status, Drossel, Ansagen.
- [ ] **T7 Kennzeichnung:** Datenstand je Kachel, Historientext in Inspector und Bibliothek; Kachelgrößen unverändert.
- [ ] **T8 E2E, a11y, Screenshots:** Playwright-Ablauf; a11y-Ergänzung; Harness (Vorher: Statusleiste „Live“ ohne Feed; Nachher: live/verbunden, pausiert, offline, nicht konfiguriert; Kachel mit Abweichungskennzeichnung; jeweils 1440/768/375, hell und dunkel), SHA-256 unterschiedlich, 0 px Overflow.
- [ ] **T9 Leistung:** Zähltests und Bundle-Größe aus 2.6 im BUILD_LOG.
- [ ] **T10 V1-Gegenprobe:** V1-Editor und Kachel-Detailseite unverändert (bestehende Tests grün, Diff der V1-Dateien leer).
- [ ] **T11 Doku:** Spezifikation, Nachträge, Plananpassung P10a/P10b und Vorgabe für 160 (2.7).
- [ ] **T12 Abschluss:** Pflicht-Verifikation (§7), Schutzbereichs-Diff, BUILD_LOG-Builder-Eintrag, PR öffnen, Review anfordern.

## 6. Abnahme

- „Pausieren“ friert alle sichtbaren Kacheln auf denselben Analysezeitpunkt ein; neue Live-Ereignisse und CRM-Neuladen ändern während der Pause nichts Sichtbares.
- Eine während der Pause hinzugefügte oder aufgeklappte Kachel ist sichtbar als abweichender Stand gekennzeichnet.
- „Fortsetzen“ zeigt einen konsistenten aktuellen Stand; 24 Kacheln über 3 Pipelines erzeugen genau 3 CRM-Abrufe; keine verwaisten Abos nach 10 Pausenzyklen.
- Pause verändert weder Entwurf, `isDirty` noch Undo-Verlauf; nach Neuladen und Dashboard-Wechsel startet der Editor live.
- Die Statusleiste zeigt Verbindung, letzte neue Daten und Datenstand getrennt und nur aus echten Quellen; ohne Supabase steht dort nie „Live“.
- Jeder aktive Katalogeintrag hat eine geprüfte Historienart; kein Bestand gilt als rekonstruierbar; Inspector und Bibliothek zeigen den Text.
- V1-Pfad unverändert; Schutzbereichs-Diff leer; keine Migration; keine neuen Abhängigkeiten; `size-limit` grün.
- 1440/768/375 ohne horizontalen Overflow, Pause-Knopf und Statusleiste per Tastatur und Screenreader verständlich, keine neuen a11y-Verstöße.

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
git diff <BASELINE> -- src/simulation src/types src/context src/services/data src/features/resources   # muss leer sein
git diff <BASELINE> -- supabase src/services/db/crmRepository.ts src/domain src/features/dashboard/data src/features/dashboard/model/dashboardPresets.ts   # muss leer sein
git diff <BASELINE> -- src/services/liveKpi/liveKpiReadAdapter.ts src/services/liveKpi/liveKpiTenantScope.ts src/services/liveKpi/liveKpiStreamHistory.ts supabase/functions   # muss leer sein
```

Zusätzlich: Playwright `e2e/editor-time-control.spec.ts` und `e2e/a11y.spec.ts` lokal, CI-Checks `lint`, `typecheck`, `test`, `build`, `livekpi-verifiers`, `size-limit`, `e2e` grün.

## 8. Offene Punkte und Risiken

- **Pause im Viewer-Modus/Kiosk:** 159 betrifft nur den V2-Editor und seine Vorschau. Eine Zeitsteuerung für das reine Ansehen (und Kiosk) folgt mit der Ausrollung des V2-Viewers; im Masterplan-Nachtrag vermerken.
- **Filterwechsel während der Pause:** Der Builder entscheidet zwischen „einmal laden und kennzeichnen“ und „sperren mit Grund“ (2.3 Nr. 10). Beides ist zulässig, die Wahl steht begründet im BUILD_LOG.
- **CRM-Kennzahlen mit `ereignisse`:** Wahrscheinlich bleibt es in 159 bei `keine` für alle CRM-Einträge, weil die heutigen Kennzahlen Bestände sind. Neue ereignisbasierte Flusskennzahlen (z. B. „Phaseneintritte je Woche“) sind Sache von 160 und brauchen dort eigene Katalogeinträge.
- **Live-Feed-Betriebsregel aus 153:** Die Migrationen und die Edge Function sind seit 14.11.2026 online (BUILD_LOG „Hosted-Umstellung 14.11.2026“). Ob die Regel „keine echten Kennzahlen einspeisen“ damit aufgehoben ist, entscheidet Marc. 159 ändert daran nichts und speist keine Daten ein.
- **Nicht Teil dieses Auftrags:** Zeitreihen vom Server, Historienbeginn je Organisation, Rolling Windows, Time-Travel, Shared Crosshair (alle P10b/160), Alarme (P13), Vergleichszeiträume und Erwartungsbänder (P14).
