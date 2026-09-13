# AUFTRAG 060 / Gate G42 — Authentifizierungs-Schicht (app-seitig)

**Builder:** Antigravity
**Prüfung:** Codex / Claude Code
**Baseline:** `4322e86` (Gate G41 freigegeben, Auftrag 059 abgeschlossen)
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Bezug:** `docs/BUILD_PLAN_V2.2.0.md`, Gate-Tabelle G42 / 060 (Befund
„KRITISCH 2", App-Hälfte). Die zugehörige Backend-Hälfte (echte RLS-
Durchsetzung, echtes Supabase-Auth-Backend) gehört zu Gate G28
(`docs/superpowers/specs/2026-09-08-g28-supabase-live-operation-design.md`,
aktuell pausiert) und ist **nicht** Teil dieses Auftrags.

## Ziel

Die App bekommt erstmals eine Login-Pflicht: `AuthProvider`, `useAuth()`,
`<ProtectedRoute>`, eine Login-Seite. **Rollenmodell (mit Marc
abgestimmt):** minimal — nur „eingeloggt" vs. „nicht eingeloggt", keine
Rollen-/Rechte-Differenzierung. Diese Auftrag baut **ausschließlich die
App-Seite**: eine echte, sichere Durchsetzung gibt es erst mit G28.

## Ist-Stand (nachgemessen, nicht aus dem Build-Plan übernommen)

- **0 Auth-Code vorhanden:** `find src -iname "*auth*"` liefert nichts.
  Kein `AuthProvider`, kein `useAuth`, keine Login-Seite, keine
  Routen-Absicherung.
- **`supabase/schema.sql` hat aktuell 4 offene `USING (true)`-Policies**
  (`companies`, `contacts`, `imported_funnel_deals`, sowie
  `allow_anon_authenticated_read` Zeile 406) — vollständig öffentlicher
  Lesezugriff, unabhängig vom App-seitigen Login. **Das bleibt in diesem
  Auftrag unverändert** (siehe Entscheidung 6) — die Verschärfung dieser
  Policies ist explizit Teil von G28, nicht G42 (Plan: „hier wird nur die
  App vorbereitet, damit G28 sie nur noch anschließen muss").
- **`.env.example`** dokumentiert aktuell `VITE_SUPABASE_URL` +
  `VITE_SUPABASE_ANON_KEY` (die alte Namenskonvention aus dem G28-Design —
  wird hier nicht angefasst, das ist ebenfalls G28-Scope).
- **Routing-Struktur** (`src/app/App.tsx`): eine einzige `<BrowserRouter>`
  mit einem `<Route element={<Layout />}>`-Wrapper um alle 41 generisch aus
  `APP_ROUTES`/`ROUTE_PAGES` erzeugten Routen, plus ein dev-only
  Sonderfall (`/design-system`) außerhalb dieser Liste, direkt in
  `App.tsx` deklariert. Dieses Sonderfall-Muster ist die Vorlage für die
  neue `/login`-Route (siehe Entscheidung 4).
- **Playwright hat aktuell keinen `globalSetup`** (`playwright.config.ts`)
  und 153 grüne Tests, die alle Routen direkt anspringen. Eine
  App-weite Login-Pflicht würde **alle** brechen, wenn nicht vorher eine
  authentifizierte Sitzung hergestellt wird (siehe Entscheidung 5).
- **Etabliertes Präzedenz-Muster im Repo:** Die `DataSource`-Abstraktion
  (`BUILD_PLAN.md`, Entscheidung D1: „ein `HubSpotSource` ist ein Drop-in,
  kein anderer Code ändert sich") ist genau das Muster, das für die
  Auth-Backend-Austauschbarkeit (heute: Demo-Login im Browser; später:
  echtes Supabase-Auth via G28) übertragen werden soll (siehe
  Entscheidung 2).

## Verbindliche Entscheidungen

1. **Rollenmodell: minimal, mit Marc abgestimmt.** `User`-Typ enthält nur
   `{ id, email }`, kein `role`-Feld. `useAuth()` liefert
   `{ user, isAuthenticated, login, logout }`. Keine granularen
   Berechtigungen, keine Routen-Differenzierung nach Rolle. Eine spätere
   Erweiterung ist ein eigener, dedizierter Auftrag — hier nicht
   vorwegnehmen.
2. **`AuthAdapter`-Abstraktion analog zur `DataSource`-Abstraktion.** Ein
   `AuthAdapter`-Interface (`login(email, password): Promise<User>`,
   `logout(): Promise<void>`, `getSession(): User | null`) plus **eine**
   Implementierung in diesem Auftrag: `LocalAuthAdapter` (siehe
   Entscheidung 3). Ziel: G28 kann später eine `SupabaseAuthAdapter`
   ergänzen, ohne `AuthProvider`, `ProtectedRoute` oder `LoginPage`
   anzufassen — exakt das Drop-in-Prinzip aus D1.
3. **`LocalAuthAdapter` ist explizit KEINE echte Sicherheit.** Prüfung
   eines Demo-Credentials rein im Browser (JavaScript-Vergleich gegen
   Werte aus `VITE_DEMO_AUTH_EMAIL`/`VITE_DEMO_AUTH_PASSWORD`,
   Platzhalter in `.env.example`, dokumentiert als **nicht sensibel** —
   sie schützen keine echten Daten, die `USING (true)`-Policies aus dem
   Ist-Stand machen die Daten ohnehin öffentlich lesbar). Session-Zustand
   in `localStorage` (nicht `sessionStorage` — Begründung: siehe
   Entscheidung 5, Playwright `storageState` erfasst nur `localStorage`;
   außerdem muss die Session einen vollen Seiten-Reload überstehen).
   **Die Login-Seite zeigt einen sichtbaren Hinweis** („Demo-Modus, keine
   produktive Authentifizierung — echte Absicherung folgt mit Gate G28"),
   damit niemand die App fälschlich für abgesichert hält. Diese
   Einschränkung außerdem im Builder-Bericht ausdrücklich wiederholen.
4. **Routing:** `<ProtectedRoute>` umschließt den bestehenden
   `<Route element={<Layout />}>`-Block in `App.tsx` (schützt damit
   einheitlich alle 41 Routen, passend zum minimalen Rollenmodell aus
   Entscheidung 1). `/login` wird — analog zum bestehenden
   `/design-system`-Sonderfall — als eigene `<Route>` direkt in
   `App.tsx` deklariert, außerhalb der generischen `APP_ROUTES`-Liste,
   und bleibt die einzige unbeschützte Route. `<AuthProvider>` umschließt
   die gesamte `<BrowserRouter>`-Struktur.
5. **Playwright darf durch diesen Auftrag nicht kaputtgehen.** Neuer
   `e2e/global-setup.ts`: führt einmalig einen Demo-Login gegen die
   laufende Preview-Instanz aus und speichert `storageState`
   (`playwright/.auth/user.json` oder gleichwertig, in `.gitignore`
   aufnehmen). `playwright.config.ts` referenziert diese Datei
   projektweit über `use.storageState`, damit alle bestehenden Specs
   (`routes.spec.ts`, `visual.spec.ts`, `a11y.spec.ts`,
   `resources-viewer.spec.ts`) unverändert und weiterhin authentifiziert
   laufen. Neuer `e2e/auth.spec.ts` überschreibt `storageState` gezielt
   (`test.use({ storageState: { cookies: [], origins: [] } })`) für den
   unauthentifizierten Fall und deckt mindestens: Redirect zu `/login`
   bei fehlendem Login, erfolgreicher Login mit Demo-Credential,
   Fehlermeldung bei falschem Credential, Logout führt zurück zu
   `/login` und entfernt die Session aus `localStorage`.
6. **`supabase/**` bleibt in diesem Auftrag vollständig unangetastet** —
   weder Schema noch RLS-Policies noch `.env.example`-Supabase-Variablen.
   Das ist G28-Scope (siehe Ist-Stand). Diese Auslassung im Bericht
   ausdrücklich begründen.
7. **Kein neues Business-Feature über Login/Logout hinaus, keine neue
   Abhängigkeit.** React Router und alles Benötigte ist bereits
   vorhanden.

## Grenzen und Schutzbereiche

- Nichts außerhalb der Tabelle „Erlaubte Dateien" unten anfassen.
- `supabase/**` bleibt unangetastet (Entscheidung 6) — **zusätzlich** zu
  den ohnehin dauerhaft geltenden Schutzbereichen.
- `git diff 4322e86 -- src/simulation src/types src/context src/services/data src/features/resources src/store supabase` muss **leer** sein.
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.

## Blöcke

### Block A — `AuthAdapter`-Abstraktion + `AuthProvider`/`useAuth()`

- [ ] `AuthAdapter`-Interface + `LocalAuthAdapter`-Implementierung
      (Entscheidung 2, 3).
- [ ] `AuthContext`/`AuthProvider` + `useAuth()`-Hook (Entscheidung 1).

### Block B — Login-Seite + `ProtectedRoute` + Routing-Wiring

- [ ] `LoginPage` mit sichtbarem Demo-Hinweis (Entscheidung 3).
- [ ] `ProtectedRoute`, Verdrahtung in `App.tsx` (Entscheidung 4).
- [ ] Minimale Logout-Affordance in `Layout.tsx`.
- [ ] Screenshot-Nachweis für `LoginPage` (1440/768/375px, neue UI —
      kein Vorher/Nachher nötig, da neu).

### Block C — Playwright-Absicherung + neue Auth-Tests

- [ ] `e2e/global-setup.ts`, `playwright.config.ts`-Anpassung
      (Entscheidung 5).
- [ ] `e2e/auth.spec.ts` (Entscheidung 5).
- [ ] Alle bestehenden 153 Tests laufen unverändert grün mit der neuen
      authentifizierten `storageState`.

### Block D — Abschluss

- [ ] Gate-G42-Bilanz im Bericht: was wurde gebaut, was ausdrücklich
      **nicht** (Rollen-Differenzierung, echte Backend-Sicherheit,
      RLS-Verschärfung — alles G28/Folgeauftrag), Anzahl neuer
      Playwright-Tests, Gesamtzahl grüner Tests.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run verify`, `npm test`,
      `npm run build`, `npx playwright test` grün.

## Erlaubte Dateien

| Bereich | Blöcke |
| --- | --- |
| `src/auth/**` (neu: `AuthContext.tsx`, `authAdapter.ts`, `localAuthAdapter.ts`, `ProtectedRoute.tsx`) | A, B |
| `src/features/auth/pages/LoginPage.tsx` (neu) | B |
| `src/app/App.tsx` | B |
| `src/components/layout/Layout.tsx` (nur Logout-Affordance) | B |
| `.env.example` (nur `VITE_DEMO_AUTH_EMAIL`/`VITE_DEMO_AUTH_PASSWORD`-Platzhalter) | A |
| `.gitignore` (nur Playwright-Auth-State-Datei) | C |
| `playwright.config.ts` | C |
| `e2e/global-setup.ts`, `e2e/auth.spec.ts` (neu) | C |
| `docs/BUILD_LOG.md`, dieser Auftrag | Bericht |

Andere Dateien sind nicht erlaubt — insbesondere nichts in `supabase/**`
(Entscheidung 6), nichts in `src/simulation/**`, `src/types/**`,
`src/context/**`, `src/services/data/**`, `src/features/resources/**`.

## Pflicht-Verifikation

```bash
npx tsc --noEmit
npm run lint
npm run verify
npm test
npm run build
npx playwright test   # inkl. neuem e2e/auth.spec.ts, alle bestehenden 153 weiterhin gruen
git diff 4322e86 -- src/simulation src/types src/context src/services/data src/features/resources src/store supabase   # leer
```

Screenshot-Nachweis für die neue `LoginPage` (1440/768/375px). Matrix
unter `docs/screenshots/auftrag-060/README.md`.

## Builder-Bericht und Commit

Abschnitt **„Gate G42 – Auftrag 060 (Abschluss)"** an den Anfang von
`docs/BUILD_LOG.md`: je Block Commit-Hash + Ergebnis, wie die
`AuthAdapter`-Abstraktion mit G28 zusammenspielen soll (kurz, mit Verweis
auf das G28-Design-Dokument), wie Playwright jetzt authentifiziert läuft,
Anzahl neuer/gesamt grüner Tests, Screenshot-Nachweis für die Login-Seite,
Command-Matrix, und eine ausdrückliche Wiederholung, dass dies **keine
echte Sicherheit** ist.

## Akzeptanzkriterien für die Prüfung

- `AuthProvider`/`useAuth()`/`ProtectedRoute`/`LoginPage` vorhanden und
  funktionsfähig, Rollenmodell exakt minimal (kein `role`-Feld, keine
  Rechte-Differenzierung).
- `AuthAdapter`-Interface + `LocalAuthAdapter` sauber getrennt — ein
  Austausch gegen eine künftige `SupabaseAuthAdapter` dürfte laut Code-
  Struktur ohne Änderung an `AuthProvider`/`ProtectedRoute`/`LoginPage`
  möglich sein (stichprobenartig im Review nachvollzogen).
- Alle 41 Routen sind hinter Login, `/login` ist die einzige Ausnahme.
- Login-Seite zeigt den Demo-Modus-Hinweis sichtbar.
- Playwright: `global-setup.ts` + `storageState` funktionieren, alle
  bestehenden 153 Tests weiterhin grün, `e2e/auth.spec.ts` deckt Redirect,
  Login-Erfolg, Login-Fehler, Logout ab.
- `supabase/**` unangetastet (Diff leer), keine RLS-Änderung.
- `npm run verify` 24/24, `test`/`build` grün, keine Ratsche erhöht.
- Kein neues Business-Feature über Login/Logout hinaus, keine neue
  Abhängigkeit.
- Bericht macht den Demo-/Nicht-Produktions-Charakter der Absicherung
  unmissverständlich klar.

**Abnahme:** Erst nach unabhängigem Review ist Gate G42 abgeschlossen.
Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.
