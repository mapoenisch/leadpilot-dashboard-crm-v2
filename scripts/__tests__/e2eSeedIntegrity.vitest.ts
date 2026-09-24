import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_A_USER_ID = '11111111-1111-1111-1111-111111111111';
const ADMIN_B_USER_ID = '44444444-4444-4444-4444-444444444444';
const NOMEMBER_USER_ID = '66666666-6666-6666-6666-666666666666';

describe('e2eSeedIntegrity (Gate G58 / [P1-6])', () => {
  const seedSql = fs.readFileSync(path.join(ROOT, 'supabase/seed.sql'), 'utf-8');

  it('admin-a@e2e.local ist Mitglied der Demo-Organisation 00000000-0000-0000-0000-000000000001', () => {
    // admin-a (11111111-...) muss in organization_members genau der DEMO_ORG_ID zugeordnet sein,
    // damit E2E-Tests und Visual-Baselines keinen Integritätsfehler (SYNTHETIC_NOT_ALLOWED) rendern.
    const memberRegex = new RegExp(
      `\\('${ADMIN_A_USER_ID}',\\s*'${DEMO_ORG_ID}',\\s*'admin'\\)`
    );
    expect(
      memberRegex.test(seedSql),
      `admin-a (${ADMIN_A_USER_ID}) muss in public.organization_members der Demo-Organisation (${DEMO_ORG_ID}) zugeordnet sein`
    ).toBe(true);
  });

  it('admin-b@e2e.local bleibt Organisation B zugeordnet und nomember hat keine Mitgliedschaft', () => {
    const adminBRegex = new RegExp(
      `\\('${ADMIN_B_USER_ID}',\\s*'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',\\s*'admin'\\)`
    );
    expect(adminBRegex.test(seedSql), 'admin-b ist Organisation B zugeordnet').toBe(true);
    const orgMembersBlock = seedSql.split('public.organization_members')[1] || '';
    expect(orgMembersBlock.includes(NOMEMBER_USER_ID), 'nomember hat keine Mitgliedschaft').toBe(false);
  });

  it('Organisation A und B bleiben im Seed für spätere Mandantentrennung (G60) angelegt', () => {
    expect(seedSql).toContain('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(seedSql).toContain('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  });
});
