# Auftrag 174b – Kacheln ohne Scrollen: Inhalt passt sich an, Mindestgröße, ruhiger Kachelkopf

**Status:** Beauftragt (Marc, 25.11.2026). Builder: Claude Code, sofern Marc nichts anderes festlegt. Prüfer: ein anderer Agent nach `CLAUDE.md` §4.1.
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

- [ ] **T0 – Vorher-Stand messen.** Screenshot-Harness `scripts/captureAuftrag174bGateScreenshots.mjs` nach Vorbild 174a. Er misst je Darstellungsart Scroll- und Überlaufwerte im Kachelkörper, die Lage des Ziehgriffs im Verhältnis zur Kategoriezeile und die Resize-Folge für K6. Alle Befunde K1–K7 werden nachgestellt oder begründet als nicht reproduzierbar dokumentiert.
- [ ] **T1 – Mindestgröße je Darstellungsart (K2).** Tabelle der Mindestgrößen in Rasterzellen je Darstellungsart und Breakpoint, abgeleitet aus Messungen statt geschätzt. Durchsetzung beim Ziehen (`grid/useGridDragAndDrop.ts`), in der Kollisionsauflösung (`grid/gridEngine.ts`), per Tastatur (`grid/useGridKeyboard.ts`), beim Darstellungswechsel und beim Laden (Anhebung als Entwurf). Unit-Tests für jede Grenze.
- [ ] **T2 – Inhalt passt sich an (K2, K5).** Kachelkörper ohne `overflow-auto`. Renderer und Diagramme skalieren über Container-Größen (vorhandene Chart-Primitives und Tokens nutzen, keine neue Bibliothek). Die 560-px-Lesebreite mit horizontalem Scrollen aus 174a entfällt. Ausklappbare Bereiche werden zu Überlagerungen.
- [ ] **T3 – Kachelkopf (K1, K3, K4).** Ziehgriff in eine eigene Fläche, die keinen Inhalt überdeckt, etwa links in die Schnellaktionsleiste oder als Griffleiste über dem Kopf. Kurze Stand-Zeile plus einklappbare Erläuterung. Die Stand-Dopplung beheben.
- [ ] **T4 – Resize ohne Verschieben (K6) und Säulenachse (K7).** Ursache bestimmen und beheben, mit Regressionstest (Vitest für die Rechnung, E2E für den Ablauf in einer Sektion).
- [ ] **T5 – Gates und Doku.** E2E-Ergänzung in `e2e/dashboard-editor-smoke.spec.ts` oder einer neuen Datei in der seriellen Gruppe (dann auch `.github/workflows/ci.yml` und `scripts/runV23Acceptance.mjs`). Vorher/Nachher-Matrix `docs/screenshots/auftrag-174b/README.md` (1440/768/375 px, 0 px Überlauf, keine Scrollleiste in Kacheln). BUILD_LOG-Eintrag. Stufenprotokoll und Stufenregel in `docs/dashboard/UMSTELLUNG_P16.md` nach §0 Nr. 4 anpassen.

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
