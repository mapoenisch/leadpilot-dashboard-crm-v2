import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Lokaler Operator-Import. Ausschließlich synthetische Set-4-Daten;
// keine Tokens, Schemaänderungen, Löschungen oder fremden Mandanten.
const CONTACT_IDS = Array.from({ length: 20 }, (_, i) => String(905953680598 + i));
const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;

export function buildImportPlan(snapshot) {
  if (snapshot.sourceSystem !== 'hubspot' || snapshot.hubspotPortalId !== 148823070) {
    throw new Error('Falsche Snapshot-Quelle oder falsches HubSpot-Portal.');
  }
  for (const [field, count] of [['companies', 'companies'], ['contacts', 'contacts'], ['importedFunnelDeals', 'deals']]) {
    if (!Array.isArray(snapshot[field]) || snapshot.counts?.[count] !== snapshot[field].length) {
      throw new Error(`Inkonsistente Snapshot-Zählwerte: ${field}.`);
    }
  }
  const contacts = CONTACT_IDS.map((id) => {
    const matches = snapshot.contacts.filter((contact) => contact.id === id);
    if (matches.length !== 1) throw new Error(`Kontakt ${id} fehlt oder ist doppelt.`);
    const contact = matches[0];
    if (!contact.firstName || !contact.lastName || !/^[^@\s]+@[^@\s]+\.example\.com$/.test(contact.email)) {
      throw new Error(`Kontakt ${id} ist kein vollständiger synthetischer Demo-Kontakt.`);
    }
    return contact;
  });
  if (new Set(contacts.map((contact) => contact.email.toLowerCase())).size !== 20) {
    throw new Error('Doppelte Kontakt-E-Mail-Adressen.');
  }
  const companies = [...new Set(contacts.map((contact) => contact.companyId))].map((id) => {
    const matches = snapshot.companies.filter((company) => company.id === id);
    if (matches.length !== 1 || !matches[0].name?.trim() || !/^[^.\s]+\.example\.com$/.test(matches[0].domain)) {
      throw new Error(`Ungültiges Demo-Unternehmen für ${id}.`);
    }
    return matches[0];
  });
  if (companies.length !== 10 || new Set(companies.map((company) => company.domain.toLowerCase())).size !== 10) {
    throw new Error('Set 4 muss genau zehn eindeutig zugeordnete Unternehmen enthalten.');
  }
  return { companies, contacts };
}

export function buildImportSql(plan, organizationId, operatorEmail, apply = false) {
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(organizationId)) {
    throw new Error('Explizite gültige Zielorganisation erforderlich.');
  }
  if (!operatorEmail || !operatorEmail.includes('@')) throw new Error('Operator erforderlich.');
  const organization = sqlString(organizationId);
  return `BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '20s';
SELECT pg_advisory_xact_lock(hashtext('hubspot-set4-import'));
CREATE TEMP TABLE import_plan (payload jsonb) ON COMMIT DROP;
INSERT INTO import_plan VALUES (${sqlString(JSON.stringify(plan))}::jsonb);
CREATE TEMP TABLE import_companies ON COMMIT DROP AS
  SELECT x.* FROM import_plan, jsonb_to_recordset(payload->'companies') AS x(id text, domain text, name text, industry text, city text, "postalCode" text, "employeeCount" integer);
CREATE TEMP TABLE import_contacts ON COMMIT DROP AS
  SELECT x.* FROM import_plan, jsonb_to_recordset(payload->'contacts') AS x(id text, "companyId" text, email text, "firstName" text, "lastName" text, "jobTitle" text);
DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organization_members m JOIN auth.users u ON u.id=m.user_id JOIN public.organizations o ON o.id=m.organization_id WHERE o.id=${organization}::uuid AND u.email=${sqlString(operatorEmail)} AND m.role='admin' AND m.status='active' AND o.status='active') THEN
    RAISE EXCEPTION 'Keine aktive Admin-Mitgliedschaft für den Zielmandanten';
  END IF;
  IF EXISTS (SELECT 1 FROM public.companies c JOIN import_companies i ON c.id=i.id OR lower(c.domain)=lower(i.domain) WHERE c.organization_id<>${organization}::uuid OR c.id<>i.id) OR
     EXISTS (SELECT 1 FROM public.contacts c JOIN import_contacts i ON c.id=i.id OR lower(c.email)=lower(i.email) WHERE c.organization_id<>${organization}::uuid OR c.id<>i.id) THEN
    RAISE EXCEPTION 'Import kollidiert mit vorhandenen IDs, Domains, E-Mails oder einem anderen Mandanten';
  END IF;
END $guard$;
INSERT INTO public.companies (id,domain,name,industry,city,postal_code,employee_count,organization_id)
SELECT id,domain,name,coalesce(industry,'Allgemein'),coalesce(city,'Unbekannt'),coalesce("postalCode",''),coalesce("employeeCount",0),${organization}::uuid FROM import_companies
ON CONFLICT (id) DO UPDATE SET domain=EXCLUDED.domain,name=EXCLUDED.name,industry=EXCLUDED.industry,city=EXCLUDED.city,postal_code=EXCLUDED.postal_code,employee_count=EXCLUDED.employee_count;
INSERT INTO public.contacts (id,company_id,email,first_name,last_name,job_title,organization_id)
SELECT id,"companyId",email,"firstName","lastName",coalesce("jobTitle",''),${organization}::uuid FROM import_contacts
ON CONFLICT (id) DO UPDATE SET company_id=EXCLUDED.company_id,email=EXCLUDED.email,first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,job_title=EXCLUDED.job_title;
DO $verify$
BEGIN
  IF (SELECT count(*) FROM public.contacts c JOIN import_contacts i ON i.id=c.id JOIN public.companies co ON co.id=c.company_id AND co.organization_id=c.organization_id WHERE c.organization_id=${organization}::uuid)<>20 THEN
    RAISE EXCEPTION 'Import unvollständig oder Unternehmenszuordnung ungültig';
  END IF;
END $verify$;
SELECT json_build_object('mode',${sqlString(apply ? 'applied' : 'dry-run-rolled-back')},'organizationId',${organization},'contacts',20,'companies',10,'allCompanyReferencesValid',true);
${apply ? 'COMMIT' : 'ROLLBACK'};
`;
}

export function main(args) {
  const value = (flag) => args[args.indexOf(flag) + 1];
  for (const flag of ['--snapshot', '--organization', '--operator']) {
    if (!args.includes(flag) || !value(flag) || value(flag).startsWith('--')) throw new Error(`${flag} fehlt.`);
  }
  const contents = readFileSync(value('--snapshot'), 'utf8');
  const plan = buildImportPlan(JSON.parse(contents));
  const sql = buildImportSql(plan, value('--organization'), value('--operator'), args.includes('--apply'));
  const result = spawnSync('docker', ['exec', '-i', 'supabase_db_LeadPilot_Dashboard-CRM', 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atq'], { input: sql, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'Lokaler Import fehlgeschlagen.');
  console.log(result.stdout.trim());
  console.log(`snapshotSha256=${createHash('sha256').update(contents).digest('hex')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
