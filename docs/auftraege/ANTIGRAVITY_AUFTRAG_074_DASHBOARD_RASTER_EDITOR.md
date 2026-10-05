# Auftrag 074 – Dashboard Teilauftrag 5: Raster, Editor und Konfigurationsfenster

**Stand:** 05.10.2026

**Basis:** `main` `fbb7244` (nach PR #57). Plan: `docs/superpowers/plans/2026-10-01-executive-dashboard-plan.md`, Teilauftrag 5, §3 (Nutzererlebnis, Raster), §5 (Lazy Loading), §6 (Speicherung). Datenverträge: Auftrag 070 (`model/dashboardCatalog.ts`, `model/dashboardConfig.ts`, `model/dashboardValidation.ts`, `model/defaultDashboard.ts`), Auftrag 071 (`data/dashboardData.ts`, `hooks/useDashboardData.ts`), Auftrag 072 (`hooks/useDashboardPreferences.ts`), Auftrag 073 (`components/DashboardTile.tsx`, `components/DashboardChart.tsx`).

**Voraussetzung:** Teilaufträge 1–4 sind gemergt (Aufträge 070–073, PR #57 am 05.10.2026). Die Designfreigabe der Testkachel liegt vor (BUILD_LOG „Designfreigabe Testkachel durch Marc (Stand f779901)“). Das Raster, der Editor und der Konfigurator sind neue Bedienflächen; ihre Optik folgt den vorhandenen Tokens und Komponenten (`Card`, `Button`, `Modal`, `Input`, `Select`, `Badge`) und der freigegebenen Kachel. Marc sieht das Ergebnis in der Vorschau (CI-Artefakt `dashboard-preview`) vor dem Merge.

**Builder:** Claude Code (Zyklus 1). **Prüfer:** Codex. **Merge:** nur Marc.

**Branch:** `claude/inspiring-pascal-hvjcog` (Session-Branch, neu von `main` `fbb7244`), PR gegen `main`.

## Ziel

Ein bedienbares persönliches Dashboard als eigenständiges Modul, **noch ohne Einbindung in die produktive Seite**: ein Raster in gespeicherter Reihenfolge mit den vier Größen, eine Arbeitskopie mit Bearbeitungsmodus (hinzufügen, konfigurieren, entfernen, Größe wählen, verschieben), ein Konfigurationsfenster mit Suche, Kategorien, Vorschau und Filterausnahmen, zentrale Filter, Speichern, Abbrechen, Zurücksetzen und Navigationsschutz, sowie sichtbarkeitsgesteuertes Laden der Kacheln. Der Editor kennt Supabase nicht: Er bekommt die Speicherfunktion (Form von `useDashboardPreferences`) von außen. Die Einbindung unter `/dashboard`, den Rollout-Schalter und die Router-Anbindung des Navigationsschutzes liefert Teilauftrag 7; die Vorschau (`/dashboard-vorschau.html`) zeigt das Modul bis dahin mit einem Speicher-Ersatz im Arbeitsspeicher.

## Globale Grenzen

- Schutzbereiche (`CLAUDE.md` §6) unverändert: `src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources`. Keine Migration, keine Änderung an `supabase/`.
- Nur lesen: `src/features/dashboard/model/**`, `src/features/dashboard/data/**`, `src/features/dashboard/hooks/useDashboardData.ts`, `src/features/dashboard/hooks/useDashboardPreferences.ts`, `src/components/ui/**`, `src/hooks/**`, `src/domain/**`, `src/app/**`, `src/features/overview/**`. Keine Änderung an `DashboardTile.tsx`, `DashboardChart.tsx` oder den Diagrammmodulen; Rahmen für Bearbeitungsaktionen liegt **um** die Kachel, nicht darin. Brauchst du eine Änderung außerhalb der Ziel-Dateien: stoppen, Konflikt im BUILD_LOG dokumentieren (`CLAUDE.md` §5.3).
- Produktive Seiten unverändert: kein Import der neuen Komponenten aus `src/app/**` oder `src/features/overview/**`; das Startbundle bleibt bis auf Chunk-Hashes inhaltsgleich (Nachweis `npx size-limit`).
- Keine neue Abhängigkeit (`CLAUDE.md` §8). Drag-and-drop mit HTML-Drag-Ereignissen; Bedienung ohne Maus über Schaltflächen.
- **Jede Datei unter 400 physischen Zeilen** (`wc -l`, auch Tests und Skripte). ESLint `max-lines` zählt ohne Leerzeilen und Kommentare und erfasst `scripts/*.mjs` nicht; die Prüfung per `wc -l` über alle geänderten Dateien gehört ins BUILD_LOG.

## Belegte Grundlagen

- Konfiguration: `DashboardConfig` (`version`, `filters?`, `tiles`), `DashboardTileConfig` (`tileId`, `catalogId`, `view`, `size`, `title?`, `filterMode`, `period?`, `pipeline?`), `MAX_TILES = 24`, `MAX_TITLE_LENGTH = 80`; `tileId` passt auf `/^[A-Za-z0-9_-]{1,64}$/`, Pipeline 1 bis 64 Zeichen (`dashboardValidation.ts`). Die Listenreihenfolge ist die Rasterreihenfolge.
- Prüfung: `validateDashboardConfig(input)` liefert `{ ok: true, config, unavailable }` (Kacheln mit unbekannter oder inaktiver KPI bleiben in `config`) oder `{ ok: false, issues }` mit lesbaren `message`-Texten je Verstoß (u. a. unzulässige Darstellung, Größe unter der Mindestgröße, Filtermodus, Pipeline-Ausnahme).
- Zustand der Speicherung: `PreferencesState` mit `kind` `standard | gespeichert | zukuenftige_version | ungueltig`, `config`, `revision`, `canSave`; `useDashboardPreferences()` liefert `status` (`keine_sitzung | laden | bereit | fehler`), `state`, `error`, `isSaving`, `save(config): Promise<SaveResult>` (Fehlerarten u. a. `konflikt`, `gesperrt`, `ungueltig`, `sitzung_gewechselt`, `technisch`) und `reloadServerVersion()`. Kein Autosave; Erfolg erst nach Serverbestätigung.
- Daten: `useDashboardData(tile, filters?, { enabled })`. Mit `enabled: false` liefert er den Ladezustand ohne Abfrage und ohne Live-Abonnement; CRM-Abfragen teilen sich den Schlüssel je Organisation und Pipeline.
- Kachel: `DashboardTile` mit `tile`, `entry?`, `data`, `onShowDetails`, `onRetryChartLoad?` (Standard: Seite neu laden), `dashboardFilters?`, `chartLoaders?`. Im Ladezustand hat sie bereits die Endhöhe; der Ladeplatzhalter ist fokussierbar und gibt den Fokus nach dem Laden an den Inhaltsbereich weiter.
- Katalog: `getActiveEntries`, `getCatalogEntry`, `DASHBOARD_CATEGORIES`, `VIEWS_BY_SHAPE`, `minSizeFor(entry, view)`, `TILE_SIZES`; `SUPPORTED_DATE_FIELDS` ist für alle Quellen leer (kein belegtes Datumsfeld), ein eigener Zeitraum oder zentraler Zeitraum wirkt derzeit nirgends und wird je Kachel erklärt (`periodReason`).
- Standardansicht: `DEFAULT_DASHBOARD_CONFIG`.
- Plan §3, Raster: Desktop 12, Tablet 6, Handy 1 Spalte; Klein 3/3/voll, Mittel 6/6/voll, Groß 9/6/voll, Volle Breite 12/6/voll. Keine automatische Lückenfüllung (Tastatur- und Lesereihenfolge bleiben gleich). Plan §5: Vorlauf 300 px, einmal aktivierte Kacheln bleiben eingebunden.

## Lehren aus PR #57 (gelten als Abnahmekriterien)

Codex hat PR #57 in zehn Runden geprüft. Die Befunde fielen in wiederkehrende Klassen; dieser Auftrag verlangt sie von Anfang an:

1. **Keine Layoutsprünge:** Jede Zustandsänderung (Laden → bereit, Aktivierung, Speichern, Hinweise) hält die Höhe; Messung der **ganzen Kachel bzw. des ganzen Bereichs**, nicht nur des Inhalts.
2. **Lange oder fremde Texte:** Titel (bis 80 Zeichen), Pipeline-Namen (bis 64 Zeichen ohne Leerzeichen), KPI-Namen und Fehlertexte brechen um oder kürzen mit zugänglichem Volltext; 0 px horizontaler Seitenüberlauf auf 375 px.
3. **Ansagen:** Jeder Zustandswechsel (Hinzufügen, Entfernen, Verschieben mit neuer Position, Speichern, Fehler, Konflikt, Verwerfen, Zurücksetzen) hat eine Meldung in einer dauerhaften Live-Region; auch die Rückkehr zum Normalzustand.
4. **Fokus:** Nach Öffnen und Schließen des Konfigurators, Hinzufügen, Entfernen und Verschieben bleibt der Fokus auf einem sichtbaren, sinnvollen Element mit sichtbarem Fokusring.
5. **Keine technischen Texte:** Fehler- und Konfliktmeldungen sind verständlich; keine Export-, Feld- oder Resolvernamen.
6. **Echte Datenpfade statt nur Beispieldaten:** Tests mit 24 Kacheln, unbekannter Katalog-ID, inaktivem Eintrag in gültiger Konfiguration, zukünftiger Formatversion, insgesamt ungültiger gespeicherter Form (Standardansicht mit Hinweis) und langen Namen.
7. **Gesperrte Aktionen:** Während eines laufenden Speicherns sind alle ändernden Aktionen und die Navigation wirkungslos und sichtbar gesperrt; kein doppeltes Speichern.
8. **Ziel-Dateien:** Nur die Dateien dieser Tabelle; die Grenze „unter 400 Zeilen“ gilt physisch.

## Ziel-Dateien

| Datei | Änderung |
|---|---|
| `src/features/dashboard/hooks/dashboardEditorReducer.ts` | Neu: reine Funktionen auf der Arbeitskopie (Hinzufügen, Ändern, Entfernen, Verschieben, Zurücksetzen, Startfilter), ohne React |
| `src/features/dashboard/hooks/useDashboardEditor.ts` | Neu: Modus, Arbeitskopie, `dirty`, Speichern/Abbrechen/Zurücksetzen, Konfliktführung, `requestLeave`, Ansagetext |
| `src/features/dashboard/hooks/useTileActivation.ts` | Neu: Sichtbarkeit mit `IntersectionObserver`, Vorlauf 300 px, Aufräumen |
| `src/features/dashboard/components/LazyDashboardTile.tsx` | Neu: Aktivierung, angewendete Filter, Daten über `useDashboardData` (oder eingespeiste Funktion), `DashboardTile` |
| `src/features/dashboard/components/UnavailableTileSlot.tsx` | Neu: erklärter Platzhalter für gespeicherte Kacheln mit unbekannter oder inaktiver KPI |
| `src/features/dashboard/components/DashboardGrid.tsx` | Neu: Raster, Bearbeitungsrahmen um jede Kachel (Griff, Nach oben/unten, Bearbeiten, Entfernen), Ansagen |
| `src/features/dashboard/components/DashboardFilters.tsx` | Neu: zentrale Filter (Zeitraum, Pipeline) mit Sitzungs- und Startfilter |
| `src/features/dashboard/components/EditorToolbar.tsx` | Neu: „Dashboard bearbeiten“, Hinzufügen, Zurücksetzen, Speichern, Abbrechen, Statusanzeige, Live-Region |
| `src/features/dashboard/components/UnsavedChangesDialog.tsx` | Neu: Speichern / Verwerfen / Im Editor bleiben |
| `src/features/dashboard/components/TileConfigurator.tsx` | Neu: Konfigurationsfenster, wird erst beim Öffnen nachgeladen |
| `src/features/dashboard/components/DashboardWorkspace.tsx` | Neu: Zusammenführung aus Raster, Filtern, Werkzeugleiste, Konfigurator und Dialogen; nimmt `preferences` (Form von `useDashboardPreferences`) und optional `useData`, `chartLoaders`, `onShowDetails` entgegen; ohne `onShowDetails` (bis Teilauftrag 7) erklärt „Details“ per sichtbarem Hinweis und Ansage, dass die Detailansicht folgt (wie in der Galerie), keine stille Schaltfläche und keine Navigation |
| `src/features/dashboard/preview/DashboardEditorPreview.tsx` | Neu: Vorschau des Arbeitsbereichs mit Speicher-Ersatz im Arbeitsspeicher, Teststeuerung (nächstes Speichern: Erfolg, Fehler, Konflikt), Anzeige „aktivierte Kacheln n von m“ |
| `src/features/dashboard/preview/editorPreviewData.ts` | Neu: feste, gekennzeichnete Testdaten je Katalogeintrag als `TileData` |
| `src/features/dashboard/preview/DashboardPreviewPage.tsx` | Arbeitsbereich unter der Galerie einbinden; `?bereich=editor` zeigt nur ihn |
| `src/features/dashboard/__tests__/dashboardEditorReducer.vitest.ts` | Neu |
| `src/features/dashboard/__tests__/useDashboardEditor.ui.vitest.tsx` | Neu |
| `src/features/dashboard/__tests__/useTileActivation.ui.vitest.tsx` | Neu |
| `src/features/dashboard/__tests__/DashboardGrid.ui.vitest.tsx` | Neu |
| `src/features/dashboard/__tests__/DashboardFilters.ui.vitest.tsx` | Neu |
| `src/features/dashboard/__tests__/TileConfigurator.ui.vitest.tsx` | Neu |
| `src/features/dashboard/__tests__/DashboardWorkspace.ui.vitest.tsx` | Neu: Nutzungsabläufe |
| `scripts/captureAuftrag074Screenshots.mjs` (+ optional `scripts/lib/dashboardShotHelpers.mjs`) | Neu: Screenshot-, Overflow-, axe-, Tastatur- und Netzwerknachweis |
| `docs/screenshots/auftrag-074/README.md` | Neu: Ergebnismatrix (keine Bilddateien) |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_074_DASHBOARD_RASTER_EDITOR.md` | Checkboxen abhaken |
| `docs/BUILD_LOG.md` | Builder-Eintrag |

## Vorgaben

### Raster (`DashboardGrid`)

- Reine Listenreihenfolge: `tiles` in der Reihenfolge der Konfiguration, Schlüssel `tileId`. Spalten `grid-cols-1 md:grid-cols-6 lg:grid-cols-12`, Spannen je Größe wie im Plan; kein `grid-auto-flow: dense`.
- Jede Kachel mit bekanntem aktivem Katalogeintrag läuft über `LazyDashboardTile`; eine Kachel mit unbekanntem oder inaktivem Eintrag in einer strukturell gültigen Konfiguration (`PreferencesState.kind: 'gespeichert'`, Liste `unavailable`) erscheint als `UnavailableTileSlot` (Grund in Worten, Hinweis „bleibt gespeichert“, im Bearbeitungsmodus „Entfernen“). Diese Kachel geht bei gewöhnlichen Bearbeitungen und beim Speichern nie verloren; nur „Entfernen“ dieser Kachel und „Auf Standard zurücksetzen“ nehmen sie bewusst aus der Arbeitskopie. **Grenze des Erhalts:** Eine Konfiguration, die `validateDashboardConfig` insgesamt ablehnt (z. B. unzulässige Darstellungs- oder Größenkombination), fällt nach dem bestehenden Vertrag auf `kind: 'ungueltig'` mit der Standardansicht (`interpretStoredConfig`); dafür gelten der dort vorgesehene Hinweis und das ausdrückliche Ersetzen beim Speichern, **kein** Erhalt je Kachel. Ein erweiterter Lade-/Speichervertrag ist nicht Teil dieses Auftrags (`model/**`, `hooks/useDashboardPreferences.ts` bleiben nur lesbar).
- Bearbeitungsmodus: Um jede Kachel eine Werkzeugzeile mit „Nach oben“, „Nach unten“ (jeweils `aria-label` mit Kacheltitel und Position, am Anfang bzw. Ende gesperrt), „Bearbeiten“, „Entfernen“ und auf Breiten ab 768 px einem Ziehgriff. Ziehen verschiebt per HTML-Drag-Ereignissen; die Zielposition ist erkennbar, Loslassen außerhalb ändert nichts. Auf dem Handy gibt es keinen Ziehgriff, nur die Schaltflächen. Nach einer Verschiebung bleibt der Fokus auf derselben Schaltfläche (am Rand auf der anderen) und die Live-Region sagt „<Titel> steht jetzt an Position n von m“.
- Mobile Reihenfolge = gespeicherte Reihenfolge; Lese- und Tastaturreihenfolge = Bildschirmreihenfolge.
- Leeres Raster (alle Kacheln entfernt): erklärender Leerzustand mit „Kachel hinzufügen“ und „Auf Standard zurücksetzen“, kein leerer weißer Bereich.

### Aktivierung und Laden (`useTileActivation`, `LazyDashboardTile`)

- `useTileActivation({ rootMargin = '300px' })` liefert `ref`, `near` (aktuell im Bereich inklusive Vorlauf) und `active` (einmal aktiviert, bleibt aktiv). Aktiviert wird **ausschließlich über den Beobachter**: Kacheln im Startbereich werden beim ersten Beobachterereignis aktiv, ohne Zeitverzögerung (Plan §5: „Startkacheln im sichtbaren Bereich sofort aktivieren“); es gibt keine Sonderregel für die ersten Kacheln der Liste. Ohne `IntersectionObserver` (Test, alte Browser) sind alle aktiv. Fokus auf eine Kachel (`onFocusCapture`) aktiviert sie, damit Tastaturnutzer nie vor einem toten Platzhalter stehen. Observer werden beim Aushängen getrennt.
- `LazyDashboardTile` ruft `useDashboardData(tile, appliedFilters, { enabled: active })` auf. Inaktive Kacheln zeigen die `DashboardTile` im Ladezustand mit Endhöhe (Titel und „Details“ bleiben erreichbar). **Filterwechsel:** `appliedFilters` übernimmt neue Filter nur, solange die Kachel `near` ist; außerhalb bleiben die zuletzt angewendeten Filter, sodass keine neue Abfrage startet. Nähert sie sich wieder, wechselt sie auf die aktuellen Filter und zeigt bis zum Ergebnis den Ladezustand, nie alte Daten unter neuem Filter.
- Datenhook austauschbar (`useData` Eigenschaft) für Tests und Vorschau; Standard ist `useDashboardData`.
- `onRetryChartLoad` (Wiederholen nach fehlgeschlagenem Modulabruf lädt die Seite neu, Auftrag 073) wird im Arbeitsbereich so angebunden, dass vorher `requestLeave` den Entwurf schützt: Bei Änderungen erscheint der Dialog „Speichern / Verwerfen / Im Editor bleiben“, erst danach lädt die Seite neu.

### Editor (`dashboardEditorReducer`, `useDashboardEditor`)

- Eigenschaften: `preferences` mit `state`, `save`, `isSaving`, `reloadServerVersion` (Form von `UseDashboardPreferencesResult`). Ausgabe: `mode`, `draft`, `dirty` (Vergleich mit `state.config`, nicht nur „etwas wurde angefasst“), `saveStatus`, `conflict`, Aktionen, `announcement`, `requestLeave`.
- „Dashboard bearbeiten“ legt eine Arbeitskopie der Konfiguration an; die gespeicherte Ansicht bleibt bis zum Speichern unverändert. Nur die Arbeitskopie wird bearbeitet; das Raster zeigt im Bearbeitungsmodus die Arbeitskopie.
- Aktionen als reine Funktionen im Reducer, einzeln getestet: Hinzufügen (neue eindeutige `tileId` nach `TILE_ID_PATTERN`, auch nach Entfernen und Hinzufügen nie doppelt; ab `MAX_TILES` wirkungslos und die Schaltfläche gesperrt mit Hinweis), Ändern (Darstellung, Größe, Titel, Filtermodus, Ausnahmen), Entfernen, Verschieben um eine Position und auf einen Zielindex, Zurücksetzen auf `DEFAULT_DASHBOARD_CONFIG` (wirkt erst durch Speichern), Startfilter setzen/entfernen. Jede Aktion prüft das Ergebnis mit `validateDashboardConfig`; eine ungültige Kombination wird nie übernommen, der Grund steht im Konfigurator.
- Speichern: Vor dem Senden `validateDashboardConfig`; dann `preferences.save(draft)`. Erfolgsmeldung „Gespeichert“ **erst** nach `ok: true`; danach `mode` zurück auf Ansicht. **Alle Fehlerarten des bestehenden Vertrags** (`SaveResult` und `PreferencesError`) haben einen eigenen verständlichen Text ohne Feld- oder Resolvernamen: `konflikt` („Die Ansicht wurde inzwischen an anderer Stelle geändert“), `ungueltig`, `keine_mitgliedschaft` („Du gehörst dieser Organisation nicht mehr“), `sitzung_abgelaufen` („Deine Sitzung ist abgelaufen, bitte melde dich neu an“), `nicht_konfiguriert` („Die Speicherung ist nicht eingerichtet“), `technisch`, `keine_sitzung`, `gesperrt`, `sitzung_gewechselt`. Bei jedem Fehler bleibt der Entwurf erhalten und der Bearbeitungsmodus offen. Test tabellengesteuert über alle neun Arten: je Art ein eigener Text in der Live-Region, Entwurf unverändert.
- Konflikt: Der Entwurf bleibt erhalten. Angeboten werden „Aktuelle Serveransicht laden“ (`reloadServerVersion`, Entwurf bleibt) und „Entwurf verwerfen und Serverfassung übernehmen“. Nach dem Laden heißt die Speicherschaltfläche „Trotzdem speichern (ersetzt die neuere Fassung)“; erst dieser ausdrückliche Schritt überschreibt. Keine stille Überschreibung.
- `state.canSave === false` (`zukuenftige_version`): „Dashboard bearbeiten“ ist gesperrt, Hinweis in Worten (gespeicherte Ansicht stammt aus einer neueren Version, nichts wird überschrieben). `kind: 'ungueltig'`: Hinweis „Gespeicherte Ansicht war ungültig, Standard wird gezeigt“; Bearbeiten ist möglich, die Werkzeugleiste weist vor dem Speichern darauf hin, dass die gespeicherte Fassung ersetzt wird.
- Abbrechen: verwirft die Arbeitskopie; die Ansage nennt es. Wirkt nicht auf Live-Werte und nicht auf Sitzungsfilter. „Auf Standard zurücksetzen“ ersetzt nur die Arbeitskopie.
- Während `isSaving`: alle ändernden Aktionen, Abbrechen, Zurücksetzen und `requestLeave` wirkungslos; Schaltflächen gesperrt mit erkennbarem Grund („Speichert …“).
- Navigationsschutz: `requestLeave(proceed)` führt `proceed` sofort aus, wenn nichts geändert ist, sonst öffnet er `UnsavedChangesDialog` („Speichern“ → bei Erfolg `proceed`, bei Fehler bleibt der Dialog mit Meldung; „Verwerfen“ → `proceed`; „Im Editor bleiben“). Zusätzlich `beforeunload`, solange `dirty` gilt, und nur dann. Die Anbindung an den Router (`BrowserRouter`, kein Datenrouter, daher kein `useBlocker`) erledigt Teilauftrag 7.

### Zentrale Filter (`DashboardFilters`)

- Zeitraum (von/bis, `JJJJ-MM-TT`, von ≤ bis) und Pipeline (1 bis 64 Zeichen). **Übernahme ausdrücklich, kein Tippen als Filter:** Zeitraum und Pipeline sind Entwurfsfelder des Filterbereichs und wirken erst über „Filter anwenden“ (auch per Eingabetaste); bis dahin ändert sich weder die Ansicht noch ein Abfrageschlüssel. So startet das Tippen eines Pipeline-Namens keine Abfrage je Zwischenstand. Ungültige Eingaben werden beim Anwenden erklärt und nicht übernommen; „Filter zurücksetzen“ leert beide Felder und wendet sofort an. Pipeline-Eingabe nur, wenn mindestens eine Kachel des aktuellen Rasters den Pipeline-Filter unterstützt (`entry.filters` enthält `pipeline`); Zeitraum immer, die Wirkung je Kachel nennt `periodReason`.
- Ein Hinweis nennt, dass derzeit keine Quelle einen Datumsfilter anwendet (belegtes Datumsfeld fehlt). Ungültige Eingaben zeigen einen verständlichen Text, kein stilles Verwerfen.
- **Sitzungsfilter** (Standardfall) ändern nur die Ansicht der Sitzung und markieren den Entwurf nicht als geändert. Startwert = `config.filters`. Im Bearbeitungsmodus „Als Startfilter übernehmen“ und „Startfilter entfernen“ ändern `draft.filters` und damit `dirty`. Abbrechen verwirft nur den Entwurf.
- Wirksame zentrale Filter gehen als `dashboardFilters` an jede Kachel.

### Konfigurator (`TileConfigurator`)

- Öffnet sich als `Modal` und wird erst dann nachgeladen (`React.lazy`, eigener Chunk; Nachweis im Build und im Netzwerk: kein Konfigurator-Chunk vor dem Öffnen). Fehlgeschlagener Nachladevorgang: erklärte Meldung mit „Wiederholen“, Entwurf bleibt.
- Suche (Name und Definition, ohne Groß-/Kleinschreibung) und Kategorien (`DASHBOARD_CATEGORIES`, nur belegte Kategorien, „Alle“) über `getActiveEntries`; Trefferzahl wird angesagt; leere Trefferliste mit Erklärung.
- Auswahl eines Eintrags → Darstellung ausschließlich aus `entry.views`, Größe ausschließlich ab `minSizeFor(entry, view)`; wechselt die Darstellung auf eine größere Mindestgröße, springt die Größe auf die Mindestgröße und die Ansage nennt es. Eigener Titel (höchstens 80 Zeichen, Zähler). Filtermodus nur aus erlaubten Optionen; nicht erlaubte sind sichtbar gesperrt mit dem Grund aus der Validierung. Pipeline-Ausnahme nur bei Quellen mit Pipeline-Filter.
- Begründung bei unzulässiger Kombination aus den `message`-Texten von `validateDashboardConfig`, ohne technische Fehlermeldung; „Übernehmen“ nur bei gültiger Kachel.
- Direkte Vorschau mit derselben Logik wie die Kachel (`LazyDashboardTile`-Datenpfad, gleiche Filter): beim Öffnen aktiv, solange das Fenster offen ist.
- Bearbeiten einer vorhandenen Kachel öffnet dieselbe Maske mit ihren Werten; „Übernehmen“ ändert die Arbeitskopie, „Abbrechen“ lässt sie unverändert. Fokus beim Öffnen auf das erste Bedienelement, beim Schließen zurück auf die auslösende Schaltfläche (oder die neue Kachel).

### Arbeitsbereich (`DashboardWorkspace`) und Vorschau

- Setzt Raster, Filter, Werkzeugleiste, Konfigurator und Dialoge zusammen; zeigt je `preferences.status` einen Zustand: `laden` (stabile Mindestfläche: ein Skelett aus den Kacheln der Standardansicht mit denselben Größen und derselben Reihenfolge; die gespeicherte Konfiguration ist bis zum Ende des Ladens unbekannt, `state` ist `null`. Weicht das gespeicherte Layout vom Standard ab, ändert sich die Höhe **genau einmal** beim Wechsel von `laden` zu `bereit`, danach nie mehr innerhalb des bereiten Rasters; das ist die dokumentierte Restgrenze und im BUILD_LOG festzuhalten), `fehler` (verständlicher Text mit „Erneut laden“), `keine_sitzung` (Hinweis), `bereit` (Raster). Dauerhafte Live-Region für Ansagen. „Details“ jeder Kachel ist bedienbar: Ohne übergebenen `onShowDetails` erscheint der Hinweis „Die Detailansicht folgt mit Teilauftrag 7“ (sichtbar und angesagt, Fokus bleibt auf der Schaltfläche); mit `onShowDetails` wird er mit der `tileId` aufgerufen. Test für beide Wege, auch per Tastatur.
- Vorschau: Speicher-Ersatz im Arbeitsspeicher mit Revision und der Teststeuerung „nächstes Speichern: Erfolg / technischer Fehler / Konflikt“, deutlich als Testdaten gekennzeichnet; Kacheldaten aus `editorPreviewData.ts` über `useData`; Anzeige „aktivierte Kacheln n von m“. `?bereich=editor` zeigt nur den Arbeitsbereich (ohne Testkachel und Galerie), damit der Netzwerknachweis nicht von ihnen beeinflusst wird.

## Umsetzung

- [ ] Tests zuerst für `dashboardEditorReducer`: Hinzufügen (eindeutige gültige `tileId`, auch nach Entfernen; Grenze 24), Ändern (Darstellung/Größe/Titel/Filtermodus, ungültig wird abgelehnt), Entfernen, Verschieben (Rand, mittlere Position, Zielindex), Zurücksetzen, Startfilter; eine unbekannte gespeicherte Kachel bleibt bei gewöhnlichen, nicht ausdrücklich löschenden Aktionen (Hinzufügen, Ändern anderer Kacheln, Verschieben, Größe, Filter) unverändert erhalten und wird mit dem anschließenden Speichern mitgespeichert; ausdrücklich löschend sind nur „Entfernen“ dieser Kachel und „Auf Standard zurücksetzen“ (ersetzt die Arbeitskopie vollständig, auch Platzhalter); dann implementieren.
- [ ] Tests zuerst für `useDashboardEditor`: `dirty` (Änderung und Rückänderung), Speichern mit Erfolg / technischem Fehler / Konflikt / gesperrt, Entwurf bleibt bei jedem Fehler, Konfliktführung bis „Trotzdem speichern“, laufendes Speichern sperrt Aktionen, `requestLeave` mit allen drei Wegen, `beforeunload` nur bei `dirty`, Aufräumen; dann implementieren.
- [ ] Tests zuerst für `useTileActivation` und `LazyDashboardTile` (mit gestelltem `IntersectionObserver`): Aktivierung der Kacheln im Startbereich beim ersten Beobachterereignis, keine Aktivierung außerhalb von Bereich und Vorlauf, Aktivierung bei Annäherung, sticky Aktivierung, Fokus aktiviert, Observer getrennt beim Aushängen, ohne Observer alle aktiv, Filterwechsel außerhalb des Bereichs startet keine Abfrage (Zählung der Datenaufrufe), Wechsel bei Annäherung zeigt Laden statt alter Daten; dann implementieren.
- [ ] Tests zuerst für `DashboardGrid`: Reihenfolge im DOM = Konfigurationsreihenfolge, Spannen je Größe, Verschieben per Schaltfläche und Tastatur mit Fokus und Ansage, Ziehen und Loslassen, Ziehgriff nur ab 768 px, `UnavailableTileSlot` für unbekannte und inaktive IDs samt Entfernen (Erhalt beim Speichern), `ungueltig` zeigt die Standardansicht mit Hinweis ohne Platzhalter, Leerzustand, 24 Kacheln; dann implementieren.
- [ ] Tests zuerst für `TileConfigurator`: Suche und Kategorien mit Trefferansage, nur erlaubte Darstellungen/Größen, Größensprung bei Darstellungswechsel mit Ansage, Titelgrenze, gesperrte Filteroptionen mit Grund, Pipeline-Ausnahme nur bei Pipeline-Quellen, „Übernehmen“ nur bei gültiger Kachel, Fokus beim Öffnen und Schließen, Nachlade-Fehler mit „Wiederholen“; dann implementieren.
- [ ] Tests zuerst für `DashboardWorkspace` (Nutzungsabläufe, jeweils mit Speicher-Ersatz): (a) Zahl hinzufügen, Größe wechseln, umsortieren, speichern, Arbeitsbereich neu einhängen → gespeicherte Ansicht; (b) Änderungen vornehmen und abbrechen → letzte gespeicherte Konfiguration; (c) Speicherfehler → Entwurf bleibt; (d) Konflikt → beide Wege, kein stilles Überschreiben; (e) Navigation mit Änderungen → Dialog mit drei Wegen; (f) Wiederholen nach Modulfehler bei geändertem Entwurf → Dialog; (g) gespeicherte Konfiguration mit unbekannter ID → Platzhalter, nach Speichern weiter vorhanden; (h) `zukuenftige_version` und `ungueltig` mit ihren Hinweisen; (i) Filterwechsel (Sitzungsfilter ändern `dirty` nicht, Startfilter schon); (j) „Details“ ohne und mit `onShowDetails`, auch per Tastatur; (k) Status `laden` zeigt das Skelett aus der Standardansicht, `fehler` und `keine_sitzung` ihre Texte; dann implementieren.
- [ ] Tests zuerst für `DashboardFilters`: Tippen in Pipeline und Zeitraum ändert weder Filter noch Datenaufrufe (Zählung), „Filter anwenden“ und Eingabetaste übernehmen genau einmal, ungültige Eingabe wird erklärt und nicht übernommen, „Filter zurücksetzen“, Pipeline-Feld nur bei unterstützender Kachel, lange Pipeline-Namen brechen um; dann implementieren.
- [ ] Vorschau: Arbeitsbereich mit Testdaten, Speicher-Ersatz und `?bereich=editor`.
- [ ] Screenshot-Skript `scripts/captureAuftrag074Screenshots.mjs` nach Vorbild `captureAuftrag073Screenshots.mjs`: Vorher (Basis `fbb7244`) und Nachher je Breite 1440/768/375 mit unterschiedlichen Hashes; 0 px horizontaler Seitenüberlauf in Ansicht, Bearbeitung, geöffnetem Konfigurator und Dialog; axe `serious`/`critical` = 0 in allen vier Zuständen; Tastaturablauf (Bearbeiten, Verschieben per Tastatur mit Fokus auf der Schaltfläche, Konfigurator öffnen und schließen, Speichern); Ziehen mit der Maus auf Breiten ab 768 px; Höhen gleich (ganze Kachel im Lade- und Fertigzustand einer aktivierten Kachel; Mindestfläche des Rasters beim Laden gleich der Standardansicht im bereiten Zustand, Wechsel genau einmal bei abweichendem Layout); Netzwerk `?bereich=editor`: vor dem Öffnen kein Konfigurator-Chunk, nach dem Öffnen genau ein Konfigurator-Chunk, bei 24 Kacheln ohne Scrollen nur die sichtbaren Kacheln und ihr Vorlauf aktiviert, nach Scrollen weitere. Matrix `docs/screenshots/auftrag-074/README.md`, keine Bilddateien committen.
- [ ] Pflicht-Verifikation (`CLAUDE.md` §7) mit Exit-Codes: `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm test`, `npm run verify`, `npm run build` (auch mit `VITE_DASHBOARD_PREVIEW=true` zum Chunknachweis), `npm run verify:quality-budget`, `npx size-limit`; `wc -l` über alle geänderten Dateien (alle < 400); Schutzbereichs-Diff gegen `fbb7244` leer.
- [ ] BUILD_LOG-Eintrag, Push, PR gegen `main`.

## Abnahme

Bearbeiten funktioniert auf 1440/768/375 px und mit der Tastatur. Abbrechen erhält die letzte gespeicherte Konfiguration; vor „Gespeichert“ bestätigt nichts eine Speicherung. Keine Änderung wird vor dem Speichern übernommen, kein Entwurf geht bei Fehler oder Konflikt verloren, kein Konflikt wird still überschrieben. Kacheln mit unbekannter oder inaktiver KPI in einer gültigen Konfiguration erscheinen erklärt und bleiben beim Speichern erhalten; eine insgesamt ungültige gespeicherte Konfiguration zeigt die Standardansicht mit Hinweis (bestehender Vertrag). Konfigurator und Diagrammmodule laden nachweislich erst bei Bedarf; nicht sichtbare Kacheln starten keine Abfragen; Filterwechsel löst keinen Abfragesturm aus. Alle Zustandswechsel werden angesagt, der Fokus bleibt sichtbar, Texte brechen um, die Höhen springen nicht. Produktive Seiten und Startbundle unverändert. Codex prüft; Marc sieht die Vorschau im CI-Artefakt `dashboard-preview`; Merge nur durch Marc.

## Nicht Teil dieses Auftrags

Geführte KPI-Kombinationen und zweite KPI (Teilauftrag 6), Detailseite und Navigation „Details“, Einbindung unter `/dashboard`, Rollout-Schalter, Router-Anbindung des Navigationsschutzes und `PersonalExecutiveDashboard` (Teilauftrag 7), neue Katalogeinträge (Teilauftrag 8), E2E-Ablauf `e2e/personal-dashboard.spec.ts` gegen die echte Persistenz, Änderungen an Katalog, Validierung, Datenauflösung oder Speicherung.
