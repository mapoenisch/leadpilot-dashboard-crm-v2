// Branch-Tests: simulation.worker handleMessage-Fehlerkanten (synchron, ohne Runtime).
// Abgrenzung zu workerIntegrity (TEST A–K: START/PAUSE/RESUME/CANCEL-Happy-Paths,
// MISSING_PAYLOAD, INVALID_STATE_TRANSITION nach CANCEL): hier nur die dort nicht
// abgedeckten Kanten — UNKNOWN_COMMAND, null-Kommando, PAUSE-No-op außerhalb
// RUNNING, CANCEL-Idempotenz. Alles läuft über stubbed globalThis.postMessage.
import { describe, it, expect, beforeEach } from 'vitest';
import { workerRunner } from '../simulation.worker';
import {
  WORKER_PROTOCOL_VERSION,
  type WorkerMessageCommand,
  type WorkerMessageEvent,
} from '../../../types/workerMessages';

describe('simulation.worker.branch', () => {
  let posted: WorkerMessageEvent[];

  beforeEach(() => {
    posted = [];
    (globalThis as unknown as { postMessage: (evt: WorkerMessageEvent) => void }).postMessage = (
      evt: WorkerMessageEvent,
    ) => {
      posted.push(evt);
    };
  });

  it('null-Kommando wird als INVALID_PROTOCOL_VERSION abgewiesen', () => {
    workerRunner.handleMessage(null as unknown as WorkerMessageCommand);
    expect(posted).toHaveLength(1);
    const evt = posted[0]!;
    expect(evt.type).toBe('FAILED');
    if (evt.type === 'FAILED') {
      expect(evt.payload!.error!.code).toBe('INVALID_PROTOCOL_VERSION');
      expect(evt.runId).toBe('unknown');
      expect(evt.requestId).toBe('unknown');
    }
  });

  it('unbekanntes Kommando wird als UNKNOWN_COMMAND abgewiesen', () => {
    workerRunner.handleMessage({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      command: 'FROBNICATE',
      runId: 'r-unknown',
      requestId: 'q-unknown',
    } as unknown as WorkerMessageCommand);
    expect(posted).toHaveLength(1);
    const evt = posted[0]!;
    expect(evt.type).toBe('FAILED');
    if (evt.type === 'FAILED') {
      expect(evt.payload!.error!.code).toBe('UNKNOWN_COMMAND');
      expect(evt.runId).toBe('r-unknown');
      expect(evt.payload!.error!.recoverable).toBe(false);
    }
  });

  it('START ohne runId/Payload wird als MISSING_PAYLOAD abgewiesen', () => {
    workerRunner.handleMessage({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      command: 'START',
      runId: '',
      requestId: 'q-nopayload',
    } as unknown as WorkerMessageCommand);
    const failed = posted.filter((e) => e.type === 'FAILED');
    expect(failed).toHaveLength(1);
    if (failed[0]?.type === 'FAILED') {
      expect(failed[0]!.payload!.error!.code).toBe('MISSING_PAYLOAD');
    }
  });

  it('PAUSE außerhalb RUNNING ist ein No-op ohne Event', () => {
    posted.length = 0;
    workerRunner.handleMessage({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      command: 'PAUSE',
      runId: 'r-pause-noop',
      requestId: 'q-pause-noop',
    });
    expect(posted).toEqual([]);
  });

  it('RESUME außerhalb PAUSED wird als INVALID_STATE_TRANSITION abgewiesen', () => {
    workerRunner.handleMessage({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      command: 'RESUME',
      runId: 'r-resume-bad',
      requestId: 'q-resume-bad',
    });
    expect(posted).toHaveLength(1);
    const evt = posted[0]!;
    expect(evt.type).toBe('FAILED');
    if (evt.type === 'FAILED') {
      expect(evt.payload!.error!.code).toBe('INVALID_STATE_TRANSITION');
      expect(evt.payload!.error!.recoverable).toBe(true);
    }
  });

  it('CANCEL ist idempotent: erstes postet CANCELLED, zweites schweigt', () => {
    workerRunner.handleMessage({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      command: 'CANCEL',
      runId: 'r-cancel',
      requestId: 'q-cancel-1',
    });
    expect(posted).toHaveLength(1);
    expect(posted[0]?.type).toBe('CANCELLED');
    posted.length = 0;
    workerRunner.handleMessage({
      protocolVersion: WORKER_PROTOCOL_VERSION,
      command: 'CANCEL',
      runId: 'r-cancel',
      requestId: 'q-cancel-2',
    });
    expect(posted).toEqual([]);
  });
});
