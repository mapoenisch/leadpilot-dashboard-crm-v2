// Automatisierungs-Restpunkt 4: `ci.yml` führt eine feste Dateiliste aus. Eine neue E2E-Suite
// (z. B. e2e/personal-dashboard.spec.ts) würde sonst nie in der CI laufen.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..', '..');
const ci = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf-8');
const specs = fs
  .readdirSync(path.join(root, 'e2e'))
  .filter((file) => file.endsWith('.spec.ts'))
  .sort();

describe('E2E-Dateiliste in ci.yml', () => {
  it('findet die vorhandenen E2E-Suiten', () => {
    expect(specs.length).toBeGreaterThan(0);
  });

  it.each(specs)('führt e2e/%s in der CI aus', (file) => {
    const pattern = new RegExp(`(^|\\s)e2e/${file.replace(/[.]/g, '\\.')}(\\s|$)`, 'm');
    expect(ci).toMatch(pattern);
  });
});
