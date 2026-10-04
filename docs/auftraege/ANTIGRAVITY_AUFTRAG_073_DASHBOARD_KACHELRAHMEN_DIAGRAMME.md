# Auftrag 073 – Dashboard Teilauftrag 4: Kachelrahmen und Diagramme

**Stand:** 04.10.2026

**Basis:** `main` `92180d3` (nach PR #56). Plan: `docs/superpowers/plans/2026-10-01-executive-dashboard-plan.md`, Teilauftrag 4, §4 (Daten und Eignung), §5 (Darstellung gemäß Referenz, Lazy Loading). Designfreigabe: BUILD_LOG „Designfreigabe Testkachel durch Marc (Stand f779901)“. Datenverträge: Auftrag 070 (`model/dashboardCatalog.ts`, `model/dashboardConfig.ts`) und Auftrag 071 (`data/dashboardData.ts`).

**Voraussetzung:** Designfreigabe (02.10.2026) und Teilauftrag 1 (Auftrag 070) liegen vor. Teilaufträge 2 und 3 sind gemergt, werden hier aber nicht benutzt: Die Kachel bekommt ihre Daten als Eigenschaft und läuft mit festen Testdaten (Plan TA4: „anhand definierter Testdaten unabhängig von Teilaufträgen 2/3 baubar“).

**Builder:** Claude Code (Zyklus 1). **Prüfer:** Codex. **Merge:** nur Marc.

**Branch:** `claude/elegant-cerf-g28p04` (Session-Branch), PR gegen `main`.

## Ziel

Ein einheitlicher Kachelrahmen (`DashboardTile`) und eine Darstellungsauswahl (`DashboardChart`) für alle Darstellungen des Katalogs: Zahl, Tabelle, Säulen, Balken, Kreis, Ring, Linie, Fläche und Übersicht. Jede Kachel zeigt Titel, Inhalt, Einheit, tatsächlichen Zeitraum/Stand, Quelle, Datenzustand und eine bedienbare Schaltfläche „Details“. Diagrammmodule werden je Darstellung nachgeladen. **Kein Raster, kein Editor, keine Sichtbarkeitsaktivierung** (Teilauftrag 5), **keine Detailseite und keine Einbindung unter `/dashboard`** (Teilauftrag 7).

## Globale Grenzen

- Schutzbereiche (`CLAUDE.md` §6) unverändert: `src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources`. Keine Persistenz, keine Migration.
- Nur lesen: `src/features/dashboard/model/**`, `src/features/dashboard/data/**`, `src/features/dashboard/hooks/**`, `src/components/ui/**`, `src/hooks/**`, `src/domain/**`, `src/app/**`.
- Keine neue Abhängigkeit (`CLAUDE.md` §8). Vorhandene Bausteine nutzen: `Card`, `Badge`, `Button`, `useReducedMotion`, Design-Tokens.
- Produktive Seiten bleiben unverändert: Kein Import der neuen Komponenten aus `src/app/**` oder `src/features/overview/**`. Damit ändert sich das Startbundle nicht.
- Freigegebenes Design wird übernommen, nicht neu gestaltet: Tiefen-Säulen/-Balken, Ring/Kreis mit Türkis-Abstufung (`shareColors`), Linie/Fläche, Tooltip-/Ablesezeile, mobile Scrollbarkeit innerhalb der Kachel ohne kleinere Beschriftung.
- **Abweichung vom Plantext, begründet:** Plan TA4 nennt für Linie/Fläche „vorhandene Recharts-Technik“. Freigegeben hat Marc aber die eigenen SVG-Diagramme der Testkachel (`DepthLineChart`, `DepthAreaChart`). Die Freigabe geht vor; Recharts wird für diesen Teilauftrag nicht verwendet.

## Ziel-Dateien

| Datei | Änderung |
|---|---|
| `src/features/dashboard/preview/charts/*` → `src/features/dashboard/components/charts/*` | Verschoben (`git mv`): `Depth3dBarChart.tsx`, `Depth3dDonutChart.tsx`, `DepthLineChart.tsx`, `DepthAreaChart.tsx`, `ChartReadout.tsx`, `chartTypes.ts`, `depthGeometry.ts` |
| `src/features/dashboard/preview/ChartModuleBoundary.tsx` → `src/features/dashboard/components/charts/ChartModuleBoundary.tsx` | Verschoben, Rückfall „Wiederholen“ unverändert |
| `src/features/dashboard/components/charts/depthGeometry.ts` | Ergänzt: negative Werte bei Säulen/Balken (Nullachse), Mindestsichtbarkeit kleiner Werte |
| `src/features/dashboard/components/charts/Depth3dBarChart.tsx` | Ergänzt: Nullachse und Säulen/Balken unterhalb von 0 |
| `src/features/dashboard/components/charts/chartLoaders.ts` | Neu: dynamische Imports je Diagrammart, `lazy`-Cache |
| `src/features/dashboard/components/tileFormat.ts` | Neu: Wertformatierung je Einheit, Zeitraum-/Standtext, Quellenbezeichnung |
| `src/features/dashboard/components/TileStatus.tsx` | Neu: Zustandsanzeige je `TileDataState` |
| `src/features/dashboard/components/TileValue.tsx` | Neu: Zahl und Tabelle |
| `src/features/dashboard/components/TileOverview.tsx` | Neu: Übersichtsinhalt Team/HR, Roadmap, Live-Aktivität |
| `src/features/dashboard/components/DashboardChart.tsx` | Neu: Auswahl der Darstellung, Eignungsprüfung der Werte, Suspense/Fehlergrenze |
| `src/features/dashboard/components/DashboardTile.tsx` | Neu: Kachelrahmen mit Kopf, Inhalt, Fußzeile und „Details“ |
| `src/features/dashboard/preview/DashboardDesignPreview.tsx` | Nur Importpfade und `DEFAULT_CHART_LOADERS` aus `chartLoaders.ts`; Verhalten unverändert |
| `src/features/dashboard/preview/TileGalleryPreview.tsx` | Neu: Kachelgalerie mit allen Darstellungen, Größen und Zuständen |
| `src/features/dashboard/preview/tileGallerySampleData.ts` | Neu: feste, gekennzeichnete Testdaten als `TileData` |
| `src/features/dashboard/preview/DashboardPreviewPage.tsx` | Galerie unter der Testkachel einbinden |
| `src/features/dashboard/__tests__/depthGeometry.vitest.ts` | Verschoben aus `preview/__tests__/`, ergänzt um Negativ- und Kleinwertfälle |
| `src/features/dashboard/__tests__/tileFormat.vitest.ts` | Neu |
| `src/features/dashboard/__tests__/DashboardChart.ui.vitest.tsx` | Neu |
| `src/features/dashboard/__tests__/DashboardTile.ui.vitest.tsx` | Neu |
| `src/features/dashboard/preview/__tests__/DashboardDesignPreview.ui.vitest.tsx` | Nur Importpfade |
| `scripts/captureAuftrag073Screenshots.mjs` | Neu: Screenshot-, Overflow- und Netzwerknachweis |
| `docs/screenshots/auftrag-073/README.md` | Neu: Ergebnismatrix (keine Bilddateien) |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_073_DASHBOARD_KACHELRAHMEN_DIAGRAMME.md` | Checkboxen abhaken |
| `docs/BUILD_LOG.md` | Builder-Eintrag |

Jede Datei unter 400 Zeilen (Lint `max-lines`). Weitere Dateien nur nach Rückfrage (`CLAUDE.md` §5.3).

## Belegte Grundlagen

- Kachelkonfiguration `DashboardTileConfig` (`tileId`, `catalogId`, `view`, `size`, `title?`, `filterMode`) und Katalogeintrag `ActiveCatalogEntry` (`name`, `category`, `unit`, `shape`, `views`, `minSize`, `timeBasis`, `funnelStages?`, `mayBeNegative?`, `detailRouteId`).
- Datenzustand `TileData = ResolvedTileData | UnavailableTileData` mit `state` aus `laden | bereit | keine_daten | fehler | offline | veraltet | nicht_konfiguriert | nicht_verfuegbar`, `value`, `series`, `overview`, `unit`, `timeBasis`, `asOf`, `origin.layer`, `scope` (`stammdaten | organisation | organisationsuebergreifend`), `effectiveFilter` (`mode`, `period`, `pipeline`, `periodReason?`, `pipelineReason?`), `quality?: 'degradiert'`, `message?`.
- Live-Geltungsbereich (Auftrag 071, bestätigt von Marc am 03.10.2026): `live_kpi_public_feed` ist nicht mandantengetrennt; Live-Kacheln liefern `scope: 'organisationsuebergreifend'`, und die Kachel zeigt dazu einen Hinweis (dieser Teilauftrag).
- `resolveBaseline` kann bei leeren Quelllisten `state: 'bereit'` mit `series: []` liefern; leere Reihen sind im Typvertrag zulässig.
- Zulässige Darstellungen je Datenform: `VIEWS_BY_SHAPE`; Mindestgrößen: `MIN_SIZE_BY_VIEW`, `minSizeFor`. Die Validierung (`validateDashboardConfig`) verhindert unzulässige Kombinationen bereits beim Speichern.
- Freigegebene Diagramme der Testkachel mit `DepthChartProps` (`idPrefix`, `data`, `unit`, `period`, `title`, `reducedMotion`, `orientation`, `solid`), Ladeplatzhalter mit Endhöhe (`ChartLoadingPlaceholder`, `ChartLayoutReserve`) und Fehlergrenze mit „Wiederholen“.
- Aktuell kann keine aktive Katalogkachel negative Reihen liefern (EBITDA ist nur Zahl/Tabelle). Plan §4 verlangt die korrekte Darstellung trotzdem; sie wird mit Testdaten nachgewiesen.

## Vorgaben

### Kachelrahmen (`DashboardTile`)

- Eigenschaften: `tile: DashboardTileConfig`, `entry?: ActiveCatalogEntry`, `data: TileData`, `onShowDetails: (tileId: string) => void`, optional `onRetryChartLoad` (Standard: Seite neu laden wie in der Testkachel, weil der Browser einen fehlgeschlagenen Modulabruf festhält; Teilauftrag 5 sichert vorher die Arbeitskopie).
- Kopf: Kategorie, Titel (`tile.title` sonst `entry.name`), Zeile „Zeitraum/Stand · Quelle“. Quelle als Wort: Stammdaten, CRM, Live. Zustandsabzeichen nur bei Abweichung von `bereit`.
- Zeitbezug je Kachel sichtbar (Plan §4, „Filter“): „Dashboard-Filter“, „Eigener Zeitraum“ oder „Fester historischer Stand“ aus `data.effectiveFilter.mode` (bei `nicht_verfuegbar` aus `tile.filterMode`). Ist ein Zeitraum oder eine Pipeline gesetzt, werden sie genannt; wirkt ein gewählter Filter für diese Quelle nicht, erscheint `periodReason` bzw. `pipelineReason` als kurzer Hinweis.
- Geltungsbereich: Bei `scope: 'organisationsuebergreifend'` dauerhaft sichtbarer Hinweis „Live-Feed, nicht nach Organisation getrennt“ (Text mit zugänglicher Erklärung, nicht nur Farbe oder Symbol).
- Inhalt über `DashboardChart`. Fußzeile mit Schaltfläche „Details“ (`aria-label` „Details zu <Titel>“), immer bedienbar, auch bei `fehler` und `nicht_verfuegbar`.
- `Card` als Rahmen, `data-size` und `data-view` am Element. Mindesthöhen je Darstellung, damit Laden, Fehler und fertige Darstellung dieselbe Höhe haben (kein Layoutsprung). Keine Größenänderung, kein Skalieren, kein Pulsieren bei Hover/Fokus.
- Ohne Katalogeintrag (`nicht_verfuegbar`) keine erfundenen Metadaten: Titel aus `tile.title` oder die Katalog-ID, Hinweis aus `data.message`.

### Datenzustände (`TileStatus`)

| Zustand | Anzeige |
|---|---|
| `laden` | Reservefläche in Endhöhe mit „wird geladen“, fokussierbar |
| `keine_daten` | „Keine Daten“, niemals 0 |
| `fehler` | Verständlicher Text aus `message`, keine technische Meldung |
| `offline` | Hinweis „Live-Verbindung getrennt“; vorhandener Wert bleibt mit Zeitstempel sichtbar |
| `veraltet` | Wert bleibt sichtbar, Hinweis „veraltet“ mit Zeitstempel |
| `nicht_konfiguriert` | „Datenquelle nicht eingerichtet“ |
| `nicht_verfuegbar` | Hinweis aus `message`, Kachel bleibt entfernbar (Teilauftrag 5) |
| `quality: 'degradiert'` | Zusatzhinweis „eingeschränkte Datenqualität“ |

### Formatierung (`tileFormat.ts`)

- Deutsche Zahlenformatierung (`Intl.NumberFormat('de-DE')`).
- `EUR`: in der Zahlansicht ab 1 Mio. kompakt („2,35 Mio. EUR“), in Tabelle, Tooltip und zugänglichem Text exakt.
- `x`: eine Nachkommastelle mit „x“ („3,2x“). `%`: eine Nachkommastelle mit Leerzeichen („12,5 %“). Andere Einheiten: Zahl plus Einheit.
- Zeitraum/Stand: `timeBasis`; bei Live zusätzlich `asOf` als „Stand TT.MM.JJJJ, HH:MM“. Kein erfundener Zeitraum.
- `null` ergibt „Keine Daten“, nie „0“.

### Darstellung (`DashboardChart`)

- Wählt anhand `tile.view`: `zahl`, `tabelle` (`TileValue`), `saeulen`/`balken` (`Depth3dBarChart`, `orientation`), `kreis`/`ring` (`Depth3dDonutChart`, `solid`), `linie`/`flaeche`, `uebersicht` (`TileOverview`). `series` wird zu `DatumInput[]`; ein Einzelwert erscheint in Zahl und Tabelle.
- Eignung der **Werte** vor dem Zeichnen prüfen, ohne Ausnahme zu werfen: Kreis/Ring mit negativem Wert oder Summe 0 → erklärter Zustand „Nicht als Anteil darstellbar“ plus Tabelle. Nicht endliche Werte → „Keine Daten“. Leere Reihe (`series` ist `null` oder `[]`) bei einer reihenbasierten Darstellung (Säulen, Balken, Kreis, Ring, Linie, Fläche, Tabelle einer Reihe) → „Keine Daten“, auch wenn `state` `bereit` meldet; es wird kein Diagramm und kein Zeitpunktregler gerendert. Passt die Darstellung nicht zur Datenform des Eintrags (z. B. alte Konfiguration), erklärter Hinweis statt Diagramm.
- Säulen/Balken: Skala über `min(0, kleinster Wert)` bis `max(0, größter Wert)`; Nullachse sichtbar; negative Werte unterhalb bzw. links der Achse. Nullwerte behalten ihren Platz ohne Fläche. Werte ungleich 0, deren Fläche unter 2 px läge, erhalten 2 px; Beschriftung, Tooltip und Tabelle zeigen den exakten Wert.
- Kreis/Ring: exakte Winkelanteile, keine Mindestwinkel; kleine Anteile bleiben über Legende und Tabelle lesbar.
- Unter jedem Diagramm die zugängliche Alternative „Werte als Tabelle“ (wie Testkachel), außerhalb der Fehlergrenze.
- `idPrefix` je Kachel aus `useId` plus `tileId`, nur Buchstaben und Ziffern: zwei identische Kacheln auf einer Seite teilen keine SVG-IDs.
- `reducedMotion` aus `useReducedMotion`. Tooltip/Ablesezeile mit Wert, Einheit, Kategorie und Zeitraum; Anteile nur bei Kreis/Ring mit belastbarer Summe.
- Mobil (375 px): Diagramm scrollt innerhalb der Kachel, Beschriftung wird nicht verkleinert (Designfreigabe).

### Nachladen (`chartLoaders.ts`)

- Ein `import()` je Diagrammmodul: Säulen/Balken, Kreis/Ring, Linie, Fläche. `React.lazy`-Cache je Loader-Satz und Modul (wie bisher in der Testkachel). Zahl, Tabelle und Übersicht laden kein Diagrammmodul.
- Tests mit ersetzten Loadern: Eine Kachel „Zahl“ ruft keinen Loader auf; „Ring“ ruft nur den Kreis/Ring-Loader auf; zwei Ring-Kacheln rufen ihn einmal auf.
- Build-Nachweis: `npm run build` mit `VITE_DASHBOARD_PREVIEW=true` erzeugt getrennte Chunks je Diagrammmodul (Dateiliste im BUILD_LOG). Netzwerknachweis im Screenshot-Skript (siehe unten).

### Galerie (Vorschau)

- `TileGalleryPreview` unter der bestehenden Testkachel auf `/dashboard-vorschau.html`, deutlich als Testdaten gekennzeichnet. Mit gesetztem `?ansicht=` blendet `DashboardPreviewPage` die bestehende Testkachel aus (sie startet mit „Säulen“ und würde sonst immer den Säulen-Chunk laden); ohne Parameter bleibt die Seite wie freigegeben. Feste `TileData` ohne Abfragen; echte Katalogeinträge, wo vorhanden (z. B. `baseline.arr_verlauf`, `baseline.mrr_paketmix`, `uebersicht.roadmap`).
- Inhalt: jede Darstellung mindestens einmal; alle vier Größen in Desktopbreite (3/6/9/12 von 12 Spalten wie in der Testkachel); Zustände `laden`, `keine_daten`, `fehler`, `veraltet`, `offline`, `nicht_verfuegbar`, `degradiert`; eine Live-Kachel mit Geltungsbereichshinweis; je ein Beispiel für „Dashboard-Filter“, „Eigener Zeitraum“ und „Fester historischer Stand“; eine leere Reihe (`bereit`, `series: []`); Säulen und Balken mit negativen Werten und mit sehr kleinen Werten; Ring mit Summe 0; zwei identische Ring-Kacheln nebeneinander.
- URL-Parameter `?ansicht=<view>` zeigt nur Kacheln dieser Darstellung (für den Netzwerknachweis). „Details“ in der Galerie zeigt einen kurzen Hinweis statt zu navigieren.

## Umsetzung

- [ ] Verschieben der Diagrammmodule und der Fehlergrenze (`git mv`), Importe in Testkachel und Tests anpassen; bestehende Tests der Testkachel unverändert grün.
- [ ] Tests zuerst für `depthGeometry` (negative Werte, gemischte Vorzeichen, nur negative, Nullachse, Mindestsichtbarkeit 2 px, Nullwerte), dann implementieren; Säulen/Balken zeichnen die Nullachse.
- [ ] Tests zuerst für `tileFormat` (EUR kompakt/exakt, x, %, `null`, Live-Zeitstempel), dann implementieren.
- [ ] Tests zuerst für `DashboardChart` (jede Darstellung rendert; Ring mit negativem Wert bzw. Summe 0 → erklärter Zustand; nicht endliche Werte; leere Reihe mit `state: 'bereit'` → „Keine Daten“ ohne Diagramm und ohne Regler, je reihenbasierter Darstellung; Darstellung passt nicht zur Datenform; Loader nur bei Bedarf; zwei identische Kacheln mit getrennten SVG-IDs; reduzierte Bewegung durchgereicht), dann implementieren.
- [ ] Tests zuerst für `DashboardTile` (Titel, eigener Titel, Quelle, Zeitraum/Stand; jeder Zustand der Tabelle oben; „Keine Daten“ statt 0; „Details“ ruft `onShowDetails(tileId)` per Klick und Tastatur, auch im Fehlerzustand; Zeitbezug für alle drei Modi samt gesetztem Zeitraum/Pipeline und `periodReason`; Geltungsbereichshinweis bei `organisationsuebergreifend`, keiner bei `stammdaten`/`organisation`; ohne Katalogeintrag keine erfundenen Metadaten), dann implementieren.
- [ ] Galerie mit Testdaten und `?ansicht=`-Filter.
- [ ] Screenshot-Skript `scripts/captureAuftrag073Screenshots.mjs` nach Vorbild `captureDashboardPreviewScreenshots.mjs`: Vorher (Basis `92180d3`, nur Testkachel) und Nachher (Galerie) auf 1440/768/375 px, SHA-256 je Bild, 0 px horizontaler Overflow der Seite; zusätzlich Hover-/Fokuszustand je Diagrammart. Netzwerknachweis (Testkachel dabei ausgeblendet): `?ansicht=zahl` lädt keinen Diagramm-Chunk, `?ansicht=ring` nur den Kreis/Ring-Chunk. Ergebnis als `docs/screenshots/auftrag-073/README.md`, PNG-Dateien nicht committen.
- [ ] Pflicht-Verifikation (`CLAUDE.md` §7) mit Exit-Codes: `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm test`, `npm run verify`, `npm run build`, `npm run verify:quality-budget`; `npx size-limit` unverändert innerhalb der Grenzen; Schutzbereichs-Diff gegen `92180d3` leer.
- [ ] BUILD_LOG-Eintrag, Push, PR gegen `main`.

## Abnahme

Freigegebener Stil erkennbar, Werte unverzerrt (bis auf die dokumentierte 2-px-Mindestsichtbarkeit), negative Werte unterhalb der Nullachse, keine abgeschnittenen Beschriftungen auf 1440/768/375 px, keine großflächigen Hover-Effekte. Fehlende Werte und leere Reihen zeigen „Keine Daten“, nie 0 oder ein leeres Diagramm. Jede Kachel nennt ihren Zeitbezug; Live-Kacheln weisen auf den nicht mandantengetrennten Feed hin. Jede Kachel besitzt eine bedienbare Schaltfläche „Details“. Diagrammmodule laden nachweislich nur bei Bedarf. Produktive Seiten und Startbundle unverändert. Codex prüft; Marc sieht die Galerie im CI-Artefakt `dashboard-preview`; Merge nur durch Marc.

## Nicht Teil dieses Auftrags

Raster, Reihenfolge, Größenwahl durch Nutzer, Editor, Arbeitskopie und Sichtbarkeitsaktivierung `useTileActivation`/`LazyDashboardTile` (Teilauftrag 5), Kombinationen (Teilauftrag 6), Detailseite, Navigation „Details“ und Einbindung unter `/dashboard` (Teilauftrag 7), neue Katalogeinträge (Teilauftrag 8), E2E-Ablauf `e2e/personal-dashboard.spec.ts`.
