// G65 (Auftrag 067S, Spec §19): Produktivbuild nur mit vollständiger Konfiguration.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkProductionConfig, readProductionEnv } from '../checkProductionConfig.mjs';

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
});

describe('readProductionEnv (dieselben Dateien wie vite build)', () => {
  let dir = '';
  // Vitest setzt VITE_SUPABASE_* hermetisch leer; Umgebungswerte schlagen bei Vite
  // die Dateien. Für diesen Test gelten nur die Dateien im Temp-Verzeichnis.
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
  });
  afterEach(() => {
    process.env = { ...saved };
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('berücksichtigt .env.production.local mit Vorrang (Codex-Review #30, P1)', async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prod-env-'));
    fs.writeFileSync(
      path.join(dir, '.env'),
      `VITE_SUPABASE_URL=https://abc.supabase.co\nVITE_SUPABASE_ANON_KEY=${jwt('anon')}\n`,
    );
    expect(checkProductionConfig(await readProductionEnv(dir))).toEqual([]);

    fs.writeFileSync(
      path.join(dir, '.env.production.local'),
      `VITE_SUPABASE_ANON_KEY=${jwt('service_role')}\n`,
    );
    expect(checkProductionConfig(await readProductionEnv(dir)).join(' ')).toMatch(
      /privilegierten Schlüssel/,
    );
  });
});
