# Auftrag 077 – Dashboard Teilauftrag 7: Details und Integration unter `/dashboard`

**Stand:** 05.10.2026

**Basis:** Branch `claude/inspiring-pascal-hvjcog` `cf964a1` (PR #60, Auftrag 076, noch nicht gemergt). Die Umsetzung beginnt erst, wenn PR #60 in `main` gemergt ist. Dann wird dieser Branch auf `main` neu aufgesetzt, und die Baseline ist der Merge-Commit von PR #60. Plan: `docs/superpowers/plans/2026-10-01-executive-dashboard-plan.md`, Teilauftrag 7, §3 „Normalansicht“, §5 „Lazy Loading und Ladeverhalten“. Datenverträge: Aufträge 070 (Katalog), 071 (Datenauflösung), 072 (Speicherung), 073 (Kachelrahmen), 074 (Raster, Editor), 076 (Kombinationen).

**Voraussetzung:** Teilaufträge 5 und 6 sind gemergt (Plan: „integrierte Teilaufträge 5/6“).

**Builder:** Claude Code (Zyklus 1). **Prüfer:** Codex. **Merge:** nur Marc.

**Freigabe:** Marc hat die Entscheidungen E1–E3 am 05.10.2026 im Chat getroffen, jeweils gemäß Vorschlag (E1: „ich glaube 1.“ nach Erklärung bestätigt; E2 und E3: „e2 und e3 passen“). Gebaut wird nach dem Merge von PR #60.

**Branch:** `claude/auftrag-077-dashboard-details`, PR gegen `main`.

## Ziel

Die neue persönliche Ansicht wird unter `/dashboard` angebunden, aber nur hinter einem ausdrücklich definierten Rollout-Schalter. Bis zur Gesamtabnahme (Teilauftrag 8) bleibt die alte Ansicht der Standard. Jede Kachel führt über „Details“ auf eine eigene, lazy geladene Detailseite `/dashboard/tiles/:tileId` mit:

- Titel, Definition, Wert und tatsächlichem Zeitraum
- Quelle, Aktualität, Aufteilung/Verlauf und zugänglicher Detailtabelle
- bei Kombinationen beiden Operanden und der Formel
- bei Übersichtskacheln passenden Übersichtsdetails statt einer erfundenen Kennzahlendefinition

Darunter führt „Zur Fachübersicht“ zur Fachseite aus dem Katalog. Filter der Sitzung bleiben beim Hin- und Rückweg erhalten. Nach einem Browser-Reload gilt der gespeicherte Kontext.

## Entscheidungen Marc (05.10.2026, jeweils Vorschlag gewählt)

| Nr. | Frage                                                    | Entscheidung                                                                                                                                                                                                                                                  | Verworfen                                                                                                                           |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Form des Rollout-Schalters                               | Build-Schalter `VITE_EXECUTIVE_DASHBOARD_V2` (Standard aus). Ist er aus, ist `/dashboard` unverändert, und die Detailroute ist nicht registriert (404 wie heute). Ist er an, zeigt `/dashboard` die neue Ansicht. Eintrag in `.env.example` ohne Wert `true`. | Zur Laufzeit je Benutzer umschaltbar (z. B. Schalter in der alten Ansicht). Braucht gespeicherten Zustand und erweitert den Umfang. |
| E2  | Zugang zur alten Ansicht bei aktivem Schalter            | Kein Umschalter in der Oberfläche. Die alte Ansicht bleibt im Code und kehrt beim Zurückschalten des Schalters zurück (Plan Teilauftrag 8: „alte Ansicht verfügbar“).                                                                                         | Zusätzlicher Link „Bisherige Ansicht“ auf eine eigene Route                                                                         |
| E3  | Detailseite einer Kachel aus dem ungespeicherten Entwurf | Im Bearbeitungsmodus ist „Details“ deaktiviert, mit dem Hinweis „Erst speichern, dann Details öffnen“. Der Editor wird nie unbemerkt verlassen (Plan: „Unsaved Editor-Vorschau navigiert nicht versehentlich aus dem Editor“).                                | „Details“ startet `requestLeave`, also die Rückfrage Speichern/Verwerfen/Bleiben.                                                   |

## Globale Grenzen

- **Schutzbereiche** (`CLAUDE.md` §6) bleiben unverändert: `src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources`. Keine Migration und keine Änderung an `supabase/`.
- **Änderungen in `src/app/**` und `src/components/layout/**`** nur in den unten genannten Dateien und Stellen.
- **Alte Ansicht unverändert:** `src/features/overview/pages/ExecutiveDashboardPage.tsx` wird nicht geändert.
- **Schalter aus:** Ein Produktionsbuild bleibt im Verhalten unverändert (gleiche Routen, gleiche Seiten). Das Startbundle (`Initial JS bundle`, `npx size-limit`) wächst höchstens um den Schalter und die Lazy-Importe, also unter 1 KB gzip. Der neue Code liegt ausschließlich in eigenen Chunks.
- **Nur lesen:** `src/domain/**`, `src/components/ui/**`, `src/hooks/**`, `src/auth/**`, `dashboardEditorReducer.ts`, `useDashboardEditor.ts`, `useDashboardPreferences.ts`, die Resolver unter `data/`. Werte der Detailseite entstehen über denselben Datenweg wie in der Kachel (`useDashboardData`), ohne eigene Berechnung.
- **Keine neue Abhängigkeit.** Keine Änderung an `Modal.tsx`.
- **Jede Datei unter 400 physischen Zeilen** (`wc -l`, auch Tests und Skripte). Die Prüfung gehört ins BUILD_LOG. `DashboardTile.tsx` (369) und `DashboardWorkspace.tsx` (344) liegen nahe an der Grenze, Erweiterungen kommen daher in neue Dateien.

## Belegte Grundlagen

- **Routing:** `src/app/App.tsx` registriert `APP_ROUTES` generisch über `ROUTE_PAGES` (`routePages.tsx`, `s-exec` → `ExecutiveDashboardPage`, lazy). Unbekannte Pfade gehen an `NotFoundPage`.
- **Seitenmetadaten:** `routeForPathname` (`src/app/routes.tsx`) kennt nur exakte Pfade und liefert für alles andere „Seite nicht gefunden (404)“. `Layout.tsx` und `Sidebar.tsx` nutzen diese Funktion. Eine dynamische Detailroute würde daher heute als 404 betitelt.
- **Arbeitsbereich:** `DashboardWorkspace.tsx` kennt weder Supabase noch Router.
  - Er bietet `onShowDetails?: (tileId) => void`. Fehlt der Wert, erscheint ein Hinweis auf Teilauftrag 7.
  - Er bietet `requestLeave` für Navigation mit ungespeicherten Änderungen.
  - Sitzungsfilter liegen lokal (`useState` `session`, Zeile 105). Ohne Sitzungsfilter gelten die gespeicherten Startfilter (`config.filters`).
- **Katalog:** Aktive Einträge tragen `definition`, `unit`, `timeBasis`, `detailRouteId` (Pflicht, Test: jede ID existiert in `APP_ROUTES`) und `kind: 'kpi' | 'uebersicht'`. Kombinationseinträge erben `detailRouteId` aus der Regel.
- **Daten:** `ResolvedTileData` liefert `value`, `series`, `overview` (`team_hr`, `roadmap`, `live_aktivitaet`), `asOf`, `origin`, `scope`, `effectiveFilter` und bei Kombinationen `combination { formula, operands[] }`.
- **Speicherung:** `useDashboardPreferences` liefert die gespeicherte Konfiguration je Organisation und Benutzer. Die Detailseite liest die Kachel (`tileId`) aus dieser Konfiguration, nicht aus der URL.

## Entwurf

- **Rollout-Schalter** (`model/dashboardRollout.ts`): Die Funktion `isPersonalDashboardEnabled()` liest `import.meta.env.VITE_EXECUTIVE_DASHBOARD_V2 === 'true'` (gemäß E1). Es gibt genau eine Stelle, die den Schalter liest. Tests setzen ihn über `vi.stubEnv`.
- **Einstieg** (`src/app/routePages.tsx`): `s-exec` zeigt auf `ExecutiveDashboardEntry`. Diese Komponente lädt je nach Schalter lazy entweder `ExecutiveDashboardPage` (alt) oder `PersonalExecutiveDashboard` (neu). Bei ausgeschaltetem Schalter wird der neue Chunk nie angefordert (Test über Loader-Aufruf).
- **Detailroute** (`src/app/App.tsx`): Ist der Schalter an, kommt eine zusätzliche `<Route path="/dashboard/tiles/:tileId">` vor `*` hinzu. Sie nutzt dieselbe `RouteErrorBoundary`-/`Suspense`-Hülle und lädt `DashboardTileDetailPage` lazy.
- **Seitenmetadaten** (`src/app/routes.tsx`): `routeForPathname` erkennt das Präfix `/dashboard/tiles/` und liefert `{ id: 's-exec-detail', path, title: 'Kachel-Details', categoryLabel: 'Übersicht' }`. Damit erhält die Seite keine 404-Metadaten. In der Seitenleiste bleibt „Executive Dashboard“ aktiv (`Sidebar.tsx`: aktiver Eintrag über das Präfix `/dashboard`). Bei ausgeschaltetem Schalter gibt `routeForPathname` für diesen Pfad weiterhin 404 zurück.
- **Persönliche Ansicht** (`pages/PersonalExecutiveDashboard.tsx`): Die Seite verbindet `useDashboardPreferences`, `useDashboardData`, `chartLoaders` und `DashboardWorkspace`. `onShowDetails` navigiert nach `/dashboard/tiles/:tileId` und übergibt `location.state = { filters, returnFocus: tileId }`. Bei der Rückkehr gilt:
  - Die Sitzungsfilter werden aus `location.state` wiederhergestellt.
  - Der Fokus geht auf den „Details“-Knopf der Ausgangskachel.
  - Die Rückkehr wird in der Live-Region angesagt.
  - Dafür bekommt `DashboardWorkspace` zwei optionale Props: `initialSessionFilters` und `onSessionFiltersChange` (kontrollierbar, Standard wie bisher). Es entsteht kein globaler Speicher und kein `sessionStorage`. Nach einem Browser-Reload ist `location.state` leer, also gelten die gespeicherten Startfilter (Plan: „nach Browser-Reload auf gespeicherten Kontext zurückfallen“).
- **Detailseite** (`pages/DashboardTileDetailPage.tsx`, Teile in `components/detail/`):
  - **Kopf:** Titel (eigener Titel oder Katalogname), Definition, Wert mit Einheit, tatsächlicher Zeitraum, Quelle (Ebene und Fachquelle in Worten, ohne Modul- oder Exportnamen), Aktualität (`asOf` bzw. Stand) und Datenzustand (gleiche Texte wie `TileStatus`).
  - **Inhalt:** Aufteilung bzw. Verlauf über `DashboardChart` mit der Darstellung der Kachel, darunter immer eine zugängliche Detailtabelle (`<table>` mit `<caption>`).
  - **Kombination:** Formel in Worten, beide Operanden mit Wert, Einheit und Zeitbasis sowie das Ergebnis. Ist die Kombination nicht berechenbar, erscheint der Grund statt eines Werts.
  - **Übersichtskachel:** Übersichtsdetails je Art (Team/HR: Bereiche und Köpfe; Roadmap: Meilensteine mit Status; Live-Aktivität: letzte Ereignisse mit Zeitpunkt). Keine Kennzahlendefinition, kein Wert-Feld.
  - **Fuß:** „Zur Fachübersicht“ führt zu `routeForViewId[detailRouteId].path`. Fehlt die Fachseite (ID unbekannt), entfällt der Link, und die Seite nennt den Grund. Es gibt keinen toten Link. Dazu kommt „Zurück zum Dashboard“.
  - **Unbekannte oder gelöschte `tileId`** (oder Kachel nicht in der gespeicherten Konfiguration): Hinweis „Diese Kachel gibt es in deinem Dashboard nicht mehr“ mit „Zurück zum Dashboard“. Kein 404, keine leere Seite.
  - **Ladezustände:** Konfiguration lädt → Platzhalter mit gleicher Kopfhöhe. Keine Sitzung → wie die Ansicht. Ladefehler des Chunks → Fehlerkarte mit „Erneut laden“, die Konfiguration bleibt erhalten.
- **Gleicher Datenstand:** Detailseite und Kachel nutzen `useDashboardData` mit derselben Kachelkonfiguration und denselben effektiven Filtern. Ein Test prüft, dass Wert, Formel und Operanden einer Kombination in Kachel und Details übereinstimmen.

## Ziel-Dateien

| Datei                                                                                                   | Änderung                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/dashboard/model/dashboardRollout.ts`                                                      | Neu: Rollout-Schalter (einzige Lesestelle)                                                                                                                                                                                          |
| `src/features/dashboard/pages/ExecutiveDashboardEntry.tsx`                                              | Neu: Auswahl alt/neu nach Schalter, beide lazy                                                                                                                                                                                      |
| `src/features/dashboard/pages/PersonalExecutiveDashboard.tsx`                                           | Neu: Seite mit Speicherung, Daten, Arbeitsbereich und Navigation                                                                                                                                                                    |
| `src/features/dashboard/pages/DashboardTileDetailPage.tsx`                                              | Neu: Detailseite (Kopf, Inhalt, Fuß, Zustände)                                                                                                                                                                                      |
| `src/features/dashboard/components/detail/*.tsx`                                                        | Neu: `DetailHeader`, `DetailTable`, `CombinationDetails`, `OverviewDetails`, `DetailMissingTile`                                                                                                                                    |
| `src/features/dashboard/hooks/useDashboardNavigation.ts`                                                | Neu: Navigation zu Details und zurück, `location.state` lesen und schreiben, Fokus-Rückgabe                                                                                                                                         |
| `src/features/dashboard/components/DashboardWorkspace.tsx`                                              | Nur: optionale Props `initialSessionFilters`, `onSessionFiltersChange`, `returnFocusTileId`; Details-Sperre im Editor gemäß E3                                                                                                      |
| `src/features/dashboard/components/DashboardTile.tsx`                                                   | Nur: Details-Knopf deaktivierbar mit Hinweis (E3), Ref für Fokus-Rückgabe                                                                                                                                                           |
| `src/app/routePages.tsx`                                                                                | Nur: `s-exec` → `ExecutiveDashboardEntry`                                                                                                                                                                                           |
| `src/app/App.tsx`                                                                                       | Nur: Detailroute bei aktivem Schalter vor `*`                                                                                                                                                                                       |
| `src/app/routes.tsx`                                                                                    | Nur: `routeForPathname` für das Präfix `/dashboard/tiles/` bei aktivem Schalter                                                                                                                                                     |
| `src/components/layout/Sidebar.tsx`                                                                     | Nur, falls der aktive Eintrag sonst nicht „Executive Dashboard“ ist                                                                                                                                                                 |
| `.env.example`                                                                                          | `VITE_EXECUTIVE_DASHBOARD_V2=` mit Kommentar (Standard aus)                                                                                                                                                                         |
| Tests (`src/features/dashboard/__tests__/`)                                                             | `dashboardRollout.vitest.ts`, `ExecutiveDashboardEntry.ui.vitest.tsx`, `DashboardTileDetailPage.ui.vitest.tsx`, `useDashboardNavigation.vitest.ts`; Ergänzungen in `DashboardWorkspace`-Tests; Routing-Tests für `routeForPathname` |
| `e2e/personal-dashboard.spec.ts`                                                                        | Neu: Ablauf Ansicht → Details → Fachübersicht → zurück, Reload, unbekannte Kachel (mit Schalter an)                                                                                                                                 |
| `scripts/captureAuftrag077Screenshots.mjs` (+ `scripts/lib/`), `docs/screenshots/auftrag-077/README.md` | Screenshot- und Ablaufnachweis                                                                                                                                                                                                      |
| `docs/BUILD_LOG.md`, dieser Auftrag                                                                     | Berichte, Checkboxen                                                                                                                                                                                                                |

## Lehren aus PR #57, #59 und #60 (gelten als Abnahmekriterien)

1. **Gates messen, was sie behaupten:** Es gibt echte Navigation (Klick und Tastatur, Zurück-Taste des Browsers, Reload, direkter Aufruf der Detail-URL) statt nur geprüfter Komponenten. Dazu kommen Höchstbelegung mit 24 Kacheln, jede Kachelart einmal in den Details sowie Höhen ohne Layoutsprung beim Laden.
2. **Fokus nach jedem Seitenwechsel:** Auf der Detailseite liegt der Fokus auf der Überschrift. Bei der Rückkehr liegt er auf dem „Details“-Knopf der Ausgangskachel. Ist die Kachel weg, liegt er auf der Dashboard-Überschrift.
3. **Abgeleiteter Zustand wirkt nicht weiter:** Ein Filter aus `location.state` überlebt keinen Reload und keinen Benutzerwechsel. Eine Detailseite zeigt nie Daten einer Kachel, die nicht (mehr) in der gespeicherten Konfiguration steht.
4. **Kein versehentliches Verlassen des Editors:** Gilt für „Details“, Seitenleiste, Browser-Zurück und Fachübersichtslink, alle über den vorhandenen Leave-Guard.
5. **Ansagen:** Seitenwechsel, Rückkehr mit wiederhergestellten Filtern und unbekannte Kachel laufen über eine dauerhafte Live-Region. Texte enthalten keine Modul-, Export- oder Resolvernamen, und lange Namen brechen um (0 px Überlauf auf 375 px).
6. **Chunkfehler:** Ein fehlgeschlagener Lazy-Import der Detailseite zeigt „Erneut laden“ und verliert keinen Kontext. Getestet wird das mit einem abgelehnten Loader.
7. **Schalter aus ist wirklich aus:** Routen, Titel, Seitenleiste und Startbundle sind wie vorher. Der Nachweis kommt aus einem Build mit und einem Build ohne Schalter.
8. **Keine Layoutsprünge** und **0 px Seitenüberlauf** auf 1440/768/375 px. axe `serious`/`critical` = 0 in Ansicht, Detailseite (KPI, Kombination, nicht berechenbar, Übersicht) und Seite für eine unbekannte Kachel.

## Aufgaben (Tests zuerst)

- [x] Marcs Entscheidungen E1–E3 in diesem Auftrag festhalten (Datum, Wortlaut).
- [ ] Branch nach dem Merge von PR #60 auf `main` neu aufsetzen und die Baseline-Commit-ID hier eintragen.
- [ ] Tests zuerst für Schalter und Einstieg: Schalter aus → alte Seite, kein Import der neuen Seite, Detail-URL ergibt 404. Schalter an → neue Seite, Detailroute aktiv, `routeForPathname` liefert „Kachel-Details“.
- [ ] Tests zuerst für die Detailseite, jeweils mit Daten aus `useDashboardData`:
  - KPI: Titel, Definition, Wert, Zeitraum, Quelle, Aktualität, Tabelle
  - Kombination: Formel, beide Operanden, gleicher Wert wie in der Kachel
  - Nicht berechenbar: Grund, kein Wert
  - Übersicht: je Art eigene Details, keine Definition
  - Fachseitenlink vorhanden und richtig; fehlende Fachseite → Grund statt Link
  - Unbekannte und gelöschte Kachel
  - Ladezustand ohne Höhensprung
  - Chunkfehler mit „Erneut laden“
- [ ] Tests zuerst für die Navigation:
  - Filter der Sitzung gehen mit zur Detailseite und zurück.
  - Nach einem Reload gelten die gespeicherten Startfilter.
  - Fokus-Rückgabe auf den „Details“-Knopf.
  - Browser-Zurück verhält sich wie „Zurück zum Dashboard“.
  - Im Bearbeitungsmodus führt „Details“ gemäß E3 nicht aus dem Editor.
  - Benutzerwechsel verwirft den übergebenen Zustand.
- [ ] Umsetzung gemäß Entwurf in dieser Reihenfolge: Schalter, Metadaten und Route, persönliche Ansicht, Detailseite, Navigation, Fokus und Ansagen.
- [ ] `e2e/personal-dashboard.spec.ts` mit aktivem Schalter: Ansicht → Details (jede Kachelart) → Fachübersicht → Browser-Zurück → Dashboard mit gleichen Filtern; Reload auf der Detailseite; direkte URL einer unbekannten Kachel.
- [ ] Screenshot-Skript `scripts/captureAuftrag077Screenshots.mjs` nach Vorbild von `captureAuftrag076Screenshots.mjs`:
  - Vorher (Baseline) und Nachher je Breite 1440/768/375 mit unterschiedlichen Hashes für Ansicht und Detailseiten (KPI, Kombination, nicht berechenbar, Übersicht, unbekannte Kachel)
  - Schalter-aus-Lauf mit identischem `/dashboard`
  - 0 px Seitenüberlauf, axe `serious`/`critical` = 0
  - Tastaturablauf (Details öffnen, Fachübersicht, zurück, Fokusziel prüfen)
  - Höchstbelegung mit 24 Kacheln
  - Committet wird nur die textuelle Matrix `docs/screenshots/auftrag-077/README.md`.
- [ ] Pflicht-Verifikation (`CLAUDE.md` §7) mit Exit-Codes: `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm test`, `npm run verify`, `npm run build` (mit und ohne Schalter), `npm run verify:quality-budget`, `npx size-limit`. Dazu leerer Schutzbereichs-Diff und `wc -l` über alle geänderten Dateien.
- [ ] Optional vorab lokal `/codex-review:code`; das Ergebnis gehört als Prüfnachweis ins BUILD_LOG.
- [ ] BUILD_LOG-Eintrag (Ziel, Dateien, Prüfungen, Schutzbereiche, Screenshot-Matrix, Freigabestatus), Push und PR gegen `main`.

## Abnahme

- Jede KPI-, Kombinations- und Übersichtskachel führt zu den richtigen Details, und die Fachseitenziele bestehen.
- Bei Kombinationen stimmen Kachel und Details bei gleichem Datenstand überein.
- Sitzungsfilter und Fokus überstehen den Hin- und Rückweg. Ein Reload fällt auf den gespeicherten Kontext zurück, eine unbekannte Kachel führt verständlich zurück.
- Die Detailseite ist eine eigene Lazy-Route; Chunkfehler und direkte Navigation nach einem Reload sind getestet.
- Mit ausgeschaltetem Schalter bleiben Produktion, Routen und Startbundle unverändert, und die alte Ansicht bleibt bis zur Gesamtabnahme erhalten.
- Codex prüft, Merge nur durch Marc.
