// G65 (Auftrag 067S, Spec §19): Produktivbuild nur mit vollständiger Konfiguration.
import { describe, expect, it } from 'vitest';
import { checkProductionConfig, parseDotenv } from '../checkProductionConfig.mjs';

const jwt = (role: string) =>
  ['e30', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'sig'].join('.');

describe('checkProductionConfig', () => {
  it('akzeptiert https-URL und anon-Schlüssel', () => {
    expect(
      checkProductionConfig({
        VITE_SUPABASE_URL: 'https://abc.supabase.co',
        VITE_SUPABASE_ANON_KEY: jwt('anon'),
      }),
    ).toEqual([]);
  });

  it('weist fehlende Werte, Platzhalter, http und privilegierte Schlüssel ab', () => {
    expect(checkProductionConfig({})).toHaveLength(2);
    expect(
      checkProductionConfig({
        VITE_SUPABASE_URL: 'https://your-project.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'your-anon-public-key',
      }),
    ).toContain('Platzhalter aus .env.example sind nicht ersetzt.');
    expect(
      checkProductionConfig({
        VITE_SUPABASE_URL: 'http://abc.example',
        VITE_SUPABASE_ANON_KEY: jwt('anon'),
      }),
    ).toContain('VITE_SUPABASE_URL muss für Produktion https verwenden.');
    expect(
      checkProductionConfig({
        VITE_SUPABASE_URL: 'https://abc.supabase.co',
        VITE_SUPABASE_ANON_KEY: jwt('service_role'),
      }).join(' '),
    ).toMatch(/privilegierten Schlüssel/);
    expect(
      checkProductionConfig({
        VITE_SUPABASE_URL: 'https://abc.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'sb_secret_x',
      }).join(' '),
    ).toMatch(/privilegierten Schlüssel/);
  });

  it('liest .env-Zeilen ohne Kommentare', () => {
    expect(parseDotenv('# x\nVITE_SUPABASE_URL="https://a.b"\n  FOO = bar \n')).toEqual({
      VITE_SUPABASE_URL: 'https://a.b',
      FOO: 'bar',
    });
  });
});
