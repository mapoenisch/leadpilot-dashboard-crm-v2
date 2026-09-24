// Branch-Tests: SimulationService Live-Pfad ohne Endlosschleifen.
// window-Timer werden gestubbt (kein echter Timeout feuert) — start/pause/setSpeed
// bleiben dadurch seiteneffektfrei und synchron prüfbar. executeTick nutzt die
// reale Engine (rein/deterministisch).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SimulationService } from '../../simulationService';

describe('simulationService.branch', () => {
  const scheduled: Array<{ id: number; ms: number }> = [];
  let nextId = 0;
  let setTimeoutSpy: ReturnType<typeof vi.fn>;
  let clearTimeoutSpy: ReturnType<typeof vi.fn>;

  const svc = SimulationService.getInstance();

  const hadWindow = 'window' in globalThis;
  const origWindow = (globalThis as Record<string, unknown>).window;

  beforeEach(() => {
    scheduled.length = 0;
    nextId = 0;
    setTimeoutSpy = vi.fn((_cb: () => void, ms: number) => {
      nextId += 1;
      scheduled.push({ id: nextId, ms });
      return nextId;
    });
    clearTimeoutSpy = vi.fn((_id: number) => {});
    vi.stubGlobal('window', {
      setTimeout: setTimeoutSpy,
      clearTimeout: clearTimeoutSpy,
    });
    svc.resetSimulation();
    setTimeoutSpy.mockClear();
    clearTimeoutSpy.mockClear();
    scheduled.length = 0;
  });

  afterEach(() => {
    if (hadWindow) {
      (globalThis as Record<string, unknown>).window = origWindow;
    } else {
      delete (globalThis as Record<string, unknown>).window;
    }
  });

  it('getInstance ist ein Singleton', () => {
    expect(SimulationService.getInstance()).toBe(svc);
  });

  it('Initialzustand hat Defaults (Seed 42, gestoppt, 12s-Takt)', () => {
    const state = svc.getState();
    expect(state).toMatchObject({
      isRunning: false,
      tickCount: 0,
      dayIndex: 0,
      seed: 42,
      speed: 1,
      intervalMs: 12000,
    });
    expect(state.metrics).toBeDefined();
  });

  it('getState gibt Kopien zurück (Mutation leakt nicht)', () => {
    const first = svc.getState();
    first.tickCount = 999;
    if (first.metrics) first.metrics.liveARR = -1;
    const second = svc.getState();
    expect(second.tickCount).toBe(0);
    expect(second.metrics?.liveARR).not.toBe(-1);
  });

  it('Listen-Getter geben Kopien zurück', () => {
    expect(svc.getSimulationLeads()).toEqual([]);
    expect(svc.getOpportunities()).toEqual([]);
    expect(svc.getSimulationDeals()).toEqual([]);
    expect(svc.getSimulationActivities()).toEqual([]);
    expect(svc.getEvents()).toEqual([]);
    svc.getSimulationLeads().push({ id: 'x' } as never);
    expect(svc.getSimulationLeads()).toEqual([]);
  });

  it('subscribe erhält Events, unsubscribe beendet', () => {
    const seen: Array<{ event: unknown }> = [];
    const unsubscribe = svc.subscribe((event) => seen.push({ event }));
    svc.start();
    expect(seen.length).toBeGreaterThan(0);
    unsubscribe();
    const before = seen.length;
    svc.executeTick();
    expect(seen).toHaveLength(before);
  });

  it('start setzt isRunning, plant Tick und zeichnet SYSTEM_INFO auf', () => {
    svc.start();
    expect(svc.getState().isRunning).toBe(true);
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 12000);
    const events = svc.getEvents();
    expect(events[0]).toMatchObject({ type: 'SYSTEM_INFO', title: 'Simulation gestartet' });
  });

  it('doppeltes start ist ein No-op (kein zweiter Timer, kein zweites Event)', () => {
    svc.start();
    const eventsAfterFirst = svc.getEvents().length;
    svc.start();
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(svc.getEvents()).toHaveLength(eventsAfterFirst);
  });

  it('pause ohne laufenden Zustand ist ein No-op', () => {
    svc.pause();
    expect(clearTimeoutSpy).not.toHaveBeenCalled();
    expect(svc.getEvents()).toEqual([]);
  });

  it('pause stoppt, räumt Timer auf und zeichnet Pause-Event auf', () => {
    svc.start();
    const timerId = (setTimeoutSpy.mock.results[0]?.value as number) ?? 0;
    svc.pause();
    expect(svc.getState().isRunning).toBe(false);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(timerId);
    expect(svc.getEvents()[0]).toMatchObject({ type: 'SYSTEM_INFO', title: 'Simulation pausiert' });
  });

  it('setSpeed im Stopp setzt nur das Tempo (kein Timer)', () => {
    svc.setSpeed(2);
    expect(svc.getState().speed).toBe(2);
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it('setSpeed im Lauf plant mit effektivem Intervall neu', () => {
    svc.start();
    setTimeoutSpy.mockClear();
    clearTimeoutSpy.mockClear();
    svc.setSpeed(2);
    expect(svc.getState().speed).toBe(2);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 6000);
  });

  it('resetSimulation stellt Defaults wieder her und meldet null an Listener', () => {
    const seen: unknown[] = [];
    svc.subscribe((event) => seen.push(event));
    svc.start();
    svc.executeTick();
    svc.resetSimulation(99);
    const state = svc.getState();
    expect(state).toMatchObject({ isRunning: false, tickCount: 0, seed: 99, speed: 1 });
    expect(svc.getEvents()).toEqual([]);
    expect(svc.getSimulationLeads()).toEqual([]);
    expect(seen[seen.length - 1]).toBeNull();
    // Custom-Seed steht auch im nächsten Start-Event
    svc.start();
    expect(svc.getEvents()[0]?.id).toContain('-s99-');
  });

  it('executeTick treibt Tick/Events voran und meldet Listener', () => {
    const latest: unknown[] = [];
    svc.subscribe((event) => latest.push(event));
    svc.executeTick();
    expect(svc.getState().tickCount).toBe(1);
    expect(svc.getEvents().length).toBeGreaterThan(0);
    svc.executeTick();
    expect(svc.getState().tickCount).toBe(2);
    expect(latest.length).toBeGreaterThan(0);
  });
});
