import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PnLPage } from './PnLPage';

describe('Glossar auf bestehender Seite (Auftrag 117, Codex P2)', () => {
  it('PnLPage erklärt EBITDA im Panel-Untertitel', () => {
    render(<PnLPage />);
    const abbr = document.querySelector('abbr[title*="Zinsen"]');
    expect(abbr).not.toBeNull();
    expect(abbr).toHaveTextContent('EBITDA');
  });
});
