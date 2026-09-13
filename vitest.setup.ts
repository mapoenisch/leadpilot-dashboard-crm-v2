// vitest.setup.ts — Setup für Vitest (G32).
// Simulation-Tests laufen in Node-Umgebung und brauchen kein DOM-Setup.
// Der jsdom-Zweig gilt nur für das ui-Projekt (*.ui.vitest.ts, Hooks/G33-Umbau).
if (typeof window !== 'undefined') {
  // @testing-library/jest-dom greift beim Import auf globales expect zu —
  // im Setup-Kontext noch nicht vorhanden, daher explizit bereitstellen.
  const { expect: vitestExpect } = await import('vitest');
  (globalThis as Record<string, unknown>).expect = vitestExpect;
  await import('@testing-library/jest-dom');
  const { cleanup } = await import('@testing-library/react');
  const { afterEach } = await import('vitest');
  afterEach(() => {
    cleanup();
  });

  // jsdom kennt kein matchMedia — Grund-Polyfill (Tests installieren bei Bedarf
  // ihr eigenes, schärferes Mock via writable/configurable defineProperty).
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      value: () => ({
        matches: false,
        media: '',
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
      writable: true,
      configurable: true,
    });
  }

  // jsdom kennt kein ResizeObserver — Grund-Polyfill für Recharts ResponsiveContainer
  if (typeof window.ResizeObserver !== 'function') {
    class ResizeObserverMock {
      private callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
      observe(target: Element) {
        this.callback(
          [
            {
              target,
              contentRect: {
                x: 0,
                y: 0,
                width: 800,
                height: 600,
                top: 0,
                right: 800,
                bottom: 600,
                left: 0,
                toJSON: () => {},
              },
              borderBoxSize: [],
              contentBoxSize: [],
              devicePixelContentBoxSize: [],
            } as unknown as ResizeObserverEntry,
          ],
          this as unknown as ResizeObserver
        );
      }
      unobserve() {}
      disconnect() {}
    }

    Object.defineProperty(window, 'ResizeObserver', {
      value: ResizeObserverMock,
      writable: true,
      configurable: true,
    });
    (globalThis as Record<string, unknown>).ResizeObserver = ResizeObserverMock;
  }
}
