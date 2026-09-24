# ANTIGRAVITY_AUFTRAG_067Q — Pause, Fortsetzen, Abbruch, Retry und Snapshot-Resume (Gate G63)

> **Builder:** Claude Code (Rollenwechsel bis v2.3.0, `CLAUDE.md` §4) · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.

## Ziel

Admin und Manager können einen laufenden Simulations-Run **pausieren**, **fortsetzen**,
**abbrechen** und einen abgebrochenen oder fehlgeschlagenen Run **wiederholen**. Außerdem
können sie einen pausierten Run nach einem Reload oder in einer zweiten Sitzung aus einem
**validierten Snapshot** fortsetzen. Viewer sehen den Zustand nur lesend.

Alle Befehle greifen kooperativ an **sicheren Tick-Grenzen**. Ein Run, der pausiert und
fortgesetzt wird, liefert **byte-identisch** dasselbe Ergebnis wie ein ununterbrochener
Run mit gleicher Baseline und gleichem Seed.

Quellen: Spec `docs/superpowers/specs/2026-09-15-v2-3-0-production-readiness-design.md`
§8.2 (Audit), §9 (Worker), §12 (Fehlercodes `SIMULATION_CANCELLED`,
`SIMULATION_RESUME_INVALID`), §16.2; Masterauftrag 067 → 067Q/G63; Masterplan Task 17.

## Baseline

- Branch `claude/067q-run-control`, abgezweigt von `claude/ci-quality-baselines-reduce-u1yo54`
  (PR #25, Stand `d6add92`). Fachlicher Stand = `main` `81410f7` plus Issue #7.
- Schutzbereichs-Baseline: `d6add92`.
- Golden Run (`v23GoldenRun.characterization.vitest.ts`) und
  `reproducibilityIntegrity` werden **vor** der ersten Änderung und **nach** der
  letzten Änderung ausgeführt; beide müssen unverändert grün sein.

## Fachliche Regeln

| Zustand | erlaubte Befehle (Admin/Manager) | Viewer |
|---|---|---|
| `queued`, `running`, `progress` | `pause`, `cancel` | keine |
| `paused` | `resume`, `cancel` | keine |
| `cancelled`, `failed` | `retry` | keine |
| `completed` | keine (Reproduce bleibt wie bisher) | keine |
| gespeicherter Pausen-Snapshot | `resumeFromSnapshot`, `discard` | keine |

- **Tick-Grenze:** Der Worker prüft Befehle nur zwischen zwei Ticks. Ein Pause-Befehl
  während eines Batches wirkt nach dem aktuellen Tick. Es gibt keinen halben Tick.
- **Snapshot** (`RunResumeSnapshot`): enthält Tick, PRNG-Zustand, Zustand, Leads,
  Opportunities, Deals, Aktivitäten, Queues, Events und Zeitreihe bis zum Tick, außerdem
  `runId`, `organizationId`, `scenarioVersionId`, `baselineHash`, `modelVersion`,
  `schemaVersion`, `seed`, `targetTicks` und das Manifest. Der `snapshotHash` ist SHA-256
  über die kanonische Serialisierung (`canonicalSha256`) aller Felder außer dem Hash.
- **Resume-Validierung** (fail-closed, Fehlercode `SIMULATION_RESUME_INVALID`): Der Hash
  muss neu berechnet übereinstimmen. `organizationId`, `baselineHash`, `modelVersion`,
  `schemaVersion`, `runId` und `targetTicks` müssen zum Manifest und zur aktiven Sitzung
  passen. Außerdem gilt `0 < tick < targetTicks`.
- **Abbruch** endet mit dem Fehlercode `SIMULATION_CANCELLED`. Er ist kein stiller
  Erfolg, und der Worker wird terminiert.
- **Doppelte Befehle** sind idempotent: ein zweites `pause` im Zustand `paused`
  wird ignoriert und nicht an den Worker geschickt. Ein zweites `retry` mit gleichem
  Schlüssel, während der erste Retry läuft, liefert denselben Promise, also genau einen
  neuen Run.
- **Retry** startet die Version mit **demselben Seed** neu. Das Ergebnis ist damit
  deterministisch gleich einem ununterbrochenen Lauf.
- **Persistenz:** Ein Pause-Snapshot eines Server-Runs wird über eine RPC atomar
  gespeichert. Wenn der Run später abgeschlossen wird (`persist_completed_run`), löscht ein
  Trigger den Pausen-Snapshot in derselben Transaktion. `discard` löscht ihn ausdrücklich.
- **Audit** (Spec §8.2) über SECURITY-DEFINER-Funktionen ohne PII:
  `scenario.run_paused`, `scenario.run_resumed`, `scenario.run_cancelled`,
  `scenario.run_retried`.

## Ziel-Dateien

| Datei | Aktion |
|---|---|
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_067Q_RUN_STEUERUNG.md` | NEU (diese Datei) |
| `src/types/runControl.ts` | NEU — `RunResumeSnapshot`, `RunControlCommand`, `RunControlStatus`, Fehlercodes |
| `src/types/workerMessages.ts` | MODIFY — `resumeSnapshot` im START-Payload, `snapshot` im PAUSED-Payload |
| `src/types/scenario.ts` | MODIFY — `RunOptions.onPaused` |
| `src/simulation/prng.ts` | MODIFY — `DeterministicRNG.fromState(seed, state)` |
| `src/simulation/scenarioTickRunner.ts` | MODIFY — Resume-Eingang (`startTick`, Queues) im Main-Thread-Pfad; gemeinsamer `tickTimeSeriesPoint` für Worker und Main-Thread |
| `src/simulation/worker/simulation.worker.ts` | MODIFY — Snapshot bei PAUSE, START aus Snapshot, CANCEL mit Einheiten |
| `src/simulation/worker/workerSnapshot.ts` | NEU — Snapshot bauen/wiederherstellen (ausgelagert wegen `max-lines`) |
| `src/simulation/runControlService.ts` | NEU — Rollen-/Zustandsmatrix, Snapshot-Hash und -Validierung, Retry-Dedupe |
| `src/simulation/runCoordinator.ts` | MODIFY — `pause()`, `resume()`, `paused`/`cancelled`, `SIMULATION_CANCELLED`, Resume-Start |
| `src/simulation/scenarioService.ts` | MODIFY — Steuerbefehle der Fassade, `resumeFromSnapshot` |
| `src/simulation/scenarioRunExecutor.ts` | MODIFY — Lauf aus validiertem Snapshot, Pause-Hook |
| `src/services/runs/runPersistenceService.ts` | MODIFY — `persistRunPause`, `discardRunPause`, `loadRunPauses`, `recordRunControl` |
| `supabase/migrations/20261001_run_control.sql` | NEU — Tabelle `simulation_run_pauses`, RLS, RPCs, Trigger, Audit |
| `supabase/tests/run_control.sql` | NEU — Rollen-, Mandanten- und Atomizitätstests |
| `src/store/slices/runSlice.ts` | MODIFY — `pauseRun`, `resumeRun`, `cancelRun`, `retryRun`, `resumeFromSnapshot`, Status `paused` |
| `src/store/hooks.ts` | MODIFY — `useRunControl` |
| `src/features/simulation/components/RunControlBar.tsx` | NEU — Aktionen je Status und Rolle |
| `src/features/simulation/components/RunActionModal.tsx` | MODIFY — RunControlBar während des Laufs |
| `src/features/simulation/pages/LiveSimulationPage.tsx` | MODIFY — Status inkl. `paused`, gespeicherte Pausen fortsetzen |
| Tests: `src/simulation/__tests__/vitest/runControlService.vitest.ts`, `runCoordinator.vitest.ts`, `src/simulation/worker/__tests__/simulationWorkerControl.vitest.ts`, `src/services/runs/__tests__/runPersistenceService.vitest.ts`, `src/features/simulation/components/__tests__/RunControlBar.ui.vitest.tsx` | NEU/MODIFY |
| `e2e/run-control.spec.ts` | NEU |
| `.github/workflows/ci.yml` | MODIFY — `run-control.spec.ts` im sequenziellen Worker-Schritt |
| `src/simulation/scenarioRunResume.ts` | NEU — Resume-Pfad (ausgelagert wegen `max-lines`) |
| `src/store/__tests__/runControlSlice.vitest.ts`, `src/simulation/__tests__/vitest/scenarioRunResume.vitest.ts`, `src/services/runs/__tests__/runControlPersistence.vitest.ts` | NEU |
| `docs/BUILD_LOG.md`, `BUILD_PLAN.md` | MODIFY |

Freigegebene Schutzbereiche laut Masterauftrag: `src/simulation/**`, `src/types/**`, der
RNG-/Seed-Pfad und das Run-/Persistenzmodell. **Nicht** freigegeben: `src/context/**`,
`src/services/data/**` (nur lesend importiert: `canonicalSha256`), `src/features/resources/**`.

## Globale Grenzen

- Keine neuen npm-Pakete. Jede Datei unter 400 Zeilen (`max-lines`).
- Keine Änderung am Ergebnis ununterbrochener Runs: Golden Run bleibt byte-identisch.
- Kein Inline-Style (Issue #7): nur Tailwind-Klassen.
- Keine Secrets, Tokens oder PII in Snapshots, Audit-Details oder Logs.
- Viewer-Pfade bleiben read-only: in der UI (keine Aktionen) **und** in der DB (RPC-Rollenprüfung).

## Tasks

- [x] **1. Golden Run vorher sichern.** `npx vitest run v23GoldenRun reproducibilityIntegrity`
- [x] **2. Rote Tests schreiben** (erwartet rot vor der Implementierung):
  - Rollen-/Zustandsmatrix inkl. Viewer, doppelter Befehl, unbekannter Befehl.
  - Snapshot-Hash stabil gegen Key-Reihenfolge; jede Manipulation (Tick, State, Hash,
    Organisation, Baseline-Hash, Modell-/Schemaversion) → `SIMULATION_RESUME_INVALID`.
  - Determinismus: Pause bei Tick k + Resume (gleicher Worker **und** frischer Worker
    aus Snapshot) = ununterbrochener Lauf, byte-identisch (Zustand, PRNG, Events,
    Zeitreihe).
  - Coordinator: `paused`/`cancelled`-Ereignisse, Cancel → `SIMULATION_CANCELLED` und
    Worker terminiert, Pause im Zustand `paused` sendet keinen zweiten Befehl.
  - Retry-Idempotenz: zwei gleichzeitige Retries → genau ein Run.
  - Persistenz: Pause-RPC mit falschem Mandanten/Viewer abgelehnt, Abschluss löscht
    Pause atomar.
- [x] **3. Worker und Protokoll** umsetzen (Snapshot bei PAUSE, START aus Snapshot).
- [x] **4. `runControlService` und Coordinator** umsetzen.
- [x] **5. Service-Fassade und Executor** (Resume-Lauf, Retry mit gleichem Seed).
- [x] **6. Migration, SQL-Tests und Persistenz-Service.**
- [x] **7. Store und UI** (`RunControlBar` im Modal und auf der Live-Simulationsseite).
- [x] **8. E2E** `e2e/run-control.spec.ts`: Admin pausiert → Reload → setzt aus Snapshot
  fort → Run abgeschlossen; Cancel → Retry; Viewer sieht keine Aktionen.
- [x] **9. Golden Run nachher**, Vollgates, BUILD_LOG-Eintrag, Übergabe an Codex.

## Verifikation

```
npx tsc --noEmit
npm run lint && npm run format:check
npm run verify:quality-budget
npm run test:coverage
npm run verify
npm run build
supabase test db
npx playwright test e2e/run-control.spec.ts e2e/worker-responsiveness.spec.ts e2e/persistence-multisession.spec.ts --workers=1
npx playwright test e2e/a11y.spec.ts e2e/routes.spec.ts
```

Schutzbereichs-Diff gegen `d6add92` für `src/context`, `src/services/data`,
`src/features/resources`: leer. `src/simulation` und `src/types` nur in den oben
genannten Dateien.

## Gate G63 — Abnahmekriterien

1. Pause/Resume/Cancel entsprechen dem echten Worker-Zustand; Befehle nur an Tick-Grenzen.
2. Resume aus Snapshot ist byte-identisch zum ununterbrochenen Lauf; jede Manipulation
   liefert `SIMULATION_RESUME_INVALID`.
3. Cancel liefert `SIMULATION_CANCELLED`, kein Zombie-Worker.
4. Viewer und Fremdmandant können weder in der UI noch per RPC steuern.
5. Retry ist idempotent und deterministisch.
6. Audit-Einträge für Pause, Fortsetzen, Abbruch und Retry ohne PII.
7. Golden Run unverändert, alle Pflicht-Gates grün, Codex-Freigabe im BUILD_LOG.
