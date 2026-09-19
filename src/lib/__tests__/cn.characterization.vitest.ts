// Charakterisierung: cn (Tailwind-Klassen-Merge).
import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('verbindet Klassen und löst Konflikte zugunsten der letzten', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-sm', 'font-bold')).toBe('text-sm font-bold');
  });

  it('ignoriert Falsy und Arrays/Objekte wie clsx', () => {
    expect(cn('a', undefined, null, 'c')).toBe('a c');
    expect(cn({ active: true, hidden: false })).toBe('active');
  });

  it('leere Eingabe liefert leeren String', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
  });
});
