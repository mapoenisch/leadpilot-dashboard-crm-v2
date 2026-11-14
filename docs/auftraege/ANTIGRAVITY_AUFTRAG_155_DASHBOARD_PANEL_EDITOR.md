# Auftrag 155 – Dashboard-Editor: Panel-Editor mit Baukasten, Vorschau und Rohdateninspektor (P08b)

**Ziel:** Eine Kachel des V2-Editors lässt sich in einer Vollflächen-Fokusansicht bearbeiten. Der Panel-Editor arbeitet auf einer eigenen temporären Arbeitskopie, zeigt eine Live-Vorschau mit denselben Renderern wie das Dashboard, führt durch einen visuellen Baukasten in sechs Stufen, bietet einen deklarativen Modus (validiertes JSON, verlustfreier Wechsel) und legt im Rohdateninspektor offen, woraus der angezeigte Wert berechnet wurde. „Übernehmen“ ist genau ein Undo-Schritt im Dashboard-Entwurf, „Abbrechen“ hinterlässt keine Spur. Damit ist die P08-Abnahme des Masterplans vollständig erfüllt.

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P08 sowie §3.2, §3.3, §4.B und §4.D (nur Darstellung). Plananpassung vom 13.11.2026: P08 ist geteilt, dies ist P08b.
**Fachgrundlage:** [ABFRAGEVERTRAG_P08A.md](../dashboard/ABFRAGEVERTRAG_P08A.md) (verbindlich), [EDITOR_UX_FACHVERTRAEGE_145.md](../dashboard/EDITOR_UX_FACHVERTRAEGE_145.md) §3 (UX-Skizze, wo sie dem Abfragevertrag widerspricht, gilt der Abfragevertrag, siehe §1 unten).
**Vorgelagert:** 154 (P08a, PR #181, gemergt).
**Nachgelagert:** 156 (CRM-Repository-Paginierung), danach P09.
**Baseline:** `main`, Commit `a7313ba` (Merge von PR #181).
**Branch:** `auftrag-155-panel-editor` (enthält diesen Auftrag; der Builder baut darauf weiter).
**Builder:** Antigravity. **Prüfer:** Codex auf GitHub (oder ein anderer Agent, der nicht gebaut hat) gemäß `CLAUDE.md` §4.1. **Merge:** Marc.
**Status:** GEPLANT, noch nicht gebaut.

---

## 1. Ist-Stand (Baseline `a7313ba`), am Code geprüft

| Baustein                       | Ist                                                                                                                                                                                                                                              | Fundstelle                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Einstieg im Inspector          | Schaltfläche `Im Panel-Editor öffnen` (`data-testid="open-panel-editor-btn"`) ruft `onOpenPanelEditor?.(tileId)`.                                                                                                                                | `components/editor/EditorInspectorV2.tsx:270–282`                                                    |
| Verdrahtung                    | `DashboardEditorShellV2` reicht `onOpenPanelEditor` nur durch. `PersonalExecutiveDashboardV2Container` und `DashboardEditorPreviewV2` übergeben **nichts**: Der Knopf ist heute ohne Wirkung.                                                    | `components/editor/DashboardEditorShellV2.tsx:44,56`; `pages/PersonalExecutiveDashboard.tsx:75–86`   |
| Shell-Größe                    | `DashboardEditorShellV2.tsx` hat 394 Zeilen (Grenze `max-lines` 400). Neue Logik passt dort nicht hinein.                                                                                                                                        | —                                                                                                    |
| Kachel-Schnellaktion           | Die Kachel hat eine Aktion „Im Inspector konfigurieren“ (Symbol `Sliders`), aber keine Aktion „Widget bearbeiten“.                                                                                                                               | `components/editor/canvas/CanvasTileCard.tsx:~193–205`                                               |
| Undo-Befehl                    | `UpdateTileConfigCommand(tileId, fromPatch, toPatch)` setzt ein Teilobjekt der Kachel und nimmt es vollständig zurück. Ein Aufruf = ein Verlaufsschritt.                                                                                         | `core/editorCommands.ts:121–177`                                                                     |
| Abfragevertrag                 | `normalizeTileQuery`, `validateTileQuery` (7 Fehlercodes) und `getQueryCapabilities` (Aggregationen, Pipeline-Filter, Gruppierung `stage`, genau ein Zeitbezug, erlaubte Darstellungen) sind vorhanden und getestet.                             | `model/tileQuery.ts`, `model/queryCapabilities.ts`                                                   |
| Sperrgründe                    | Die Texte für gesperrte Optionen (z. B. „Feste Stammdaten, kein Pipeline-Filter“) stehen direkt in `InspectorTabs.tsx` (379 Zeilen).                                                                                                             | `components/editor/inspector/InspectorTabs.tsx:~170, 221, 249`                                       |
| Renderer                       | Canvas rendert über `LazyDashboardTile` mit `useData`-Hook und `convertV2TileToV1(normalizeTileQuery(...))`.                                                                                                                                     | `components/editor/canvas/CanvasTileCard.tsx:19–66`; `components/LazyDashboardTile.tsx`              |
| Servermetadaten gehen verloren | `fetchCrmPipelineOverview` liefert `evaluatedDeals`, `pipeline`, `asOf`. `resolveCrmFromOverview` übernimmt davon nichts (`asOf: null`); `ResolvedTileData` hat kein Feld dafür. Der Rohdateninspektor hätte heute keine Datenquelle.            | `data/crmAggregateSource.ts:10–14, 63–78`; `data/resolveCrm.ts:37–54`; `data/dashboardData.ts:41–44` |
| Herkunft Browser vs. Server    | Der Offline-Fallback setzt `evaluatedDeals = totalDeals` und `asOf = now`, ohne Kennzeichnung, dass im Browser gerechnet wurde.                                                                                                                  | `data/crmAggregateSource.ts:70–79`                                                                   |
| Mindestgrößen                  | Das V2-Raster kennt keine darstellungsabhängigen Mindestgrößen. Ein Wechsel von Kennzahl oder Darstellung ändert das Layout nicht.                                                                                                               | `components/editor/grid/gridEngine.ts`, `editorPlacement.ts` (keine `minW`-Regel gefunden)           |
| Lazy Loading                   | Muster vorhanden: `lazy(loader)` mit `Suspense` im Workspace, Chart-Loader.                                                                                                                                                                      | `components/DashboardWorkspace.tsx:4,62`; `components/charts/chartLoaders.ts`                        |
| Abweichungen im P02-Vertrag    | §3.2 nennt 144 Katalog-IDs, Filter wie Deal-Status/Lead-Kanal, Gruppierungen wie Region/Segment und Zeitfenster (30 Min, 7 Tage, Geschäftsjahr). Laut Abfragevertrag gibt es 48 aktive IDs, nur `pipeline`, nur `stage`, keinen freien Zeitraum. | `EDITOR_UX_FACHVERTRAEGE_145.md:139–150`; `ABFRAGEVERTRAG_P08A.md` §1, §6                            |

## 2. Soll

### 2.1 Öffnen, Arbeitskopie, Übernehmen, Abbrechen

1. Der Panel-Editor öffnet sich aus (a) dem Inspector-Knopf `Im Panel-Editor öffnen` und (b) einer neuen Kachel-Schnellaktion „Widget bearbeiten“ (`data-testid="tile-open-panel-editor"`). Die bestehende Aktion „Im Inspector konfigurieren“ bleibt. Ein fachlicher Drilldown bleibt eine eigene Aktion (Masterplan §3.1).
2. Der Panel-Editor ist eine Vollflächenansicht innerhalb des V2-Editors (`role="dialog"`, `aria-modal="true"`, beschriftet mit dem Kacheltitel), keine eigene Route. Fokus springt beim Öffnen auf den Titel, bleibt im Panel gefangen und kehrt beim Schließen auf das auslösende Element zurück.
3. Beim Öffnen entsteht eine **temporäre Arbeitskopie** der Kachel: `catalogId`, `title`, `view`, `query` (normalisiert über `normalizeTileQuery`). Änderungen im Panel berühren den Dashboard-Entwurf nicht: kein Änderungsstern, kein Undo-Eintrag, kein Datenabruf für andere Kacheln.
4. **Übernehmen** dispatcht genau **einen** `UpdateTileConfigCommand` mit `fromPatch` = Originalwerte der geänderten Felder und `toPatch` = neue Werte (Beschreibung „Kachel im Panel-Editor bearbeitet“). Ein Undo stellt Kennzahl, Titel, Darstellung und Abfrage vollständig wieder her, ein Redo wendet alles wieder an. Ohne Änderung ist „Übernehmen“ deaktiviert. Gespeichert wird erst mit „Dashboard speichern“.
5. Übernehmen ist nur mit gültiger Arbeitskopie möglich (`validateTileQuery` ohne Fehler, Darstellung in `allowedPresentations`, Titel innerhalb der Längengrenze des Inspectors). Sonst ist der Knopf deaktiviert und nennt den ersten Grund.
6. **Abbrechen**, Zurück-Pfeil und `Escape` schließen das Panel. Bei geänderter Arbeitskopie fragt zuerst ein Dialog (bestehende `UnsavedChangesDialog`-Komponente wiederverwenden), ob die Änderungen verworfen werden. Nach dem Verwerfen ist der Entwurf bytegleich zum Stand vor dem Öffnen (Test).
7. Während das Panel offen ist, gelten die bestehenden Navigationssicherungen des Editors unverändert (`useInAppLinkGuard`, `useBrowserBackGuard`, `useLeaveGuard`). Ungespeicherte Panel-Änderungen zählen dabei als offene Änderungen.
8. Wird die Kachel während der Panel-Sitzung aus dem Entwurf entfernt (z. B. Undo eines Hinzufügens per Tastenkürzel), schließt das Panel mit Hinweis, ohne etwas zu schreiben. Tastenkürzel des Haupt-Editors (`useEditorShortcuts`) sind bei offenem Panel inaktiv; das Panel hat in P08b keinen eigenen Verlauf.
9. Der Panel-Editor wird per `React.lazy` nachgeladen und liegt in einem eigenen Chunk. Das Initial-Bundle wächst nicht über die `size-limit`-Grenze; der Builder belegt im BUILD_LOG die Größe des neuen Chunks und die Initial-Bundle-Größe vor/nach.

### 2.2 Kopfzeile

10. Zurück-Pfeil, editierbarer Widget-Titel (gleiche Längengrenze und Leer-Regel wie im Inspector), Modus-Umschalter `Visueller Baukasten` ↔ `Deklarative Abfrage` (Segment-Schalter, Tastatur bedienbar), `Abbrechen`, primär `Übernehmen`.
11. Ein Änderungshinweis („Nicht übernommen“) erscheint, sobald die Arbeitskopie vom Original abweicht.

### 2.3 Live-Vorschau (obere Hälfte)

12. Die Vorschau rendert die Arbeitskopie mit **denselben** Bausteinen wie der Canvas: `LazyDashboardTile`, derselbe `useData`-Hook, `convertV2TileToV1(normalizeTileQuery(...))`. Keine eigene Rechenlogik, keine eigenen Diagramme.
13. Umschalter Desktop (1440) / Tablet (768) / Mobil (375): Die Vorschau zeigt die Kachel in der Breite und Höhe, die sie im jeweiligen Breakpoint-Layout des Entwurfs hat (Spaltenanteil × Rahmenbreite), skaliert in die verfügbare Fläche. Der Umschalter ändert weder Layout noch Datenrechte (Masterplan §3.3).
14. Zustände `laden`, `keine_daten`, `fehler`, `nicht_verfuegbar` werden wie auf dem Canvas angezeigt. Ist die Arbeitskopie ungültig, zeigt die Vorschau statt Daten den Zustand „Abfrage ungültig“ mit den Fehlern und **ruft keine Daten ab**.
15. Die Vorschau nutzt den geteilten Cache aus 154: Öffnen des Panels für eine Kachel mit unveränderter effektiver Abfrage löst **keinen** zusätzlichen RPC-Aufruf aus; ein Pipeline-Wechsel auf eine schon geladene Pipeline ebenfalls nicht (Test über den RPC-Mock).

### 2.4 Visueller Baukasten (untere Hälfte, Modus 1)

16. Sechs Stufen in fester Reihenfolge, jede als beschrifteter Abschnitt (kein Wizard mit Zwangsreihenfolge; alle Stufen sind sichtbar):
    1. **Kennzahl:** Auswahl aus den aktiven Katalogeinträgen mit Suche und Kategorien. Such- und Kategorielogik aus `WidgetLibraryV2` wiederverwenden (bei Bedarf in eine gemeinsame Funktion herauslösen), nicht duplizieren. Nicht hinzufügbare Einträge (`isAddableCatalogId`) sind nicht wählbar.
    2. **Aggregation:** nur `allowedAggregations`. Bei genau einer Option wird sie angezeigt und ist fest; bei keiner steht „Keine Aggregation, fester Wert“.
    3. **Filter:** Pipeline mit den drei Bedeutungen aus dem Abfragevertrag: „Dashboard-Pipeline übernehmen“ (`pipelineId` fehlt), „Alle Pipelines“ (`null`), feste Pipeline (String). Ohne `supportsPipelineFilter` gesperrt mit Grund.
    4. **Gruppierung:** „Keine“ oder „Nach Stufe“ (`['stage']`), nur bei `supportsStageGrouping`, sonst gesperrt mit Grund.
    5. **Zeitbezug:** der eine erlaubte Wert (`fest`, `aktuell`, `live`) als Anzeige mit Erklärung; Hinweis „Frei wählbare Zeitfenster folgen mit P10“. Keine auswählbaren Zeitfenster.
    6. **Darstellung:** nur `allowedPresentations`. Die zur Form der Kennzahl passende Darstellung ist als „Empfohlen“ markiert (Regel aus dem Katalog ableiten, nicht von Hand pflegen; ist keine Regel ableitbar, entfällt die Markierung).
17. Jede gesperrte Option nennt ihren Grund sichtbar und für Screenreader (`aria-describedby`). Die Sperrgründe kommen aus **einer** Quelle: neue Datei `model/queryCapabilityReasons.ts`, die Inspector und Panel gemeinsam nutzen. `InspectorTabs.tsx` stellt darauf um, ohne sein Verhalten zu ändern (bestehende Tests bleiben grün).
18. **Kennzahlwechsel** (Stufe 1) setzt `catalogId` und `query.metricId` gemeinsam und bereinigt unzulässig gewordene Felder deterministisch: Aggregation → `defaultAggregation` oder entfernt; `pipelineId` entfernt, wenn die neue Kennzahl keinen Pipeline-Filter hat; `groupBy` entfernt, wenn keine Stufengruppierung; `timeframe` entfernt; `view` → bisherige Darstellung, falls erlaubt, sonst die erste erlaubte. Jede Bereinigung erscheint als Hinweis („Gruppierung entfernt: neue Kennzahl ist nicht nach Stufe gruppierbar“). Die Bereinigung ist eine reine Funktion in `model/panelQueryDraft.ts` mit Tabellentest über alle Paare der Kennzahlformen.
19. Der Baukasten erzeugt nie eine Abfrage, die `validateTileQuery` ablehnt (Test: für jeden der 48 aktiven Einträge jede im Baukasten anbietbare Kombination durchspielen).

### 2.5 Deklarativer Modus (Modus 2)

20. Ein beschriftetes, mehrzeiliges Textfeld (`<textarea>`, Monospace, keine neue Abhängigkeit, kein Code-Editor-Paket) enthält die kanonische `tile.query` als JSON mit fester Schlüsselreihenfolge (`metricId`, `aggregation`, `pipelineId`, `groupBy`, `timeframe`, `filters`) und zwei Leerzeichen Einzug. Fehlende optionale Felder werden nicht als `null` ausgeschrieben (Ausnahme: `pipelineId: null` bedeutet „alle Pipelines“ und bleibt erhalten).
21. Prüfung bei jeder Eingabe (entprellt, Pausenwert aus `textInputDebouncer.ts` wiederverwenden): (a) JSON-Syntax mit Fehlercode `json_syntax` und, sofern ermittelbar, Zeile/Spalte; (b) Wurzel ist ein Objekt (`typ_ungueltig`); (c) `validateTileQuery` gegen den Katalogeintrag aus `metricId`; unbekannte `metricId` → `metrik_abweichend`. Alle Fehler erscheinen als Liste mit Feldpfad und deutschem Text; die Liste ist eine `aria-live="polite"`-Region.
22. Hilfen statt Autovervollständigung: eine Feldreferenz neben dem Textfeld, die für die aktuelle Kennzahl die zulässigen Werte aus `getQueryCapabilities` auflistet, und ein Knopf „Beispiel einfügen“, der eine gültige Beispielabfrage für die aktuelle Kennzahl erzeugt. Eine echte Autovervollständigung ist nicht Teil von P08b (Abweichung vom Masterplan §3.2, im Spezifikationsdokument begründet: keine neue Abhängigkeit).
23. Eine im deklarativen Modus geänderte `metricId` wechselt die Kennzahl **ohne** automatische Bereinigung: unzulässige Felder werden als Fehler gemeldet, nicht still entfernt.
24. **Verlustfreier Wechsel:** Visuell → deklarativ serialisiert die Arbeitskopie. Deklarativ → visuell ist nur bei fehlerfreier Eingabe möglich; sonst bleibt der Modus deklarativ, der Text bleibt erhalten, der Grund wird angezeigt. Für jede gültige Abfrage gilt `parse(serialize(q))` deep-equal `q` und `serialize(parse(text))` gleich `text` für kanonisch formatierten Text (Tabellentest über alle 48 Einträge und die Abfrageformen aus 2.4). Parser und Serialisierer liegen als reine Funktionen in `model/panelQueryCodec.ts`.
25. Es wird kein Text an die Datenbank gesendet; die Abfrage läuft ausschließlich über den vorhandenen Datenpfad. Freie SQL-/Formel-Eingabe gibt es nicht.

### 2.6 Rohdateninspektor

26. Eigener Bereich (Tab neben dem Baukasten bzw. dem deklarativen Modus, in beiden Modi erreichbar), zeigt die Daten der **aktuellen Vorschau**, nicht der gespeicherten Kachel.
27. CRM-Übersichtskennzahlen: Tabelle mit Spalten Stufe, Anzahl, Volumen, Anteil % (`stages`), Summenzeile (`totalDeals`, `totalVolume`), dazu `wonVolume` und `openVolume`. Darüber die Herkunft: „Ausgewertete Deals: {evaluatedDeals}“, „Berechnet: {asOf}“ (lokale Zeit mit Zeitzone), Pipeline-Bedeutung („alle Pipelines“ / Name / „Dashboard-Pipeline: Name“), Berechnungsort „Server (Vollbestand)“ oder „Browser (Demo-Daten ohne Supabase)“.
28. Dafür werden die Servermetadaten durchgereicht: `ResolvedTileData` erhält ein optionales Feld `aggregate?: { evaluatedDeals: number; pipeline: string | null; asOf: string; computedBy: 'server' | 'browser' }` (in `data/dashboardData.ts`). `fetchCrmPipelineOverview` liefert `computedBy`, `resolveCrmFromOverview` übernimmt die Werte. Das bestehende Feld `asOf` (Bedeutung: Messzeitpunkt bei Live-Daten) bleibt für CRM `null`, damit Aktualitätsanzeigen anderer Ansichten unverändert bleiben (Test).
29. Andere Kennzahlen: Tabelle mit Wert bzw. Reihenpunkten (`value`, `series`), Einheit, `timeBasis`, `asOf` (falls vorhanden) und Herkunft aus `origin` (`layer`, `module`, `exportName`, `liveKpiId`). Hinweis „Kein Serveraggregat, fester Stand aus …“ bzw. „Live-Messwert“. Keine erfundenen Felder.
30. Leer-, Lade- und Fehlerzustand entsprechen der Vorschau. Die Tabelle ist eine echte `<table>` mit `<caption>`, Zahlen rechtsbündig im Format aus `tileFormat.ts`. Kein Export in P08b.

### 2.7 Responsive und Barrierefreiheit

31. 1440: Vorschau oben, Baukasten/deklarativ/Rohdaten unten, nebeneinanderliegende Stufen erlaubt. 768: gestapelt. 375: gestapelt, Vorschau einklappbar, Kopfzeile ohne horizontalen Überlauf, Touch-Ziele mindestens 44 × 44 px. 0 px horizontaler Overflow auf allen drei Breiten.
32. Alles per Tastatur bedienbar, sichtbarer Fokus, Status nie nur über Farbe, `prefers-reduced-motion` respektiert. Der bestehende a11y-Lauf (`e2e/a11y.spec.ts`) wird um den offenen Panel-Editor ergänzt und bleibt ohne neue Verstöße gegenüber `a11y-baseline.json`.

### 2.8 Dokumentation

33. Neue Spezifikation `docs/dashboard/PANEL_EDITOR_P08B.md`: Öffnen/Schließen, Arbeitskopie und Undo-Vertrag, Bereinigungsregeln beim Kennzahlwechsel, Codec-Vertrag (Schlüsselreihenfolge, Roundtrip-Regeln, Fehlercodes inkl. `json_syntax`), Datenfeld `aggregate`, Rohdateninspektor-Inhalte, bewusste Abweichungen (keine Autovervollständigung; Tabs Transformationen und Alarm erst mit P14/P13; keine Zeitfenster bis P10; Einheiten/Achsen/Legende/Farbpaletten im Panel erst, wenn der Katalog sie als Optionen führt).
34. Datierte Nachträge (nichts umschreiben): `EDITOR_UX_FACHVERTRAEGE_145.md` §3 (tatsächlicher Panel-Umfang laut P08b; 6-Stufen-Fluss gegen den realen Katalog), `DASHBOARD_EDITOR_MASTERPLAN.md` §6 Umsetzungsstand P08b mit Hinweis, dass die P08-Abnahme erfüllt ist bzw. welche Punkte offen bleiben, `ABFRAGEVERTRAG_P08A.md` (Feld `aggregate` und `computedBy`).

## 3. Verbindliche Grenzen

1. **Schutzbereiche:** `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**` bleiben unberührt (Diff leer). Diese Aufgabe braucht keine Typ-Generierung, weil keine neue RPC entsteht.
2. **Keine Migration, keine SQL-Änderung.** Struktur- und Fachprüfung aus 154 bleiben wie sie sind. Was der Panel-Editor speichert, läuft durch denselben Speicherpfad (`dashboardLayoutIntegrity.ts`, `save_dashboard_v2`).
3. **`crmRepository.ts` und `src/domain/executiveCockpitData.ts` bleiben unverändert.** Die Paginierung ist Auftrag 156.
4. **Keine neue Schema-Version, keine neuen Felder in `DashboardTileConfigV2`.** Der Panel-Editor schreibt nur `catalogId`, `title`, `view` und `query`. Die Altfelder `pipelineOverride`, `timeframeOverride`, `aggregationOverride` werden nicht geschrieben.
5. **V1-Editor unverändert.** Der Panel-Editor existiert nur im V2-Editor hinter dem bestehenden Rollout-Schalter (`dashboardRollout.ts`).
6. **Keine neuen Abhängigkeiten** (kein Code-Editor, kein JSON-Schema-Paket, keine Dialog-Bibliothek). Vorhandene Komponenten (`Button`, `UnsavedChangesDialog`, Design-Tokens) wiederverwenden.
7. **`max-lines` 400** je Datei. `DashboardEditorShellV2.tsx` (394) bekommt höchstens die Einbindung eines Hosts (`PanelEditorHost`), alle Zustandslogik liegt in eigenen Dateien. Wird der Platz trotzdem knapp, erst vorhandene Logik der Shell in einen Hook auslagern (ohne Verhaltensänderung, mit Test), dann einbinden. `InspectorTabs.tsx` (379) darf durch die Umstellung auf `queryCapabilityReasons.ts` nur kürzer werden.
8. **Tests zuerst** (rot vor grün), Rot-Läufe im BUILD_LOG: (a) Klick auf `open-panel-editor-btn` öffnet heute nichts; (b) `ResolvedTileData` einer CRM-Kachel enthält kein `evaluatedDeals`; (c) Roundtrip-Test des Codecs schlägt vor der Implementierung fehl.
9. **Kein Eingriff in Hosted-Supabase** und keine echten Kennzahlen im Live-Feed (Betriebsregel aus 153 gilt weiter).

## 4. Ziel-Dateien

| Pfad                                                                                                                                      | Änderung                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_155_DASHBOARD_PANEL_EDITOR.md`                                                                        | Dieser Auftrag (Checkboxen abhaken, Status)                                                                                |
| `docs/dashboard/PANEL_EDITOR_P08B.md`                                                                                                     | Neu: Spezifikation (2.8 Nr. 33)                                                                                            |
| `src/features/dashboard/components/editor/panel/PanelEditorHost.tsx`                                                                      | Neu: Zustand „welche Kachel ist offen“, `React.lazy`/`Suspense`, Übernehmen-Dispatch, Fokus-Rückgabe                       |
| `src/features/dashboard/components/editor/panel/PanelEditorV2.tsx`                                                                        | Neu: Vollflächenansicht, Kopfzeile, Moduswechsel, Abbruch-Dialog                                                           |
| `src/features/dashboard/components/editor/panel/PanelPreview.tsx`                                                                         | Neu: Vorschau mit Breakpoint-Umschalter und Ungültig-Zustand                                                               |
| `src/features/dashboard/components/editor/panel/VisualQueryBuilder.tsx`                                                                   | Neu: sechs Stufen                                                                                                          |
| `src/features/dashboard/components/editor/panel/DeclarativeQueryEditor.tsx`                                                               | Neu: Textfeld, Fehlerliste, Feldreferenz, Beispiel                                                                         |
| `src/features/dashboard/components/editor/panel/RawDataInspector.tsx`                                                                     | Neu: Tabellen und Herkunft                                                                                                 |
| `src/features/dashboard/components/editor/panel/usePanelEditorDraft.ts`                                                                   | Neu: Arbeitskopie, Dirty-Erkennung, Patch-Berechnung für `UpdateTileConfigCommand`                                         |
| `src/features/dashboard/model/panelQueryDraft.ts`                                                                                         | Neu: Bereinigung beim Kennzahlwechsel, Übernehmen-Prüfung                                                                  |
| `src/features/dashboard/model/panelQueryCodec.ts`                                                                                         | Neu: `serializeTileQuery`, `parseTileQueryText`, Fehlercode `json_syntax`                                                  |
| `src/features/dashboard/model/queryCapabilityReasons.ts`                                                                                  | Neu: gemeinsame Sperrgründe                                                                                                |
| `src/features/dashboard/components/editor/inspector/InspectorTabs.tsx`                                                                    | Nur Umstellung auf `queryCapabilityReasons.ts`                                                                             |
| `src/features/dashboard/components/editor/WidgetLibraryV2.tsx`                                                                            | Nur falls Such-/Kategorielogik herausgelöst werden muss (2.4 Nr. 16.1), ohne Verhaltensänderung                            |
| `src/features/dashboard/components/editor/DashboardEditorShellV2.tsx`                                                                     | `PanelEditorHost` einbinden; `onOpenPanelEditor` intern belegen; Shortcuts bei offenem Panel deaktivieren                  |
| `src/features/dashboard/components/editor/useEditorShortcuts.ts`                                                                          | Nur Abschaltbarkeit bei offenem Panel                                                                                      |
| `src/features/dashboard/components/editor/canvas/CanvasTileCard.tsx`, `EditorCanvasV2.tsx`                                                | Schnellaktion „Widget bearbeiten“                                                                                          |
| `src/features/dashboard/data/dashboardData.ts`, `data/resolveCrm.ts`, `data/crmAggregateSource.ts`, `hooks/useDashboardData.ts`           | Feld `aggregate` mit `computedBy` durchreichen (2.6 Nr. 28)                                                                |
| `src/features/dashboard/preview/DashboardEditorPreviewV2.tsx`                                                                             | Panel in der Vorschauseite nutzbar (für Screenshot-Harness)                                                                |
| `src/features/dashboard/__tests__/panelQueryCodec.vitest.ts`                                                                              | Neu: Roundtrip über 48 Einträge, Syntax- und Schemafehler                                                                  |
| `src/features/dashboard/__tests__/panelQueryDraft.vitest.ts`                                                                              | Neu: Bereinigungstabelle, Baukasten erzeugt nur gültige Abfragen                                                           |
| `src/features/dashboard/__tests__/PanelEditorV2.ui.vitest.tsx`                                                                            | Neu: Öffnen (beide Wege), Übernehmen = ein Undo-Schritt, Redo, Abbrechen mit/ohne Änderung, Escape, Fokus, Kachel entfernt |
| `src/features/dashboard/__tests__/PanelPreview.ui.vitest.tsx`                                                                             | Neu: Zustände, Ungültig ohne Abruf, keine Zusatz-RPCs bei gleicher Abfrage                                                 |
| `src/features/dashboard/__tests__/RawDataInspector.ui.vitest.tsx`                                                                         | Neu: CRM-Tabelle mit `evaluatedDeals`/`asOf`/`computedBy`, Nicht-CRM-Herkunft                                              |
| bestehende Tests (`crmAggregateSource`, `useDashboardData`, `EditorInspectorV2`, `DashboardEditorShellV2`, `WidgetLibraryV2`)             | Erwartungen ergänzen; nicht löschen                                                                                        |
| `e2e/personal-dashboard-panel-editor.spec.ts`                                                                                             | Neu: V2-Editor öffnen, Kachel wählen, Panel öffnen, Pipeline ändern, Übernehmen, Undo, Abbrechen                           |
| `e2e/a11y.spec.ts`, `e2e/a11y-baseline.json`                                                                                              | Panel-Zustand ergänzen (Baseline nur erweitern, keine bestehenden Verstöße neu zulassen)                                   |
| `scripts/captureAuftrag155GateScreenshots.mjs`, `docs/screenshots/auftrag-155/README.md`                                                  | Neu: Harness und Ergebnis-Matrix (nur README committen)                                                                    |
| `docs/dashboard/EDITOR_UX_FACHVERTRAEGE_145.md`, `docs/dashboard/DASHBOARD_EDITOR_MASTERPLAN.md`, `docs/dashboard/ABFRAGEVERTRAG_P08A.md` | Datierte Nachträge (2.8 Nr. 34)                                                                                            |
| `BUILD_PLAN.md`, `docs/BUILD_LOG.md`                                                                                                      | Status, Builder-Eintrag, Prüfnachweis                                                                                      |

Bei Bedarf außerhalb dieser Liste: stoppen und im PR begründen (`CLAUDE.md` §5.3).

## 5. Tasks

Reihenfolge je Block: Tests zuerst, dann Umsetzung.

- [ ] **T0 Einstieg:** Branch `auftrag-155-panel-editor` auschecken, bei Bedarf auf aktuellen `main` rebasen. Masterplan §3.2/§3.3, `ABFRAGEVERTRAG_P08A.md`, `EDITOR_UX_FACHVERTRAEGE_145.md` §3 und diesen Auftrag lesen. Baseline-Diff der Schutzbereiche notieren.
- [ ] **T1 Rot-Nachweise:** (a) UI-Test: Klick auf `open-panel-editor-btn` öffnet kein Panel. (b) Vitest: CRM-Kachel liefert kein `aggregate`/`evaluatedDeals`. (c) Codec-Roundtrip-Test gegen eine leere Implementierung. Ergebnisse im BUILD_LOG.
- [ ] **T2 Modell:** `queryCapabilityReasons.ts` (Inspector umstellen, alte Tests grün), `panelQueryDraft.ts`, `panelQueryCodec.ts` mit Tabellentests (2.4 Nr. 18–19, 2.5 Nr. 20–24).
- [ ] **T3 Datenpfad:** Feld `aggregate` mit `computedBy` von `crmAggregateSource` über `resolveCrm` bis `useDashboardData`; `asOf` bleibt für CRM `null`. T1 (b) grün.
- [ ] **T4 Host und Arbeitskopie:** `PanelEditorHost`, `usePanelEditorDraft`, Einbindung in die Shell, Kachel-Schnellaktion, Lazy-Chunk. Tests: beide Öffnungswege, Übernehmen = ein `UpdateTileConfigCommand`, Undo/Redo, Abbrechen ohne Spur (bytegleicher Entwurf), Escape, Fokus-Rückgabe, Shortcuts inaktiv, Kachel entfernt. T1 (a) grün.
- [ ] **T5 Vorschau:** `PanelPreview` mit Breakpoint-Umschalter, Zuständen und Ungültig-Zustand ohne Abruf; RPC-Zähltest für geteilten Cache.
- [ ] **T6 Baukasten:** `VisualQueryBuilder` mit sechs Stufen, Sperrgründen, Kennzahlwechsel mit Bereinigungshinweisen, Empfehlung der Darstellung.
- [ ] **T7 Deklarativ:** `DeclarativeQueryEditor` mit Prüfung, Fehlerliste, Feldreferenz, Beispiel, Moduswechsel-Regeln. T1 (c) grün.
- [ ] **T8 Rohdaten:** `RawDataInspector` für CRM und übrige Kennzahlen.
- [ ] **T9 E2E und a11y:** Playwright-Ablauf und a11y-Ergänzung; Screenshot-Harness (Panel offen: Baukasten, Deklarativ mit Fehler, Rohdaten; jeweils 1440/768/375; Vorher = Editor ohne Panel), SHA-256 unterschiedlich, 0 px Overflow.
- [ ] **T10 Doku:** Spezifikation und Nachträge (2.8).
- [ ] **T11 Abschluss:** Pflicht-Verifikation (§7), Bundle-Größen im BUILD_LOG, Schutzbereichs-Diff, BUILD_LOG-Builder-Eintrag, PR öffnen, Review anfordern.

## 6. Abnahme

- Der Panel-Editor öffnet sich aus Inspector und Kachel, lädt lazy und arbeitet auf einer eigenen Arbeitskopie.
- „Übernehmen“ ist genau ein Undo-Schritt, der Kennzahl, Titel, Darstellung und Abfrage vollständig zurücknimmt; „Abbrechen“ lässt den Entwurf bytegleich.
- Die Vorschau nutzt dieselben Renderer und denselben Datenpfad wie der Canvas; ungültige Abfragen lösen keinen Abruf aus; gleiche Abfragen teilen den Abruf.
- Der Baukasten bietet nur, was `getQueryCapabilities` erlaubt, nennt Gründe für Sperren und erzeugt nie eine ungültige Abfrage.
- Der deklarative Modus prüft Syntax und Schema, der Wechsel in beide Richtungen ist für gültige Abfragen verlustfrei.
- Der Rohdateninspektor zeigt für CRM-Kennzahlen Stufenzeilen, `evaluatedDeals`, `asOf` und den Berechnungsort, für alle anderen Kennzahlen Wert, Zeitbasis und Herkunft.
- 1440/768/375 ohne horizontalen Overflow, Tastaturbedienung vollständig, keine neuen a11y-Verstöße.
- Schutzbereichs-Diff leer, keine Migration, keine neuen Abhängigkeiten, `size-limit` grün, V1-Editor unverändert.

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
git diff a7313ba -- src/simulation src/types src/context src/services/data src/features/resources   # muss leer sein
git diff a7313ba -- src/services/db/crmRepository.ts src/domain/executiveCockpitData.ts supabase/   # muss leer sein
```

Zusätzlich: Playwright-Lauf `e2e/personal-dashboard-panel-editor.spec.ts` und `e2e/a11y.spec.ts` lokal, CI-Checks `lint`, `typecheck`, `test`, `build`, `livekpi-verifiers`, `size-limit`, `e2e` grün.

## 8. Offene Punkte und Risiken

- **Bundle-Größe:** Der Panel-Editor zieht Diagramm-Renderer nicht ins Initial-Bundle, weil er lazy lädt und die Renderer schon über `chartLoaders.ts` nachgeladen werden. Wird `size-limit` trotzdem rot, ist das ein Befund (Chunk-Aufteilung prüfen), kein Grund, die Grenze anzuheben.
- **Mehrere offene Panels:** Es gibt höchstens ein offenes Panel. Ein zweiter Öffnungsversuch bei offenem Panel ist nicht möglich (Panel ist modal).
- **Gleichzeitige Bearbeitung im Inspector:** Der Inspector ist bei offenem Panel verdeckt; es gibt keine konkurrierenden Schreibwege in dieselbe Kachel.
- **Konflikt beim Speichern:** Unverändert über den Konfliktdialog aus P07; das Panel selbst speichert nicht.
- **Nicht Teil dieses Auftrags:** Transformationen und Joins (P14), Schwellenwerte/Alarme im Panel (P13), Zeitfenster und Time-Travel (P10), Einheiten/Achsen/Legende/Farbpaletten als neue Kachelfelder, Autovervollständigung im deklarativen Modus, Export aus dem Rohdateninspektor, Paginierung der übrigen CRM-Pfade (156).
