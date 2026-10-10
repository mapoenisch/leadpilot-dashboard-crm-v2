// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditorPattern, FunnelPattern, MobileHomePattern } from '../designPatternScreens';
import { LANGER_TITEL } from '../designPatternTiles';

describe('FunnelPattern', () => {
  it('führt alle belegten Funnelstufen inklusive Testversionen (Codex PR #73, Runde 4)', () => {
    render(<FunnelPattern />);
    const funnel = screen.getByTestId('muster-funnel');
    for (const stufe of [
      'Leads',
      'MQL',
      'SQL',
      'Testversionen gestartet',
      'Angebote',
      'Neukunden',
    ]) {
      expect(funnel.textContent).toContain(stufe);
    }
    expect(funnel.textContent).toContain('264');
    expect(funnel.textContent).toContain('Self-Service-Pfad, parallel');
  });

  it('hält Testversionen aus der Stufenkette des Diagramms (Codex PR #73, Runde 5)', () => {
    render(<FunnelPattern />);
    const chart = screen.getByTestId('muster-funnel-stufen');
    expect(chart.textContent).not.toContain('Testversionen');
    expect(chart.textContent).toContain('Angebote');
  });

  it.each([
    ['mobil', MobileHomePattern],
    ['funnel', FunnelPattern],
    ['editor', EditorPattern],
  ])(
    'zeigt im Muster %s den langen Titel im Normalfall, getrennt vom Fehler (Runde 6)',
    (id, Pattern) => {
      render(<Pattern />);
      const lang = screen.getByTestId(`muster-${id}-lang`);
      expect(lang.textContent).toContain(LANGER_TITEL);
      expect(lang.querySelector('[role="alert"]')).toBeNull();
      const fehler = screen.getByTestId(`muster-${id}-fehler`);
      expect(fehler.textContent).not.toContain(LANGER_TITEL);
      expect(fehler.querySelector('[role="alert"]')).not.toBeNull();
    },
  );
});
