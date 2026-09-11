# AUFTRAG 052 / Gate G37 — `SimulationContext` → Zustand

**Builder:** OpenCode
**Prüfung:** Codex / Claude Code
**Baseline:** `29cbcd1` (Gate G36 komplett)
**Branch:** `codex/v2.2.0-haertung`
**Status:** OFFEN
**Bezug:** `docs/BUILD_PLAN_V2.2.0.md`, Entscheidung E3 + Gate-Tabelle G37 / 052:
„Zustand-Store mit `simulationSlice`, `scenarioSlice`, `runSlice`; Selektor-Hooks;
Profiler-Messung vorher/nachher." Behebt **HOCH 4 Teil 1** (Rendering nicht
optimiert — Root Cause: ein monolithischer Context-Value löst bei jeder
Änderung ALLE 10 Konsumenten aus, unabhängig davon, welchen Teil sie
tatsächlich lesen). **HOCH 4 Teil 2** (Riesenkomponenten zerlegen,
`memo`/`useCallback` auf Komponentenebene) ist **nicht** Teil dieses
Auftrags, sondern G40 (Auftrag 058) — dieser Auftrag tauscht nur den
Datenzugriffs-Mechanismus, **keine** Komponente wird hier zerlegt oder
umstrukturiert.

## Ziel

`src/context/SimulationContext.tsx` (303 Zeilen, ein `SimulationContextValue`
mit ~30 Feldern, ein `<SimulationProvider>`) durch einen Zustand-Store mit
drei Slices ersetzen — granulare Selektor-Hooks statt eines Context, der bei
jedem Tick/jeder Aktion alle 10 Konsumenten gleichzeitig rendert. **Reine
Zugriffsschicht-Migration, kein fachliches Verhalten ändert sich** — Beweis:
alle Integritätssuiten bleiben grün, Screenshot-Vergleich identisch,
`npx playwright test` unverändert grün.

## Ist-Stand (nachgemessen)

`src/context/SimulationContext.tsx`, 303 Zeilen. Bindet zwei Singletons ein
(`simulationService: ISimulationService`, `scenarioService: ScenarioService`,
beide aus `src/simulation/`), synchronisiert sie klassisch per
`useEffect`+`useState`+`service.subscribe(...)` in React-State. Die
Provider-Props `service`/`scenService` sind zur Testinjektion gedacht,
werden aber **aktuell von niemandem überschrieben** (kein Konsument, kein
Test — per Suche bestätigt) — das vereinfacht die Migration, muss aber nicht
zwingend erhalten bleiben.

**10 Konsumenten** (`useSimulation()`), keiner davon Unit-getestet (0 Treffer
für `useSimulation`/`SimulationContext` in `*.test.*`/`*.vitest.*` — die
Regressionsdeckung läuft ausschließlich über `npm run verify` (Suiten, die
`ScenarioService`/`SimulationEngine` direkt testen, nicht über den Context)
und die Playwright-E2E-Suite):

| Datei | Zeilen | Braucht |
| --- | --- | --- |
| `ActivitiesView.tsx` | 367 | nur `simulationSlice` (`activities`, `events`) |
| `LiveDashboardView.tsx` | 279 | nur `simulationSlice` (`leads`, `deals`, `events`) |
| `DetailTierView.tsx` | 243 | `scenarioSlice`+`runSlice`+`simulationSlice` (`activeVersion`, `aggregation`, `events`, `state`) |
| `KpiTimeSeriesDetailView.tsx` | 873 | wie DetailTierView + `runs` |
| `AuditTierView.tsx` | 317 | nur `runSlice` (`runs`, `reRun`, `reproduce`) |
| `RunActionModal.tsx` | 131 | `scenarioSlice`+`runSlice` (`activeVersion`, `runVersion`, `reRun`, `runs`, `reproduce`, `draftMeasures`) |
| `MeasureManagerModal.tsx` | 561 | nur Measures (`draftMeasures`, `addDraftMeasure`, `removeDraftMeasure`, `previewMeasures`) |
| `ManagementTierView.tsx` | 322 | alle drei Slices (`state`, `activeScenario`, `activeVersion`, `aggregation`, `workerProgress`, `draftMeasures`, `start`, `pause`, `resetSimulation`) |
| `MultiScenarioComparisonModal.tsx` | 577 | `scenarioSlice` **+ ruft `scenarioService.getVersionsForScenario(...)` direkt auf der rohen Service-Instanz** |
| `ScenarioManagerModal.tsx` | 793 | `scenarioSlice` **+ ruft `scenarioService.compareVersions(...)` direkt auf der rohen Service-Instanz** |

Die letzten zwei Dateien greifen **zusätzlich** direkt auf die rohe
`ScenarioService`-Instanz zu (nicht nur über Context-Actions) — siehe
Entscheidung 6.

Keiner der 10 Konsumenten liest `.service` oder `.scenarioService` als
Objekt-Property vom Context (per Suche bestätigt) — außer den zwei
destrukturierten Direktzugriffen oben. Der `service`/`scenarioService` aus
`SimulationContextValue` selbst wird nicht gebraucht.

## Verbindliche Entscheidungen

1. **Neues Verzeichnis `src/store/`**: `src/store/simulationStore.ts` (Store
   erzeugen, kombiniert alle drei Slices — sie sind nicht unabhängig
   voneinander lauffähig, z. B. braucht `previewMeasures` die
   `activeVersionId` aus dem Scenario-Teil), `src/store/slices/simulationSlice.ts`,
   `src/store/slices/scenarioSlice.ts`, `src/store/slices/runSlice.ts`
   (Zustand-Slice-Pattern: je eine `StateCreator`-Funktion), `src/store/hooks.ts`
   (exportierte Selektor-Hooks, ein Hook pro logischem Bedarf — kein rohes
   `useSimulationStore(state => state.x)` verstreut in Komponenten, Muster
   analog `useLiveKpi*`/`useCrmQueries` aus G34/G36).
2. **`draftMeasures`/`addDraftMeasure`/`removeDraftMeasure`/`setDraftMeasures`/
   `previewMeasures` gehören zu `scenarioSlice`** (nicht in der 3-Slice-Liste
   des Plans explizit genannt — hier festgelegt, weil `previewMeasures` von
   `activeVersionId` abhängt). Im Bericht kurz bestätigen.
3. **Store abonniert `simulationService.subscribe(...)` bei Store-Erzeugung**
   (Modul-Ladezeit), nicht mehr in einem Provider-`useEffect`. Kein
   Provider-Baum mehr (E3) — `<SimulationProvider>` in `src/app/App.tsx`
   entfällt vollständig, Konsumenten importieren die Hooks aus
   `src/store/hooks.ts` direkt. Da `App.tsx` genau einmal für die gesamte
   App-Lebensdauer existiert, ist das Fehlen von Unsubscribe-on-Unmount in
   Produktion folgenlos — **aber**: Vite-HMR im Dev-Modus könnte das
   Store-Modul neu laden und eine zweite, nie aufgeräumte Subscription
   erzeugen. Prüfen und im Bericht festhalten, ob das ein reales Problem ist
   (z. B. `import.meta.hot.dispose`) oder ob es vernachlässigbar ist — keine
   Vorgabe der Lösung, nur der Prüfpflicht.
4. **Selektor-Hooks mit `useShallow`** (`zustand/react/shallow`) für jeden
   Selektor, der mehr als ein Feld als Objekt zurückgibt — sonst erzeugt
   Zustand bei jedem Aufruf eine neue Objektreferenz und der Konsument
   rendert trotzdem bei jedem Store-Update (genau der Bug, den dieser
   Auftrag beheben soll, nur eine Ebene tiefer versteckt).
5. **Actions sind stabile Store-Methoden** (`set`/`get` im Slice-Creator),
   kein `useCallback`-Wrapping mehr nötig auf Komponentenseite — das ist ein
   Nebeneffekt-Gewinn der Migration, kein zusätzlicher Auftrag.
6. **`scenarioService.getVersionsForScenario(...)`** (`MultiScenarioComparisonModal.tsx`)
   **und `scenarioService.compareVersions(...)`** (`ScenarioManagerModal.tsx`)
   bleiben direkte Aufrufe auf den Singleton — aber importiert direkt aus
   `src/simulation/scenarioService.ts` statt über den Store/Context
   geschleust. Das ist bereits gängiges Muster im Code
   (`MeasureManagerModal.tsx` importiert z. B. bereits direkt aus
   `simulation/parameterRegistry` und `simulation/systemContext`) und laut
   `eslint.config.js`-Zonen zulässig (`features → simulation` erlaubt). Kein
   Escape-Hatch im Store für den rohen Service nötig.
7. **`src/simulation/**` bleibt nach Möglichkeit vollständig unberührt** (0
   Diff) — der Store ruft ausschließlich bestehende öffentliche Methoden auf
   (`subscribe`, `getState`, `getScenarios`, …), genau wie der bisherige
   Context. Falls beim Bauen doch eine Änderung dort unausweichlich
   erscheint: **stoppen, Konflikt dokumentieren**, nicht eigenmächtig
   erweitern (`CLAUDE.md` §8).
8. **`src/context/SimulationContext.tsx` wird am Ende gelöscht** (Block D),
   nicht nur entkoppelt — kein totes Parallelsystem im Repo.
9. **Profiler-Nachweis (Plan-Pflicht, Block D):** eine reproduzierbare
   Interaktion (z. B. Simulation starten, N Ticks laufen lassen, zwischen
   Tiers wechseln) vor der Migration (Baseline `29cbcd1`, separater
   Build/Worktree) und danach mit React Profiler messen — konkrete Zahlen
   (Re-Render-Anzahl je betroffener Komponente, nicht nur „gefühlt
   schneller"). Mechanismus dem Builder überlassen (`<Profiler onRender>`,
   React DevTools Profiler-Export, o. ä.), aber das Ergebnis muss im Bericht
   als Vorher/Nachher-Zahlenpaar stehen.
10. **Keine neue Abhängigkeit außer `zustand`** (aktuelle stabile Version,
    exakt gepinnt wie `@tanstack/react-query` in Auftrag 051).
11. **Kein fachliches Verhalten ändert sich.** Gleiche Funktionssignaturen
    nach außen betrachtet (ein Konsument, der vorher `runVersion(id)` rief,
    ruft danach denselben `runVersion(id)` über einen Selektor-Hook auf —
    Reihenfolge/Timing von `refreshData()` nach Aktionen bleibt erhalten).

## Grenzen und Schutzbereiche

- `src/context/**` ist für diesen Auftrag **ausdrücklich freigegeben**
  (dediziert dafür geschrieben, siehe `BUILD_PLAN_V2.2.0.md` Abschnitt
  „Schutzbereiche während V2.2.0") — sonst gilt `CLAUDE.md` §6 unverändert.
- `git diff 29cbcd1 -- src/simulation src/types src/services/data src/features/resources` muss **leer** sein.
- Nichts außerhalb der Tabelle „Erlaubte Dateien" unten anfassen.
- Kein Eingriff in `ISimulationService`/`ScenarioService`-Signaturen — nur Konsument.
- Kein Merge, Tag oder Push ohne ausdrückliche Freigabe.

## Blöcke

### Block A — Store-Grundgerüst (noch nichts umgestellt)

- [ ] `zustand` installieren (exakte Version).
- [ ] Drei Slice-Dateien unter `src/store/slices/` (Entscheidung 1+2), `src/store/simulationStore.ts` kombiniert sie.
- [ ] Store abonniert `simulationService` bei Erzeugung (Entscheidung 3), HMR-Frage geprüft und dokumentiert.
- [ ] `src/store/hooks.ts`: alle Selektor-Hooks (mit `useShallow` wo nötig, Entscheidung 4).
- [ ] Vitest-Unit-Tests für den Store (co-located, Projekt-Konvention): Actions verändern State korrekt, `subscribe`-Callback aktualisiert `simulationSlice`, Selektoren geben stabile Referenzen zurück wo erwartet.
- [ ] Noch **kein** Konsument umgestellt, `SimulationContext.tsx`/`SimulationProvider` bleiben unverändert im Einsatz — reine Additiv-Änderung, 0 Risiko für bestehende Funktionalität.
- [ ] `npx tsc --noEmit`, `npm run verify`, `npm test`, `npm run build` grün (der neue Store ist zu diesem Zeitpunkt totes/unbenutztes Zusatzcode, darf aber nichts brechen).

### Block B — Einfache Konsumenten (Einzel-Slice)

- [ ] `ActivitiesView.tsx`, `LiveDashboardView.tsx`, `DetailTierView.tsx`, `KpiTimeSeriesDetailView.tsx`, `AuditTierView.tsx` auf die neuen Selektor-Hooks umstellen.
- [ ] `npm run verify`, `npm test`, `npm run build` grün. Screenshots (betroffene Routen) 1440/768/375, Erfolgsfall pixelidentisch.
- [ ] `npx playwright test` weiterhin grün (deckt u. a. `/crm/leads`-Nachbarschaft und die Simulation-Tiers ab, sofern in `e2e/routes.spec.ts`/`visual.spec.ts` erfasst — prüfen, welche Routen betroffen sind).

### Block C — Komplexe Konsumenten (Multi-Slice + Direktzugriff)

- [ ] `RunActionModal.tsx`, `MeasureManagerModal.tsx`, `ManagementTierView.tsx`, `MultiScenarioComparisonModal.tsx`, `ScenarioManagerModal.tsx` auf die neuen Hooks umstellen.
- [ ] Die zwei Direktaufrufe auf `scenarioService` (Entscheidung 6) auf direkten Import umgestellt, nicht über den Store geleitet.
- [ ] `npm run verify`, `npm test`, `npm run build`, `npx playwright test` grün. Screenshots wie Block B.

### Block D — Aufräumen + Profiler-Nachweis

- [ ] `src/context/SimulationContext.tsx` löschen, `<SimulationProvider>` aus `src/app/App.tsx` entfernen.
- [ ] `useSimulation`/`SimulationContext`/`SimulationProvider`: 0 verbleibende Referenzen im gesamten `src/` (`grep -rn`).
- [ ] Profiler-Vorher/Nachher-Nachweis (Entscheidung 9) im Bericht.
- [ ] Vollständige Pflicht-Verifikation (siehe unten) ein letztes Mal am Gesamtergebnis.

## Erlaubte Dateien

| Bereich | Blöcke |
| --- | --- |
| `package.json`, `package-lock.json` (nur `zustand`) | A |
| `src/store/**` (neu) | A |
| `src/features/crm/components/ActivitiesView.tsx` | B |
| `src/features/simulation/LiveDashboardView.tsx` | B |
| `src/features/simulation/components/DetailTierView.tsx` | B |
| `src/features/simulation/components/KpiTimeSeriesDetailView.tsx` | B |
| `src/features/simulation/components/AuditTierView.tsx` | B |
| `src/features/simulation/components/RunActionModal.tsx` | C |
| `src/features/simulation/components/MeasureManagerModal.tsx` | C |
| `src/features/simulation/components/ManagementTierView.tsx` | C |
| `src/features/simulation/components/MultiScenarioComparisonModal.tsx` | C |
| `src/features/simulation/components/ScenarioManagerModal.tsx` | C |
| `src/context/SimulationContext.tsx` (löschen) | D |
| `src/app/App.tsx` | D |
| `docs/BUILD_LOG.md`, dieser Auftrag | Bericht |

Andere Dateien sind nicht erlaubt. Insbesondere: kein Eingriff in
`src/simulation/**` (Entscheidung 7), `eslint.config.js` nur falls eine neue
Zonen-Regel für `src/store/` zwingend nötig wird — dann explizit im Bericht
begründen, warum.

## Pflicht-Verifikation

```bash
npx tsc --noEmit                     # 0 Fehler
npm run lint                          # Ratsche nicht erhöht
npm run verify                        # 24/24 — nach jedem Block
npm test                              # alle Vitest grün, inkl. neuer Store-Tests
npm run build                         # Exit 0
npx playwright test                   # weiterhin alle grün (153 zum Zeitpunkt dieses Auftrags)
grep -rn "useSimulation\|SimulationContext\|SimulationProvider" src   # 0 Treffer nach Block D
git diff 29cbcd1 -- src/simulation src/types src/services/data src/features/resources   # leer
```

Screenshot-Harness analog Auftrag 051: 1440/768/375px, Vorher/Nachher-Paare
für die betroffenen Routen, Erfolgsfall-Hashes gleich (bei kleinen
Rendering-Rauschen wie in Auftrag 051 dokumentiert per Pixel-Diff + Playwright-
Visual-Gegenprobe nachweisen, nicht blind auf SHA-256 verlassen), Ergebnis-
Matrix unter `docs/screenshots/auftrag-052/README.md`.

## Builder-Bericht und Commit

Abschnitt **„Gate G37 – Auftrag 052: `SimulationContext` → Zustand"** an den
Anfang von `docs/BUILD_LOG.md`:

- Je Block: Commit-Hash, was geändert wurde, `verify`/`playwright`-Status.
- Store-Architektur kurz erklärt (Slice-Aufteilung, warum Measures bei
  `scenarioSlice`, wie die `subscribe`-Bindung funktioniert, HMR-Befund).
- Profiler-Vorher/Nachher-Zahlen mit der genauen Interaktion, die gemessen wurde.
- Bestätigung: `src/simulation/**` 0 Diff (oder dokumentierter Konflikt, falls doch nötig).
- Command-Matrix mit allen Ergebnissen aus der Pflicht-Verifikation.

## Akzeptanzkriterien für die Prüfung

- Kein `useSimulation`/`SimulationContext`/`SimulationProvider` mehr im Code.
- Jeder der 10 ehemaligen Konsumenten nutzt granulare Selektor-Hooks, keine
  Komponente zieht sich „der Einfachheit halber" den kompletten Store.
- Selektoren mit Objekt-Rückgabe nutzen `useShallow` — Prüfer testet
  stichprobenartig, ob ein irrelevantes Store-Update einen Konsumenten
  trotzdem neu rendert (React DevTools Profiler oder `console.count` in
  einer Komponente).
- `src/simulation/**` 0 Diff (oder sauber begründete Ausnahme).
- Profiler-Zahlen zeigen eine tatsächliche Verbesserung, nicht nur eine
  Behauptung.
- `npm run verify` 24/24, `test`/`build`/`playwright` grün, Lint-Ratsche
  nicht erhöht.
- Sichtbare Daten/Reihenfolge unverändert (Screenshot- und Playwright-Beweis).
- Kein neues Business-Feature, keine Komponenten-Zerlegung (bleibt G40).

**Abnahme:** Erst nach unabhängigem Review ist Gate G37 abgeschlossen. Kein
Merge, Tag oder Push ohne ausdrückliche Freigabe.
