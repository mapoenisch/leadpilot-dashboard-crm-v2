# Auftrag 174b – Kacheln ohne Scrollen: Inhalt passt sich an, Mindestgröße, ruhiger Kachelkopf

**Status:** Umgesetzt (Builder Claude Code, beauftragt von Marc am 25.11.2026), Review ausstehend. Prüfer: ein anderer Agent nach `CLAUDE.md` §4.1.
**Basis:** `main` nach Merge von PR #222 (`5e5d17ac`).
**Ziel:** Jede Kachel zeigt ihren Inhalt vollständig und lesbar, ohne Scrollen in der Kachel. Wird eine Kachel kleiner gezogen, verkleinert sich der Inhalt bis zu einem lesbaren Mindestmaß. Kleiner als dieses Mindestmaß lässt sich die Kachel nicht ziehen. Lange Erklärungstexte sind eingeklappt, und die Bedienelemente überdecken keinen Inhalt.
**Herkunft der Befunde:** Hosted-Smoke-Test von Marc am 25.11.2026 auf `leadpilot-dashboard-crm.netlify.app` (Stand `5e5d17ac`, Organisation „LeadPilot Demo“, Stufe 1). Die Bildschirmfotos bleiben lokal. Die Befunde sind unten so beschrieben, dass sie ohne Bilder nachvollziehbar sind.

## 0. Einordnung und Entscheidungen Marc (25.11.2026)

1. **Kein Scrollen in Kacheln.** Diese Entscheidung ersetzt die Festlegungen 3 und 4 aus Auftrag 174a, nach denen längere Inhalte in der Kachel scrollen und Diagramme mit 560 px Lesebreite horizontal scrollen. Kacheln mit innerem Scrollen sind auf einem Dashboard nicht sinnvoll.
2. **Inhalt verkleinert sich statt abgeschnitten zu werden.** Unterhalb der Mindestgröße bleibt die Kachel stehen, der Resize-Griff gibt nicht weiter nach.
3. **Lange Erklärungstexte bleiben erhalten, aber eingeklappt.** Ein kleines, unauffälliges Bedienelement (Pfeil oder Plus) klappt sie auf.
4. **Rollout:** Stufe 2 entfällt, weil es nur eine Organisation gibt. Stufe 3 folgt nach mindestens 7 Tagen auf Stufe 1 ohne offenen Fehler. Die Frist beginnt nach Auslieferung dieses Auftrags (siehe §6).

## 1. Befunde und Abnahme

### Befundbeschreibung (Smoke-Test 25.11.2026)

- **K1 – Ziehgriff liegt auf der Schrift.** Der Ziehgriff („Kachel verschieben“, oben links, `GripVertical`) liegt über der Kategoriezeile. Aus „FINANZEN“ wird optisch „⠿NANZEN“, aus „VERTRIEB/CRM“ wird „⠿ERTRIEB/CRM“. Der Griff ist sichtbar, sobald die Kachel gewählt ist oder die Maus darüber steht.
- **K2 – Verkleinerte Kachel zeigt nur einen Ausschnitt.** „MRR nach Paket“ (Ring) wurde kleiner gezogen. Danach sind Legende („Sta…“, „Gro…“, „Pro…“), Prozentwerte, Werte-Chips, „Werte als Tabelle“ und „Details“ abgeschnitten, und in der Kachel erscheinen Scrollleisten. Der Inhalt bleibt in Originalgröße und wird nur beschnitten.
- **K3 – Zu lange Erklärungstexte im Kachelkopf.** CRM-Kacheln („Offenes Volumen“, „Deals in der Pipeline“, „Pipeline-Volumen nach Stufe“) zeigen unter dem Titel drei Zeilen Text: „Aktueller Stand der importierten CRM-Deals; ein Abschlussdatum (closeDate) existiert, seine fachliche Bedeutung für Zeitfilter ist nicht belegt. · CRM · Zeitbezug: Dashboard-Filter“. Die eigentliche Zahl rutscht dadurch nach unten oder aus der Kachel.
- **K4 – Doppeltes „Stand“.** Referenzwert-Kacheln zeigen „Referenzwert, Stand Stand 31.12.2025“. Ursache: `time/TileStandLine.tsx` setzt „Stand“ vor `timeBasis`, und `timeBasis` enthält bereits „Stand 31.12.2025“ (`model/catalog/activeEntries.ts`, `STAND_2025`).
- **K5 – Grauer Block über der Nachbarkachel, Zahl abgeschnitten.** In der Sektion „Pipeline“ ist bei „Offenes Volumen“ die KPI-Zahl „50.000“ unten abgeschnitten. Am rechten Rand der Kachel liegt ein breiter grauer Block, der in die Nachbarkachel „Deals in der Pipeline“ hineinragt und deren Titel verdeckt. Wahrscheinlich ist es die Scrollleiste des Kachelinhalts aus 174a. Der Builder bestätigt die Ursache.
- **K6 – Ziehen am unteren Griff verschiebt die Kachel.** Kachel „Pipeline-Volumen nach Stufe“ (Säulen, Sektion „Pipeline“, gewählt, Inspector offen) wurde am unteren Resize-Griff (`s`, Pfeil in der Mitte der Unterkante) gezogen. Statt dass die Kachel an ihrer Stelle höher oder niedriger wird, erscheint an ihrer bisherigen Position ein großer gestrichelter Platzhalter. Die Kachel selbst wird unterhalb dieses Platzhalters gezeichnet. Der Zeiger lag dabei nahe der Unterkante des sichtbaren Bereichs. Möglicherweise spielt das automatische Scrollen am Rand mit. Der Builder reproduziert den Fehler und bestimmt die Ursache.
- **K7 – Prüfpunkt Säulenachse.** In derselben Kachel zeigt die y-Achse 60.000 und 40.000. Ob die Säule bei 0 beginnt, war wegen K2/K6 nicht erkennbar. Der Builder prüft das. Eine Säule, deren Achse nicht bei 0 beginnt, ist ein eigener Befund.

### Abnahmekriterien

| Befund             | Abnahmekriterium                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K1                 | Der Ziehgriff überdeckt in keinem Zustand (Hover, gewählt, Touch-Tablet) Kategorie, Titel oder Werte. Bewegen per Maus, Touch (langes Drücken) und Tastatur funktioniert wie bisher.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| K2, K5             | Im Bearbeitungsmodus, in der Vorschau und in der normalen Ansicht hat keine Kachel eine Scrollleiste, weder vertikal noch horizontal (Messung: `scrollHeight <= clientHeight` und `scrollWidth <= clientWidth` für Kachelkörper und Diagrammbereich). Nichts ragt über die Kachelgrenze oder in eine Nachbarkachel. Beim Verkleinern schrumpfen Diagramm, Legende, Zahl und Beschriftungen mit. Geprüft wird jede Darstellungsart (Zahl, Linie, Fläche, Säulen, Balken, Kreis, Ring, Gauge, Sparkline, Tabelle, Trichter, Heatmap, Übersicht) auf Mindestgröße und auf einer mittleren Größe bei 1440 px und 1024 px. |
| K2 Mindestgröße    | Jede Darstellungsart hat eine Mindestgröße in Rasterzellen (Breite × Höhe), bei der alles lesbar ist: Schrift mindestens 11 px, KPI-Zahl mindestens 20 px, Legende vollständig oder sinnvoll gekürzt mit vollem Text per Tooltip oder Tabelle. Der Resize-Griff gibt unterhalb dieser Größe nicht nach. Die Tastatur-Größenänderung beachtet dieselbe Grenze. Die Mindestgröße hängt von der Darstellung ab, nicht nur von der Kennzahl. Ein Wechsel der Darstellung im Inspector vergrößert die Kachel bei Bedarf auf die neue Mindestgröße.                                                                         |
| K2 Bestandslayouts | Gespeicherte Kacheln unter der neuen Mindestgröße werden beim Öffnen im Editor auf die Mindestgröße angehoben. Das gilt als ungespeicherte Änderung und wird nicht automatisch gespeichert. In der Ansicht ohne Editor bleibt der Inhalt lesbar und ohne Scrollleiste; die Kachel darf dafür höher dargestellt werden. Gespeicherte Revisionen bleiben unverändert, bis der Nutzer speichert.                                                                                                                                                                                                                         |
| K3                 | Unter dem Titel steht höchstens eine kurze Zeile (Stand bzw. Zeitbezug). Der lange Erklärungstext ist standardmäßig eingeklappt und lässt sich über ein kleines Bedienelement (Pfeil oder Plus, dezent) aufklappen und wieder zuklappen. Bedienbar per Maus, Touch und Tastatur, mit `aria-expanded` und einem verständlichen Namen („Erläuterung anzeigen“). Der aufgeklappte Text ragt nicht aus der Kachel, sondern erscheint als Überlagerung (Popover) über der Kachel. Gilt für alle Kacheln mit Erklärungstext, nicht nur für CRM.                                                                             |
| K4                 | „Referenzwert, Stand 31.12.2025“ ohne Dopplung. Alle anderen Stand-Texte bleiben unverändert (Unit-Test über alle Katalogeinträge mit `history.kind === 'fest'`).                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| K6                 | Ziehen am unteren, rechten und Eck-Griff ändert nur die Größe. Die obere linke Ecke der Kachel bleibt an ihrer Stelle. Die Vorschau (gestrichelte Fläche) deckt sich mit der Kachel. Geprüft in einer Sektion und ohne Sektion, mit offenem Inspector und mit Zeiger am unteren Rand des sichtbaren Bereichs (automatisches Scrollen).                                                                                                                                                                                                                                                                                |
| K7                 | Säulen- und Balkendiagramme beginnen bei 0, oder die Abweichung ist sichtbar gekennzeichnet.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

### Ausklappbare Bereiche in der Kachel

„Werte als Tabelle“, die Zeitwahl und die Erläuterung (K3) dürfen die Kachel nicht vergrößern und keine Scrollleiste erzeugen. Sie öffnen als Überlagerung über der Kachel. Ein Dialog ist ebenfalls zulässig, wenn der Inhalt dafür zu groß ist. Escape und ein Klick außerhalb schließen die Überlagerung, der Fokus kehrt zum auslösenden Element zurück.

## 2. Reproduktion

Voraussetzungen wie in Auftrag 174a §2 (lokaler Supabase-Stack, Seed-Nutzer `manager-a@e2e.local`, Org A lokal auf Stufe 1).

1. `/dashboard` bei 1440 px öffnen, eine Kachel wählen und auf Kategorie und Titel achten (K1).
2. „MRR nach Paket“ (Ring) am Eck-Griff schrittweise verkleinern (K2).
3. Eine CRM-Kachel ansehen, etwa „Offenes Volumen“ oder „Deals in der Pipeline“ (K3, K5).
4. Eine Referenzwert-Kachel ansehen, etwa „ARR“ oder „MRR nach Paket“ (K4).
5. In einer Sektion „Pipeline-Volumen nach Stufe“ als Säulen wählen, den Inspector offen lassen und am unteren Griff ziehen, auch mit dem Zeiger nahe der unteren Fensterkante (K6, K7).

## 3. Umsetzung in prüfbaren Schritten

- [x] **T0 – Vorher-Stand messen.** Harness `scripts/captureAuftrag174bGateScreenshots.mjs` auf der Editor-Vorschau mit Testdaten (ohne Datenbank), Vorher-Build `5e5d17ac`. Nachgestellt: K1 (Griff überdeckt Kategorie), K2/K5 (16 von 17 Kacheln mit Scrollbereich bei 1440 px), K3 (Text „closeDate“ sichtbar), K4 (5× „Stand Stand“), K6 (tiefe Kachel springt 44 px, Vorschau 864 px daneben). K7 nicht als Fehler bestätigt (siehe §7 Nr. 6).
- [x] **T1 – Mindestgröße (K2).** Gemessen statt als Tabelle: Jede Kachel meldet ihren Platzbedarf bei Mindestfaktor (`tileFit.ts`, `TileFitBox.tsx`), umgerechnet in Rasterzellen (`grid/tileMinSizes.ts`). Durchgesetzt beim Ziehen (`useGridDragAndDrop.ts`) und per Tastatur (`useGridKeyboard.ts`). Abweichungen in §7 Nr. 2 und 3.
- [x] **T2 – Inhalt passt sich an (K2, K5).** Kachelkörper `overflow-hidden`; der Inhalt wird in der Einpassfläche gesetzt und per `transform` verkleinert. Feste Scrollhöhen (Tabelle, Übersicht, Hinweise, Trichter, waagerechter Diagramm-Scrollbereich) entfallen im Einpass-Modus. Abweichung „Werte als Tabelle“ in §7 Nr. 4.
- [x] **T3 – Kachelkopf (K1, K3, K4).** Ziehgriff in der Aktionsleiste über der Kachelkante. Kopf: Kategorie, Titel, Klartextname (eine Zeile), Stand-Zeile, daneben ein kleiner Pfeil „Erläuterung anzeigen“ mit Zeitbezug, Quelle und Formel als Überlagerung. Fußzeile einzeilig. `TileStandLine` ohne doppeltes „Stand“.
- [x] **T4 – Resize ohne Verschieben (K6) und Säulenachse (K7).** Ursache K6: Tailwind erzeugte `row-start-*` nur bis 13; tiefere Kacheln fielen in die automatische Platzierung. Behoben über `tailwind.config.js` (Startzeilen bis 200, safelist) und `rowStartClass()`. Tests: `gridRowPlacement.vitest.ts`, E2E.
- [x] **T5 – Gates und Doku.** Neue E2E-Datei `e2e/dashboard-tile-fit-preview.spec.ts` (parallele Vorschau-Gruppe, braucht keine Datenbank; deshalb nicht in der seriellen Gruppe), eingetragen in `ci.yml` und `runV23Acceptance.mjs`. Matrix `docs/screenshots/auftrag-174b/README.md`, BUILD_LOG, Stufenregel in `UMSTELLUNG_P16.md`.

## 4. Ziel-Dateien (Einstiegspunkte)

| Bereich                         | Dateien                                                                                                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kachel im Editor                | `src/features/dashboard/components/editor/canvas/CanvasTileCard.tsx`, `components/editor/grid/GridResizeHandle.tsx`                                                                     |
| Raster und Grenzen              | `components/editor/grid/useGridDragAndDrop.ts`, `components/editor/grid/gridEngine.ts`, `components/editor/grid/useGridKeyboard.ts`, `components/editor/sections/SectionedCanvasV2.tsx` |
| Renderer                        | `components/DashboardTile.tsx`, `components/TileValue.tsx`, Diagramm-Renderer unter `components/charts/`                                                                                |
| Kopf und Stand                  | `time/TileStandLine.tsx`, `components/TileStatus.tsx`                                                                                                                                   |
| Darstellungsgrenzen             | `model/dashboardCatalog.ts` (`MIN_SIZE_BY_VIEW`) oder ein neues Modul für Rastermindestmaße                                                                                             |
| Inspector (Darstellungswechsel) | `components/editor/EditorInspectorV2.tsx` bzw. `inspector/*`                                                                                                                            |
| Doku                            | `docs/BUILD_LOG.md`, `docs/screenshots/auftrag-174b/README.md`, `docs/dashboard/UMSTELLUNG_P16.md`, `BUILD_PLAN.md`                                                                     |

Muss der Builder weitere Dateien ändern, begründet er das im BUILD_LOG.

## 5. Grenzen

- Schutzbereiche nach `CLAUDE.md` §6 bleiben unberührt (leerer Diff gegen `5e5d17ac`).
- Keine neuen Abhängigkeiten und keine Datenmigration. Gespeicherte Layouts werden nur durch Speichern des Nutzers geändert.
- Die alte Editor-Version (V1) bleibt unverändert, außer dort, wo sie dieselben Renderer nutzt. Dort sind Verbesserungen erwünscht, aber kein Rückschritt (V1-Screenshots im Vorher/Nachher).
- Der Panel-Editor (Auftrag 155) ist nicht Teil dieses Auftrags. Keine Änderung an Release-Tag, Hosted-DB oder Stufen.

## 6. Übergang

Nach Review und Merge baut Marc die App neu (`npm run build:production`) und liefert sie auf Netlify aus. Danach wiederholt Marc den Smoke-Test. Ist er ohne offenen Fehler, trägt der Builder das Ergebnis ins Stufenprotokoll ein. Ab diesem Datum läuft die 7-Tage-Frist bis Stufe 3, danach folgen Release-PR und Tag `v4.0.0`.

## 7. Festlegungen des Builders

1. **Einpassung per Verkleinerung.** Kopf und Fußzeile bleiben in Originalgröße. Der Inhalt dazwischen (Zahl, Diagramm, Legende, Ausgabezeile, „Werte als Tabelle“) wird in einer Layoutbreite gesetzt und so weit verkleinert, dass er vollständig in die Fläche passt. Bei knapper Höhe darf die Layoutbreite schmaler sein; der Inhalt steht dann zentriert. Die Diagramme selbst bleiben unverändert (SVG mit 560 px Zeichenfläche). Gilt nur im Dashboard-Editor V2 (Bearbeiten und Vorschau). Alte Ansicht, Kiosk, Druck und Bericht sind unverändert.
2. **Mindestfaktor 0,8.** Darunter gilt der Inhalt nicht mehr als gut lesbar (12-px-Text wird zu 9,6 px; die Diagrammfläche bleibt mindestens 448 px breit). Die Mindestgröße einer Kachel ergibt sich aus der Messung ihres Inhalts bei diesem Faktor, nicht aus einer festen Tabelle je Darstellungsart. So zählen auch Titellänge und Datenmenge. Folge: Diagrammkacheln brauchen auf einer schmalen Arbeitsfläche viele Spalten. Bei 1440 px mit beiden offenen Seitenleisten sind es etwa 7 von 12 Spalten.
3. **Keine automatische Anhebung beim Öffnen (Abweichung von §1, „K2 Bestandslayouts“).** Die Mindestgröße in Rasterzellen hängt von der Breite der Arbeitsfläche ab, also davon, ob Bibliothek und Inspector offen sind. Eine automatische Anhebung würde beim bloßen Öffnen oder Schließen eines Seitenbereichs ungespeicherte Änderungen erzeugen. Stattdessen werden zu kleine Kacheln vollständig, aber kleiner dargestellt. Beim Ziehen rasten sie auf die Mindestgröße ein, kleiner geht nicht. Die Vorlage „Executive Dashboard“ hat Diagrammkacheln unter der Mindestgröße (Faktor 0,46 bei 1440 px mit offenen Seitenleisten). Ob die Vorlage größere Standardmaße bekommt, entscheidet Marc (§8).
4. **„Werte als Tabelle“ und Zeitwahl ohne Überlagerung (Abweichung von §1, „Ausklappbare Bereiche“).** Sie öffnen weiter in der Kachel. Die Einpassung verkleinert den Inhalt dann so, dass auch die geöffnete Tabelle ohne Scrollen hineinpasst. Eine Überlagerung hätte bei langen Tabellen einen eigenen Scrollbereich gebraucht. Die Erläuterung (K3) öffnet wie gefordert als Überlagerung.
5. **Smartphone-Liste unverändert.** In der Listenansicht (< 640 px) bestimmt der Inhalt die Kachelhöhe. Diagramme behalten dort den waagerecht scrollbaren Bereich aus 174a, weil ein auf 343 px eingepasstes Diagramm (Faktor 0,55) nicht lesbar wäre. Entscheidung Marc offen (§8).
6. **K7 ohne Fehler.** Säulen- und Balkendiagramme beginnen bei 0 (`niceSignedScale` nimmt 0 immer in den Wertebereich). Im Bildschirmfoto war nur der obere Teil der Achse sichtbar. Regressionstest in `gridRowPlacement.vitest.ts`.
7. **Ladehinweis ohne langen Zeitbezug.** Solange ein Diagramm lädt, nennt der sichtbare Hinweis im Einpass-Modus nur den Titel.

## 8. Entscheidungen Marc (25.11.2026)

1. **Größere Standardmaße für Diagrammkacheln in den Vorlagen:** Umsetzen wie empfohlen als eigener, kleiner Folgeauftrag nach Abschluss und Merge von PR #223.
2. **Smartphone-Liste:** Das waagerechte Scrollen der Diagramme in der Smartphone-Liste (< 640 px) bleibt unverändert bestehen.
