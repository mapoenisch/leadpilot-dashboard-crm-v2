import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildImportPlan, buildImportSql } from './importHubSpotCaseStudy.mjs';

function fixture() {
  const companies = Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, name: `Firma ${i}`, domain: `firma${i}.example.com`, employeeCount: 1 }));
  const contacts = Array.from({ length: 20 }, (_, i) => ({ id: String(905953680598 + i), companyId: `c${i % 10}`, firstName: 'Demo', lastName: String(i), email: `demo${i}@firma${i % 10}.example.com` }));
  return { sourceSystem: 'hubspot', hubspotPortalId: 148823070, companies, contacts, importedFunnelDeals: [], counts: { companies: 10, contacts: 20, deals: 0 } };
}

test('übernimmt nur die 20 Set-4-Kontakte und ihre zehn Unternehmen', () => {
  const data = fixture();
  data.contacts.push({ id: 'unrelated', email: 'private@example.org' });
  data.counts.contacts++;
  const plan = buildImportPlan(data);
  assert.equal(plan.contacts.length, 20);
  assert.equal(plan.companies.length, 10);
  assert.ok(!JSON.stringify(plan).includes('private@example.org'));
});
test('weist fehlende Kontakte, Firmenname und fremde Quelle zurück', () => {
  const missing = fixture(); missing.contacts.pop(); missing.counts.contacts--;
  assert.throws(() => buildImportPlan(missing), /fehlt/);
  const nameless = fixture(); nameless.companies[0].name = '';
  assert.throws(() => buildImportPlan(nameless), /Unternehmen/);
  const wrong = fixture(); wrong.hubspotPortalId = 1;
  assert.throws(() => buildImportPlan(wrong), /Quelle/);
});
test('weist echte Kontaktdaten und ungültige Referenzen zurück', () => {
  const real = fixture(); real.contacts[0].email = 'person@real.org';
  assert.throws(() => buildImportPlan(real), /synthetischer/);
  const dangling = fixture(); dangling.contacts[0].companyId = 'missing';
  assert.throws(() => buildImportPlan(dangling), /Unternehmen/);
});
test('Dry-run rollt zurück; Apply verwendet Transaktion, Mandantenschutz und Upsert', () => {
  const plan = buildImportPlan(fixture());
  const org = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  assert.match(buildImportSql(plan, org, 'admin@example.com'), /ROLLBACK;\s*$/);
  const applied = buildImportSql(plan, org, 'admin@example.com', true);
  assert.match(applied, /^BEGIN;/);
  assert.match(applied, /COMMIT;\s*$/);
  assert.match(applied, /m.role='admin'/);
  assert.match(applied, /ON CONFLICT \(id\) DO UPDATE/);
  assert.match(applied, /Import kollidiert/);
  assert.doesNotMatch(applied, /DELETE FROM|TRUNCATE|ALTER TABLE|DROP TABLE/);
});
test('SQL-Literale sind escaped; Zielorganisation muss explizit gültig sein', () => {
  const plan = buildImportPlan(fixture()); plan.companies[0].name = "O'Brian";
  assert.match(buildImportSql(plan, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@example.com'), /O''Brian/);
  assert.throws(() => buildImportSql(plan, 'invalid', 'admin@example.com'), /Zielorganisation/);
});
