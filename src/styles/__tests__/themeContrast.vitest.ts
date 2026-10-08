/**
 * Auftrag 083 / F15: Regressionen für den hellen Modus.
 * 1. `--color-text-primary` ist definiert (vorher undefiniert, Fallback Weiß auf Hell).
 * 2. Die Shell (Kopfzeile, Sidebar, Simulationsleiste) nutzt themenabhängige Hintergrund-Tokens
 *    statt fest verdrahteter dunkler Werte.
 * 3. Die hellen Markentöne erreichen auf den getönten hellen Flächen mindestens 4.5:1.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');
const css = fs.readFileSync(path.join(ROOT, 'src/styles/global.css'), 'utf8');

type Rgb = [number, number, number];

/** Token eines Selektorblocks aus global.css; fehlende Tokens liefern `undefined`. */
function block(selector: string): (name: string) => string | undefined {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} fehlt in global.css`).toBeGreaterThanOrEqual(0);
  const body = css.slice(start, css.indexOf('\n}', start)).replace(/\/\*[\s\S]*?\*\//g, '');
  const tokens = new Map<string, string>();
  for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    if (name && value) tokens.set(name, value.trim());
  }
  return (name) => tokens.get(name);
}

const darkToken = block(':root');
const lightToken = block("[data-theme='light']");
const required = (lookup: (name: string) => string | undefined, name: string): string => {
  const value = lookup(name);
  if (!value) throw new Error(`${name} fehlt in global.css`);
  return value;
};
const light = (name: string) => required(lightToken, name);

const channels = (color: string): number[] => (color.match(/[\d.]+/g) ?? []).map(Number);
const rgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const luminance = ([r, g, b]: Rgb) => {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contrast = (text: string, surface: Rgb) => {
  const a = luminance(rgb(text));
  const b = luminance(surface);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
/** rgba-Farbe über eine deckende Grundfarbe legen. */
const over = (rgba: string, base: string): Rgb => {
  const [r = 0, g = 0, b = 0, alpha = 1] = channels(rgba);
  const [br, bg, bb] = rgb(base);
  return [r * alpha + br * (1 - alpha), g * alpha + bg * (1 - alpha), b * alpha + bb * (1 - alpha)];
};

describe('Auftrag 083 / F15 – Theme-Tokens', () => {
  it('definiert --color-text-primary über --color-text', () => {
    expect(darkToken('--color-text-primary')).toBe('var(--color-text)');
  });

  it('definiert --color-text-soft dunkel wie der bisherige Fallback, hell wie der Haupttext', () => {
    expect(darkToken('--color-text-soft')?.toLowerCase()).toBe('#e6f3f1');
    expect(lightToken('--color-text-soft')).toBe('var(--color-text)');
  });

  it('Dashboard-Komponenten nutzen nur definierte Text-Tokens', () => {
    const dir = path.join(ROOT, 'src/features/dashboard');
    const files = fs.readdirSync(dir, { recursive: true, encoding: 'utf8' });
    for (const file of files.filter((f) => f.endsWith('.tsx') && !f.includes('__tests__'))) {
      const source = fs.readFileSync(path.join(dir, file), 'utf8');
      for (const [, token] of source.matchAll(/var\((--color-text[\w-]*)/g)) {
        expect(darkToken(token ?? ''), `${token} in ${file}`).toBeDefined();
      }
    }
  });

  it.each(['--color-shell-header', '--color-shell-sidebar', '--color-shell-strip'])(
    '%s existiert in dunkel und hell',
    (token) => {
      expect(darkToken(token)).toMatch(/^rgba\(/);
      expect(lightToken(token)).toMatch(/^rgba\(/);
      expect(lightToken(token)).not.toBe(darkToken(token));
    },
  );

  it('Shell-Komponenten haben keine fest verdrahteten dunklen Hintergründe mehr', () => {
    const files = {
      'Header.tsx': 'bg-[var(--color-shell-header)]',
      'Sidebar.tsx': 'bg-[var(--color-shell-sidebar)]',
      'SimulationBar.tsx': 'bg-[var(--color-shell-strip)]',
    };
    for (const [file, expected] of Object.entries(files)) {
      const source = fs.readFileSync(path.join(ROOT, 'src/components/layout', file), 'utf8');
      expect(source, file).toContain(expected);
      expect(source, file).not.toMatch(/bg-\[rgba\((6,22,19|18,51,48),0\.(75|85|95)\)\]/);
    }
  });

  it('feste dunkle Schrift auf bg-primary hat eine helle Variante für das helle Theme', () => {
    // Codex PR #68: bg-primary wird hell zu #006057; fest dunkle Schrift läge dort bei 2.5:1.
    const source = fs.readFileSync(
      path.join(ROOT, 'src/features/vertrieb/components/SlaSwimlane.tsx'),
      'utf8',
    );
    const matches = [...source.matchAll(/bg-primary text-\[#0[0-9a-fA-F]{5}\][^"]*/g)];
    expect(matches.length).toBeGreaterThan(0);
    for (const [className] of matches) {
      expect(className).toContain('[[data-theme=light]_&]:text-white');
    }
  });

  it('helle Markentöne erreichen auf neutralen Flächen und ihrer Soft-Fläche mindestens 4.5:1', () => {
    const neutral = {
      bg: light('--charcoal'),
      'bg-deep': light('--color-bg-deep'),
      surface: light('--surface'),
      'surface-raised': light('--color-surface-raised'),
    };
    const brand = {
      '--cyan': '--cyan-a12',
      '--orange': '--orange-a14',
      '--coral-red': '--coral-red-a14',
      '--mint-green': '--mint-green-a14',
    };
    for (const [token, soft] of Object.entries(brand)) {
      for (const [name, base] of Object.entries(neutral)) {
        expect(contrast(light(token), rgb(base)), `${token} auf ${name}`).toBeGreaterThanOrEqual(
          4.5,
        );
        expect(
          contrast(light(token), over(light(soft), base)),
          `${token} auf ${soft} über ${name}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
