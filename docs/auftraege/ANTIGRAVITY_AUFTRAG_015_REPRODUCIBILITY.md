# ANTIGRAVITY AUFTRAG 015 — Reproduzierbarkeit härten

**Basis:** `BUILD_PLAN.md` Phase 1 · Befunde C4-2, C4-3, C4-4, C4-5, C4-6 aus `ARCHITECTURE_DECISIONS.md` Teil C.4
**Gewählte Optionen:** D4-A (Options-Param + `systemContext`), D5-A (bestehende Testkonvention), D6-A (`correlationId` minimal)
**Abnahme:** Gate **G1** (siehe unten)
**Nicht anfassen:** `SimulationEngine.executeTick` ist bereits deterministisch (rng + state injiziert) — Änderungen nur in der Orchestrierungsschicht.

Regel für den gesamten Auftrag: **keine `Math.random()`, `Date.now()`, `new Date()` in der Run-Erzeugungs- oder Tick-Kette.** Erlaubt bleibt ausschließlich: `window.setTimeout` im Live-Loop von `SimulationService` (Playground, nicht reproduzierbar — siehe B20) und `crmRepository.addLead`/`updateLeadStatus` (werden in AUFTRAG 016 entfernt; bis dahin mit `// REMOVED IN AUFTRAG_016` markieren).

---

## Schritt 1 — `src/simulation/systemContext.ts` (NEU)

Zentrale, test-überschreibbare Quelle für Zeit, IDs und neue Run-Seeds.

```ts
import { DeterministicRNG } from './prng';

export interface SystemContext {
  now(): string;                                   // ISO-8601 Zeitstempel
  nextScenarioId(): string;
  nextRunId(seed: number, versionNumber: number): string;
  nextCorrelationId(): string;
  newRunSeed(): number;                             // 100000..999999
}

const realImpl: SystemContext = {
  now: () => new Date().toISOString(),
  nextScenarioId: () => `scen-${cryptoInt()}`,
  nextRunId: (seed, v) => `run-s${seed}-v${v}-${cryptoInt()}`,
  nextCorrelationId: () => `corr-${cryptoInt()}`,
  newRunSeed: () => 100000 + (cryptoInt() % 900000),
};

function cryptoInt(): number {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
  }
  // Nur als Fallback in Nicht-Browser-Umgebungen ohne WebCrypto.
  return Math.floor(Math.random() * 0xffffffff);
}

let active: SystemContext = realImpl;

export const systemContext = {
  now: () => active.now(),
  nextScenarioId: () => active.nextScenarioId(),
  nextRunId: (seed: number, v: number) => active.nextRunId(seed, v),
  nextCorrelationId: () => active.nextCorrelationId(),
  newRunSeed: () => active.newRunSeed(),

  /** Nur für Tests: einzelne Felder deterministisch überschreiben. */
  __overrideForTest(partial: Partial<SystemContext>) {
    active = { ...active, ...partial };
  },
  __resetForTest() {
    active = realImpl;
  },
};
```

> Begründung: Der neue Run-Seed darf aus echter Entropie kommen — er wird im `RunManifest` gespeichert, `reproduce()` bleibt darüber exakt. Nur die *Erzeugung* wird injizierbar, nicht die Reproduktion.

Konstante ergänzen (falls nicht vorhanden), z. B. in `src/simulation/scenarioRepository.ts` oder neuer `src/simulation/constants.ts`:

```ts
export const BASELINE_PERIOD_START = '2026-01-01';   // Entscheidung 1347
```

---

## Schritt 2 — `src/simulation/scenarioService.ts` umstellen

### 2a. Import

```ts
import { systemContext } from './systemContext';
import { BASELINE_PERIOD_START } from './constants';
```

### 2b. `RunOptions` einführen

Neuer Typ (in `src/types/scenario.ts`, siehe Schritt 3) und 4. Parameter:

```ts
public runScenarioVersion(
  versionId: string,
  seedOverride?: number,
  targetTicks = 50,
  opts?: RunOptions,          // NEU
): RunExecutionResult {
```

`RunOptions`:
```ts
export interface RunOptions {
  simulationStartDate?: string;   // Default: BASELINE_PERIOD_START
  correlationId?: string;         // Default: systemContext.nextCorrelationId()
  baselineVersion?: string;       // wird in AUFTRAG 016 verwendet; jetzt Default 'v1.0'
}
```

### 2c. Ersetzungen in `scenarioService.ts`

| Zeile (ca.) | Alt | Neu |
|---|---|---|
| ~87 | `` `scen-${randomSeed}` `` / `Math.random()`-Seed | `const scenarioId = systemContext.nextScenarioId();` |
| ~90 | `new Date().toISOString()` | `systemContext.now()` |
| ~146 | `new Date().toISOString()` | `systemContext.now()` |
| ~192 | `seedOverride ?? Math.floor(Math.random()*899999)+100000` | `seedOverride ?? systemContext.newRunSeed()` |
| ~205 | `` `run-s${seed}-v${...}-${Math.floor(Math.random()*1000)}` `` | `systemContext.nextRunId(seed, version.versionNumber)` |
| ~206 | `new Date().toISOString()` (createdAt) | `systemContext.now()` |
| ~313 | `new Date().toISOString()` (completedAt) | `systemContext.now()` |
| ~357 (`reRun`) | `Math.floor(Math.random()*899999)+100000` | `systemContext.newRunSeed()` |

### 2d. `simulationStartDate` nie mehr aus der Wall-Clock

Im `RunManifest`-Aufbau:
```ts
simulationStartDate: opts?.simulationStartDate ?? BASELINE_PERIOD_START,
```
(Behebt den Verstoß gegen Entscheidung 1346.)

### 2e. `correlationId` durchreichen

```ts
const correlationId = opts?.correlationId ?? systemContext.nextCorrelationId();
```
- in den `RunManifest` schreiben (Feld siehe Schritt 3)
- in `SimulationRun` schreiben
- nach jedem `SimulationEngine.executeTick(...)` die neuen Events stempeln:
```ts
for (const e of output.newEvents) {
  if (e.correlationId === undefined) e.correlationId = correlationId;
}
```

### 2f. `reproduce()` (Z. ~364) — nur prüfen, NICHT ändern

Nutzt bereits `existingRun.manifest.seed` + `scenarioVersionId`. Zusätzlich `opts` weiterreichen, damit `correlationId`/`baselineVersion` des Originals übernommen werden:
```ts
return this.runScenarioVersion(scenarioVersionId, seed, targetTicks, {
  simulationStartDate: existingRun.manifest.simulationStartDate,
  baselineVersion: existingRun.manifest.baselineVersion,
  correlationId: existingRun.manifest.correlationId,   // gleicher Vorgang, gleiche ID
});
```

---

## Schritt 3 — Typen (`src/types/scenario.ts`, `src/types/simulation.ts`)

`src/types/scenario.ts`:
```ts
export interface RunManifest {
  // ... bestehende Felder ...
  readonly correlationId: string;   // NEU
}

export interface SimulationRun {
  // ... bestehende Felder ...
  correlationId: string;            // NEU
}

export interface RunOptions {       // NEU (siehe Schritt 2b)
  simulationStartDate?: string;
  correlationId?: string;
  baselineVersion?: string;
}
```

`src/types/simulation.ts` — `SimulationEvent`:
```ts
export interface SimulationEvent {
  // ... bestehende Felder ...
  correlationId?: string;           // NEU, optional (Live-Events haben keine)
}
```

---

## Schritt 4 — Worker: deterministische Error-IDs (C4-5)

`src/simulation/worker/simulation.worker.ts` — Runner-Klasse:
```ts
private errorSeq = 0;
private currentRunId = 'nomanifest';   // in handleStart aus cmd.manifest?.runId setzen
```
Alle 4 Fundstellen (`err-${Date.now()}` an Z. ~60, ~83, ~94, ~200):
```ts
errorId: `err-${this.currentRunId}-t${this.tickCount ?? 0}-${this.errorSeq++}`,
```

---

## Schritt 5 — Queue-Historie-Test (C4-6, nur Test)

Kein Code-Fix: `salesQueueManager.processTick` liefert die volle Liste in `updatedEntries` (Z. ~206), `slice(-20)` betrifft nur `projection.entries` (Z. ~261). Analog `csQueueManager` (Z. ~214 / ~269). Nur absichern:

NEU `src/simulation/__tests__/queueHistoryIntegrity.test.ts`:
```ts
export async function runQueueHistoryTest(): Promise<{ success: boolean; log: string[] }> {
  // 80 Ticks über SimulationEngine/ScenarioService fahren
  // assert: gesammelte updatedEntries.length > 20 möglich
  // assert: jede projection.entries.length <= 20
  // assert: keine Entry-ID geht zwischen zwei Ticks verloren (Superset-Check)
}
```
In `scripts/verifyIntegrity.ts` als `{ name: '015a - Queue History', res: await runQueueHistoryTest() }` registrieren.

---

## Schritt 6 — Golden-Run-Test (Kern von Gate G1)

NEU `src/simulation/__tests__/reproducibilityIntegrity.test.ts`:

```ts
import { systemContext } from '../systemContext';
import { ScenarioRepository } from '../scenarioRepository';
import { ScenarioService } from '../scenarioService';

export async function runReproducibilityTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  let ok = true;
  try {
    systemContext.__overrideForTest({
      now: () => '2026-01-01T00:00:00.000Z',
      nextScenarioId: () => 'scen-fixed',
      nextRunId: (s, v) => `run-fixed-s${s}-v${v}`,
      nextCorrelationId: () => 'corr-fixed',
      newRunSeed: () => 777001,
    });

    const repo = ScenarioRepository.getInstance();
    repo.resetToDefaults();
    const svc = ScenarioService.getInstance();

    const { scenario, version } = svc.createScenario('Golden', 'reproducibility');
    const A = svc.runScenarioVersion(version.id, 777001, 120);
    const B = svc.runScenarioVersion(version.id, 777001, 120);

    // 1) Manifeste identisch (alle Quellen injiziert -> byte-gleich)
    ok = assert(log, 'manifest', JSON.stringify(A.run.manifest) === JSON.stringify(B.run.manifest)) && ok;

    // 2) Event-Stream identisch (id, type, correlationId, Reihenfolge)
    const sig = (r: typeof A) => r.events.map(e => `${e.id}|${e.type}|${e.correlationId}`).join('\n');
    ok = assert(log, 'events', sig(A) === sig(B)) && ok;

    // 3) End-Snapshot / RNG-State identisch
    ok = assert(log, 'rngState', A.run.rngState === B.run.rngState) && ok;
    ok = assert(log, 'finalMetrics', JSON.stringify(A.run.finalMetrics) === JSON.stringify(B.run.finalMetrics)) && ok;

    // 4) simulationStartDate stammt NICHT aus der Wall-Clock
    ok = assert(log, 'startDate', A.run.manifest.simulationStartDate === '2026-01-01') && ok;
  } finally {
    systemContext.__resetForTest();
  }
  return { success: ok, log };
}

function assert(log: string[], name: string, cond: boolean): boolean {
  log.push(`${cond ? '✅' : '❌'} ${name}`);
  return cond;
}
```

In `scripts/verifyIntegrity.ts` als `{ name: '015 - Reproducibility (Golden Run)', res: await runReproducibilityTest() }` registrieren.

---

## Schritt 7 — `package.json` Scripts

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "verify": "tsx scripts/verifyIntegrity.ts",
  "test": "npm run verify"
}
```
(`tsx` ist bereits in `devDependencies`.)

---

## Schritt 8 — `SimulationContext.tsx` (UI-Verdrahtung, optional aber empfohlen)

`runVersion` / `reRun`-Callbacks: pro Nutzeraktion eine `correlationId` erzeugen und mitgeben, damit die Audit-Kette bei einer UI-Aktion beginnt:
```ts
scenService.runScenarioVersion(versionId, undefined, undefined, {
  correlationId: systemContext.nextCorrelationId(),
});
```

---

## Schritt 9 — Doku nachziehen

`ARCHITECTURE_DECISIONS.md`:
- Teil C.4 Tabelle: C4-3 → **erledigt**, C4-5 → **erledigt**, C4-6 → **verifiziert (kein Bug)**, C4-2 → **teilweise (correlationId)**, C4-4 → **dokumentiert (B20)**.
- Teil B: B20 + B21 ergänzen (siehe `BUILD_PLAN.md` Phase 0).
- D4 Änderungsprotokoll: Zeile „AUFTRAG 015 — Reproduzierbarkeit gehärtet".
- D5 MASTERSTATUS: „Nächster Schritt" auf AUFTRAG 016 setzen.

---

## Gate G1 — Abnahme

Alle müssen erfüllt sein:

- [ ] `npx tsc --noEmit` grün
- [ ] `npm run verify` grün — **alle** Alt-Suiten + `015 - Reproducibility` + `015a - Queue History`
- [ ] `grep -rnE 'Math\.random|Date\.now|new Date\(' src --include='*.ts' | grep -v __tests__` → nur Whitelist (`crmRepository` mit `// REMOVED IN AUFTRAG_016`-Kommentar). **Keine** Fundstelle in `scenarioService.ts`, `engine.ts`, `eventRules.ts`, `simulation.worker.ts`.
- [ ] `git grep -n 'correlationId' src/types/scenario.ts` zeigt Feld in `RunManifest` und `SimulationRun`
- [ ] eigener Commit `feat(auftrag-015): deterministic run creation + correlationId + golden-run test`
