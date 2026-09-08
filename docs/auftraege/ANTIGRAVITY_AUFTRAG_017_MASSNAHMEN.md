# ANTIGRAVITY AUFTRAG 017 — Maßnahmen & Wirkungsvorschau

**Basis:** `BUILD_PLAN.md` Phase 3 (Kandidat 1) · Entscheidungen **419–468** (Teil A8) + **1474–1573** (Teil A19, Decision-Support/Maßnahmen)
**Voraussetzung:** AUFTRAG 015 + 016 abgenommen (Gate G1 + G2), nach `main` gemergt.
**Abnahme:** Gate **G3**
**Ziel:** Die App kann Szenarien bauen und vergleichen, aber nicht *„was wäre, wenn ich X tue"* durchspielen. Dieser Auftrag schließt den Decision-Support-Kreislauf: `Beobachten → verstehen → Maßnahme definieren → simulieren → vergleichen → entscheiden`.

**Leitplanken (aus den Entscheidungen):**
1. Maßnahmen sind **eigene Objekte** mit Startzeitpunkt; dauerhaft oder befristet; verändern **nie** Ebene A (419–428).
2. Eine Maßnahme kann **mehrere Parameter** gleichzeitig ändern; hat Name + Beschreibung; erwarteter Effekt wird von der Simulation berechnet (429–438).
3. Maßnahmen können **zeitlich gestaffelt** sein und einen **Ramp-up** haben (459–468).
4. Eine Maßnahme kann **als eigenes Szenario simuliert werden, ohne das bestehende zu verändern** (1474–1573) — das ist die Wirkungsvorschau.
5. **Reproduzierbarkeit bleibt:** Maßnahmen landen im eingefrorenen `RunManifest`; `reproduce()` spielt identische Maßnahmen ab.
6. **V1-Katalog (449–458):** Marketing-Gesamtbudget, Kanalbudgets, Sales-FTE, Trial-to-Paid, globaler Sales Cycle, Paketpreise/Rabatt. **Bewusst NICHT:** Churn-Baseline, CS-Qualitätsregler, direkte Paketwechsel bestehender Kunden.
7. **Kein Auto-Optimierer** in V1; Konflikte erzeugen nur **Warnungen** (kein Auflösen).

> **Namenskollision:** In `src/domain/strategieData.ts` existiert ein statisches `MASSNAHMEN`-Objekt (Strategie-Tabelle im UI). Das ist **nicht** gemeint. Im Code heißt dieser Auftrag **`Measure`** / **`measure*`**; „Maßnahme" nur in UI-Text und Doku.

---

## Schritt 0 — Audit: welche Katalog-Parameter wirken heute überhaupt?

Aktuell reicht die Run-Schleife in `scenarioService.runScenarioVersion` nur **3** Werte an `SimulationEngine.executeTick` weiter:
`salesRepCount`, `csRepCount`, `churnRateMonthly` — statisch aus `manifest.parameters`.
Von den V1-Katalog-Hebeln ist damit **nur `salesRepCount`** wirksam.

**Aufgabe:** Pro Katalog-Parameter feststellen, ob und wo er die Simulation beeinflusst. Grep-Startpunkte: `src/simulation/eventRules.ts` (`evaluateNewLeadRule`, `evaluateLeadProgressionRule`, `recalculateMetrics`), `src/simulation/engine.ts`, `src/simulation/salesQueueManager.ts`.

Ergebnis ist eine Tabelle:

| Parameter | Wirkt heute auf | Muss verdrahtet werden? |
|---|---|---|
| `marketingBudgetYearly` | (vermutlich nur Finanz-Kostenseite) | Lead-Menge (Response-Kurve, Entsch. 469–478) |
| `channelMix` | ? | Lead-Herkunft/Conversion je Kanal |
| `trialToPaidConversion` | ? | Trial→Won-Konversion im Progression-Rule |
| `salesRepCount` | Sales Queue Kapazität | — (wirkt) |
| `salesCycleDays` | ? | Dauer bis Deal-Abschluss / Queue-Wartezeit |
| `discountPercent` | ? | Deal Value / MRR neuer Deals |

### D8 — Umfang der Engine-Verdrahtung

| Option | Konsequenz |
|---|---|
| **A — Katalog-Parameter in diesem Auftrag verdrahten** ✅ *Empfehlung* | Schritte 1–3 wiren `marketingBudgetYearly` → Lead-Menge, `trialToPaidConversion` → Konversion, `salesCycleDays` → Deal-Timing, `discountPercent` → Deal Value. Dann bilden die Maßnahmen (Schritte 4–8) eine vollständige, spürbare Funktion. Aufwand: groß. |
| B — Maßnahmen-Schicht nur auf `salesRepCount` | Kleiner, aber Maßnahmen für die anderen Hebel wären „deklariert, aber wirkungslos". Halbes Feature. |
| C — Splitten: AUFTRAG 017a (Engine-Verdrahtung) + 017b (Maßnahmen-Schicht) | Sauberste Trennung, zwei kleinere Abnahmen. Wählen, falls A zu groß für einen Durchgang ist. |

**Default = A.** Falls der Agent A für zu groß hält: nach Schritt 0 stoppen, C-Split vorschlagen, `017a`/`017b` anlegen.

---

## Schritt 1–3 — Katalog-Parameter in die Engine verdrahten (Option A)

Für jeden noch nicht wirksamen Katalog-Parameter:

1. **`executeTick`-Input erweitern** (`src/simulation/engine.ts` `TickInput`): neue optionale Felder `marketingBudgetYearly?`, `trialToPaidConversion?`, `salesCycleDays?`, `discountPercent?`, `channelMix?`.
2. **Regel anpassen** (`src/simulation/eventRules.ts`):
   - `evaluateNewLeadRule(clock, rng, existingLeads, marketingBudgetYearly, channelMix)` — Lead-Wahrscheinlichkeit/-Menge steigt nichtlinear mit Budget (einfache Sättigungskurve, z. B. `leadsPerTick = base * (1 - exp(-budget / k))`); Konstante `k` dokumentiert.
   - `evaluateLeadProgressionRule(..., trialToPaidConversion, salesCycleDays)` — Konversionswahrscheinlichkeit = `trialToPaidConversion / 100`; `salesCycleDays` steuert, nach wie vielen Ticks ein Opportunity zu Won/Lost fällig wird.
   - `recalculateMetrics(..., discountPercent)` — MRR neuer Deals = Listenpreis × `(1 - discountPercent/100)`.
3. **Sensitivitäts-Test je Parameter** in `runMeasureTest` (Schritt 7): ein Run mit Default vs. ein Run mit deutlich verändertem Parameter → mindestens eine Kern-KPI (ARR/MRR/Kunden/Cash) ändert sich messbar. **Das ist Teil von Gate G3.**

Bestehende Werte bleiben Default; kein bestehender Test darf brechen (Golden-Run bleibt bei unveränderten Parametern byte-gleich).

---

## Schritt 4 — Typen (`src/types/measure.ts`, NEU)

```ts
import { ScenarioParameters } from './scenario';

/** V1-Maßnahmenkatalog (Entsch. 449–458). Bewusst NICHT: churnRateMonthly, csRepCount, targetPackageFocus. */
export type MeasureParameterKey =
  | 'marketingBudgetYearly'
  | 'channelMix'
  | 'trialToPaidConversion'
  | 'salesRepCount'
  | 'salesCycleDays'
  | 'discountPercent';

export const MEASURE_PARAMETER_KEYS: readonly MeasureParameterKey[] = [
  'marketingBudgetYearly', 'channelMix', 'trialToPaidConversion',
  'salesRepCount', 'salesCycleDays', 'discountPercent',
];

export type MeasureChangeMode = 'set' | 'delta' | 'multiply';

export interface MeasureChange {
  parameter: MeasureParameterKey;
  mode: MeasureChangeMode;   // 'set' = Zielwert, 'delta' = +/- absolut, 'multiply' = Faktor
  value: number;
}

export interface Measure {
  id: string;
  name: string;
  description?: string;
  startTick: number;              // >= 0
  durationTicks?: number;         // undefined = dauerhaft (419–428)
  rampUpTicks?: number;           // 0 / undefined = sofort wirksam (459–468)
  changes: MeasureChange[];       // mind. 1
  createdAt: string;              // systemContext.now()
}

export interface MeasureConflict {
  parameter: MeasureParameterKey;
  measureIds: string[];
  kind: 'MULTIPLE_SET' | 'SET_AND_RELATIVE';
  message: string;
}

export interface MeasureKpiDelta {
  kpiId: 'liveARR' | 'liveMRR' | 'liveCustomers' | 'liveCash' | 'liveEBITDA';
  label: string;
  unit: string;
  baseValue: number;
  withMeasuresValue: number;
  delta: number;
  deltaPercent: number;
}

export class MeasureError extends Error {
  constructor(public code: 'INVALID_PARAMETER' | 'INVALID_TIMING' | 'EMPTY_CHANGES' | 'OUT_OF_BOUNDS', message: string) {
    super(message);
    this.name = 'MeasureError';
  }
}
```

---

## Schritt 5 — `EffectiveParameterResolver` (`src/simulation/effectiveParameterResolver.ts`, NEU)

Kern der Maßnahmen-Schicht: berechnet die effektiven Parameter zu jedem Tick — **pure, deterministisch, ohne Wall-Clock/RNG**.

```ts
import { ScenarioParameters } from '../types/scenario';
import { Measure, MeasureChange, MeasureConflict, MeasureError } from '../types/measure';
import { V1_PARAMETER_DEFINITIONS } from './parameterRegistry';

export class EffectiveParameterResolver {
  private readonly measures: readonly Measure[];

  constructor(private readonly base: Readonly<ScenarioParameters>, measures: readonly Measure[]) {
    for (const m of measures) this.validate(m);
    // deterministische Reihenfolge: nach startTick, dann createdAt, dann id
    this.measures = [...measures].sort((a, b) =>
      a.startTick - b.startTick || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  }

  /** Effektive Parameter zum Tick-Index `tick` (0-basiert). */
  at(tick: number): ScenarioParameters {
    let p: ScenarioParameters = JSON.parse(JSON.stringify(this.base));
    for (const m of this.measures) {
      const f = this.rampFactor(m, tick);        // 0..1
      if (f === 0) continue;
      for (const c of m.changes) p = this.applyChange(p, c, f);
    }
    return this.clamp(p);
  }

  detectConflicts(): MeasureConflict[] {
    // pro Parameter: >1 Maßnahme mit überlappendem Wirkzeitraum
    //  - zwei 'set'            -> MULTIPLE_SET
    //  - 'set' + ('delta'|'multiply') -> SET_AND_RELATIVE
    // nur Warnung, kein Auflösen (Entsch. 429–438).
  }

  // --- intern ---

  private rampFactor(m: Measure, tick: number): number {
    if (tick < m.startTick) return 0;
    if (m.durationTicks !== undefined && tick >= m.startTick + m.durationTicks) return 0; // Revert nach Ende
    const ramp = m.rampUpTicks ?? 0;
    if (ramp > 0 && tick < m.startTick + ramp) return (tick - m.startTick) / ramp;         // lineare Interpolation
    return 1;
  }

  private applyChange(p: ScenarioParameters, c: MeasureChange, f: number): ScenarioParameters {
    if (c.parameter === 'channelMix') return p; // V1: channelMix-Maßnahmen nur als 'set' mit vollem Mix -> Sonderfall, siehe unten
    const key = c.parameter as keyof ScenarioParameters;
    const cur = p[key] as number;
    const baseVal = this.base[key] as number;
    let next = cur;
    if (c.mode === 'set')       next = baseVal + (c.value - baseVal) * f;   // rampt von Basis zum Zielwert
    else if (c.mode === 'delta') next = cur + c.value * f;
    else if (c.mode === 'multiply') next = cur * (1 + (c.value - 1) * f);
    (p[key] as number) = next;
    return p;
  }

  private clamp(p: ScenarioParameters): ScenarioParameters {
    for (const key of Object.keys(V1_PARAMETER_DEFINITIONS) as (keyof ScenarioParameters)[]) {
      const def = V1_PARAMETER_DEFINITIONS[key];
      if (typeof (p[key]) === 'number' && def.min !== undefined && def.max !== undefined) {
        (p[key] as number) = Math.min(def.max, Math.max(def.min, p[key] as number));
      }
    }
    return p;
  }

  private validate(m: Measure): void {
    if (m.startTick < 0) throw new MeasureError('INVALID_TIMING', `Maßnahme "${m.id}": startTick < 0.`);
    if (m.durationTicks !== undefined && m.durationTicks <= 0) throw new MeasureError('INVALID_TIMING', `Maßnahme "${m.id}": durationTicks <= 0.`);
    if (!m.changes?.length) throw new MeasureError('EMPTY_CHANGES', `Maßnahme "${m.id}": keine changes.`);
    for (const c of m.changes)
      if (!MEASURE_PARAMETER_KEYS.includes(c.parameter))
        throw new MeasureError('INVALID_PARAMETER', `Maßnahme "${m.id}": "${c.parameter}" nicht im V1-Katalog.`);
  }
}
```

`channelMix`-Maßnahmen: V1 nur `mode: 'set'` mit vollständigem `ChannelMix` (auto-normalisiert), kein Ramp-up. Wenn zu aufwändig → in V1 aus dem Katalog nehmen und in `ARCHITECTURE_DECISIONS.md` als NUR BESCHLOSSEN führen.

---

## Schritt 6 — Run-Schleife & Manifest anbinden

### `src/types/scenario.ts`

```ts
export interface RunOptions {
  simulationStartDate?: string;
  correlationId?: string;
  baselineVersion?: string;
  dataSourceId?: string;
  measures?: Measure[];            // NEU
}

export interface RunManifest {
  // ... bestehende Felder ...
  readonly measures: readonly Measure[];   // NEU, frozen
}

export interface SimulationRun {
  // ... bestehende Felder ...
  measures: readonly Measure[];             // NEU
}
```

### `src/simulation/scenarioService.ts` — `runScenarioVersion`

```ts
import { EffectiveParameterResolver } from './effectiveParameterResolver';

// vor Manifest-Aufbau:
const measures = Object.freeze((opts?.measures ?? []).map(m => Object.freeze({ ...m, changes: m.changes.map(c => ({ ...c })) })));

// im Manifest ergänzen:  measures,

const resolver = new EffectiveParameterResolver(manifest.parameters, measures);

// Tick-Schleife: statt manifest.parameters.X  ->  eff.X
for (let i = 0; i < targetTicks; i++) {
  const eff = resolver.at(i);
  const output: TickOutput = SimulationEngine.executeTick({
    state: currentState, rng, leads, opportunities, deals, activities,
    salesRepCount: eff.salesRepCount,
    csRepCount: eff.csRepCount,
    churnRateMonthly: eff.churnRateMonthly,        // unverändert (nicht im Katalog, aber eff == base)
    marketingBudgetYearly: eff.marketingBudgetYearly,   // nach Schritt 1–3
    trialToPaidConversion: eff.trialToPaidConversion,
    salesCycleDays: eff.salesCycleDays,
    discountPercent: eff.discountPercent,
    channelMix: eff.channelMix,
    queueEntries, csQueueEntries,
  });
  // ...
}
```

`reproduce()` reicht `existingRun.manifest.measures` in `RunOptions.measures` weiter → identische Wiederholung.

---

## Schritt 7 — Wirkungsvorschau (`ScenarioService.previewMeasures`, Entsch. 1474–1573)

```ts
public async previewMeasures(
  baseVersionId: string,
  measures: Measure[],
  targetTicks = 50,
  opts?: RunOptions,
): Promise<{
  base: RunExecutionResult;
  withMeasures: RunExecutionResult;
  kpiDeltas: MeasureKpiDelta[];
  conflicts: MeasureConflict[];
}> {
  const seed = opts?.seed ?? systemContext.newRunSeed();     // gleicher Seed für beide Läufe
  const base = await this.runScenarioVersion(baseVersionId, seed, targetTicks, { ...opts, measures: [] });
  const withMeasures = await this.runScenarioVersion(baseVersionId, seed, targetTicks, { ...opts, measures });
  // WICHTIG: beide Läufe NICHT persistieren — previewMeasures ruft eine interne Variante ohne repo.saveRun auf
  //          und legt KEINE neue ScenarioVersion an (Entsch. 1474–1573).
  const kpiDeltas = diffFinalMetrics(base.run.finalMetrics, withMeasures.run.finalMetrics);
  const conflicts = new EffectiveParameterResolver(base.run.manifest.parameters, measures).detectConflicts();
  return { base, withMeasures, kpiDeltas, conflicts };
}
```

Umsetzungshinweis: `runScenarioVersion` bekommt einen internen `persist: boolean`-Schalter (Default `true`); `previewMeasures` ruft mit `persist: false` → kein `repo.saveRun`, kein Snapshot-Pruning, keine Version. Das Manifest wird trotzdem vollständig gebaut (für den KPI-Diff), nur nicht gespeichert.

---

## Schritt 8 — UI

Neue Komponente `src/features/simulation/components/MeasureManagerModal.tsx` (oder Panel in `ScenarioManagerModal.tsx`):

- **Liste** der Maßnahmen der aktiven Szenarioversion (Draft-State, erst beim Run in `opts.measures`).
- **Hinzufügen/Bearbeiten/Löschen** — pro Maßnahme: Name, Beschreibung, `startTick`, `durationTicks` (leer = dauerhaft), `rampUpTicks`, und n × `MeasureChange` (Parameter-Dropdown aus `MEASURE_PARAMETER_KEYS` + Mode + Wert). Werte gegen `V1_PARAMETER_DEFINITIONS` min/max validieren (Inline-Fehler).
- **Timeline-Streifen** je Maßnahme: `Start → Ramp-up → volle Wirkung → Ende` visualisieren (Entsch. 459–468).
- **Button „Wirkungsvorschau simulieren"** → `previewMeasures` → Tabelle KPI-Delta (ARR/MRR/Kunden/Cash/EBITDA: Basis vs. mit Maßnahmen, absolut + %) + **Konfliktwarnungen** (`detectConflicts`).
- In `RunActionModal.tsx`: die Draft-Maßnahmen fließen als `opts.measures` in den echten Run.
- In `AuditTierView.tsx` (RunManifest-Tab): `manifest.measures` auflisten.

Kein Auto-Optimierer, keine automatische Konfliktauflösung.

---

## Schritt 9 — Integrity-Test (Suite 022)

NEU `src/simulation/__tests__/measureIntegrity.test.ts` → `runMeasureTest()`:

1. **Resolver — Ramp-up:** Maßnahme `salesRepCount set 6`, `startTick 10`, `rampUpTicks 10`. `at(9) == base`; `at(15).salesRepCount ≈ base + (6-base)*0.5`; `at(20).salesRepCount == 6`.
2. **Resolver — Ende/Revert:** `durationTicks 5` → `at(startTick+5) == base`.
3. **Resolver — Clamp:** Maßnahme `salesRepCount set 99` → `at(...).salesRepCount == 10` (Registry-Max).
4. **Mehrere Maßnahmen:** zwei `delta +1` auf `salesRepCount` → +2 (additiv, deterministische Reihenfolge).
5. **Konflikt:** zwei `set` auf `marketingBudgetYearly`, überlappend → genau 1 `MULTIPLE_SET`.
6. **Reproduzierbarkeit mit Maßnahmen:** `systemContext.__overrideForTest`; derselbe Run (Version+Seed+Maßnahmen) 2× → identischer Event-Stream, identisches `finalMetrics`, identischer `rngState`. `manifest.measures` frozen.
7. **Golden-Run unverändert:** Run **ohne** Maßnahmen bleibt byte-gleich zum bisherigen Golden-Run (keine Regression durch Schritt 1–3, solange Parameter auf Default).
8. **`previewMeasures` persistiert nichts:** `repo.getRunsForVersion(...)`-Anzahl vor/nach identisch; keine neue `ScenarioVersion`.
9. **Sensitivität je Katalog-Parameter (Gate G3):** für jeden verdrahteten Parameter ein Run Default vs. Run stark verändert → mind. eine Kern-KPI ändert sich > 1 %.

Registrieren in `scripts/verifyIntegrity.ts` als `{ name: '022 - Measures & Effective Parameters', res: test22 }`, Banner auf „001 bis 022".

---

## Schritt 10 — Doku

`ARCHITECTURE_DECISIONS.md`:
- Teil C: Entscheidungen **419–468** und der Maßnahmen-Teil von **1474–1573** → **IMPLEMENTIERT (AUFTRAG 017)**. Falls `channelMix`-Maßnahmen ausgeklammert: als NUR BESCHLOSSEN vermerken.
- Teil B: neuer Abschnitt **B23 — Maßnahmen-Schicht**: `EffectiveParameterResolver` berechnet effektive Parameter pro Tick aus `baseParameters + Measure[]`; pure/deterministisch; Ergebnis auf `V1_PARAMETER_DEFINITIONS`-Grenzen geklemmt; Maßnahmen im eingefrorenen `RunManifest`; Wirkungsvorschau (`previewMeasures`) persistiert nichts.
- Teil C.4-7 / Parameter-Surface: die in Schritt 1–3 verdrahteten Parameter aus „NUR BESCHLOSSEN" herausnehmen.
- `docs/BUILD_LOG.md`: Eintrag + Gate-G3-Ergebnis.
- D4 Änderungsprotokoll + D5 MASTERSTATUS (nächster Schritt → AUFTRAG 018).

---

## Gate G3 — Abnahme

- [ ] `npx tsc --noEmit` grün · `npm run verify` grün inkl. `022 - Measures & Effective Parameters` · `npm run build` erfolgreich
- [ ] Golden-Run **ohne** Maßnahmen byte-gleich zum Stand vor AUFTRAG 017 (keine Regression)
- [ ] Reproduzierbarkeit **mit** Maßnahmen: gleicher Run 2× → identischer Event-Stream + Snapshot + `rngState`; `manifest.measures` frozen; `reproduce()` spielt sie ab
- [ ] `previewMeasures` legt **keinen** Run und **keine** ScenarioVersion an
- [ ] Resolver: Ramp-up-Interpolation, Ende-Revert, Registry-Clamp, Mehrfach-Maßnahmen alle per Test belegt
- [ ] Konfliktwarnung erscheint bei zwei `set` auf denselben Parameter (keine automatische Auflösung)
- [ ] **Sensitivität:** jeder verdrahtete Katalog-Parameter verändert nachweislich mind. eine Kern-KPI
- [ ] UI: Maßnahme anlegen → Timeline sichtbar → „Wirkungsvorschau" zeigt KPI-Delta-Tabelle; Maßnahmen fließen in den echten Run; `manifest.measures` in `AuditTierView` sichtbar
- [ ] eigener Commit `feat(auftrag-017): measures + effective parameter resolver + impact preview`
