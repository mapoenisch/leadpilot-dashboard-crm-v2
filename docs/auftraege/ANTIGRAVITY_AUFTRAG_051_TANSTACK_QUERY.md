# AUFTRAG 051 / Gate G36 — TanStack Query für Server-State

**Builder:** OpenCode
**Prüfung:** Codex / Claude Code
**Baseline:** `9328255` (Gate G35 komplett freigegeben)
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Bezug:** `docs/BUILD_PLAN_V2.2.0.md`, Entscheidung E4 + Gate-Tabelle G36 / 051:
„TanStack Query für HTTP-State; ein Musterfall Optimistic Update; Grenze zum
Realtime-Store dokumentiert."

## Ziel

Die vier handgebauten `useEffect`+`useState`-Datenabrufe gegen `CRMRepository`
durch TanStack Query (`useQuery`) ersetzen, die einzige echte Schreib-Mutation
(`seedDatabase`) durch `useMutation` mit einem Optimistic-Update-Musterfall,
und die Grenze zwischen drei parallelen State-Schichten schriftlich
dokumentieren — **ohne** eine neue Fachfunktion einzuführen (V2.2.0 ist
Härtung, siehe Kopf von `BUILD_PLAN_V2.2.0.md`).

## Ist-Stand (nachgemessen, nicht geschätzt)

Vier Dateien mit identischem, dupliziertem Muster (`useEffect` + `useState`
+ Promise-Chain + `isMounted`-Guard, Fehler nur `logger.error(...)`, keine
Fehler-UI):

| Datei | Zeilen | Ruft auf | Fehlerzustand |
| --- | --- | --- | --- |
| `src/features/crm/pages/DealsPage.tsx` | 35 | `CRMRepository.getImportedFunnelDeals()` | nur geloggt, keine UI |
| `src/features/crm/pages/CompaniesPage.tsx` | 35 | `CRMRepository.getCompanies()` | nur geloggt, keine UI |
| `src/features/crm/pages/LeadsPage.tsx` | 413 | `Promise.all([getCompanies, getContacts, getImportedFunnelDeals, getAuditSummary])` | nur geloggt, keine UI; **Bug Z. 49-50:** `catch {}` ohne Bindung referenziert trotzdem `err` |
| `src/components/executiveCockpit/PipelineSnapshot.tsx` | 203 | `getPipelineOverview(CRMRepository)` (Domain-Helper) | **einzige** der vier mit echtem `loading`/`error`/`empty`-State über `<ManagementChartState>` — Referenzmuster für die anderen drei |

**Einzige echte Server-Mutation im HTTP-Scope:** `CRMRepository.seedDatabase()`
(`LeadsPage.tsx:61-82`, Button „Datensätze synchronisieren/seeden", Tab
„audit"), delegiert an `seedSupabaseDatabase()` (`services/import/crmSeeder.ts`,
idempotente Upserts gegen Supabase). Nach Erfolg aktuell manueller Re-Fetch
(`loadDataFromRepository()`). Die einzigen granularen CRM-Schreibpfade
(`addLead`, `updateLeadStatus`) sind in `crmRepository.ts:168-169` **absichtlich**
deaktiviert (`never`, wirft Error — „Operativer CRM-Schreibpfad ist nicht Teil
dieser App", B22/BUILD_PLAN D1) — **die dürfen in diesem Auftrag nicht
reaktiviert werden**, auch nicht für ein "saubereres" Optimistic-Update-Beispiel.
Deshalb: der geforderte Optimistic-Update-Musterfall läuft auf **Metadaten-Ebene**
(Sync-Status), nicht auf Entity-Ebene — siehe Block E.

**Zwei Abgrenzungen, die NICHT in den TanStack-Query-Scope gehören** (per
Recherche verifiziert, im Auftrag dokumentieren, siehe Block A):

1. **Realtime-KPI-Streams** (`src/hooks/useLiveKpi.ts`, `useLiveKpiHistory.ts`,
   `useLiveKpiActivity.ts`) — laufen über einen eigenen Store mit
   `useSyncExternalStore` (in G33/G34 gehärtet), kein Request/Response-Zyklus.
   Bleiben unverändert.
2. **Simulation-Domain-Aktionen** (`RunActionModal.tsx`, `AuditTierView.tsx`)
   — rufen `scenService.runVersion/reRun/reproduce` über `SimulationContext`
   auf (`src/context/SimulationContext.tsx:202-226`), das ist In-Memory-
   Simulationszustand der geschützten `src/simulation/`-Zone, kein HTTP-
   Server-State. Bleiben unverändert.

## Verbindliche Entscheidungen

1. **Neue Abhängigkeit, hier ausdrücklich freigegeben (einzige):**
   `@tanstack/react-query` (aktuelle stabile v5, exakte Version im Bericht
   nennen). `@tanstack/react-query-devtools` optional als `devDependency`,
   nur `import.meta.env.DEV`-gated eingebunden — kein Bundle-Gewicht in Prod.
2. **Ein `QueryClient`**, eine Stelle: neue Datei `src/app/queryClient.ts`.
   In `src/app/App.tsx` `<QueryClientProvider client={queryClient}>` um
   `<SimulationProvider>` legen (innerhalb `<RouteErrorBoundary>`) — eine
   einzige, minimal-invasive Änderung an `App.tsx`.
3. **Zentrale Query-Keys**, keine verstreuten String-Literale: neue Datei
   `src/services/query/queryKeys.ts` mit einer Key-Factory (`crmKeys.companies()`,
   `crmKeys.contacts()`, `crmKeys.deals()`, `crmKeys.auditSummary()`,
   `crmKeys.pipelineOverview()`, `crmKeys.syncStatus()`).
4. **Neue Hooks unter `src/hooks/queries/`** (ein Hook oder wenige pro Datei,
   Aufteilung dem Builder überlassen) — importieren aus `services/db/crmRepository`
   und `domain/executiveCockpitData`. Das ist laut `eslint.config.js`-Zonen
   zulässig (Regel verbietet nur `services → components/features`, nicht
   `hooks → services`), analog zum bestehenden `useLiveKpi*`-Muster.
5. **`crmRepository.ts` selbst bleibt unverändert** — nur als Konsument
   importiert. Kein Eingriff in die Datenquellen-Schicht.
6. **Fehlerzustände vereinheitlichen:** `DealsPage.tsx`, `CompaniesPage.tsx`,
   `LeadsPage.tsx` bekommen dasselbe `<ManagementChartState>`-Muster wie
   `PipelineSnapshot.tsx` (bestehende Komponente wiederverwenden, siehe
   `CLAUDE.md` §8 — nicht neu erfinden). Das macht Fehler erstmals sichtbar,
   die vorher still verschluckt wurden — das ist eine gewollte Verbesserung
   dieses Auftrags, keine unangekündigte Abweichung.
7. **`LeadsPage.tsx:49-50`-Bug** (`catch {}` referenziert trotzdem `err`)
   wird **nicht separat gepatcht**, sondern verschwindet als Konsequenz davon,
   dass das manuelle `try/catch` durch `useQuery`s `isError`/`error` ersetzt
   wird. Im Bericht kurz erwähnen, kein eigener Fix-Commit nötig.
8. **Optimistic-Update-Musterfall (Block E):** `seedDatabase` über
   `useMutation`. `onMutate`: Sync-Status-Query-Cache-Eintrag
   (`crmKeys.syncStatus()`) optimistisch auf `'syncing'` setzen, alten Wert
   für Rollback merken. `onError`: Rollback auf den gemerkten Wert +
   Fehleranzeige. `onSuccess`/`onSettled`: `queryClient.invalidateQueries`
   für `companies`/`contacts`/`deals`/`auditSummary` (ersetzt den bisherigen
   manuellen `loadDataFromRepository()`-Re-Fetch) und Sync-Status zurück auf
   `'idle'`/`'success'`. **Bewusst auf Metadaten-Ebene, nicht Entity-Ebene** —
   Begründung siehe Ist-Stand oben, im Bericht wiederholen, damit die Prüfung
   nicht nach einer granularen Entity-Optimistic-Update sucht, die es im
   aktuellen Scope nicht geben darf.
9. **Sichtbare Business-Daten/-Reihenfolge unverändert.** Screenshot-Vergleich
   Pflicht (siehe `CLAUDE.md` §7) — der Erfolgsfall (Daten geladen, kein
   Fehler) muss pixelidentisch zur Baseline bleiben. Die neu sichtbaren
   Error-/Loading-States sind neue Aufnahmen, kein Vorher/Nachher-Vergleich
   nötig, da vorher keine eigene Fehler-UI existierte.
10. **Grenze dokumentieren** (E4-Pflicht): neuer Abschnitt in
    `ARCHITECTURE_DECISIONS.md` Teil B (Ziel-Architektur) — 3 Absätze, je
    einer für TanStack Query (HTTP-Server-State), Zustand/`useSyncExternalStore`
    (Realtime-Stream), `SimulationContext` (In-Memory-Simulationszustand),
    mit den zwei Abgrenzungen aus dem Ist-Stand oben.
11. **Keine weitere neue Abhängigkeit**, kein Anfassen von `package-lock.json`
    über die eine Dependency hinaus.

## Grenzen und Schutzbereiche

- `git diff 9328255 -- src/simulation src/types src/context src/services/data src/services/db/crmRepository.ts src/features/resources src/features/simulation src/hooks/useLiveKpi.ts src/hooks/useLiveKpiHistory.ts src/hooks/useLiveKpiActivity.ts` muss **leer** sein.
- Nichts außerhalb der Tabelle „Erlaubte Dateien" unten anfassen.
- `RunActionModal.tsx`, `AuditTierView.tsx`: unangetastet (siehe Abgrenzung 2 oben).
- Kein Reaktivieren von `addLead`/`updateLeadStatus`/`getLeads`/`getDeals`/`getActivities` in `crmRepository.ts`.
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.

## Blöcke

### Block A — Grundgerüst

- [ ] `@tanstack/react-query` installieren (+ optional Devtools als `devDependency`).
- [ ] `src/app/queryClient.ts`: `QueryClient`-Instanz mit begründeten `defaultOptions` (`staleTime`, `retry` — kurz im Bericht begründen, kein Cargo-Cult-Default).
- [ ] `src/services/query/queryKeys.ts`: Key-Factory wie in Entscheidung 3.
- [ ] `App.tsx`: `QueryClientProvider` einhängen (Entscheidung 2), Devtools nur `DEV`-gated.
- [ ] `ARCHITECTURE_DECISIONS.md`: Grenz-Dokumentation (Entscheidung 10).
- [ ] `npx tsc --noEmit`, `npm run build` grün.

### Block B — `DealsPage.tsx` + `CompaniesPage.tsx`

- [ ] Beide auf `useQuery` umstellen (Hooks aus `src/hooks/queries/`).
- [ ] `<ManagementChartState>` für `loading`/`error`/`empty` einbauen.
- [ ] Manuelles `useEffect`+`useState`+`isMounted`-Pattern vollständig entfernt.
- [ ] `npm run verify` 24/24, `npm test`, `npm run build` grün.
- [ ] Screenshots 1440/768/375, Erfolgsfall pixelidentisch zur Baseline.

### Block C — `LeadsPage.tsx` (ohne die Mutation)

- [ ] Die vier parallelen Reads (`getCompanies`, `getContacts`, `getImportedFunnelDeals`, `getAuditSummary`) auf `useQuery`/`useQueries` umstellen.
- [ ] Bug Z. 49-50 verschwindet durch Wegfall des manuellen `try/catch` (Entscheidung 7) — im Bericht kurz erwähnen.
- [ ] `<ManagementChartState>` einbauen.
- [ ] `npm run verify`, `npm test`, `npm run build` grün. Screenshots wie Block B.

### Block D — `PipelineSnapshot.tsx`

- [ ] Auf `useQuery` (wrapt `getPipelineOverview`) umstellen.
- [ ] Bestehendes `<ManagementChartState>`-Muster bleibt strukturell erhalten, nur die Datenherkunft wechselt.
- [ ] `npm run verify`, `npm test`, `npm run build` grün. Screenshots wie Block B.

### Block E — Mutation + Optimistic Update (`seedDatabase`)

- [ ] `useMutation` in `LeadsPage.tsx` gemäß Entscheidung 8 (`onMutate`/`onError`/`onSuccess`/`onSettled`, Rollback getestet).
- [ ] Manuellen `loadDataFromRepository()`-Re-Fetch nach Seed durch `invalidateQueries` ersetzen.
- [ ] Testfall: Mutation künstlich fehlschlagen lassen (z. B. gemockter Fehler) → Sync-Status rollt korrekt zurück, keine falschen Daten sichtbar.
- [ ] `npm run verify`, `npm test`, `npm run build` grün. Screenshots (Sync-Button-Zustände: idle/syncing/error) neu aufgenommen.

## Erlaubte Dateien

| Bereich | Blöcke |
| --- | --- |
| `package.json`, `package-lock.json` (nur `@tanstack/react-query`[-devtools]) | A |
| `src/app/queryClient.ts` (neu) | A |
| `src/services/query/queryKeys.ts` (neu) | A |
| `src/app/App.tsx` | A |
| `docs/ARCHITECTURE_DECISIONS.md` (nur Teil B ergänzen) | A |
| `src/hooks/queries/*.ts` (neu) | A–E |
| `src/features/crm/pages/DealsPage.tsx` | B |
| `src/features/crm/pages/CompaniesPage.tsx` | B |
| `src/features/crm/pages/LeadsPage.tsx` | C, E |
| `src/components/executiveCockpit/PipelineSnapshot.tsx` | D |
| `docs/BUILD_LOG.md`, dieser Auftrag | Bericht |

Andere Dateien sind nicht erlaubt.

## Pflicht-Verifikation

```bash
npx tsc --noEmit                     # 0 Fehler
npm run lint                          # Ratsche nicht erhöht (aktuell 19/3)
npm run verify                        # 24/24 — simulation-Suiten unberührt, müssen trivial grün bleiben
npm test                              # alle Vitest grün
npm run build                         # Exit 0
git diff 9328255 -- src/simulation src/types src/context src/services/data src/services/db/crmRepository.ts src/features/resources src/features/simulation src/hooks/useLiveKpi.ts src/hooks/useLiveKpiHistory.ts src/hooks/useLiveKpiActivity.ts   # leer
grep -rn "useEffect" src/features/crm/pages/DealsPage.tsx src/features/crm/pages/CompaniesPage.tsx src/features/crm/pages/LeadsPage.tsx src/components/executiveCockpit/PipelineSnapshot.tsx   # kein Daten-Fetch-useEffect mehr
```

Screenshot-Harness analog `scripts/captureAuftragXXXGateScreenshots.mjs`:
1440/768/375px, Vorher/Nachher-Paare für den Erfolgsfall (SHA-256 muss
**gleich** bleiben, nicht verschieden — hier wird bewusst Bild-Gleichheit
bewiesen, kein visueller Umbau), neue Aufnahmen für Loading-/Error-/
Sync-Status-Zustände, Ergebnis-Matrix unter `docs/screenshots/auftrag-051/README.md`.

## Builder-Bericht und Commit

Abschnitt **„Gate G36 – Auftrag 051: TanStack Query für Server-State"** an
den Anfang von `docs/BUILD_LOG.md`:

- Je Block: Commit-Hash, was geändert wurde, `verify`-Status.
- Block E: der Optimistic-Update-Ablauf im Detail (Code-Auszug `onMutate`/
  `onError`/`onSettled`), Beweis für den Rollback-Fall.
- Gewählte `@tanstack/react-query`-Version, `defaultOptions`-Begründung.
- Screenshot-Matrix (Erfolgsfall-Hashes gleich, neue Zustände dokumentiert).
- Command-Matrix mit allen Ergebnissen aus der Pflicht-Verifikation.

## Akzeptanzkriterien für die Prüfung

- Alle vier Lese-Zugriffe laufen über `useQuery`; kein manuelles
  `useEffect`+`useState`+Promise-Pattern mehr in den vier Ziel-Dateien.
- `seedDatabase` läuft über `useMutation`; Optimistic Update auf
  Sync-Status-Ebene nachweisbar (`onMutate` setzt optimistischen Wert,
  `onError` rollt zurück — Prüfer testet das aktiv, nicht nur Code lesen).
- Realtime-KPI-Hooks und Simulation-Domain-Aktionen (`RunActionModal`,
  `AuditTierView`, `SimulationContext`) 0 Diff.
- `crmRepository.ts` 0 Diff, keine reaktivierten Schreibpfade.
- Grenz-Dokumentation in `ARCHITECTURE_DECISIONS.md` vorhanden und inhaltlich
  korrekt (3 Schichten sauber getrennt).
- Sichtbare Daten/Reihenfolge im Erfolgsfall unverändert (Screenshot-Hash
  gleich); neue Fehler-/Lade-Zustände sind eine dokumentierte, gewollte
  Verbesserung.
- `git diff` außerhalb der erlaubten Dateien leer.
- `npm run verify` 24/24, `test` grün, `build` 0, Lint-Ratsche nicht erhöht.
- Keine neue Fachfunktion (kein reaktivierter CRM-Schreibpfad, keine neue
  UI-Aktion außerhalb des bestehenden Seed-Buttons).

**Abnahme:** Erst nach unabhängigem Review ist Gate G36 abgeschlossen. Kein
Merge, Tag oder Push ohne ausdrückliche Freigabe.
