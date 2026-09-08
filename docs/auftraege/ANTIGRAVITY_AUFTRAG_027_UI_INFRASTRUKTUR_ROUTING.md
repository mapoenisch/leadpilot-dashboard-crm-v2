# Auftrag 027: UI-Infrastruktur und URL-Routing Implementation Plan

> **Für ausführende Agenten:** Diesen Auftrag seriell und taskweise abarbeiten. Nach jedem Task müssen die dort genannten Nachweise erbracht sein. Änderungen außerhalb der Ziel-Dateien sind nicht zulässig, außer sie wurden vorab als Abweichung im Build-Log begründet und freigegeben.

**Phase:** UI-Umbau · **Gate:** G11

**Status:** DRAFT / SPEZIFIKATION

**Goal:** Das Dashboard erhält eine sichere Tailwind-/shadcn-Grundlage und echtes URL-Routing, ohne Simulations-, Daten- oder bestehende Fachlogik zu verändern.

**Architecture:** `BrowserRouter → SimulationProvider → AppLayout → Outlet → Route-Page`. Die URL ist die alleinige Quelle für die aktuell sichtbare Seite. Eine zentrale Route-Metadatenliste verbindet Pfade, Navigation, Seitentitel und den vorübergehend weiterverwendeten Legacy-View-Adapter; dadurch bleiben sämtliche bestehenden Views erreichbar, während die vier Übersichtseiten in eigenständige Pages aufgeteilt werden.

**Tech Stack:** React 18, TypeScript, Vite, `react-router-dom`, Tailwind CSS 3, PostCSS, Autoprefixer, shadcn/ui (lokal generierte Primitives), `clsx`, `tailwind-merge`, vorhandenes `lucide-react`, Recharts und Framer Motion (nur Installation, noch keine produktive Nutzung), CDP-Screenshot-Harness.

**Referenzen:** Nutzerauftrag vom 04.09.2026; `CLAUDE.md`; `ARCHITECTURE_DECISIONS.md` B18; `src/styles/global.css`; `docs/auftraege/ANTIGRAVITY_AUFTRAG_026_INPUTS_CHECKBOXES.md`.

Die angehängten Entwürfe dienen ausschließlich als visuelle Zielreferenz. Der vorliegende Auftrag ist für Umsetzung, Dateigrenzen und Abnahme verbindlich.

## Globale Grenzen

- Baseline für Vorher-Artefakte und Schutzbereichs-Diff ist der unmittelbar vor Start dokumentierte `HEAD`-Commit.
- Vor Änderungen `git status --short`, `npx tsc --noEmit`, `npm run verify` und `npm run build` ausführen und die Ergebnisse im Abschlussbericht festhalten.
- Das vorhandene CSS-Token-System in `src/styles/global.css` bleibt die visuelle Single Source of Truth. Tailwind referenziert diese Werte; keine bestehenden CSS-Variablen werden gelöscht, umbenannt oder semantisch umgedeutet.
- Tailwinds Preflight bleibt deaktiviert. Bestehende Komponenten verwenden noch Inline-Styles und globale Grundregeln; ein globaler Reset wäre in diesem Auftrag ein nicht nachweisbarer visueller Eingriff.
- `lucide-react` ist bereits vorhanden und darf weder ersetzt noch erneut installiert werden.
- shadcn/ui wird lokal unter `src/components/shadcn/` initialisiert. Nicht den Standardpfad `src/components/ui/` verwenden, weil dort bereits eigene LeadPilot-Komponenten liegen und auf macOS Namenskollisionen mit `Button.tsx`/`button.tsx` entstehen können.
- Zulässige shadcn-Primitives dieses Auftrags: `button`, `dialog`, `dropdown-menu`. Sie werden nur installiert und durch TypeScript abgesichert, aber noch in keiner bestehenden Feature-Ansicht erzwungen eingesetzt.
- Recharts und Framer Motion werden ausschließlich als freigegebene, noch ungenutzte Abhängigkeiten für spätere Aufträge installiert. Keine bestehende Chart-Implementierung austauschen und keine Animation hinzufügen.
- Kein Tailwind- oder shadcn-Umbau bestehender Komponenten außer den ausdrücklich genannten Shell-, Navigations- und neuen Page-Dateien.
- Keine Änderung an `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`, Repositories, Persistenz, RNG, Run-/Versionsmodell, Datenmodellen oder fachlichen Berechnungen.
- `SimulationProvider` muss die gesamte Routenstruktur weiterhin umschließen. Navigation darf eine laufende Simulation weder pausieren, zurücksetzen noch neu starten.
- `OverviewView.tsx` wird in diesem Auftrag nicht gelöscht. Nach der Extraktion ist sie ein rückwärtskompatibler Adapter und muss bis zur Migration aller bisherigen Übersichts-Subpages bestehen bleiben.
- Der Auftrag führt keine Supabase-Realtime-Subscriptions, keine n8n-Änderungen, keine 3D-Assets und keine neuen Unternehmensdaten ein.
- Die bestehenden sprachlichen Texte, Test-IDs und fachlichen Datenimporte bleiben erhalten, soweit sie nicht für ein Routing-Attribut zwingend ergänzt werden müssen.

---

## Ziel-Dateien

| Datei | Verantwortung |
|---|---|
| `package.json` | Freigegebene Laufzeit- und Build-Abhängigkeiten |
| Sperrdatei des verwendeten Paketmanagers | Reproduzierbare Abhängigkeitsauflösung |
| `tailwind.config.js` | Tailwind-Theme als Referenz auf die vorhandenen LeadPilot-Tokens; Preflight deaktiviert |
| `postcss.config.js` | Tailwind- und Autoprefixer-Verarbeitung |
| `components.json` | shadcn-Konfiguration mit konfliktfreiem Komponentenpfad |
| `src/styles/global.css` | Tailwind-Direktiven zusätzlich zu den unveränderten LeadPilot-Tokens |
| `src/lib/utils.ts` | shadcn-Hilfsfunktion `cn()` |
| `src/components/shadcn/button.tsx` | Lokal generierte shadcn-Button-Primitive |
| `src/components/shadcn/dialog.tsx` | Lokal generierte shadcn-Dialog-Primitive |
| `src/components/shadcn/dropdown-menu.tsx` | Lokal generierte shadcn-Dropdown-Primitive |
| `src/app/routes.tsx` | Zentrale, typisierte Pfad-/Titel-/Navigationsmetadaten aller bestehenden Views |
| `src/app/LegacyRouteView.tsx` | Übergangsadapter von Route-Metadaten auf die vorhandenen Feature-Views |
| `src/app/App.tsx` | `BrowserRouter`, geschachtelte Routen und Fehler-/Fallback-Route |
| `src/components/layout/Layout.tsx` | Routen-Layout mit `Outlet`; keine View-State-Props mehr |
| `src/components/layout/Sidebar.tsx` | URL-basierte Navigation via `NavLink`/`useLocation` |
| `src/components/ui/NavItem.tsx` | Link-fähiger, zugänglicher Navigationseintrag ohne verschachtelte Buttons/Links |
| `src/features/overview/pages/ExecutiveDashboardPage.tsx` | Extrahierte Executive-Dashboard-Page |
| `src/features/overview/pages/CompanyProfilePage.tsx` | Extrahierte Unternehmenssteckbrief-Page |
| `src/features/overview/pages/YearHighlightsPage.tsx` | Extrahierte Jahres-Highlights-Page |
| `src/features/overview/pages/DataBasisPage.tsx` | Extrahierte Datenbasis-&-Konsistenz-Page |
| `src/features/overview/OverviewView.tsx` | Rückwärtskompatibler Adapter auf die vier extrahierten Pages |
| `scripts/captureAuftrag027GateScreenshots.mjs` | Isolierter G11-Nachweis für Routing, Deep Links und visuelle Regression |
| `docs/screenshots/auftrag-027/README.md` | Screenshot-/Hash-/Assertion-Matrix |
| `docs/BUILD_LOG.md` | G11-Abschlussbericht |

Keine weitere Datei ist Teil des Auftrags. Insbesondere `src/domain/navData.ts` bleibt unverändert; die neue Route-Metadatenliste ergänzt sie, statt sie zu überschreiben.

---

## Verbindliche Routenmatrix

Jeder Eintrag aus `NAV_CATEGORIES` erhält einen eindeutigen Pfad. Die vier hervorgehobenen Pfade müssen als explizite Routen vorliegen; die übrigen dürfen über den typisierten Übergangsadapter gerendert werden, dürfen aber weder aus der Sidebar verschwinden noch zu einem Fallback führen.

| Bisherige ID | Zielpfad | Titel | Renderer in Auftrag 027 |
|---|---|---|---|
| `s-exec` | `/dashboard` | Executive Dashboard | `ExecutiveDashboardPage` |
| `s-profil` | `/company/profile` | Unternehmenssteckbrief | `CompanyProfilePage` |
| `s-highlights` | `/company/highlights` | Jahres-Highlights 2025 | `YearHighlightsPage` |
| `s-daten` | `/company/data-basis` | Datenbasis & Konsistenz | `DataBasisPage` |
| `s-live-simulation` | `/crm/live-simulation` | Live-Simulation (Ebene B) | `LiveDashboardView` |
| `s-leads` | `/crm/leads` | Leads & Kontakte | `CRMView` mit `s-leads` |
| `s-companies` | `/crm/companies` | Unternehmen (Accounts) | `CRMView` mit `s-companies` |
| `s-deals` | `/crm/deals` | Deal Pipeline | `CRMView` mit `s-deals` |
| `s-activities` | `/crm/activities` | Aktivitäten-Historie | `CRMView` mit `s-activities` |
| `s-idee`, `s-value`, `s-historie`, `s-standort` | `/company/idea`, `/company/value-proposition`, `/company/history`, `/company/location` | gemäß `NAV_CATEGORIES` | `UnternehmenView` |
| `s-funktion`, `s-pricing`, `s-perf`, `s-roadmap` | `/product/features`, `/product/pricing`, `/product/performance`, `/product/roadmap` | gemäß `NAV_CATEGORIES` | `ProduktView` |
| `s-markt`, `s-wettbewerb`, `s-swot` | `/market/overview`, `/market/competition`, `/market/swot` | gemäß `NAV_CATEGORIES` | `MarktView` |
| `s-icp`, `s-persona`, `s-segmente`, `s-top10` | `/customers/icp`, `/customers/persona`, `/customers/segments`, `/customers/top-customers` | gemäß `NAV_CATEGORIES` | `KundenView` |
| `s-funnel`, `s-sla`, `s-kanaele`, `s-planung` | `/sales/funnel`, `/sales/sla`, `/sales/channels`, `/sales/planning` | gemäß `NAV_CATEGORIES` | `VertriebView` |
| `s-guv`, `s-bilanz`, `s-unit` | `/finance/p-and-l`, `/finance/balance-sheet`, `/finance/unit-economics` | gemäß `NAV_CATEGORIES` | `FinanzenView` |
| `s-headcount`, `s-hr`, `s-team` | `/organisation/headcount`, `/organisation/hr`, `/organisation/team` | gemäß `NAV_CATEGORIES` | `OrganisationView` |
| `s-okr`, `s-bsc`, `s-treiber` | `/strategy/okrs`, `/strategy/balanced-scorecard`, `/strategy/growth-drivers` | gemäß `NAV_CATEGORIES` | `StrategieView` |
| `s-kampagne-internal` | `/resources/materials` | Originalmaterialien & Decks | `InternalResourcesView` |
| `s-satzung`, `s-gesellschafter`, `s-handelsregister` | `/legal/articles`, `/legal/shareholders`, `/legal/commercial-register` | gemäß `NAV_CATEGORIES` | `RechtView` |

`/` navigiert per `Navigate` nach `/dashboard`. Unbekannte Pfade zeigen eine klare 404-Ansicht mit Link zurück zum Dashboard. Es gibt keine verdeckte Rückkehr zu `s-exec` bei einer unbekannten URL.

---

## Task 1: Baseline, Paketfundament und token-kompatibles Tailwind

**Files:**

- Modify: `package.json`, Sperrdatei des Paketmanagers, `src/styles/global.css`
- Create: `tailwind.config.js`, `postcss.config.js`, `components.json`, `src/lib/utils.ts`, `src/components/shadcn/button.tsx`, `src/components/shadcn/dialog.tsx`, `src/components/shadcn/dropdown-menu.tsx`
- Test: `npx tsc --noEmit`, `npm run verify`, `npm run build`

**Consumes:** Die CSS-Variablen aus `src/styles/global.css`, bestehende Pfad-Alias-Konfiguration aus `tsconfig.json`.

**Produces:** Einen installierten, buildbaren UI-Stack, der bestehendes Styling nicht zurücksetzt und neue Tailwind-/shadcn-Komponenten ohne Namenskollision ermöglicht.

- [x] **Schritt 1: Baseline dokumentieren**

  `git status --short`, `npx tsc --noEmit`, `npm run verify` und `npm run build` ausführen. Den Baseline-Commit für alle folgenden Diff- und Screenshot-Prüfungen notieren. Bei einem roten Baseline-Gate stoppen und den Befund dokumentieren; nicht auf einem fehlerhaften Stand weiterbauen.

- [x] **Schritt 2: Freigegebene Abhängigkeiten installieren**

  Ergänze `react-router-dom`, `tailwindcss` in der stabilen 3.x-Linie, `postcss`, `autoprefixer`, `clsx`, `tailwind-merge`, `class-variance-authority`, Recharts und Framer Motion. `lucide-react` bleibt unverändert. Die Sperrdatei muss zur verwendeten Paketmanager-Version passen.

  Eine Abhängigkeitsinstallation darf keine Secrets, keine `.env` und keine lockfile-fremden Massenänderungen erzeugen.

- [x] **Schritt 3: Tailwind ohne globalen Legacy-Reset konfigurieren**

  `content` deckt `./index.html` und `./src/**/*.{ts,tsx}` ab. In `theme.extend` die vorhandenen Tokens als `var(--...)` referenzieren:

  - Farben: Hintergrund, Deep Background, Surface, Border, Text, Muted, Cyan/Primary, Orange/Accent, Success und Error.
  - Schriften: `display`, `body`, `mono`.
  - Abstände: `1`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12`.
  - Radien: `sm`, `md`, `lg`, `xl`, `full`.
  - Schatten: `card`, `modal`, `glow-cyan`, `glow-cyan-strong`, `glow-orange`.

  `corePlugins: { preflight: false }` ist Pflicht. Es dürfen keine hardcodierten, semantisch abweichenden Parallelfarben im Tailwind-Theme entstehen.

- [x] **Schritt 4: PostCSS und globale CSS-Einbindung ergänzen**

  Ergänze die drei Tailwind-Direktiven in `src/styles/global.css`, ohne die bestehende Token-Definition oder die Basisregeln zu entfernen. Die Direktiven müssen vor den eigenen Regeln stehen. `postcss.config.js` aktiviert ausschließlich `tailwindcss` und `autoprefixer`.

- [x] **Schritt 5: shadcn konfliktfrei initialisieren**

  `components.json` nutzt den Alias `@/components/shadcn` für `ui`, `@/lib/utils` für Utilities und die vorhandene CSS-Datei als globale CSS-Datei. Initialisiere nur `button`, `dialog` und `dropdown-menu` im separaten Ordner. Die generierten Komponenten müssen TypeScript kompilieren, werden aber noch nicht an die bestehenden `Button`, `Modal` oder `Select`-Aufrufer angeschlossen.

- [x] **Schritt 6: Fundament verifizieren**

  ```bash
  npx tsc --noEmit
  npm run verify
  npm run build
  ```

  Erwartet: alle Befehle Exit-Code 0. Ein Build-Fehler durch Tailwind, PostCSS oder den shadcn-Pfad blockiert den Auftrag.

---

## Task 2: Zentrale Route-Metadaten und Legacy-Adapter

**Files:**

- Create: `src/app/routes.tsx`, `src/app/LegacyRouteView.tsx`
- Test: `scripts/captureAuftrag027GateScreenshots.mjs`

**Consumes:** `NAV_CATEGORIES`, bestehende Feature-Views und die verbindliche Routenmatrix.

**Produces:** Eine einzige, typisierte Zuordnung von View-ID zu URL, Navigationslabel, Kategorie, Seitentitel und Renderer.

- [x] **Schritt 1: Route-Metadaten als Single Source of Truth anlegen**

  `routes.tsx` exportiert mindestens:

  ```ts
  export interface AppRouteMeta {
    id: string;
    path: string;
    title: string;
    categoryLabel: string;
  }

  export const APP_ROUTES: readonly AppRouteMeta[] = [...];
  export const routeForViewId: Record<string, AppRouteMeta> = ...;
  export const routeForPathname = (pathname: string) => ...;
  ```

  Alle IDs aus `NAV_CATEGORIES` sind exakt einmal vertreten. Implementiere einen initialen Laufzeit-Guard, der bei einer fehlenden oder doppelten ID im Entwicklungsmodus eine eindeutige Fehlermeldung ausgibt. Die fachlichen Labels stammen weiterhin aus `NAV_CATEGORIES`; nicht manuell abweichend kopieren.

- [x] **Schritt 2: Übergangsadapter von Route zu bestehender View implementieren**

  `LegacyRouteView` erhält `viewId: string`. Er kapselt ausschließlich die bisherige Feature-Auswahl aus `App.tsx` und übergibt die vorhandenen `activeSubView`-Werte unverändert. Er enthält keine eigene State-Verwaltung und keine neue Fachlogik.

  Die vier Übersichtsrouten dürfen diesen Adapter nicht verwenden; sie werden in Task 4 auf neue Page-Komponenten geroutet.

- [x] **Schritt 3: Vollständigkeit statisch und im Browser prüfen**

  Der Screenshot-Harness prüft programmgesteuert, dass jeder Sidebar-Eintrag einen zugehörigen Pfad besitzt und dass `/crm/deals`, `/organisation/team`, `/company/profile` sowie `/dashboard` eine sichtbare Seite mit passender Überschrift liefern.

---

## Task 3: Router, Layout und URL-gesteuerte Sidebar

**Files:**

- Modify: `src/app/App.tsx`, `src/components/layout/Layout.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/ui/NavItem.tsx`
- Test: `scripts/captureAuftrag027GateScreenshots.mjs`

**Consumes:** `APP_ROUTES`, `LegacyRouteView`, React Router und die bestehende mobile Drawer-Logik.

**Produces:** Direkt adressierbare Seiten mit Browser-Historie; die App-Schale bleibt auf Desktop und Mobile funktionsgleich.

- [x] **Schritt 1: App auf geschachtelte Routen umstellen**

  `App.tsx` entfernt `useState('s-exec')`, die Titel-Schleife und `renderCurrentView`. Die neue Struktur lautet:

  ```tsx
  <SimulationProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {/* definierte App-Routen */}
        </Route>
      </Routes>
    </BrowserRouter>
  </SimulationProvider>
  ```

  Alle Pfade der Matrix werden als Routen registriert. Root-Redirect und 404-Route liegen außerhalb bzw. nach den fachlichen Routen. Der Provider darf nicht durch einen Wechsel der Unterroute remounten.

- [x] **Schritt 2: Layout als Parent-Route kapseln**

  `LayoutProps` enthält weder `activeView`, `onSelectView`, `currentViewTitle` noch `children`. `Layout` liest den aktuellen Pfad über die zentralen Metadaten, bestimmt daraus Titel und Kategorie für `Header` und rendert den Seiteninhalt im bisherigen `<main>` via `<Outlet />`.

  Responsiver Drawer, `aria-hidden`/`inert`, Header, SimulationBar und Scrollverhalten bleiben funktional erhalten.

- [x] **Schritt 3: Sidebar auf echte Links umstellen**

  `Sidebar` erhält keine `activeView`-/`onSelectView`-Props mehr. Jeder `NavItem` erhält seinen Zielpfad aus `routeForViewId` und wird über `NavLink` gerendert. Der aktive Zustand wird ausschließlich anhand der Router-Location bestimmt.

  Kategorien bleiben lokal auf-/zuklappbar. Auf Mobile schließt ein erfolgreicher Link-Klick den Drawer. Navigieren per Browser-Zurück/Vorwärts aktualisiert aktive Navigation, Header-Titel und Kategorie ohne zusätzlichen State.

- [x] **Schritt 4: Semantik und Fokus erhalten**

  `NavItem` darf nicht gleichzeitig ein `<button>` und ein darin verschachteltes `<a>` rendern. Links besitzen einen zugänglichen Namen, eindeutigen sichtbaren Fokus und den bestehenden Testanker `data-testid`. Mobile Drawer: Escape, Klick außerhalb und Fokus-Rückgabe funktionieren weiter.

- [x] **Schritt 5: Router-Flow browserbasiert nachweisen**

  Der Harness muss für `/dashboard → /company/profile → /crm/deals → /organisation/team` Folgendes prüfen:

  1. passende Überschrift und aktiver Sidebar-Eintrag;
  2. Wechsel über Sidebar-Link;
  3. Browser-History zurück/vor;
  4. Reload auf jeder Ziel-URL ohne Rückfall auf `/dashboard`;
  5. unbekannter Pfad zeigt 404 mit Dashboard-Link;
  6. bei 1440 px, 768 px und 375 px kein horizontaler Overflow.

---

## Task 4: Übersicht in vier route-fähige Page-Komponenten aufteilen

**Files:**

- Create: `src/features/overview/pages/ExecutiveDashboardPage.tsx`, `src/features/overview/pages/CompanyProfilePage.tsx`, `src/features/overview/pages/YearHighlightsPage.tsx`, `src/features/overview/pages/DataBasisPage.tsx`
- Modify: `src/features/overview/OverviewView.tsx`, `src/app/App.tsx`
- Test: `scripts/captureAuftrag027GateScreenshots.mjs`

**Consumes:** Die bisherigen UI-Primitives und unveränderten Imports aus `src/domain/execData.ts`.

**Produces:** Vier unabhängig routbare Overview-Pages bei vollständig erhaltener Darstellung und Datenbasis.

- [x] **Schritt 1: Executive Dashboard extrahieren**

  Verschiebe ausschließlich den bisherigen Default-Rückgabewert in `ExecutiveDashboardPage.tsx`. Die KPI- und Chart-Datenimporte bleiben unverändert. Keine Recharts-Migration, keine Animation und keine Tailwind-Umgestaltung in diesem Schritt.

- [x] **Schritt 2: Drei Subpages extrahieren**

  Extrahiere die Rückgabewerte für `s-profil`, `s-highlights` und `s-daten` in die jeweils benannten Page-Dateien. Alle Tabellen, Alerts, Texte und Datenimporte werden 1:1 übernommen.

- [x] **Schritt 3: OverviewView als Adapter reduzieren**

  `OverviewView` akzeptiert seinen bisherigen optionalen Prop für temporäre Konsumenten weiter. Er delegiert `s-exec`, `s-profil`, `s-highlights` und `s-daten` an die vier neuen Pages. Unbekannte Werte werden sichtbar und defensiv auf die Executive-Page geleitet; es wird keine Datenlogik ergänzt.

- [x] **Schritt 4: Explizite Page-Routen bestätigen**

  `App.tsx` importiert und rendert die vier Page-Komponenten direkt für `/dashboard`, `/company/profile`, `/company/highlights` und `/company/data-basis`. Keine dieser vier Routen darf durch `LegacyRouteView` oder den bisherigen `OverviewView` laufen.

---

## Task 5: G11-Screenshot-Harness, Gates und Übergabe

**Files:**

- Create: `scripts/captureAuftrag027GateScreenshots.mjs`, `docs/screenshots/auftrag-027/README.md`
- Modify: `docs/BUILD_LOG.md`

**Consumes:** Der unmittelbar vor Task 1 dokumentierte Baseline-Commit, CDP-Pattern aus Auftrag 026, die neue Routenstruktur.

**Produces:** Reproduzierbare Vorher-/Nachher-Nachweise der UI-Schale und ein vollständiger G11-Bericht.

- [x] **Schritt 1: Isolierten CDP-Harness aufbauen**

  Das Skript akzeptiert ausschließlich `--stage=vorher` oder `--stage=nachher`, verwendet eigenen Preview-/CDP-Port und ein temporäres Browserprofil außerhalb des Repositories. Vor jeder Route werden `localStorage` und `sessionStorage` geleert. Jede fehlende Route, fehlende Überschrift, falscher aktiver Link, Overflow oder Assertion-Fehler beendet den Lauf mit Exit-Code 1.

- [x] **Schritt 2: Vorher-/Nachher-Matrix erzeugen**

  Erfasse beide Stände bei 1440 × 900, 768 × 1024 und 375 × 812 px für:

  1. `/dashboard` (Executive-Page);
  2. `/company/profile` (direkter Deep Link);
  3. `/crm/deals` (CRM-Route und aktiver Nav-Eintrag);
  4. `/organisation/team` (Organisationsroute und aktiver Nav-Eintrag);
  5. mobile Sidebar: Öffnen, Link auf `/crm/deals`, Schließen und vollständige Inhaltsbreite;
  6. unbekannte Route (404 und Rücksprung-Link).

  Dateinamen: `<flow>-<viewport>-<stage>.png`. Es entstehen genau 36 PNG-Dateien, also 18 vollständige Vorher-/Nachher-Paare.

- [x] **Schritt 3: Matrix dokumentieren**

  `README.md` enthält pro Paar Baseline-/Implementierungscommit, Dateigröße, SHA-256, viewport, Route, geprüfte Assertion und Overflow-Ergebnis. Vorher und Nachher müssen byte-verschieden sein. Falls ein Flow visuell identisch bleibt, ist dies als Gate-Fehler zu behandeln: Der jeweilige Nachweis muss den tatsächlichen Router- oder Shell-Zustand zeigen.

- [x] **Schritt 4: Vollständige Verifikation ausführen**

  ```bash
  npx tsc --noEmit
  npm run verify
  npm run build
  git diff <baseline-commit>..HEAD -- src/simulation src/types src/context src/services/data src/features/resources
  ```

  Erwartet: TypeScript ohne Fehler, alle Integrity-Suiten grün, Produktions-Build erfolgreich und Schutzbereichs-Diff ohne Ausgabe.

- [x] **Schritt 5: Abschlussbericht in BUILD_LOG eintragen**

  Der Bericht enthält Ziel und Baseline-Commit, jede geänderte Datei mit Begründung, installierte Paketversionen, Routenmatrix-Nachweis, alle Befehlsausgaben, Schutzbereichs-Diff, Screenshot-Matrix sowie offene, bewusst nicht umgesetzte Folgepunkte. Kein Freigabeclaim ohne die tatsächlich dokumentierten Nachweise.

---

## Abnahmekriterien (Gate G11)

- [x] `react-router-dom`, Tailwind 3, PostCSS, Autoprefixer, `clsx`, `tailwind-merge`, shadcn-Basisprimitives, Recharts und Framer Motion sind reproduzierbar installiert; `lucide-react` wurde nicht verändert.
- [x] Tailwind referenziert die vorhandenen LeadPilot-Tokens; Preflight ist deaktiviert; die bestehenden CSS-Variablen bleiben unverändert.
- [x] Alle Einträge aus `NAV_CATEGORIES` besitzen genau einen URL-Pfad, einen erreichbaren Renderer und einen Sidebar-Link.
- [x] `/dashboard`, `/company/profile`, `/organisation/team` und `/crm/deals` sind direkt aufrufbar, reload-sicher und besitzen korrekten Titel, Kategorie und aktiven Sidebar-Eintrag.
- [x] Browser-History funktioniert; unbekannte Pfade landen nicht still auf dem Executive Dashboard, sondern auf einer 404-Seite.
- [x] `Layout` rendert den Seiteninhalt mit `Outlet`; keine lokale `activeView`-State-Kaskade verbleibt in `App.tsx`.
- [x] `SimulationProvider` bleibt dauerhaft oberhalb der Routen; Schutzbereiche zeigen einen leeren Diff.
- [x] Die vier Overview-Pages sind eigenständige Dateien; `OverviewView.tsx` ist nur noch kompatibler Adapter und nicht gelöscht.
- [x] Desktop-Sidebar und mobiler Drawer bleiben zugänglich; bei 1440 px, 768 px und 375 px besteht kein horizontaler Overflow.
- [x] `npx tsc --noEmit`, `npm run verify` und `npm run build` sind grün.
- [x] Die 36 Screenshot-Artefakte, 18 unterschiedlichen Hash-Paare und `docs/screenshots/auftrag-027/README.md` liegen vor.
- [x] `docs/BUILD_LOG.md` enthält den vollständigen G11-Abschlussbericht.

## Bewusst nicht Teil dieses Auftrags

- Umgestaltung bestehender Feature-Views zu Tailwind-Klassen oder Glassmorphism-Karten.
- Recharts-Integration, Chart-Austausch und Framer-Motion-Animationen.
- Supabase Realtime, `useLiveKpi`, n8n-Änderungen oder neue Datenquellen.
- 3D-Teamstruktur, WebP-Assets, Roadmap-Visualisierung und mobile Redesigns.
- Ersetzen der bisherigen LeadPilot-UI-Primitives durch shadcn-Komponenten.
- Löschen von `OverviewView.tsx` oder vollständige Migration jeder Feature-View zu eigenständigen Page-Komponenten.

Diese Punkte benötigen jeweils eigene Folgeaufträge nach erfolgreichem Gate G11.
