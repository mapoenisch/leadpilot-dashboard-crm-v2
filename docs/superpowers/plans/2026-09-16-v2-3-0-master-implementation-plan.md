# LeadPilot v2.3.0 Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LeadPilot v2.2.0 wird vollständig abgesichert, produktionsnah mehrbenutzerfähig gemacht und anschließend um die freigegebenen v2.3.0-Funktionen erweitert.

**Architecture:** Supabase Auth und PostgreSQL bilden die autoritative Mandanten-, Daten- und Persistenzgrenze. Das React-Frontend greift über typisierte Services und TanStack Query zu; reproduzierbare Simulationen laufen im Web Worker und werden atomar mit Baseline-Hash, Events, Zeitreihen und Snapshots gespeichert. Die Umsetzung bleibt streng seriell: jeder Teilauftrag besitzt einen roten Starttest, einen grünen Implementierungsnachweis, einen unabhängigen Review und ein dokumentiertes Gate.

**Tech Stack:** React 18, TypeScript, Vite, Supabase Auth/PostgreSQL/RLS/RPC, TanStack Query, Zustand, Vitest, Playwright, Axe, Lighthouse CI, ESLint, Prettier, GitHub Actions, n8n.

**Spec:** `docs/superpowers/specs/2026-09-15-v2-3-0-production-readiness-design.md`

## Global Constraints

- Ausgangscode ist Commit `9380ace8290524456e7ce76852b570612a51df06` (`v2.2.0`); Zielversion ist `v2.3.0`.
- Reihenfolge ist zwingend `067A` bis `067S`; ein rotes Gate blockiert den nächsten Teilauftrag.
- Antigravity baut; Codex oder Claude Code prüft unabhängig und schreibt den Befund in `docs/BUILD_LOG.md`.
- Der aktive Teilauftrag darf ausschließlich seine ausdrücklich genannten Ziel-Dateien ändern.
- Schutzbereiche sind nur innerhalb der in diesem Plan benannten Teilaufträge freigegeben; alle anderen Schutzbereichs-Diffs müssen leer bleiben.
- Jeder Verhaltenswechsel beginnt mit einem reproduzierbar roten Test und endet mit Regression, Pflicht-Gates und einem kleinen Commit.
- Node ist auf eine kompatible Version `>=22.18.0 <23` festzulegen.
- Keine neue Laufzeitabhängigkeit ohne Begründung und dokumentierte Freigabe.
- Keine Secrets oder personenbezogenen Produktivdaten im Repo, Browser-Bundle, Log oder Testartefakt.
- Free-Tier-first: Die Abnahme setzt keinen kostenpflichtigen Dienst voraus.
- Release-Lizenz ist proprietär: `All Rights Reserved`; Drittanbieter-Lizenzen bleiben unberührt.
- Globale Endgrenzen: Coverage mindestens 80 % Lines/Statements, 75 % Functions, 70 % Branches; Lighthouse 90/95/95; initiales JavaScript höchstens 180 KB gzip; größter Chunk höchstens 250 KB gzip.

---

## Dateistruktur und Verantwortungen

| Bereich | Zielstruktur | Verantwortung |
|---|---|---|
| Identität | `src/auth/supabaseAuthAdapter.ts`, `src/auth/organizationContext.tsx`, `src/auth/permissions.ts` | Sitzung, Organisation, Rolle, Berechtigungen |
| DB-Typen | `src/types/database.generated.ts`, `src/types/organization.ts`, `src/types/errors.ts` | generierte Tabellenformen und gemeinsame Fehlercodes |
| Migrationen | `supabase/migrations/20260916_*.sql` bis `20260930_*.sql` | Schema, RLS, RPC, synthetischer Mandant, Indizes |
| CRM | `src/services/data/crmReadModelService.ts`, `src/services/data/crmEnvelopeGuard.ts` | quellenkonsistentes Read Model ohne stillen Fallback |
| Baseline | `src/services/data/baselineMapper.ts`, `src/services/data/canonicalHash.ts` | Deep-Freeze, kanonischer Hash, Engine-Input |
| Persistenz | `src/services/runs/*`, `src/services/scenarios/*` | Supabase-Repositories und atomare Run-Speicherung |
| Simulation | `src/simulation/runCoordinator.ts`, `src/simulation/runExecutor.ts`, `src/simulation/runComparisonService.ts` | aufgeteilter `ScenarioService` und Worker-Pfad |
| Integrationen | `tools/n8n/*`, `src/services/import/*` | HMAC-Ingress und vollständiger HubSpot-Import |
| Betrieb | `src/services/audit/*`, `src/services/health/*` | Audit, Diagnose, Frische und sichere Telemetrie |
| CI/Release | `.github/workflows/ci.yml`, `scripts/verifyV23ReleaseReadiness.ts` | fail-closed Messung, SHA-Pinning und Release-Abnahme |

## Issue-zu-Gate-Matrix

| GitHub-Issue | Befund | Umsetzung |
|---|---|---|
| #2 | Demo-Auth statt echter Anmeldung | 067B / G45 |
| #3 | offene oder unvollständige RLS | 067B / G45 |
| #4 | Coverage-Gate | bereits in CI vorhanden; Schwellen werden in 067K/G57 verbindlich |
| #5 | kein wirksamer Schutz für `main` | 067L / G58 |
| #6 | große Module und Max-Lines-Ausnahmen | durch v2.3.0 wieder geöffnet; 067K / G57 |
| #7 | Qualitäts-Baselines nicht null | 067K / G57 |
| #8 | GitHub-Actions auf beweglichen Tags | 067L / G58 |
| #9 | keine Lizenz | 067S / G65 |
| #13 | internes Clipping unter `/resources/materials` | 067A als Regressionstest, 067J als Fix |

### Task 1: 067A – Charakterisierung und rote Regressionen (G44)

**Files:**
- Create: `src/review/__tests__/productionReadinessCharacterization.vitest.ts`
- Create: `src/services/data/__tests__/crmSourceFallback.characterization.vitest.ts`
- Create: `src/simulation/__tests__/vitest/baselineWiring.characterization.vitest.ts`
- Create: `src/simulation/__tests__/vitest/persistenceReload.characterization.vitest.ts`
- Create: `e2e/element-clipping.spec.ts`
- Create: `docs/reviews/v2.3.0-finding-register.md`
- Modify: `vitest.config.ts`

**Interfaces:**
- Consumes: unverändertes v2.2.0-Verhalten.
- Produces: stabile Testnamen `PR-AUTH-01` bis `PR-REL-20` und eine Befundmatrix mit exakt einem Zielgate je Finding.

- [ ] **Step 1: Befundregister anlegen.** Jede Review- und Issue-Zeile erhält Schweregrad, reproduzierenden Test, Teilauftrag, Gate und Status `red`.
- [ ] **Step 2: Auth-, RLS-, Fallback-, Baseline-, Persistenz-, Worker-, HubSpot-, Release- und Asset-Befunde als Vitest-Charakterisierung erfassen.** Beispielassertion:

```ts
expect(result.sourceKind).not.toBe('synthetic');
expect(result.status).toBe('unavailable');
```

- [ ] **Step 3: Ressourcen-Clipping als Elementtest erfassen.** Für jedes sichtbare `[data-clipping-probe]` gilt:

```ts
expect(box.x).toBeGreaterThanOrEqual(containerBox.x);
expect(box.x + box.width).toBeLessThanOrEqual(containerBox.x + containerBox.width);
```

- [ ] **Step 4: Golden-Run und Reproduzierbarkeit vor geschützten Refactorings einfrieren.** Hash und fachliche Kernmetriken werden als Fixture gespeichert; volatile IDs/Zeitstempel werden vor dem Vergleich normalisiert.
- [ ] **Step 5: Tests einzeln ausführen und erwartete rote Befunde protokollieren.** Run: `npm test -- productionReadinessCharacterization baselineWiring persistenceReload && npx playwright test e2e/element-clipping.spec.ts`. Expected: ausschließlich die im Register markierten Mängel schlagen fehl.
- [ ] **Step 6: Bestehende grüne Basis prüfen.** Run: `npx tsc --noEmit && npm run verify && npm test && npm run build`. Expected: bestehende Suites bleiben grün.
- [ ] **Step 7: Gate G44 reviewen, BUILD_LOG ergänzen und committen.** Commit: `test: characterize v2.3.0 production-readiness findings`.

### Task 2: 067B – Auth, Organisationen, Rollen und RLS (G45)

**Files:**
- Create: `supabase/migrations/20260916_identity_and_tenant_rls.sql`
- Create: `supabase/tests/tenant_isolation.sql`
- Create: `src/auth/supabaseAuthAdapter.ts`
- Create: `src/auth/organizationContext.tsx`
- Create: `src/auth/permissions.ts`
- Create: `src/types/organization.ts`
- Create: `src/types/database.generated.ts`
- Modify: `src/auth/AuthContext.tsx`, `src/auth/authAdapter.ts`, `src/auth/ProtectedRoute.tsx`, `src/features/auth/pages/LoginPage.tsx`, `src/app/App.tsx`, `supabase/schema.sql`, `.env.example`
- Delete: `src/auth/localAuthAdapter.ts`

**Interfaces:**
- Produces: `OrganizationRole = 'admin' | 'manager' | 'viewer'`, `OrganizationSession { userId; organizationId; role }`, `can(permission, role): boolean`.
- Produces SQL functions: `current_organization_id()`, `current_organization_role()`, `has_org_role(required_roles text[])`.

- [ ] **Step 1: Negative SQL-Tests für zwei Organisationen und drei Rollen schreiben.** Fremde SELECT/INSERT/UPDATE/DELETE- und manipulierte RPC-Zugriffe müssen scheitern.
- [ ] **Step 2: Migration lokal anwenden und roten Test bestätigen.** Run: `supabase db reset && supabase test db`. Expected: Fremdmandantenfälle schlagen vor den Policies fehl.
- [ ] **Step 3: `organizations`, `organization_members` und `organization_id NOT NULL` samt organisationssicheren Fremdschlüsseln migrieren.**
- [ ] **Step 4: RLS ohne `USING (true)` oder `WITH CHECK (true)` implementieren und Rollenmatrix zentral abbilden.**
- [ ] **Step 5: Supabase-Auth-Adapter und Organization Context verdrahten; LocalAuth und automatisch einsetzbare Demo-Zugangsdaten vollständig entfernen.**
- [ ] **Step 6: Login-, Logout-, Reload-, Rollen- und Fremdmandanten-E2E ausführen.** Run: `npx playwright test e2e/auth.spec.ts e2e/tenant-isolation.spec.ts`. Expected: erlaubte Rolle grün, jeder Cross-Tenant-Pfad 401/403 beziehungsweise leeres RLS-Ergebnis.
- [ ] **Step 7: Vollgates, G45-Review und Commit.** Commit: `feat: add tenant-safe Supabase authentication and RLS`.

### Task 3: 067C – Sicherer Ingress, Schreibpfade und Header (G46)

**Files:**
- Create: `supabase/migrations/20260917_secure_ingress_and_bootstrap.sql`
- Create: `supabase/functions/live-kpi-ingest/index.ts`
- Create: `supabase/functions/_shared/verifyLeadPilotSignature.ts`
- Create: `supabase/functions/__tests__/liveKpiIngress.test.ts`
- Create: `public/_headers`
- Modify: `tools/n8n/live-kpi-ingest.workflow.json`, `tools/n8n/README.md`, `src/services/db/crmRepository.ts`, `src/services/import/crmImporter.ts`, `vite.config.ts`, `.env.example`
- Delete: `src/services/import/crmSeeder.ts`

**Interfaces:**
- Consumes headers `X-LeadPilot-Timestamp`, `X-LeadPilot-Nonce`, `X-LeadPilot-Signature`.
- Produces `verifySignedRequest(rawBody, headers, secret, now): VerificationResult` and idempotente DB-RPC `ingest_live_kpi(...)`.

- [ ] **Step 1: Vertragsfälle gültig, unsigned, manipuliert, älter als fünf Minuten, wiederholte Nonce, zu großer Body und unbekannte KPI schreiben.**
- [ ] **Step 2: Rotlauf bestätigen.** Run: `deno test supabase/functions/__tests__/liveKpiIngress.test.ts`. Expected: Sicherheitsfälle sind vor Implementierung rot.
- [ ] **Step 3: Timing-safe HMAC-SHA-256, Nonce-Speicher, Allowlist, Rate-Limit und Body-Limit vor privilegiertem DB-Zugriff implementieren.**
- [ ] **Step 4: Browser-Seeder und UI-Trigger entfernen; synthetischen Mandanten idempotent per SQL-Bootstrap erzeugen.**
- [ ] **Step 5: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` und Framing-Schutz in lokaler und Deployment-Konfiguration setzen.**
- [ ] **Step 6: Contract-, Header- und Vollgates ausführen.** Run: `deno test supabase/functions/__tests__/liveKpiIngress.test.ts && npm test -- liveKpi && npm run build`. Expected: alle Replay- und Signature-Negativfälle grün.
- [ ] **Step 7: G46-Review und Commit.** Commit: `feat: secure ingestion and privileged write paths`.

### Task 4: 067D – Quellenkonsistentes CRM Envelope (G47)

**Files:**
- Create: `src/services/data/crmReadModelService.ts`
- Create: `src/services/data/crmEnvelopeGuard.ts`
- Create: `src/services/data/__tests__/crmReadModelService.vitest.ts`
- Modify: `src/types/dataSource.ts`, `src/services/data/dataSourceRegistry.ts`, `src/services/data/sources/simulatedCrmSource.ts`, `src/services/data/sources/baselineFileSource.ts`, `src/services/data/sources/hubSpotBaselineSource.ts`, `src/hooks/queries/useCrmQueries.ts`, `src/features/overview/pages/DataBasisPage.tsx`

**Interfaces:**
- Produces: `loadCrmReadModel(organizationId, sourceId): Promise<CrmReadModelEnvelope>` mit `healthy | empty | degraded | unavailable`.

- [ ] **Step 1: Tests für leere Tabellen, Netzwerkfehler, partiellen Quellenmix, ungültige Runtime-Daten und bewusste Demo-Auswahl schreiben.**
- [ ] **Step 2: Rotlauf bestätigen.** Run: `npm test -- crmReadModelService crmSourceFallback`. Expected: stiller Demo-Fallback und Mischzustand werden erkannt.
- [ ] **Step 3: Envelope-Guard implementieren; ein Fehler liefert `unavailable`, eine leere Quelle `empty`, nie synthetische Ersatzdaten.**
- [ ] **Step 4: Alle CRM-Hooks auf genau einen Envelope pro Query umstellen und Quelle/Status/Abrufzeit sichtbar machen.**
- [ ] **Step 5: Unit-, UI- und Vollgates ausführen.** Run: `npm test -- crmReadModelService useCrmQueries DataBasisPage && npm run verify`. Expected: kein stiller Quellenwechsel.
- [ ] **Step 6: G47-Review und Commit.** Commit: `feat: make CRM source provenance explicit and consistent`.

### Task 5: 067E – Baseline, Hash und Engine-Verdrahtung (G48)

**Files:**
- Create: `src/services/data/canonicalHash.ts`
- Create: `src/services/data/baselineMapper.ts`
- Create: `src/services/data/__tests__/canonicalHash.vitest.ts`
- Create: `src/services/data/__tests__/baselineMapper.vitest.ts`
- Modify: `src/services/data/baselineSnapshotService.ts`, `src/types/dataSource.ts`, `src/types/simulation.ts`, `src/types/scenario.ts`, `src/simulation/engine.ts`, `src/simulation/scenarioService.ts`, `src/simulation/__tests__/vitest/reproducibilityIntegrity.vitest.ts`

**Interfaces:**
- Produces: `canonicalSha256(value): Promise<string>`, `mapBaselineToSimulationInput(baseline): SimulationBaselineInput`.

- [ ] **Step 1: Tests für Key-Reihenfolge, Deep-Freeze, Mutation nach Capture, gleiche/andere Baseline und falschen Hash schreiben.**
- [ ] **Step 2: Rotlauf bestätigen.** Run: `npm test -- canonicalHash baselineMapper baselineWiring`. Expected: hart codierte Engine-Baseline und flaches Freeze werden entlarvt.
- [ ] **Step 3: Kanonische Serialisierung, SHA-256, strukturiertes Klonen und rekursives Freeze implementieren.**
- [ ] **Step 4: Mapper verdrahten und historische Konstanten `66`, `34320`, `411840` aus dem produktiven Run-Pfad entfernen.**
- [ ] **Step 5: Manifest um `baselineId`, `baselineHash`, `dataSourceId`, `organizationId`, Schema- und Modellversion erweitern; Hash vor Reproduktion validieren.**
- [ ] **Step 6: Determinismus prüfen.** Run: `npm test -- reproducibilityIntegrity baselineMapper`. Expected: gleiche Baseline/Seed byte-identisch, andere Baseline fachlich anders, Manipulation `BASELINE_HASH_MISMATCH`.
- [ ] **Step 7: G48-Review und Commit.** Commit: `feat: wire immutable hashed baselines into simulations`.

### Task 6: 067F – Persistente Szenarien und Runs (G49)

**Files:**
- Create: `supabase/migrations/20260919_scenario_run_persistence.sql`
- Create: `src/services/scenarios/scenarioRepository.ts`
- Create: `src/services/runs/runRepository.ts`
- Create: `src/services/runs/runPersistenceService.ts`
- Create: `src/services/runs/__tests__/runPersistenceService.vitest.ts`
- Create: `e2e/persistence-multisession.spec.ts`
- Modify: `src/store/slices/scenarioSlice.ts`, `src/store/slices/runSlice.ts`, `src/simulation/scenarioService.ts`, `src/types/scenario.ts`, `src/types/snapshot.ts`

**Interfaces:**
- Produces: `persistCompletedRun(bundle): Promise<RunRecord>` über atomare RPC und `loadScenarioWorkspace(organizationId)`.

- [ ] **Step 1: Tests für atomaren Erfolg, Rollback bei Eventfehler, Reload, zweite Sitzung und Fremdorganisation schreiben.**
- [ ] **Step 2: Migration und Tests rot ausführen.** Run: `supabase db reset && supabase test db && npm test -- runPersistenceService`. Expected: In-Memory-Verlust und fehlende Atomizität sind sichtbar.
- [ ] **Step 3: Tabellen, Indizes, RLS und transaktionale RPC für Manifest, Ergebnis, Events, Zeitreihen und Snapshots implementieren.**
- [ ] **Step 4: Zustandshydrierung und Repositories verdrahten; Browser-Maps sind nicht mehr autoritative Speicherung.**
- [ ] **Step 5: Mehrsitzungs-E2E ausführen.** Run: `npx playwright test e2e/persistence-multisession.spec.ts`. Expected: Run nach Reload und zweitem berechtigtem Browser identisch vorhanden.
- [ ] **Step 6: G49-Review und Commit.** Commit: `feat: persist scenarios and simulation runs atomically`.

### Task 7: 067G – Produktiver Worker und echter Fortschritt (G50)

**Files:**
- Create: `src/simulation/runCoordinator.ts`
- Create: `src/simulation/__tests__/vitest/runCoordinator.vitest.ts`
- Modify: `src/simulation/worker/workerAdapter.ts`, `src/simulation/worker/simulation.worker.ts`, `src/types/workerMessages.ts`, `src/simulation/scenarioService.ts`, `src/store/slices/runSlice.ts`, `src/features/simulation/pages/LiveSimulationPage.tsx`

**Interfaces:**
- Produces Worker-Ereignisse `queued`, `running`, `progress`, `completed`, `failed` mit `processedUnits`, `totalUnits`, `correlationId`.

- [ ] **Step 1: Tests schreiben, die Main-Thread-Ausführung, künstlichen Timerfortschritt, Navigation-Leak und Workerfehler erkennen.**
- [ ] **Step 2: Rotlauf bestätigen.** Run: `npm test -- runCoordinator workerIntegrity`. Expected: Produktpfad nutzt Worker noch nicht vollständig.
- [ ] **Step 3: RunCoordinator implementieren; Fortschritt ausschließlich aus Ticks beziehungsweise Monte-Carlo-Runs berechnen.**
- [ ] **Step 4: Worker bei Unmount, Routewechsel, Fehler und Abschluss terminieren; Main-Thread-Executor nur für Tests/Headless exportieren.**
- [ ] **Step 5: Responsiveness-E2E ausführen.** Run: `npx playwright test e2e/worker-responsiveness.spec.ts`. Expected: UI-Heartbeat läuft während eines großen Runs weiter.
- [ ] **Step 6: G50-Review und Commit.** Commit: `feat: execute product simulations in the web worker`.

### Task 8: 067H – HubSpot-Pagination und Importintegrität (G51)

**Files:**
- Create: `src/services/import/hubSpotPageLoader.ts`
- Create: `src/services/import/hubSpotStageMapper.ts`
- Create: `src/services/import/__tests__/hubSpotPageLoader.vitest.ts`
- Create: `src/services/import/__tests__/hubSpotStageMapper.vitest.ts`
- Modify: `tools/n8n/generate-baseline-hubspot.workflow.json`, `tools/n8n/hubspot-stage-map.json`, `tools/n8n/README.md`, `src/services/import/crmImporter.ts`, `src/services/data/sources/hubSpotBaselineSource.ts`

**Interfaces:**
- Produces: `loadAllPages(fetchPage, signal): Promise<HubSpotRecord[]>`, `mapDealStage(stage): KnownStage | QuarantinedStage`.

- [ ] **Step 1: Contract-Tests für drei Seiten, 429-Backoff, Abort, Laufzeitgrenze, unbekannte Stage und inkonsistente Referenzen schreiben.**
- [ ] **Step 2: Rotlauf bestätigen.** Run: `npm test -- hubSpotPageLoader hubSpotStageMapper hubSpotSourceIntegrity`. Expected: 100er-Limit und LOST-Fallback schlagen fehl.
- [ ] **Step 3: `paging.next.after` bis zum Ende laden, Backoff mit Obergrenze und AbortSignal implementieren.**
- [ ] **Step 4: Unbekannte Stages quarantänisieren; Import nur bei validen Counts, Referenzen, Pflichtfeldern und Zeitraum freigeben.**
- [ ] **Step 5: Workflow-Fixture und Envelope-Metadaten für Portal, Zeit, Quelle und Hash aktualisieren.**
- [ ] **Step 6: G51-Review und Commit.** Commit: `feat: harden HubSpot pagination and stage mapping`.

### Task 9: 067I – 33 Bildseiten semantisch rekonstruieren (G52–G55)

**Files:**
- Modify G52: `src/features/finanzen/pages/PnLPage.tsx`, `BalanceSheetPage.tsx`, `UnitEconomicsPage.tsx`; `src/features/recht/pages/ArticlesPage.tsx`, `ShareholdersPage.tsx`, `CommercialRegisterPage.tsx`; `src/features/strategie/pages/OkrsPage.tsx`, `BalancedScorecardPage.tsx`, `GrowthDriversPage.tsx`
- Modify G53: `src/features/markt/pages/MarketOverviewPage.tsx`, `CompetitionPage.tsx`, `SwotPage.tsx`; `src/features/kunden/pages/IcpPage.tsx`, `PersonaPage.tsx`, `SegmentsPage.tsx`, `TopCustomersPage.tsx`; `src/features/vertrieb/pages/FunnelPage.tsx`, `SlaPage.tsx`, `ChannelsPage.tsx`, `PlanningPage.tsx`
- Modify G54: `src/features/unternehmen/pages/IdeaPage.tsx`, `ValuePropositionPage.tsx`, `HistoryPage.tsx`; `src/features/overview/pages/CompanyProfilePage.tsx`, `YearHighlightsPage.tsx`, `DataBasisPage.tsx`; `src/features/produkt/pages/FeaturesPage.tsx`, `PricingPage.tsx`, `PerformancePage.tsx`, `RoadmapPage.tsx`
- Modify G55: `src/features/organisation/pages/HeadcountPage.tsx`, `HrPage.tsx`, `TeamStructurePage.tsx`, `src/app/routePages.tsx`, `e2e/visual.spec.ts`, `e2e/a11y.spec.ts`, `e2e/routes.spec.ts`
- Create: `src/components/ui/DataState.tsx`, `src/components/ui/AccessibleChartSummary.tsx`, `e2e/semantic-routes.spec.ts`

**Interfaces:**
- Produces pro Route genau eine `h1`, semantische Abschnitte, echte Texte/Tabellen/Charts und `loading | empty | error | ready`.

- [ ] **Step 1: Für G52 einen roten Route-Test schreiben: kein Ganzseitenbild, genau eine `h1`, Text auswählbar, Chartzusammenfassung erreichbar.**
- [ ] **Step 2: G52-Seiten mit vorhandenen Domain-Daten und Primitives umsetzen; `npm test`, Playwright 1440/768/375 und Screenshots ausführen; G52 separat reviewen und committen.** Commit: `feat: reconstruct finance legal and strategy pages`.
- [ ] **Step 3: Dieselben roten Kriterien für G53 festschreiben, Seiten umsetzen, responsive/a11y/visual prüfen, G53 separat reviewen und committen.** Commit: `feat: reconstruct market customer and sales pages`.
- [ ] **Step 4: Dieselben roten Kriterien für G54 festschreiben, Seiten umsetzen, responsive/a11y/visual prüfen, G54 separat reviewen und committen.** Commit: `feat: reconstruct company overview and product pages`.
- [ ] **Step 5: G55-Organisationsseiten und routeweite Nachprüfung abschließen.** Run: `npx playwright test e2e/semantic-routes.spec.ts e2e/a11y.spec.ts e2e/routes.spec.ts`. Expected: alle registrierten Routen semantisch, ohne Ganzseitenbild und ohne Dokument-Overflow.
- [ ] **Step 6: G55 reviewen und committen.** Commit: `feat: complete semantic reconstruction of image pages`.

### Task 10: 067J – UX, Accessibility, Assets und Clipping (G56)

**Files:**
- Modify: `src/components/layout/Header.tsx`, `Sidebar.tsx`, `Layout.tsx`, `src/components/ui/Modal.tsx`, `src/features/crm/components/CrmResponsiveList.tsx`, `src/features/resources/InternalResourcesView.tsx`, `src/features/resources/components/ResourceCard.tsx`, `src/features/resources/components/ResourceViewer.tsx`, `src/styles/global.css`, `index.html`, `vite.config.ts`, `e2e/element-clipping.spec.ts`, `e2e/a11y.spec.ts`, `e2e/routes.spec.ts`
- Create: `public/brand/leadpilot-logo.svg`, `public/brand/favicon.svg`, `public/fonts/figtree-latin.woff2`

**Interfaces:**
- Produces stabile Selektoren `#main-content`, `[data-clipping-probe]` und genau einen gerenderten CRM-Listenmodus je Breakpoint.

- [ ] **Step 1: Rote Tests für sichtbaren Logout, Skip-Link, Drawer-Fokus, Focus-Trap/Restore, Backdrop, doppelte Tabellen/Karten, Assets, lokale Fonts und Ressourcen-Clipping ausführen.**
- [ ] **Step 2: Layout- und Modal-Fokusfluss gemäß WCAG 2.2 AA korrigieren.**
- [ ] **Step 3: Tabelle oder Karten abhängig vom Breakpoint einmalig rendern; URL-Zustand bleibt erhalten.**
- [ ] **Step 4: Geschützten Resources-Bereich so anpassen, dass Badges und „Operations & SLA“ bei 375 Pixel vollständig im Container liegen.**
- [ ] **Step 5: Logo, Favicon, lokale Fonts, Bildabmessungen und AVIF/WebP-Quellen korrigieren.**
- [ ] **Step 6: Playwright-Abnahme ausführen.** Run: `npx playwright test e2e/a11y.spec.ts e2e/element-clipping.spec.ts e2e/routes.spec.ts e2e/visual.spec.ts`. Expected: 0 kritische Axe-Befunde, 0 Dokument-Overflow, 0 internes Clipping.
- [ ] **Step 7: G56-Review und Commit.** Commit: `fix: resolve accessibility assets and mobile clipping`.

### Task 11: 067K – Toolchain, Sicherheit und Codequalität (G57)

**Files:**
- Modify: `package.json`, `package-lock.json`, `.nvmrc`, `.node-version`, `eslint.config.js`, `vitest.config.ts`, `src/simulation/scenarioService.ts`, `src/simulation/eventRules.ts`, `src/features/resources/components/ResourceViewer.tsx`
- Create: `src/simulation/runExecutor.ts`, `src/simulation/runComparisonService.ts`, `src/simulation/scenarioVersionService.ts`, `src/simulation/eventRules/leadRules.ts`, `src/simulation/eventRules/dealRules.ts`, `src/simulation/eventRules/customerSuccessRules.ts`, `src/features/resources/components/ResourceContent.tsx`

**Interfaces:**
- Preserves public `ScenarioService` facade while delegating to focused Services; keine Änderung des Golden-Run-Ergebnisses.

- [ ] **Step 1: Node-Engine und Lockfile reproduzierbar setzen; sichere kompatible Versionen für React Router, Vite und LHCI auswählen.**
- [ ] **Step 2: Vor Refactoring Golden-Run, Reproduzierbarkeit und Characterization-Suites ausführen und Hash sichern.**
- [ ] **Step 3: `ScenarioService`, `eventRules` und `ResourceViewer` nach Verantwortung teilen; öffentliche Signaturen und Ergebnisse unverändert halten.**
- [ ] **Step 4: ESLint-Baselines auf 0, Prettier auf 0 Abweichungen und Coverage-Schwellen auf 80/80/75/70 setzen.**
- [ ] **Step 5: Audit ausführen.** Run: `npm audit --omit=dev && npm audit --audit-level=high`. Expected: 0 Produktion-Schwachstellen und 0 hohe/kritische Gesamtbefunde.
- [ ] **Step 6: Qualitätsgates ausführen.** Run: `npx tsc --noEmit && npm run lint && npm run format:check && npm run test:coverage && npm run verify && npm run build`. Expected: alle Grenzen grün, Golden-Run unverändert.
- [ ] **Step 7: G57-Review und Commit.** Commit: `refactor: remove quality baselines and split oversized modules`.

### Task 12: 067L – Fail-closed CI, SHA-Pinning und Ruleset (G58)

**Files:**
- Create: `scripts/verifyV23ReleaseReadiness.ts`
- Create: `scripts/__tests__/verifyV23ReleaseReadiness.vitest.ts`
- Create: `docs/operations/github-main-ruleset.md`
- Modify: `.github/workflows/ci.yml`, `package.json`, `.lighthouserc.json`, `.size-limit.json`

**Interfaces:**
- Produces Script-Exit `0` nur bei frischen, vorhandenen Artefakten und erfüllten Grenzen; GitHub-Required-Checks entsprechen den CI-Jobnamen.

- [ ] **Step 1: Tests für fehlende Coverage-, Lighthouse-, Audit-, Migration-, E2E- und Bundle-Artefakte sowie roten Unterprozess schreiben.**
- [ ] **Step 2: Rotlauf bestätigen.** Run: `npm test -- verifyV23ReleaseReadiness`. Expected: das alte Skript akzeptiert fehlende oder fest eingetragene Werte.
- [ ] **Step 3: Release-Readiness als fail-closed Orchestrator implementieren; keine Metrik darf hardcodiert sein, Fehler propagieren als Exit ungleich 0.**
- [ ] **Step 4: E2E, Axe, Migration, Audit und Readiness bei Pull Requests und `main` ausführen; alle `uses:` auf vollständige 40-stellige Commit-SHAs pinnen.**
- [ ] **Step 5: GitHub-`main`-Ruleset einrichten: Pull Request erforderlich, direkte Pushes gesperrt, Required Checks aus CI, kein stiller Admin-Bypass.**
- [ ] **Step 6: Ruleset per API prüfen.** Run: `gh api repos/mapoenisch/leadpilot-dashboard-crm/rulesets` und `gh api repos/mapoenisch/leadpilot-dashboard-crm/branches/main/protection`. Expected: aktiver Schutz mit allen Pflichtchecks.
- [ ] **Step 7: Gesamtlauf in GitHub Actions abwarten; G58 erst bei `completed success` freigeben.** Commit: `ci: enforce fail-closed v2.3.0 release gates`.

### Task 13: 067M – Benutzer, Einladungen und Rollen (G59)

**Files:**
- Create: `supabase/migrations/20260925_organization_invitations.sql`
- Create: `supabase/functions/manage-members/index.ts`
- Create: `src/features/admin/pages/MembersPage.tsx`
- Create: `src/features/admin/components/InvitationForm.tsx`
- Create: `src/services/admin/memberService.ts`
- Create: `e2e/member-management.spec.ts`
- Modify: `src/app/routes.tsx`, `src/app/routePages.tsx`, `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Produces Admin-Operationen `invite`, `revokeInvitation`, `changeRole`, `deactivateMember`; invariant: mindestens ein aktiver Admin.

- [ ] **Step 1: Rote SQL-/E2E-Tests für Viewer/Manager-Verbot, Einladung, Widerruf, Rollenwechsel und letzten Admin schreiben.**
- [ ] **Step 2: Migration und serverseitige Admin-Funktion implementieren; Service-Role bleibt ausschließlich serverseitig.**
- [ ] **Step 3: Mitgliederseite mit erklärter Rollenmatrix, Loading/Empty/Error und Bestätigung kritischer Aktionen bauen.**
- [ ] **Step 4: Rollenabnahme ausführen.** Run: `supabase test db && npx playwright test e2e/member-management.spec.ts`. Expected: Adminpfade grün, unberechtigte Rollen 403, letzter Admin geschützt.
- [ ] **Step 5: G59-Review und Commit.** Commit: `feat: add organization member and invitation management`.

### Task 14: 067N – Serverseitiges CRM Querying und Export (G60)

**Files:**
- Create: `supabase/migrations/20260926_crm_query_indexes.sql`
- Create: `src/services/crm/crmListService.ts`
- Create: `src/services/crm/crmExportService.ts`
- Create: `src/hooks/queries/useCrmListQuery.ts`
- Create: `e2e/crm-query-export.spec.ts`
- Modify: `src/features/crm/pages/LeadsPage.tsx`, `CompaniesPage.tsx`, `DealsPage.tsx`, `ActivitiesPage.tsx`, `src/features/crm/components/CrmResponsiveList.tsx`, `src/services/query/queryKeys.ts`

**Interfaces:**
- Produces: `CrmListQuery { q; filters; sort; page; pageSize }`, `CrmPage<T> { items; total; page; pageSize }` und gefilterten CSV-Export.

- [ ] **Step 1: Rote Tests für URL-Roundtrip, serverseitige Filter/Sortierung, Seitengrenzen, Rolle/Organisation und CSV-Injection schreiben.**
- [ ] **Step 2: Organisationsgebundene Query mit Whitelist-Sortierung, Indizes und stabiler Pagination implementieren.**
- [ ] **Step 3: Export serverseitig mit aktiven Filtern, UTF-8, Formel-Injection-Schutz und Audit-Eintrag implementieren.**
- [ ] **Step 4: CRM-Seiten auf Query-URL-Zustand und progressive Ergebnisse umstellen; nie gesamten Bestand rendern.**
- [ ] **Step 5: CRM-E2E ausführen.** Run: `npx playwright test e2e/crm-query-export.spec.ts`. Expected: URL wiederherstellbar, Export exakt gefiltert, Fremdorganisation ausgeschlossen.
- [ ] **Step 6: G60-Review und Commit.** Commit: `feat: add tenant-safe CRM querying and export`.

### Task 15: 067O – Quellenfrische und Degraded-Zustände (G61)

**Files:**
- Create: `src/components/data/DataSourceStatus.tsx`
- Create: `src/services/data/sourceFreshness.ts`
- Create: `src/services/data/__tests__/sourceFreshness.vitest.ts`
- Modify: `src/features/overview/pages/ExecutiveDashboardPage.tsx`, `DataBasisPage.tsx`, `src/features/crm/CRMView.tsx`, `src/features/simulation/LiveDashboardView.tsx`

**Interfaces:**
- Produces: `classifyFreshness(fetchedAt, now): 'fresh' | 'stale' | 'expired'` und Anzeige von Quelle, Modus, Zeitpunkt, Alter und Health.

- [ ] **Step 1: Grenzwerttests für frisch, stale, expired, degraded und unavailable schreiben.**
- [ ] **Step 2: Statuskomponente implementieren; Zustand nie nur über Farbe kommunizieren.**
- [ ] **Step 3: Alle datenführenden Kernseiten an Envelope-Metadaten anbinden.**
- [ ] **Step 4: Unit/Axe/Visual ausführen.** Expected: degraded/unavailable sehen niemals wie „live erfolgreich“ aus.
- [ ] **Step 5: G61-Review und Commit.** Commit: `feat: expose data provenance and freshness states`.

### Task 16: 067P – Audit, Monitoring und Diagnose (G62)

**Files:**
- Create: `supabase/migrations/20260928_audit_and_health.sql`
- Create: `src/services/audit/auditService.ts`
- Create: `src/services/health/systemHealthService.ts`
- Create: `src/features/admin/pages/AuditPage.tsx`
- Create: `src/features/admin/pages/SystemHealthPage.tsx`
- Create: `e2e/audit-health.spec.ts`
- Modify: `src/app/routes.tsx`, `src/app/routePages.tsx`, `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Produces append-only `AuditEntry` ohne Tokens/Payload/PII und `SystemHealthSnapshot` für Auth, DB, Ingress, Sync und Worker.

- [ ] **Step 1: Negative Tests für Mutation von Auditzeilen, Viewer-Zugriff, Secret-Redaktion und fehlerhafte Subsysteme schreiben.**
- [ ] **Step 2: Append-only Tabelle, RLS und sichere Audit-Schreibfunktion implementieren.**
- [ ] **Step 3: Filterbare Audit- und Diagnoseansicht mit Korrelations-ID, Zeit und sicherem Kontext bauen.**
- [ ] **Step 4: Audit-E2E ausführen.** Run: `supabase test db && npx playwright test e2e/audit-health.spec.ts`. Expected: nur Admin sieht Diagnose, Logs enthalten keine Secrets.
- [ ] **Step 5: G62-Review und Commit.** Commit: `feat: add immutable audit and system diagnostics`.

### Task 17: 067Q – Pause, Resume, Cancel und Retry (G63)

**Files:**
- Create: `src/simulation/runControlService.ts`
- Create: `src/simulation/__tests__/vitest/runControlService.vitest.ts`
- Create: `e2e/run-control.spec.ts`
- Modify: `src/types/workerMessages.ts`, `src/simulation/worker/workerAdapter.ts`, `src/simulation/worker/simulation.worker.ts`, `src/simulation/runCoordinator.ts`, `src/services/runs/runPersistenceService.ts`, `src/features/simulation/components/RunActionModal.tsx`, `src/store/slices/runSlice.ts`

**Interfaces:**
- Produces Status `paused | cancelled`, Befehle `pause`, `resume`, `cancel`, `retry`, `resumeFromSnapshot`; Aktionen sind rollen- und zustandsgebunden.

- [ ] **Step 1: Tests für sichere Tick-Grenze, Snapshot-Hash, falsche Organisation, falsche Rolle, doppelten Befehl und Retry-Idempotenz schreiben.**
- [ ] **Step 2: Kooperative Worker-Steuerung implementieren.** Cancel erzeugt `SIMULATION_CANCELLED`, ungültiges Resume `SIMULATION_RESUME_INVALID`.
- [ ] **Step 3: Snapshot atomar speichern und Resume gegen Baseline-/Modell-/Schemahash validieren.**
- [ ] **Step 4: UI-Aktionen je Status und Rolle anbieten; Viewer bleibt read-only.**
- [ ] **Step 5: Run-Control-Abnahme ausführen.** Run: `npm test -- runControlService workerIntegrity && npx playwright test e2e/run-control.spec.ts`. Expected: deterministisches Resume und kein Zombie-Worker.
- [ ] **Step 6: G63-Review und Commit.** Commit: `feat: add durable simulation run controls`.

### Task 18: 067R – Vollständige Abnahme (G64)

**Files:**
- Create: `docs/reviews/v2.3.0-acceptance-matrix.md`
- Create: `scripts/runV23Acceptance.mjs`
- Modify: `docs/reviews/v2.3.0-finding-register.md`, `scripts/verifyV23ReleaseReadiness.ts`

**Interfaces:**
- Produces maschinenlesbare Artefakte unter `artifacts/v2.3.0/` und eine Matrix, die jede Spec-Anforderung, jedes Finding und jedes Issue einem grünen Nachweis zuordnet.

- [ ] **Step 1: Acceptance-Orchestrator mit getrennten Exit-Codes für Typecheck, Lint, Format, Unit, Coverage, Integrity, SQL/RLS, E2E/Axe, Visual, Lighthouse, Bundle und Audit schreiben.**
- [ ] **Step 2: Gesamt-Abnahme ausführen.** Run: `node scripts/runV23Acceptance.mjs`. Expected: Exit 0 und alle frischen Artefakte aus demselben Lauf.
- [ ] **Step 3: Zwei-Organisationen-/Drei-Rollen-Abnahme, Reload/Zweitbrowser, n8n-Angriffe, Hash-Manipulation und Workersteuerung manuell gegen die Matrix gegenprüfen.**
- [ ] **Step 4: Alle Findings auf `verified` setzen.** Kein Critical/Important und kein GitHub-Issue bleibt ohne Gate-Nachweis.
- [ ] **Step 5: Unabhängiger Reviewer wiederholt die Gates und dokumentiert G64.** Commit: `test: complete v2.3.0 production acceptance`.

### Task 19: 067S – Migration, Lizenz und Release v2.3.0 (G65)

**Files:**
- Create: `LICENSE`
- Create: `docs/releases/V2.3.0.md`
- Create: `docs/operations/v2.3.0-runbook.md`
- Create: `docs/operations/v2.3.0-rollback.md`
- Create: `README.md`
- Modify: `package.json`, `ARCHITECTURE_DECISIONS.md`, `BUILD_PLAN.md`, `docs/BUILD_LOG.md`, `.env.example`

**Interfaces:**
- Produces wiederholbaren Neuaufbau aus leerer DB und Upgrade von v2.2.0; Tag `v2.3.0` erst nach Marcs ausdrücklicher Freigabe.

- [ ] **Step 1: Proprietäre `LICENSE` mit `All Rights Reserved`, Urheberrechtsvermerk und Nutzungsbeschränkung anlegen; README und Release Notes identisch kennzeichnen.**
- [ ] **Step 2: Drittanbieter-Lizenzen prüfen; `licenseInfo: null` bei GitHub ist für die individuelle Lizenz allein kein Fehler.**
- [ ] **Step 3: Migration gegen leere DB und v2.2.0-Demostand ausführen; synthetischen Mandanten zweimal bootstrappen und Idempotenz beweisen.**
- [ ] **Step 4: Runbook für Konfiguration, Free-Tier-Grenzen, Backups, Rollout und getesteten kompatiblen Rollback vervollständigen.**
- [ ] **Step 5: Paketversion auf `2.3.0` setzen und `npm ci` plus G64-Abnahme aus sauberem Checkout wiederholen.**
- [ ] **Step 6: Marc legt die finale Release-Freigabe ausdrücklich fest; ohne diese Freigabe kein Merge und kein Tag.**
- [ ] **Step 7: Nach Freigabe signierten Release-Commit und annotierten Tag `v2.3.0` erstellen, pushen, GitHub Actions abwarten und G65 dokumentieren.** Commit: `chore(release): publish LeadPilot v2.3.0`.

## Selbstprüfung des Plans

- Spec-Abdeckung: Abschnitte 1–22 sind den Tasks 1–19 zugeordnet; Mängelbehebung endet mit G58, Ergänzungen beginnen erst mit G59.
- Issue-Abdeckung: #2, #3, #5, #7, #8, #9 und #13 sind offenen Gates zugeordnet; #4 ist als bestehend verifiziert und verschärft; #6 wird bewusst neu geöffnet.
- Typkonsistenz: `organizationId`, `CrmReadModelEnvelope`, `SimulationBaselineInput`, `baselineHash`, `correlationId` und Rollenwerte bleiben über alle Tasks identisch.
- Schutzbereiche: Jeder erlaubte Eingriff steht in einer exakten Dateiliste und beginnt mit Charakterisierung/Golden Run.
- Keine Freigabeabkürzung: lokales Grün ersetzt weder unabhängigen Review noch GitHub-Actions-Status noch Marcs Release-Freigabe.
