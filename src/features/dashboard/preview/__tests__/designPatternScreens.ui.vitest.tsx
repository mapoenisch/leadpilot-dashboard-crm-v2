// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FunnelPattern } from '../designPatternScreens';

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
    expect(funnel.textContent).toContain('inkl. Self-Service');
  });
});
