// Automatisierungs-Restpunkt 4: `ci.yml` führt eine feste Dateiliste aus. Eine neue E2E-Suite
// (z. B. e2e/personal-dashboard.spec.ts) würde sonst nie in der CI laufen. Geprüft werden nur
// tatsächlich ausgeführte `run`-Befehle mit `playwright test`, nicht Kommentare oder Schrittnamen.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/** Alle `run`-Befehle eines Workflows (einzeilig oder als Block mit `|`/`>`). */
export function runCommands(yaml: string): string[] {
  const lines = yaml.split('\n');
  const commands: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\s*)(?:-\s+)?run:\s*(.*)$/);
    if (!match) continue;
    const [, indent, rest] = match;
    if (!/^[|>][+-]?\s*$/.test(rest)) {
      commands.push(rest.replace(/\s+#.*$/, ''));
      continue;
    }
    const block: string[] = [];
    while (index + 1 < lines.length) {
      const next = lines[index + 1];
      if (next.trim() !== '' && next.search(/\S/) <= indent.length) break;
      block.push(next);
      index += 1;
    }
    commands.push(block.filter((line) => !line.trim().startsWith('#')).join('\n'));
  }
  return commands;
}

/** Einzelne Shell-Befehle: Fortsetzungszeilen verbinden, Kommentare entfernen, an Operatoren trennen. */
export function shellCommands(block: string): string[] {
  return block
    .replace(/\\\n/g, ' ')
    .split('\n')
    .map((line) => line.replace(/(^|\s)#.*$/, ''))
    .join('\n')
    .split(/&&|\|\||;|\||\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function playwrightFiles(yaml: string): Set<string> {
  const files = new Set<string>();
  for (const block of runCommands(yaml)) {
    for (const command of shellCommands(block)) {
      if (!/^(?:\w+=\S*\s+)*(?:npx\s+)?playwright\s+test\b/.test(command)) continue;
      for (const match of command.matchAll(/\be2e\/[\w.-]+\.(?:spec|acceptance)\.ts\b/g)) {
        files.add(match[0]);
      }
    }
  }
  return files;
}

const root = path.join(__dirname, '..', '..');
const ci = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf-8');
const specs = fs
  .readdirSync(path.join(root, 'e2e'))
  .filter((file) => file.endsWith('.spec.ts'))
  .sort();

describe('playwrightFiles', () => {
  it('zählt Dateien aus einzeiligen und mehrzeiligen run-Befehlen', () => {
    const yaml = [
      'steps:',
      '  - run: npx playwright test e2e/a.spec.ts e2e/b.spec.ts',
      '  - name: Sequentiell',
      '    run: |',
      '      npx playwright test e2e/c.spec.ts --workers=1',
      '  - run: echo fertig',
    ].join('\n');
    expect([...playwrightFiles(yaml)].sort()).toEqual([
      'e2e/a.spec.ts',
      'e2e/b.spec.ts',
      'e2e/c.spec.ts',
    ]);
  });

  it('zählt Kommentare, Schrittnamen und andere Befehle nicht', () => {
    const yaml = [
      'steps:',
      '  # später aufnehmen: e2e/kommentar.spec.ts',
      '  - name: Prüft e2e/name.spec.ts',
      '    run: npx playwright test e2e/echt.spec.ts # nicht e2e/trailing.spec.ts',
      '  - run: echo e2e/echo.spec.ts',
      '  - run: |',
      '      # e2e/block-kommentar.spec.ts',
      '      cat e2e/cat.spec.ts',
      '  - run: |',
      '      npx playwright test e2e/mehr.spec.ts \\',
      '        e2e/zeile.spec.ts # e2e/inline.spec.ts',
      '      echo e2e/not-run.spec.ts',
      '      npx playwright test e2e/nach.spec.ts && echo e2e/danach.spec.ts',
    ].join('\n');
    expect([...playwrightFiles(yaml)].sort()).toEqual([
      'e2e/echt.spec.ts',
      'e2e/mehr.spec.ts',
      'e2e/nach.spec.ts',
      'e2e/zeile.spec.ts',
    ]);
  });
});

describe('E2E-Dateiliste in ci.yml', () => {
  const listed = playwrightFiles(ci);

  it('findet die vorhandenen E2E-Suiten und die Playwright-Aufrufe', () => {
    expect(specs.length).toBeGreaterThan(0);
    expect(listed.size).toBeGreaterThan(0);
  });

  it.each(specs)('führt e2e/%s in einem Playwright-Befehl der CI aus', (file) => {
    expect(listed.has(`e2e/${file}`)).toBe(true);
  });
});
