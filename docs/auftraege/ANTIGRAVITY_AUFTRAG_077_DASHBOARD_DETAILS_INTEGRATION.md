# Auftrag 077 – Dashboard Teilauftrag 7: Details und Integration unter `/dashboard`

**Stand:** 05.10.2026

**Basis:** `main` `7a60dd8` (Merge von PR #60, Auftrag 076, am 05.10.2026). Baseline für den Schutzbereichs-Diff ist `7a60dd8`. Plan: `docs/superpowers/plans/2026-10-01-executive-dashboard-plan.md`, Teilauftrag 7, §3 „Normalansicht“, §5 „Lazy Loading und Ladeverhalten“. Datenverträge: Aufträge 070 (Katalog), 071 (Datenauflösung), 072 (Speicherung), 073 (Kachelrahmen), 074 (Raster, Editor), 076 (Kombinationen).

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
- **Jede Datei unter 400 physischen Zeilen** (`wc -l`, auch Tests und Skripte). Die Prüfung gehört ins BUILD_LOG. `DashboardTile.tsx` (vorher 369) und `DashboardWorkspace.tsx` (vorher 344) lagen nahe an der Grenze, Erweiterungen kommen daher in neue Dateien.

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

## Entwurf (Stand der Umsetzung)

Der Entwurf ist während des Baus an den Codex-Befunden zum Auftragstext geschärft worden (Abschnitt „Codex-Befunde zum Auftragstext“ unten); hier steht der gebaute Stand.

- **Rollout-Schalter** (`model/dashboardRollout.ts`): `isPersonalDashboardEnabled()` liest `import.meta.env.VITE_EXECUTIVE_DASHBOARD_V2 === 'true'` (E1). Das ist die einzige Lesestelle. Dazu kommen die Pfadhelfer `tileDetailPath` und `tileIdFromPath`. Letzterer akzeptiert genau ein Segment mit optionalem abschließendem Schrägstrich, also dieselbe Form wie die Route.
- **Einstieg** (`pages/executiveDashboardEntry.ts`, eingebunden in `src/app/routePages.tsx`): `executiveDashboardLoader()` wählt nach dem Schalter den Lazy-Loader der bisherigen oder der persönlichen Ansicht. Beide bleiben eigene Chunks. Ist der Schalter aus, wird der neue Chunk nie angefordert. Eine eigene Einstiegskomponente gibt es nicht, damit kein zusätzlicher Ladeschritt entsteht.
- **Detailroute** (`src/app/App.tsx`): Nur bei eingeschaltetem Schalter gibt es `<Route path="/dashboard/tiles/:tileId">` vor `*`, mit derselben `RouteErrorBoundary`-/`Suspense`-Hülle (Fallback als gemeinsame `RouteFallback`).
- **Nachladefehler** (`withChunkFallback`, `pages/DetailChunkError.tsx`): React hält einen abgelehnten Lazy-Import fest, deshalb hilft „Erneut versuchen“ der Fehlergrenze dort nicht. Schlägt das Nachladen der Detailseite fehl, liefert der Loader eine Ersatzseite mit „Erneut laden“ (echter Seiten-Reload) und „Zurück zum Dashboard“. Die gespeicherte Ansicht bleibt erhalten.
- **Seitenmetadaten** (`src/app/routes.tsx`): `routeForPathname` liefert bei eingeschaltetem Schalter und genau der Routenform `{ id: 's-exec', title: 'Kachel-Details', categoryLabel: 'Übersicht' }`. Über die ID `s-exec` bleibt „Executive Dashboard“ in der Seitenleiste aktiv, ohne Änderung an `Sidebar.tsx`. Tiefere Pfade und Pfade bei ausgeschaltetem Schalter bleiben 404.
- **Mitreisender Kontext** (`hooks/useDashboardNavigation.ts`): Sitzungsfilter und Fokusziel reisen im Verlaufseintrag (`location.state.dashboardNav`) mit, nie in einem globalen Speicher oder in `sessionStorage`.
  - Vor dem Öffnen der Details ersetzt `openDetails` den Eintrag der Ansicht mit Filtern und Kachel-ID. Erst danach wird die Detailseite angelegt. So stellt auch die Zurück-Taste des Browsers Filter und Fokus wieder her.
  - Der Browser behält `history.state` über einen Reload. Deshalb trägt der Zustand ein **Ladezeichen je Seitenaufruf** und die Identität (Organisation|Benutzer). Nach einem Reload oder Benutzerwechsel passt beides nicht mehr, und es gelten die gespeicherten Startfilter.
- **Persönliche Ansicht** (`pages/PersonalExecutiveDashboard.tsx`): Die Seite verbindet `useDashboardPreferences`, `useDashboardData` und `DashboardWorkspace`. Der Arbeitsbereich bekommt dafür neue optionale Props:
  - `initialSession` (Sitzungsfilter bei der Rückkehr)
  - `returnFocusTileId` und `onReturnFocus(found)` (Fokus auf „Details“ der Ausgangskachel und Ansage; fehlt die Kachel, fokussiert die Seite ihre Überschrift und sagt das an)
  - `navigate` (Linkschutz)
  - `useBackGuard` (Schutz der Zurück-Taste)
- **Editor-Schutz:**
  - „Details“ ist im Bearbeitungsmodus `aria-disabled`, mit dem Hinweis „Erst speichern, dann Details öffnen.“ (E3). Der Knopf bleibt fokussierbar, damit der Hinweis erreichbar ist.
  - `useInAppLinkGuard` fängt bei offenen Änderungen Klicks auf interne Links in der Erfassungsphase ab, bevor React Router sie ausführt. Das gilt für Seitenleiste, Fachübersicht und Kopfzeile. Danach fragt der Editor über `requestLeave` nach.
  - `useBrowserBackGuard` legt bei offenen Änderungen einen Verlaufseintrag mit demselben Pfad obenauf. Die Zurück-Taste landet dann auf derselben Seite, der Editor bleibt eingebunden, der Eintrag wird wiederhergestellt, und es kommt die Rückfrage. „Verwerfen und weiter“ bzw. „Speichern und weiter“ gehen zur tatsächlich vorherigen Seite. Der Arbeitsbereich markiert den aktiven Schutz mit `data-back-guard`.
  - Der `BrowserRouter` bleibt unverändert, eine Umstellung auf einen Data Router mit `useBlocker` ist nicht nötig.
- **Ladeplatz der Filterleiste** (`DashboardWorkspace.tsx`): Die Filterleiste steht schon während des Ladens im gesperrten Platzhalterbereich. Sonst schob sie nach dem Laden das Raster nach unten (gemessene Layoutverschiebung vorher 0,187 auf 375 px, nachher 0).
- **Detailseite** (`pages/DashboardTileDetailPage.tsx`, Teile in `components/detail/`):
  - **Kopf:** Kategorie, Titel (Fokusziel), Definition (nur Kennzahlen) und Zustandsabzeichen.
  - **Kennzahlen:** Wert, Zeitraum (mit Filterzeitraum), Quelle mit Geltungsbereich in Worten, Aktualität und Datenzustand.
  - **Inhalt:** Aufteilung bzw. Verlauf über `DashboardChart` und darunter die Tabelle (`TileTable` mit `<caption>`).
  - **Kombination** (`CombinationDetails`): Formel, beide Operanden mit Zeitbasis und das Ergebnis, alles aus `data.combination`. Nicht berechenbar: Grund statt Wert.
  - **Übersicht:** `TileOverview` ohne Definition und Wert.
  - **Fuß:** „Zurück zum Dashboard“ und „Zur Fachübersicht: …“ aus `detailRouteId`. Ohne Fachseite steht dort der Grund statt eines Links.
  - **Unbekannte oder gelöschte Kachel** (`DetailNotices`): verständlicher Hinweis mit Rückweg. Die gesuchte ID reist als Fokusziel mit, die Ansicht fokussiert dann ihre Überschrift.
  - **Ladezustände:** laden, keine Anmeldung und Ladefehler (mit „Erneut laden“), jeweils mit Mindesthöhe.
- **Gleicher Datenstand:** Detailseite und Kachel nutzen `useDashboardData` mit derselben Kachelkonfiguration und denselben effektiven Filtern. Ein Test vergleicht den Wert einer Kombination in Kachel und Details.
- **CI** (`.github/workflows/ci.yml`, `scripts/runV23Acceptance.mjs`): Im E2E-Job gibt es zusätzlich einen Build mit Schalter, `e2e/personal-dashboard.spec.ts` mit `E2E_DASHBOARD_V2=true` und danach wieder den regulären Build für Lighthouse. Der Orchestrator führt dieselbe Gruppe `E2E_DASHBOARD_V2` aus. Die Vertragstests `e2eSpecsListed` und `runV23Acceptance` prüfen beides.

## Ziel-Dateien (gebaut)

| Datei                                                                                                                                                        | Änderung                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/dashboard/model/dashboardRollout.ts`                                                                                                           | Neu: Schalter, Pfadhelfer                                                                                                                                                                                             |
| `src/features/dashboard/pages/executiveDashboardEntry.ts`, `pages/DetailChunkError.tsx`                                                                      | Neu: Loader-Auswahl, Ersatzseite bei Nachladefehler                                                                                                                                                                   |
| `src/features/dashboard/pages/PersonalExecutiveDashboard.tsx`, `pages/DashboardTileDetailPage.tsx`                                                           | Neu: Ansicht und Detailseite                                                                                                                                                                                          |
| `src/features/dashboard/components/detail/` (`TileDetailContent`, `CombinationDetails`, `DetailNotices`, `detailStyles`)                                     | Neu: Inhalt der Detailseite                                                                                                                                                                                           |
| `src/features/dashboard/hooks/useDashboardNavigation.ts`, `useInAppLinkGuard.ts`, `useBrowserBackGuard.ts`                                                   | Neu: Kontext, Linkschutz, Zurück-Schutz                                                                                                                                                                               |
| `src/features/dashboard/components/DashboardWorkspace.tsx`                                                                                                   | Nur: neue optionale Props (s. o.), Details-Sperre (E3), Filterleiste im Ladeplatz, Vorschau-Hinweistext                                                                                                               |
| `src/features/dashboard/components/DashboardGrid.tsx`, `LazyDashboardTile.tsx`, `DashboardTile.tsx`                                                          | Nur: Fokusziel `details`, `detailsBlocked` durchreichen, Knopf mit Hinweis                                                                                                                                            |
| `src/app/routePages.tsx`, `src/app/App.tsx`, `src/app/routes.tsx`                                                                                            | Nur: Loader-Auswahl, Detailroute bei Schalter, Seitenmetadaten                                                                                                                                                        |
| `src/vite-env.d.ts`, `.env.example`                                                                                                                          | Typ und Vorlage des Schalters (Standard leer = aus)                                                                                                                                                                   |
| Tests (`src/features/dashboard/__tests__/`)                                                                                                                  | Neu: `dashboardRollout`, `useDashboardNavigation`, `useInAppLinkGuard`, `DashboardTileDetailPage`, `PersonalExecutiveDashboard`, Helfer `detailRouterHarness`; angepasst: zwei Workspace-Tests (Vorschau-Hinweistext) |
| `e2e/personal-dashboard.spec.ts`                                                                                                                             | Neu: echter Ablauf mit Schalter                                                                                                                                                                                       |
| `.github/workflows/ci.yml`, `scripts/runV23Acceptance.mjs`, `scripts/__tests__/runV23Acceptance.vitest.ts`                                                   | E2E-Lauf mit Schalter in CI und Orchestrator (nach Codex-Befund ergänzt)                                                                                                                                              |
| `scripts/captureAuftrag077Screenshots.mjs`, `scripts/lib/detailShotHelpers.mjs`, `scripts/lib/detailShotConfig.ts`, `docs/screenshots/auftrag-077/README.md` | Screenshot- und Ablaufnachweis                                                                                                                                                                                        |
| `docs/BUILD_LOG.md`, dieser Auftrag                                                                                                                          | Berichte, Checkboxen                                                                                                                                                                                                  |

Nach dem zweiten und dritten Codex-Review zum Code (PR #61) zusätzlich, je nur so weit wie für den Befund nötig:

| Datei                                                                    | Änderung                                                                             |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `src/components/layout/Layout.tsx`                                       | Nur: Attribut `data-leave-guard` am Abmelde-Knopf (Rückfrage bei offenen Änderungen) |
| `src/features/dashboard/hooks/useLeaveGuard.ts`, `useDashboardEditor.ts` | Nur: Zustand `leaving` (Verlassen bestätigt) durchreichen                            |
| `src/features/dashboard/__tests__/tileDetailFacts.vitest.ts`             | Neu: Angaben „Filter“ und „Aktualität“                                               |

`src/components/layout/Sidebar.tsx` und `ExecutiveDashboardPage.tsx` bleiben unverändert.

## Codex-Befunde zum Auftragstext (PR #61, 05.10.2026)

| Befund                                                      | Bewertung  | Umsetzung                                                                                                      |
| ----------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| P1: `location.state` ist nach Reload nicht leer             | berechtigt | Ladezeichen je Seitenaufruf und Identität im Zustand; Tests `useDashboardNavigation` (Reload, Benutzerwechsel) |
| P2: Präfixvergleich klassifiziert tiefere Pfade als Details | berechtigt | `tileIdFromPath` nur ein Segment; Test `/dashboard/tiles/a/b` → 404                                            |
| P1: Rückkehrzustand fehlt im Eintrag der Ansicht            | berechtigt | `openDetails` ersetzt den Eintrag vor dem Öffnen; Unit- und E2E-Test über Browser-Zurück                       |
| P1: Lazy-Retry nach Chunkfehler wirkungslos                 | berechtigt | `withChunkFallback` mit Ersatzseite und echtem Reload; Tests                                                   |
| P1: E2E-Spec läuft nicht in der CI                          | berechtigt | Build mit Schalter und Lauf in `ci.yml` und Orchestrator; Vertragstests                                        |
| P1: Leave-Guard nicht mit Router verdrahtet                 | berechtigt | `useInAppLinkGuard` (Links) und `useBrowserBackGuard` (Zurück-Taste); Unit- und E2E-Tests                      |

## Lehren aus PR #57, #59 und #60 (gelten als Abnahmekriterien)

1. **Gates messen, was sie behaupten:** Es gibt echte Navigation (Klick und Tastatur, Zurück-Taste des Browsers, Reload, direkter Aufruf der Detail-URL) statt nur geprüfter Komponenten. Dazu kommen Höchstbelegung mit 24 Kacheln, jede Kachelart einmal in den Details sowie Laden ohne Layoutsprung (gemessen als Layoutverschiebung, CLS < 0,1).
2. **Fokus nach jedem Seitenwechsel:** Auf der Detailseite liegt der Fokus auf der Überschrift. Bei der Rückkehr liegt er auf dem „Details“-Knopf der Ausgangskachel. Ist die Kachel weg, liegt er auf der Dashboard-Überschrift.
3. **Abgeleiteter Zustand wirkt nicht weiter:** Ein Filter aus `location.state` überlebt keinen Reload und keinen Benutzerwechsel. Eine Detailseite zeigt nie Daten einer Kachel, die nicht (mehr) in der gespeicherten Konfiguration steht.
4. **Kein versehentliches Verlassen des Editors:** Gilt für „Details“ (gesperrt), Seitenleiste und Fachübersichtslink (`useInAppLinkGuard`) sowie Browser-Zurück (`useBrowserBackGuard`), alle über den vorhandenen Leave-Guard (`requestLeave`).
5. **Ansagen:** Seitenwechsel, Rückkehr mit wiederhergestellten Filtern und unbekannte Kachel laufen über eine dauerhafte Live-Region. Texte enthalten keine Modul-, Export- oder Resolvernamen, und lange Namen brechen um (0 px Überlauf auf 375 px).
6. **Chunkfehler:** Ein fehlgeschlagener Lazy-Import der Detailseite zeigt „Erneut laden“ und verliert keinen Kontext. Getestet wird das mit einem abgelehnten Loader.
7. **Schalter aus ist wirklich aus:** Routen, Titel, Seitenleiste und Startbundle sind wie vorher. Der Nachweis kommt aus einem Build mit und einem Build ohne Schalter.
8. **Keine Layoutsprünge** und **0 px Seitenüberlauf** auf 1440/768/375 px. axe `serious`/`critical` = 0 in Ansicht, Detailseite (KPI, Kombination, nicht berechenbar, Übersicht) und Seite für eine unbekannte Kachel.

## Aufgaben (Tests zuerst)

- [x] Marcs Entscheidungen E1–E3 in diesem Auftrag festhalten (Datum, Wortlaut).
- [x] Branch nach dem Merge von PR #60 auf `main` neu aufsetzen und die Baseline-Commit-ID hier eintragen.
- [x] Tests zuerst für Schalter und Einstieg: Schalter aus → alte Seite, kein Import der neuen Seite, Detail-URL ergibt 404. Schalter an → neue Seite, Detailroute aktiv, `routeForPathname` liefert „Kachel-Details“.
- [x] Tests zuerst für die Detailseite, jeweils mit Daten aus `useDashboardData`:
  - KPI: Titel, Definition, Wert, Zeitraum, Quelle, Aktualität, Tabelle
  - Kombination: Formel, beide Operanden, gleicher Wert wie in der Kachel
  - Nicht berechenbar: Grund, kein Wert
  - Übersicht: je Art eigene Details, keine Definition
  - Fachseitenlink vorhanden und richtig; fehlende Fachseite → Grund statt Link
  - Unbekannte und gelöschte Kachel
  - Ladezustand ohne Höhensprung
  - Chunkfehler mit „Erneut laden“
- [x] Tests zuerst für die Navigation:
  - Filter der Sitzung gehen mit zur Detailseite und zurück.
  - Nach einem Reload gelten die gespeicherten Startfilter.
  - Fokus-Rückgabe auf den „Details“-Knopf.
  - Browser-Zurück verhält sich wie „Zurück zum Dashboard“.
  - Im Bearbeitungsmodus führt „Details“ gemäß E3 nicht aus dem Editor.
  - Benutzerwechsel verwirft den übergebenen Zustand.
- [x] Umsetzung gemäß Entwurf in dieser Reihenfolge: Schalter, Metadaten und Route, persönliche Ansicht, Detailseite, Navigation, Fokus und Ansagen.
- [x] `e2e/personal-dashboard.spec.ts` mit aktivem Schalter: Ansicht → Details (jede Kachelart) → Fachübersicht → Browser-Zurück → Dashboard mit gleichen Filtern; Reload auf der Detailseite; direkte URL einer unbekannten Kachel.
- [x] Screenshot-Skript `scripts/captureAuftrag077Screenshots.mjs` nach Vorbild von `captureAuftrag076Screenshots.mjs`:
  - Vorher (Baseline) und Nachher je Breite 1440/768/375 mit unterschiedlichen Hashes für Ansicht und Detailseiten (KPI, Diagramm, Kombination, CRM, Übersicht, unbekannte Kachel). „Nicht berechenbar“ kommt mit echten Daten nicht vor und ist im UI-Test abgedeckt.
  - Schalter-aus-Lauf mit identischem `/dashboard`
  - 0 px Seitenüberlauf, axe `serious`/`critical` = 0
  - Tastaturablauf (Details öffnen, Fachübersicht, zurück, Fokusziel prüfen)
  - Höchstbelegung mit 24 Kacheln
  - Committet wird nur die textuelle Matrix `docs/screenshots/auftrag-077/README.md`.
- [x] Pflicht-Verifikation (`CLAUDE.md` §7) mit Exit-Codes: `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm test`, `npm run verify`, `npm run build` (mit und ohne Schalter), `npm run verify:quality-budget`, `npx size-limit`. Dazu leerer Schutzbereichs-Diff und `wc -l` über alle geänderten Dateien.
- [ ] Optional vorab lokal `/codex-review:code`; das Ergebnis gehört als Prüfnachweis ins BUILD_LOG. (Nicht gelaufen; stattdessen Codex-Review auf PR #61 zum Auftragstext, Befunde oben eingearbeitet.)
- [x] BUILD_LOG-Eintrag (Ziel, Dateien, Prüfungen, Schutzbereiche, Screenshot-Matrix, Freigabestatus), Push und PR gegen `main`.

## Abnahme

- Jede KPI-, Kombinations- und Übersichtskachel führt zu den richtigen Details, und die Fachseitenziele bestehen.
- Bei Kombinationen stimmen Kachel und Details bei gleichem Datenstand überein.
- Sitzungsfilter und Fokus überstehen den Hin- und Rückweg. Ein Reload fällt auf den gespeicherten Kontext zurück, eine unbekannte Kachel führt verständlich zurück.
- Die Detailseite ist eine eigene Lazy-Route; Chunkfehler und direkte Navigation nach einem Reload sind getestet.
- Mit ausgeschaltetem Schalter bleiben Produktion, Routen und Startbundle unverändert, und die alte Ansicht bleibt bis zur Gesamtabnahme erhalten.
- Codex prüft, Merge nur durch Marc.
