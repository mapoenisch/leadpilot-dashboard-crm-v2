// vitest.setup.ts — Setup für Vitest (G32).
// Simulation-Tests laufen in Node-Umgebung und brauchen kein DOM-Setup.
// Der jsdom-Zweig gilt nur für das ui-Projekt (*.ui.vitest.ts, Hooks/G33-Umbau).
if (typeof window !== 'undefined') {
  // @testing-library/jest-dom greift beim Import auf globales expect zu —
  // im Setup-Kontext noch nicht vorhanden, daher explizit bereitstellen.
  const { expect: vitestExpect } = await import('vitest');
  (globalThis as Record<string, unknown>).expect = vitestExpect;
  await import('@testing-library/jest-dom');

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
}
