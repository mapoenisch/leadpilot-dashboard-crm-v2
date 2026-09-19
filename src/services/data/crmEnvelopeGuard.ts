import {
  CrmReadModel,
  CrmReadModelEnvelope,
  CrmSourceHealth,
  DataSourceError,
} from '../../types/dataSource';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** Leeres Modell für `unavailable`/`empty` — niemals synthetische Ersatzdaten. */
export function emptyCrmReadModel(): CrmReadModel {
  return {
    companies: [],
    contacts: [],
    deals: [],
    activities: [],
    audit: {
      companiesLoaded: 0,
      companiesValid: 0,
      companiesErrors: 0,
      contactsLoaded: 0,
      contactsValid: 0,
      contactsMatched: 0,
      contactsErrors: 0,
      dealsLoaded: 0,
      dealsValid: 0,
      dealsErrors: 0,
    },
  };
}

/**
 * Expliziter Runtime-Guard an der Integrationsgrenze (Design §6:
 * handgeschriebene Zeilentypen → generierte DB-Typen + Guards; die generierten
 * Typen folgen mit der Supabase-Anbindung, dieser Guard gilt ab sofort für
 * jede Quelle). Wirft `DataSourceError` (INVALID_RUNTIME) statt still zu
 * mischen oder auf Demo zurückzufallen.
 */
export function validateCrmReadModel(model: unknown): asserts model is CrmReadModel {
  if (!isRecord(model)) {
    throw new DataSourceError('INVALID_RUNTIME', 'CRM-Modell ist kein Objekt.');
  }
  for (const key of ['companies', 'contacts', 'deals', 'activities'] as const) {
    if (!Array.isArray(model[key])) {
      throw new DataSourceError('INVALID_RUNTIME', `CRM-Modell: "${key}" ist kein Array.`);
    }
  }
  const { companies, contacts, deals, activities, audit } = model as Record<string, unknown>;

  for (const c of companies as unknown[]) {
    if (!isRecord(c) || !isNonEmptyString(c.id) || !isNonEmptyString(c.name)) {
      throw new DataSourceError('INVALID_RUNTIME', 'CRM-Modell: Company ohne id/name.');
    }
  }
  for (const p of contacts as unknown[]) {
    if (
      !isRecord(p) ||
      !isNonEmptyString(p.id) ||
      !isNonEmptyString(p.email) ||
      typeof p.companyId !== 'string'
    ) {
      throw new DataSourceError('INVALID_RUNTIME', 'CRM-Modell: Contact ohne id/email/companyId.');
    }
  }
  for (const d of deals as unknown[]) {
    if (
      !isRecord(d) ||
      !isNonEmptyString(d.id) ||
      typeof d.amount !== 'number' ||
      !Number.isFinite(d.amount)
    ) {
      throw new DataSourceError('INVALID_RUNTIME', 'CRM-Modell: Deal ohne id/finite amount.');
    }
  }
  for (const a of activities as unknown[]) {
    if (
      !isRecord(a) ||
      !isNonEmptyString(a.id) ||
      !isNonEmptyString(a.type) ||
      !isNonEmptyString(a.timestamp)
    ) {
      throw new DataSourceError('INVALID_RUNTIME', 'CRM-Modell: Activity ohne id/type/timestamp.');
    }
  }
  if (!isRecord(audit)) {
    throw new DataSourceError('INVALID_RUNTIME', 'CRM-Modell: Audit fehlt.');
  }
  for (const key of [
    'companiesLoaded',
    'companiesValid',
    'companiesErrors',
    'contactsLoaded',
    'contactsValid',
    'contactsMatched',
    'contactsErrors',
    'dealsLoaded',
    'dealsValid',
    'dealsErrors',
  ]) {
    if (!isFiniteNonNegativeNumber((audit as Record<string, unknown>)[key])) {
      throw new DataSourceError('INVALID_RUNTIME', `CRM-Modell: Audit-Zähler "${key}" ungültig.`);
    }
  }
}

/** Statusklassifikation: leer → empty, Audit-Fehler → degraded, sonst healthy. */
export function classifyEnvelopeStatus(
  model: CrmReadModel,
): Exclude<CrmSourceHealth, 'unavailable'> {
  const hasRows =
    model.companies.length > 0 ||
    model.contacts.length > 0 ||
    model.deals.length > 0 ||
    model.activities.length > 0;
  if (!hasRows) return 'empty';
  const errors = model.audit.companiesErrors + model.audit.contactsErrors + model.audit.dealsErrors;
  if (errors > 0) return 'degraded';
  return 'healthy';
}

/** Stabile Stringifizierung mit sortierten Keys (v0 bis 067E den kanonischen SHA-256 liefert). */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(',')}}`;
}

/** Deterministischer 64-Bit-Hash (cyrb53) als Hex — stabil pro Inhalt. */
export function hashCrmContent(model: CrmReadModel): string {
  const str = stableStringify(model);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

/**
 * Provenienz-Guard: Der Envelope muss exakt die erwartete Quelle tragen.
 * Ein Umhängen von Daten einer Quelle auf eine andere Id (partieller Mix)
 * wirft MIXED_SOURCE statt still zu mischen.
 */
export function assertSingleSourceEnvelope(
  envelope: CrmReadModelEnvelope,
  expectedSourceId: string,
): void {
  if (envelope.sourceId !== expectedSourceId) {
    throw new DataSourceError(
      'MIXED_SOURCE',
      `Provenienz verletzt: Envelope stammt aus "${envelope.sourceId}", erwartet "${expectedSourceId}".`,
    );
  }
  if (!isNonEmptyString(envelope.organizationId)) {
    throw new DataSourceError('INVALID_ORG', 'Envelope ohne organizationId.');
  }
  if (Number.isNaN(Date.parse(envelope.fetchedAt))) {
    throw new DataSourceError('INTEGRITY', 'Envelope ohne gültiges fetchedAt.');
  }
  if (!isNonEmptyString(envelope.contentHash)) {
    throw new DataSourceError('INTEGRITY', 'Envelope ohne contentHash.');
  }
  validateCrmReadModel(envelope.data);
}
