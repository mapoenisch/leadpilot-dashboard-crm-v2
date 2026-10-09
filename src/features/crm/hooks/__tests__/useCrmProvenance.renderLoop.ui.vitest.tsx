// Auftrag 084 / F12: useCrmProvenance darf zusammen mit useCrmListQuery keine
// Render-Schleife bilden. Vorher: jeder Render erzeugt neue Query-Optionen →
// QueryCache meldet 'observerOptionsUpdated' → useCrmProvenance setzt ein neues
// State-Objekt → erneuter Render. Die Dauer-Updates verdrängen die als
// Transition laufende Router-Navigation (Adresse wechselt, Inhalt bleibt).
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCrmProvenance } from '../useCrmProvenance';
import { useCrmListQuery } from '@/hooks/queries/useCrmListQuery';
import { fetchCrmList } from '@/services/crm/crmListService';

vi.mock('@/services/crm/crmListService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/crm/crmListService')>();
  return { ...actual, fetchCrmList: vi.fn() };
});

const mockedFetch = vi.mocked(fetchCrmList);

const RENDER_CAP = 200;

// Bricht eine Schleife per Fehler ab, statt den Worker in den Speicherüberlauf
// laufen zu lassen; die Grenze fängt sie ab und meldet sie dem Test.
class LoopGuard extends React.Component<
  { onLoop: () => void; children: React.ReactNode },
  { stopped: boolean }
> {
  state = { stopped: false };
  static getDerivedStateFromError() {
    return { stopped: true };
  }
  componentDidCatch() {
    this.props.onLoop();
  }
  render() {
    return this.state.stopped ? null : this.props.children;
  }
}

function Probe({ onRender }: { onRender: () => number }) {
  if (onRender() > RENDER_CAP) throw new Error('Render-Schleife');
  useCrmProvenance('deals');
  useCrmListQuery({ resource: 'deals', page: 1, pageSize: 20 });
  return null;
}

async function settleAndCount(fetchImpl: () => Promise<unknown>) {
  mockedFetch.mockImplementation(fetchImpl as never);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let renders = 0;
  let loopDetected = false;
  // Ohne act-Umgebung: act() würde bei einer Endlosschleife nie zurückkehren.
  const g = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const prevActEnv = g.IS_REACT_ACT_ENVIRONMENT;
  g.IS_REACT_ACT_ENVIRONMENT = false;
  const view = render(
    <QueryClientProvider client={queryClient}>
      <LoopGuard onLoop={() => (loopDetected = true)}>
        <Probe onRender={() => ++renders} />
      </LoopGuard>
    </QueryClientProvider>,
  );
  try {
    // Antwort abwarten, dann ruhige Phase messen.
    await new Promise((r) => setTimeout(r, 100));
    const before = renders;
    await new Promise((r) => setTimeout(r, 300));
    return { extra: renders - before, loopDetected };
  } finally {
    view.unmount();
    queryClient.clear();
    g.IS_REACT_ACT_ENVIRONMENT = prevActEnv;
  }
}

describe('useCrmProvenance + useCrmListQuery (F12 Render-Schleife)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rendert nach erfolgreicher Antwort nicht weiter', async () => {
    const result = await settleAndCount(() => Promise.resolve({ items: [{ id: 'd1' }], total: 1 }));
    expect(result.loopDetected).toBe(false);
    expect(result.extra).toBe(0);
  });

  it('rendert nach leerer Antwort nicht weiter', async () => {
    const result = await settleAndCount(() => Promise.resolve({ items: [], total: 0 }));
    expect(result.loopDetected).toBe(false);
    expect(result.extra).toBe(0);
  });

  it('rendert nach Serverfehler nicht weiter', async () => {
    const result = await settleAndCount(() => Promise.reject(new Error('SERVER_ERROR')));
    expect(result.loopDetected).toBe(false);
    expect(result.extra).toBe(0);
  });
});
