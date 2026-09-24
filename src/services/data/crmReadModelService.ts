import { CrmReadModelEnvelope, CrmSourceKind, DataSourceError } from '../../types/dataSource';
import { dataSourceRegistry } from './dataSourceRegistry';
import {
  assertSingleSourceEnvelope,
  classifyEnvelopeStatus,
  emptyCrmReadModel,
  hashCrmContent,
  validateCrmReadModel,
} from './crmEnvelopeGuard';

/** Demo-Mandant aus G45/G46-Migrationen (idempotent, mode 'synthetic'). */
export const DEMO_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';

export interface LoadCrmOptions {
  /**
   * Bewusste Demo-Auswahl (Design §6): synthetische Quellen nur wenn
   * `allowSynthetic === true` UND organizationId der Demo-Mandant ist.
   * Sonst fail-closed `unavailable`, niemals stiller Demo-Fallback.
   */
  allowSynthetic?: boolean;
}

/** Registry-Kind → Spec-Kind (Design §6). Supabase liest live aus `supabase`. */
export function resolveSourceKind(sourceId: string, registryKind: string): CrmSourceKind {
  if (sourceId === 'supabase' || sourceId.startsWith('supabase:')) return 'supabase';
  if (sourceId.startsWith('hubspot-baseline:') || registryKind === 'external') return 'hubspot';
  return 'synthetic';
}

function unavailable(
  organizationId: string,
  sourceId: string,
  sourceKind: CrmSourceKind,
  errorCode: string,
): CrmReadModelEnvelope {
  return {
    organizationId,
    sourceId,
    sourceKind,
    status: 'unavailable',
    fetchedAt: new Date().toISOString(),
    contentHash: hashCrmContent(emptyCrmReadModel()),
    data: emptyCrmReadModel(),
    errorCode,
  };
}

/**
 * 067D / G47 — lädt genau einen quellenkonsistenten Envelope aus genau einer
 * Quelle. Wirft niemals nach außen: jeder Fehler wird ein `unavailable`-
 * Envelope mit leerem Modell. Kein Fallback auf eine andere Quelle.
 */
export async function loadCrmReadModel(
  organizationId: string,
  sourceId: string,
  opts: LoadCrmOptions = {},
): Promise<CrmReadModelEnvelope> {
  if (!organizationId || typeof organizationId !== 'string') {
    return unavailable('', sourceId, 'synthetic', 'INVALID_ORG');
  }

  let source: ReturnType<typeof dataSourceRegistry.get>;
  try {
    source = dataSourceRegistry.get(sourceId);
  } catch (e) {
    const code = e instanceof DataSourceError ? e.code : 'UNKNOWN_SOURCE';
    return unavailable(organizationId, sourceId, 'synthetic', code);
  }

  const sourceKind = resolveSourceKind(source.info.id, source.info.kind);
  if (
    sourceKind === 'synthetic' &&
    !(opts.allowSynthetic === true && organizationId === DEMO_ORGANIZATION_ID)
  ) {
    return unavailable(organizationId, sourceId, sourceKind, 'SYNTHETIC_NOT_ALLOWED');
  }

  let model: unknown;
  try {
    // Genau ein Point-in-Time-Pull aus genau dieser Quelle — kein Zweitabruf.
    model = await source.fetchSnapshot();
  } catch (e) {
    const code = e instanceof DataSourceError ? e.code : 'FETCH_FAILED';
    return unavailable(organizationId, sourceId, sourceKind, code);
  }

  try {
    validateCrmReadModel(model);
  } catch (e) {
    const code = e instanceof DataSourceError ? e.code : 'INVALID_RUNTIME';
    return unavailable(organizationId, sourceId, sourceKind, code);
  }

  const status = classifyEnvelopeStatus(model);
  const envelope: CrmReadModelEnvelope = {
    organizationId,
    sourceId: source.info.id,
    sourceKind,
    status,
    fetchedAt: new Date().toISOString(),
    contentHash: hashCrmContent(model),
    data: model,
  };
  // Eigene Provenienz sofort beweisen statt sie dem Aufrufer zu überlassen.
  assertSingleSourceEnvelope(envelope, source.info.id);
  return envelope;
}
