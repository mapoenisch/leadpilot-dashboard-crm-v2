// 067Q / G63 — Befehle vor dem Worker-Start (Baseline-Erfassung läuft noch)
// gehen nicht verloren: Pause/Abbruch werden vorgemerkt und beim Start des
// Coordinators angewendet; ohne laufenden Run gibt es nichts vorzumerken.
import { describe, expect, it, vi } from 'vitest';
import { ScenarioService } from '../../scenarioService';
import { DEFAULT_BASE_2026_VERSION_ID } from '../../scenarioRepository';
import type { RunCoordinator } from '../../runCoordinator';

type Internals = {
  applyPendingCommand(c: RunCoordinator): void;
  pendingCommand: 'pause' | 'cancel' | null;
};

describe('ScenarioService — vorgemerkte Steuerbefehle (G63)', () => {
  const service = ScenarioService.getInstance();
  const internals = service as unknown as Internals;

  it('ohne laufenden Run: nichts vormerken', () => {
    expect(service.pauseActiveRun()).toBe(false);
    expect(service.resumeActiveRun()).toBe(false);
    service.cancelActiveRun();
    expect(internals.pendingCommand).toBeNull();
  });

  it('Pause während der Vorbereitung wird vorgemerkt und nach dem Lauf verworfen', async () => {
    const run = service.runScenarioVersion(DEFAULT_BASE_2026_VERSION_ID, 4711, 5, {
      persist: false,
    });
    expect(service.pauseActiveRun()).toBe(true);
    expect(service.pauseActiveRun()).toBe(false);
    expect(service.resumeActiveRun()).toBe(true);
    expect(internals.pendingCommand).toBeNull();
    expect(service.pauseActiveRun()).toBe(true);
    await run;
    expect(internals.pendingCommand).toBeNull();
    expect(service.pauseActiveRun()).toBe(false);
  });

  it('beim Worker-Start wird der vorgemerkte Befehl genau einmal angewendet', () => {
    const coordinator = { pause: vi.fn(), cancel: vi.fn() } as unknown as RunCoordinator;
    internals.pendingCommand = 'pause';
    internals.applyPendingCommand(coordinator);
    internals.applyPendingCommand(coordinator);
    expect(coordinator.pause).toHaveBeenCalledTimes(1);
    internals.pendingCommand = 'cancel';
    internals.applyPendingCommand(coordinator);
    expect(coordinator.cancel).toHaveBeenCalledTimes(1);
    expect(internals.pendingCommand).toBeNull();
  });
});
