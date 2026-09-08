# Auftrag 029: Seiten- und Navigationsmodulierung Implementation Plan

> **Für ausführende Agenten:** Diesen Auftrag seriell und taskweise abarbeiten. Nach jedem Task müssen die dort genannten Nachweise erbracht sein. Änderungen außerhalb der Ziel-Dateien sind nicht zulässig, außer sie wurden vorab als Abweichung im Build-Log begründet und freigegeben.

**Phase:** UI-Architektur & Modularisierung · **Gate:** G13

**Status:** DRAFT / SPEZIFIKATION

**Goal:** Alle 41 Anwendungsrouten werden vollständig von der bisherigen `LegacyRouteView`/`activeSubView`-Kaskade befreit. Jede Route erhält eine eigenständige Page-Komponente, die den konkreten Render-Zweig direkt übernimmt. Die alten Modul-Views werden migriert (keine doppelten JSX-Zweige, sondern reine Delegations-Adapter oder Entfernung). Die Zuordnung erfolgt über eine typisierte Eintragsliste in `routePages.tsx` (`AppRouteId → Page-Komponente`) mit Compile- und Runtime-Guards gegen `routes.tsx`. `App.tsx` rendert diese Registry generisch über `RouteErrorBoundary` mit `resetKey={route.id}`. Da es sich um ein rein strukturelles Refactoring handelt, müssen alle 18 Screenshot-Paare byte-identisch sein (`IDENTICAL`), ergänzt um einen automatisierten Deep-Link-Check für alle 41 Routen.

**Architecture:**
- **Echte Entflechtung & Einmaligkeit des Codes**: Jede Page-Komponente in `src/features/<module>/pages/` übernimmt den bisherigen JSX-Render-Code. Die bisherigen Multi-Views (`CRMView`, `UnternehmenView`, `ProduktView` etc.) behalten keinen doppelten JSX-Code, sondern delegieren als schlanke Kompatibilitätsadapter direkt an die neuen Pages.
- **Typisierte Eintragsliste & Registry (`src/app/routePages.tsx`)**:
  - `type AppRouteId = typeof APP_ROUTES[number]['id'];`
  - Eintragsliste: `ROUTE_PAGE_ENTRIES: readonly { id: AppRouteId; component: React.ComponentType }[]`
  - Dev-Guard: Prüft zur Laufzeit Duplikatfreiheit und Vollständigkeit der Eintragsliste gegen `APP_ROUTES` (`APP_ROUTES.length === ROUTE_PAGE_ENTRIES.length`).
  - Lookup-Map: `ROUTE_PAGES: Record<AppRouteId, React.ComponentType>` wird aus der validierten Eintragsliste erzeugt.
- **Schlankes, deklaratives `App.tsx`**: Iteriert über `APP_ROUTES`, holt die Page aus `ROUTE_PAGES[route.id]` und kapselt sie in `<RouteErrorBoundary resetKey={route.id}>`. `LegacyRouteView` wird nicht mehr im Routing verwendet.
- **Schutzbereich `src/features/resources/`**: Bleibt zu 100% unangetastet (Zero-Diff). `InternalResourcesView` wird ausschließlich direkt in `routePages.tsx` referenziert.
- **`RouteErrorBoundary.tsx` mit `resetKey={route.id}`**: Setzt Fehlerzustand bei Navigation automatisch zurück. Dokumentiert: fängt Render- und Lifecycle-Fehler ab (keine async/Event-Handler-Fehler).
- **Scope-Bereinigung**: `PageEmptyState` wird aus Auftrag 029 herausgenommen und erst in Gate G14/G16 mit echten dynamischen Filter- und Tabellenleerzuständen eingeführt.
- **Präzise Screenshot- & Deep-Link-Regel**:
  - Für diesen rein strukturellen Auftrag müssen alle **18 Vorher-/Nachher-Screenshot-Paare byte-identisch (`IDENTICAL`, gleicher SHA-256 Hash)** sein. Jede visuelle Abweichung gilt als Gate-Fehler.
  - Der CDP-Harness steuert zusätzlich **alle 41 Routen per Deep Link direkt an**, assertiert fehlerfreies Rendern (kein Absturz, kein 404, exakter Header-/Titel-Match) und prüft 0px horizontalen Overflow.

**Tech Stack:** React 18, TypeScript, Vite, React Router DOM v6, bestehende CSS-Tokens, CDP-Screenshot- & Deep-Link-Harness.

**Referenzen:** `CLAUDE.md`; `AGENTS.md`; `docs/BUILD_PLAN_V2.0.0.md` Phase 2 (Gate G13); `ARCHITECTURE_DECISIONS.md`; Gate G11 (`210fd9a`), Gate G12 (`4950d16`).

---

## Globale Grenzen & Schutzbereiche

- **Baseline-Commit**: `4950d16` (Freigabe Gate G12) auf Branch `feat/auftrag-029-page-modules`.
- **Schutzbereichs-Diff (Zero-Diff)**: Exakt 0 Zeilen Unterschied gegen `4950d16` in:
  - `src/simulation/**`
  - `src/types/**`
  - `src/context/**`
  - `src/services/data/**`
  - `src/features/resources/**` (weder Dateien noch Verzeichnisstruktur ändern!)
- **Keine Scheinkapselung & keine Code-Duplikation**: Die bisherigen Modul-Views werden migriert, nicht verdoppelt.
- **Keine Fachlogik- oder UI-Änderungen**: Das Markup, die Texte und Daten der Fachbereiche bleiben unverändert.
- **Keine 41-Zeilen-Import-Flut in `App.tsx`**: Routing erfolgt generisch über `routePages.tsx`.
- **Barrierefreiheit (A11y)**: Focus-Visible, `aria-expanded`, `aria-controls` und Drawer-Isolierung bleiben lückenlos erhalten.

---

## Ziel-Dateien

| Datei / Bereich | Verantwortung |
|---|---|
| `src/components/ui/RouteErrorBoundary.tsx` | Error Boundary mit `resetKey={route.id}` zur Kapselung von Routen auf App-Ebene |
| `src/app/routePages.tsx` | Eintragsliste (`ROUTE_PAGE_ENTRIES`) & typisierte Registry (`ROUTE_PAGES`) aller 41 Pages mit Dev-Guard |
| `src/features/crm/pages/` | Dedizierte Pages mit eigenständigem Render-Code: `LeadsPage`, `CompaniesPage`, `DealsPage`, `ActivitiesPage`, `LiveSimulationPage` |
| `src/features/unternehmen/pages/` | Dedizierte Pages: `IdeaPage`, `ValuePropositionPage`, `HistoryPage`, `LocationPage` |
| `src/features/produkt/pages/` | Dedizierte Pages: `FeaturesPage`, `PricingPage`, `PerformancePage`, `RoadmapPage` |
| `src/features/markt/pages/` | Dedizierte Pages: `MarketOverviewPage`, `CompetitionPage`, `SwotPage` |
| `src/features/kunden/pages/` | Dedizierte Pages: `IcpPage`, `PersonaPage`, `SegmentsPage`, `TopCustomersPage` |
| `src/features/vertrieb/pages/` | Dedizierte Pages: `FunnelPage`, `SlaPage`, `ChannelsPage`, `PlanningPage` |
| `src/features/finanzen/pages/` | Dedizierte Pages: `PnLPage`, `BalanceSheetPage`, `UnitEconomicsPage` |
| `src/features/organisation/pages/` | Dedizierte Pages: `HeadcountPage`, `HrPage`, `TeamStructurePage` |
| `src/features/strategie/pages/` | Dedizierte Pages: `OkrsPage`, `BalancedScorecardPage`, `GrowthDriversPage` |
| `src/features/recht/pages/` | Dedizierte Pages: `ArticlesPage`, `ShareholdersPage`, `CommercialRegisterPage` |
| `src/features/*/*View.tsx` | Bereinigt: Kaskaden durch einfache Delegation an die neuen Pages ersetzt (kein doppelter JSX-Code) |
| `src/app/App.tsx` | Schlanke, deklarative Routen-Generierung über `APP_ROUTES` und `routePages.tsx` mit `RouteErrorBoundary` |
| `src/app/LegacyRouteView.tsx` | Bereinigung: Entfernung aller Fach-View-Imports, Reduktion auf defensiven Not-Found-Fallback |
| `scripts/captureAuftrag029GateScreenshots.mjs` | Standalone CDP-Harness: 41-Routen Deep-Link Verification + 6 Gate-Flows Screenshots & Overflow |
| `docs/screenshots/auftrag-029/README.md` | Dokumentierte Matrix: 18/18 Paare `IDENTICAL`, 41/41 Deep-Links grün, 0px Overflow |
| `docs/BUILD_LOG.md` | Protokolleintrag für Gate G13 |

---

## Task 1: Baseline-Sicherung, Branch-Setup und Vorher-Lauf

**Files:**
- Test: `git status`, `npx tsc --noEmit`, `npm run verify`, `npm run build`

- [ ] **Schritt 1: Baseline auf 4950d16 absichern**
  Prüfe, dass `git log -1` auf Commit `4950d16` zeigt. Erstelle den Branch `feat/auftrag-029-page-modules`.
- [ ] **Schritt 2: Baseline-Verifikation ausführen**
  `npx tsc --noEmit`, `npm run verify`, `npm run build` müssen alle Exit-Code 0 liefern.
- [ ] **Schritt 3: Vorher-Screenshots erfassen**
  Harness für Auftrag 029 anlegen und die 18 Vorher-Screenshots gegen Baseline `4950d16` (via temporärem Worktree) aufnehmen.

---

## Task 2: Feedback-Primitive (`RouteErrorBoundary`)

**Files:**
- Create: `src/components/ui/RouteErrorBoundary.tsx`
- Test: `npx tsc --noEmit`, `npm run build`

- [ ] **Schritt 1: RouteErrorBoundary.tsx erstellen**
  - Implementiert als React Error Boundary mit Prop `resetKey?: string`.
  - In `componentDidUpdate(prevProps)`: Wenn `prevProps.resetKey !== this.props.resetKey`, wird `this.setState({ hasError: false, error: null })` ausgeführt.
  - Zeigt im Fehlerfall einen V2-Fehlerhinweis mit Reload-Option an.

---

## Task 3: Echte Page-Komponenten extrahieren & Modul-Views bereinigen

**Files:**
- Create: Konkrete Pages unter `src/features/<module>/pages/`
- Modify: Bisherige Multi-Views unter `src/features/<module>/<Module>View.tsx` (auf reine Delegation umstellen)
- Test: `npx tsc --noEmit`, `npm run build`

- [ ] **Schritt 1: CRM Pages (`src/features/crm/pages/`) & CRMView bereinigen**
  - `LeadsPage.tsx`: Übernimmt die Kontakte-/Leads-Tabelle direkt.
  - `CompaniesPage.tsx`: Bindet `CompaniesView` direkt ein.
  - `DealsPage.tsx`: Bindet `DealsView` direkt ein.
  - `ActivitiesPage.tsx`: Bindet `ActivitiesView` direkt ein.
  - `LiveSimulationPage.tsx`: Bindet `LiveDashboardView` direkt ein.
  - `CRMView.tsx`: Auf schlanke Delegation an die Pages umstellen; kein doppelter JSX-Code.
- [ ] **Schritt 2: Unternehmen & Produkt Pages & Views bereinigen**
  - `src/features/unternehmen/pages/`: `IdeaPage.tsx` (`s-idee`), `ValuePropositionPage.tsx` (`s-value`), `HistoryPage.tsx` (`s-historie`), `LocationPage.tsx` (`s-standort`) mit dem bisherigen JSX-Inhalt aus `UnternehmenView.tsx`.
  - `src/features/produkt/pages/`: `FeaturesPage.tsx` (`s-funktion`), `PricingPage.tsx` (`s-pricing`), `PerformancePage.tsx` (`s-perf`), `RoadmapPage.tsx` (`s-roadmap`) mit dem bisherigen JSX-Inhalt aus `ProduktView.tsx`.
  - `UnternehmenView.tsx` & `ProduktView.tsx`: Bereinigen auf Delegation an die neuen Pages.
- [ ] **Schritt 3: Markt & Kunden Pages & Views bereinigen**
  - `src/features/markt/pages/`: `MarketOverviewPage.tsx` (`s-markt`), `CompetitionPage.tsx` (`s-wettbewerb`), `SwotPage.tsx` (`s-swot`).
  - `src/features/kunden/pages/`: `IcpPage.tsx` (`s-icp`), `PersonaPage.tsx` (`s-persona`), `SegmentsPage.tsx` (`s-segmente`), `TopCustomersPage.tsx` (`s-top10`).
  - `MarktView.tsx` & `KundenView.tsx`: Bereinigen auf Delegation an die neuen Pages.
- [ ] **Schritt 4: Vertrieb & Finanzen Pages & Views bereinigen**
  - `src/features/vertrieb/pages/`: `FunnelPage.tsx` (`s-funnel`), `SlaPage.tsx` (`s-sla`), `ChannelsPage.tsx` (`s-kanaele`), `PlanningPage.tsx` (`s-planung`).
  - `src/features/finanzen/pages/`: `PnLPage.tsx` (`s-guv`), `BalanceSheetPage.tsx` (`s-bilanz`), `UnitEconomicsPage.tsx` (`s-unit`).
  - `VertriebView.tsx` & `FinanzenView.tsx`: Bereinigen auf Delegation an die neuen Pages.
- [ ] **Schritt 5: Organisation, Strategie & Recht Pages & Views bereinigen**
  - `src/features/organisation/pages/`: `HeadcountPage.tsx` (`s-headcount`), `HrPage.tsx` (`s-hr`), `TeamStructurePage.tsx` (`s-team`).
  - `src/features/strategie/pages/`: `OkrsPage.tsx` (`s-okr`), `BalancedScorecardPage.tsx` (`s-bsc`), `GrowthDriversPage.tsx` (`s-treiber`).
  - `src/features/recht/pages/`: `ArticlesPage.tsx` (`s-satzung`), `ShareholdersPage.tsx` (`s-gesellschafter`), `CommercialRegisterPage.tsx` (`s-handelsregister`).
  - `OrganisationView.tsx`, `StrategieView.tsx`, `RechtView.tsx`: Bereinigen auf Delegation an die neuen Pages.
- [ ] **Schritt 6: Schutzbereichs-Einhaltung**
  - `InternalResourcesView` in `src/features/resources/` bleibt **unverändert**. Keine Datei in `src/features/resources/` anfassen.

---

## Task 4: Typisierte Eintragsliste (`routePages.tsx`), App.tsx Refactoring & Legacy-Bereinigung

**Files:**
- Create: `src/app/routePages.tsx`
- Modify: `src/app/App.tsx`, `src/app/LegacyRouteView.tsx`
- Test: `npx tsc --noEmit`, `npm run verify`, `npm run build`

- [ ] **Schritt 1: routePages.tsx implementieren**
  - Definiert `type AppRouteId = typeof APP_ROUTES[number]['id'];`.
  - Definiert Eintragsliste:
    ```tsx
    export const ROUTE_PAGE_ENTRIES: readonly { id: AppRouteId; component: React.ComponentType }[] = [ ... ];
    ```
  - Dev-Guard: Assertiert zur Laufzeit Vollständigkeit und Duplikatfreiheit der Eintragsliste gegen `APP_ROUTES` (`APP_ROUTES.length === ROUTE_PAGE_ENTRIES.length`).
  - Erzeugt Lookup-Map:
    ```tsx
    export const ROUTE_PAGES: Record<AppRouteId, React.ComponentType> = Object.fromEntries(
      ROUTE_PAGE_ENTRIES.map((entry) => [entry.id, entry.component])
    ) as Record<AppRouteId, React.ComponentType>;
    ```
- [ ] **Schritt 2: App.tsx modularisieren**
  - Iteriert generisch über `APP_ROUTES`:
    ```tsx
    {APP_ROUTES.map((route) => {
      const Page = ROUTE_PAGES[route.id];
      return (
        <Route
          key={route.id}
          path={route.path}
          element={
            <RouteErrorBoundary resetKey={route.id}>
              <Page />
            </RouteErrorBoundary>
          }
        />
      );
    })}
    ```
- [ ] **Schritt 3: LegacyRouteView.tsx bereinigen**
  - Entfernt alle Fach-View-Importe; fungiert nur noch als defensiver Fallback für unbekannte View-IDs.

---

## Task 5: 41-Routen Deep-Link-Check, Screenshot-Matrix und Gates

**Files:**
- Create: `scripts/captureAuftrag029GateScreenshots.mjs`, `docs/screenshots/auftrag-029/README.md`
- Modify: `docs/BUILD_LOG.md`

- [ ] **Schritt 1: Nachher-Lauf mit 41-Routen Deep-Link-Prüfung ausführen**
  - Der Harness steuert alle 41 Pfade direkt an:
    - HTTP/Pathname-Validierung
    - Assertion auf gerenderten Header/Title
    - 0px horizontaler Overflow
  - Erfassung der 18 Nachher-Screenshots bei 1440px, 768px, 375px.
- [ ] **Schritt 2: Matrix & Dokumentation der Byte-Identität**
  - Erstelle `docs/screenshots/auftrag-029/README.md`.
  - Bestätigung: Alle 18 Vorher-/Nachher-Paare sind byte-identisch (`IDENTICAL`, gleicher SHA-256 Hash).
- [ ] **Schritt 3: Alle Gates und Schutzbereichs-Diff prüfen**
  ```bash
  npx tsc --noEmit
  npm run verify
  npm run build
  git diff --check 4950d16..HEAD
  git diff 4950d16..HEAD -- src/simulation src/types src/context src/services/data src/features/resources
  ```
- [ ] **Schritt 4: BUILD_LOG.md Eintrag anlegen**

---

## Abnahmekriterien (Gate G13)

- [ ] Alle 41 Routen sind über die typisierte `routePages.tsx`-Eintragsliste direkt an eigenständige Page-Komponenten angebunden.
- [ ] Page-Komponenten codieren keine Seitentitel oder Breadcrumbs hart; Layout, Header und Sidebar leiten diese ausschließlich aus `APP_ROUTES` bzw. `routeForPathname()` ab.
- [ ] Keine `activeSubView`-Kaskaden mehr in den Fach-Views; keine doppelten JSX-Zweige (Alte Views delegieren an neue Pages).
- [ ] `LegacyRouteView.tsx` importiert oder selektiert keine Fach-Views mehr.
- [ ] `App.tsx` enthält keine 41-fache Import-Kaskade, sondern iteriert generisch über `APP_ROUTES` mit `ROUTE_PAGES`.
- [ ] `RouteErrorBoundary` mit `resetKey={route.id}` kapselt jede Route zuverlässig.
- [ ] `src/features/resources/**` und alle anderen Schutzbereiche weisen exakt 0 Zeilen Diff auf.
- [ ] Automatisierter Deep-Link-Check validiert alle 41 Routen fehlerfrei (Header-Match, 0px Overflow).
- [ ] Alle 18 Vorher-/Nachher-Screenshot-Paare sind byte-identisch (`IDENTICAL`) und belegen Zero-Regression.
- [ ] `npx tsc --noEmit` hat 0 Fehler.
- [ ] `npm run verify` besteht alle 25 Suiten.
- [ ] `npm run build` erzeugt fehlerfrei das Produktions-Bundle.
- [ ] `git diff --check` meldet 0 Whitespace-Fehler.
- [ ] `docs/screenshots/auftrag-029/README.md` und `docs/BUILD_LOG.md` sind vollständig dokumentiert.
