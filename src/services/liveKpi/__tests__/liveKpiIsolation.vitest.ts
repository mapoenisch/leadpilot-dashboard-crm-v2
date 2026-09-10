// G35 (Auftrag 050-C, Block 1): Isolations-Audit als Vitest.
// Gerettet aus Abschnitt 10 von scripts/verifyLiveKpiStream.ts (gelöscht, P1):
// dessen Abschnitte 1–9 sind durch liveKpiStreamStore(.Lifecycle).vitest.ts,
// Abschnitt 11 durch liveKpiReadAdapter.vitest.ts abgelöst. Node-Projekt —
// liest nur Quelltexte, importiert weder Store noch Hooks noch Supabase.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const TARGETS = [
  '../liveKpiStreamStore.ts',
  '../../../hooks/useLiveKpi.ts',
  '../../../hooks/useLiveKpiHistory.ts',
  '../../../hooks/useLiveKpiActivity.ts',
] as const;

const RULES = [
  { name: 'kein supabaseClient', pattern: /supabaseClient/i },
  { name: 'kein supabase-Import', pattern: /from\s+['"][^'"]*supabase[^'"]*['"]/i },
  { name: 'kein setInterval', pattern: /setInterval/i },
] as const;

const CASES = TARGETS.flatMap((file) =>
  RULES.map((rule) => ({ file, name: rule.name, pattern: rule.pattern })),
);

describe('Live-KPI-Isolation (Store + Hooks)', () => {
  it.each(CASES)('$file: $name', ({ file, pattern }) => {
    const src = readFileSync(new URL(file, import.meta.url), 'utf8');
    expect(src).not.toMatch(pattern);
  });
});
