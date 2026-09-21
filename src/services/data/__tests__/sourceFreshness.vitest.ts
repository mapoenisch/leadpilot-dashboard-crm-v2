import { describe, expect, it } from 'vitest';
import {
  classifyFreshness,
  deriveProvenanceState,
  deriveExecutiveProvenanceState,
  deriveCrmProvenanceState,
  deriveSimulationProvenanceState,
  formatDataAge,
  formatSourceLabel,
  formatStatusLabel,
  sanitizeErrorCode,
  getSafeErrorDescription,
  SAFE_ERROR_CODES,
} from '../sourceFreshness';
import type { CrmReadModelEnvelope } from '../../../types/dataSource';

describe('sourceFreshness', () => {
  const BASE_TIME = 1774000000000;

  describe('classifyFreshness', () => {
    it('returns "fresh" for timestamps within 15 minutes', () => {
      expect(classifyFreshness(new Date(BASE_TIME).toISOString(), BASE_TIME)).toBe('fresh');

      const almost15Min = new Date(BASE_TIME - (14 * 60 + 59) * 1000).toISOString();
      expect(classifyFreshness(almost15Min, BASE_TIME)).toBe('fresh');

      const exact15Min = new Date(BASE_TIME - 15 * 60 * 1000).toISOString();
      expect(classifyFreshness(exact15Min, BASE_TIME)).toBe('fresh');
    });

    it('returns "stale" for timestamps between 15 minutes and 24 hours', () => {
      const justOver15Min = new Date(BASE_TIME - (15 * 60 + 1) * 1000).toISOString();
      expect(classifyFreshness(justOver15Min, BASE_TIME)).toBe('stale');

      const twoHoursAgo = new Date(BASE_TIME - 2 * 60 * 60 * 1000).toISOString();
      expect(classifyFreshness(twoHoursAgo, BASE_TIME)).toBe('stale');

      const exact24Hours = new Date(BASE_TIME - 24 * 60 * 60 * 1000).toISOString();
      expect(classifyFreshness(exact24Hours, BASE_TIME)).toBe('stale');
    });

    it('returns "expired" for timestamps older than 24 hours', () => {
      const justOver24h = new Date(BASE_TIME - (24 * 60 * 60 + 1) * 1000).toISOString();
      expect(classifyFreshness(justOver24h, BASE_TIME)).toBe('expired');

      const sevenDaysAgo = new Date(BASE_TIME - 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(classifyFreshness(sevenDaysAgo, BASE_TIME)).toBe('expired');
    });

    it('handles future timestamps gracefully (clock drift)', () => {
      const futureTime = new Date(BASE_TIME + 5000).toISOString();
      expect(classifyFreshness(futureTime, BASE_TIME)).toBe('fresh');
    });

    it('returns "expired" for invalid or missing timestamps', () => {
      expect(classifyFreshness(null, BASE_TIME)).toBe('expired');
      expect(classifyFreshness(undefined, BASE_TIME)).toBe('expired');
      expect(classifyFreshness('', BASE_TIME)).toBe('expired');
      expect(classifyFreshness('not-a-valid-date', BASE_TIME)).toBe('expired');
    });
  });

  describe('formatDataAge', () => {
    it('formats less than a minute as "gerade eben"', () => {
      const thirtySecondsAgo = new Date(BASE_TIME - 30 * 1000).toISOString();
      expect(formatDataAge(thirtySecondsAgo, BASE_TIME)).toBe('gerade eben');
    });

    it('formats minutes correctly', () => {
      const oneMinuteAgo = new Date(BASE_TIME - 60 * 1000).toISOString();
      expect(formatDataAge(oneMinuteAgo, BASE_TIME)).toBe('vor 1 Minute');

      const tenMinutesAgo = new Date(BASE_TIME - 10 * 60 * 1000).toISOString();
      expect(formatDataAge(tenMinutesAgo, BASE_TIME)).toBe('vor 10 Minuten');
    });

    it('formats hours correctly', () => {
      const oneHourAgo = new Date(BASE_TIME - 60 * 60 * 1000).toISOString();
      expect(formatDataAge(oneHourAgo, BASE_TIME)).toBe('vor 1 Stunde');

      const fiveHoursAgo = new Date(BASE_TIME - 5 * 60 * 60 * 1000).toISOString();
      expect(formatDataAge(fiveHoursAgo, BASE_TIME)).toBe('vor 5 Stunden');
    });

    it('formats days correctly', () => {
      const oneDayAgo = new Date(BASE_TIME - 24 * 60 * 60 * 1000).toISOString();
      expect(formatDataAge(oneDayAgo, BASE_TIME)).toBe('vor 1 Tag');

      const threeDaysAgo = new Date(BASE_TIME - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatDataAge(threeDaysAgo, BASE_TIME)).toBe('vor 3 Tagen');
    });

    it('returns "unbekannt" for invalid inputs', () => {
      expect(formatDataAge(null, BASE_TIME)).toBe('unbekannt');
      expect(formatDataAge('ungültig', BASE_TIME)).toBe('unbekannt');
    });
  });

  describe('formatSourceLabel & formatStatusLabel', () => {
    it('maps source kinds to human-readable German labels', () => {
      expect(formatSourceLabel('synthetic', 'simulated-crm')).toBe('Synthetisch (Demo)');
      expect(formatSourceLabel('supabase', 'supabase')).toBe('Supabase CRM');
      expect(formatSourceLabel('hubspot', 'hubspot-baseline:v1')).toBe('HubSpot Baseline');
      expect(formatSourceLabel('file', 'file-baseline')).toBe('LeadPilot Baseline');
      expect(formatSourceLabel('simulation', 'simulation-engine')).toBe('Simulations-Engine');
    });

    it('maps health statuses to clear German labels', () => {
      expect(formatStatusLabel('healthy')).toBe('Gesund');
      expect(formatStatusLabel('empty')).toBe('Leer (gültig)');
      expect(formatStatusLabel('degraded')).toBe('Eingeschränkt (degraded)');
      expect(formatStatusLabel('unavailable')).toBe('Nicht verfügbar');
    });
  });

  describe('sanitizeErrorCode & getSafeErrorDescription (P2-1)', () => {
    it('redacts sensitive raw error messages and maps to safe allowlist code and description', () => {
      // Sensitive connection string with password and host
      const sensitiveDbError = new Error(
        'FATAL: password authentication failed for user "postgres" at postgresql://postgres:SuperSecret123!@db.internal:5432/leadpilot',
      );
      const code = sanitizeErrorCode(sensitiveDbError);
      expect(SAFE_ERROR_CODES).toContain(code);
      expect(code).toBe('AUTH_REQUIRED');

      const desc = getSafeErrorDescription(code);
      expect(desc).not.toContain('postgres');
      expect(desc).not.toContain('SuperSecret123!');
      expect(desc).not.toContain('5432');
      expect(desc).not.toContain('leadpilot');
      expect(desc).toBe('Authentifizierung erforderlich. Bitte melden Sie sich erneut an.');
    });

    it('redacts SQL syntax errors and internal details', () => {
      const sqlError = new Error('syntax error at or near "SELECT secret_token FROM admin_keys"');
      const code = sanitizeErrorCode(sqlError);
      expect(SAFE_ERROR_CODES).toContain(code);
      expect(code).toBe('DATA_SOURCE_UNAVAILABLE');

      const state = deriveProvenanceState(null, sqlError, BASE_TIME);
      expect(state.status).toBe('unavailable');
      expect(state.errorCode).toBe('DATA_SOURCE_UNAVAILABLE');
      expect(state.statusDescription).not.toContain('SELECT');
      expect(state.statusDescription).not.toContain('secret_token');
      expect(state.statusDescription).not.toContain('admin_keys');
      expect(state.statusDescription).toBe('Die Datenquelle ist derzeit nicht erreichbar.');
    });

    it('maps network and timeout errors appropriately', () => {
      expect(sanitizeErrorCode(new Error('Failed to fetch from https://api.supabase.co'))).toBe(
        'NETWORK_ERROR',
      );
      expect(sanitizeErrorCode(new Error('Gateway timeout 504'))).toBe('TIMEOUT');
    });
  });

  describe('deriveProvenanceState', () => {
    it('correctly extracts provenance from a healthy envelope', () => {
      const mockEnvelope: CrmReadModelEnvelope = {
        organizationId: 'org-123',
        sourceId: 'supabase',
        sourceKind: 'supabase',
        status: 'healthy',
        fetchedAt: new Date(BASE_TIME - 5 * 60 * 1000).toISOString(),
        contentHash: 'hash123',
        data: {
          companies: [],
          contacts: [],
          deals: [],
          activities: [],
          audit: {
            companiesLoaded: 10,
            companiesValid: 10,
            companiesErrors: 0,
            contactsLoaded: 20,
            contactsValid: 20,
            contactsMatched: 20,
            contactsErrors: 0,
            dealsLoaded: 5,
            dealsValid: 5,
            dealsErrors: 0,
          },
        },
      };

      const state = deriveProvenanceState(mockEnvelope, undefined, BASE_TIME);
      expect(state.sourceKind).toBe('supabase');
      expect(state.sourceLabel).toBe('Supabase CRM');
      expect(state.isSynthetic).toBe(false);
      expect(state.status).toBe('healthy');
      expect(state.statusLabel).toBe('Gesund');
      expect(state.freshness).toBe('fresh');
      expect(state.freshnessLabel).toBe('Aktuell');
      expect(state.ageText).toBe('vor 5 Minuten');
    });

    it('correctly identifies degraded and synthetic states', () => {
      const degradedEnvelope: CrmReadModelEnvelope = {
        organizationId: '00000000-0000-0000-0000-000000000001',
        sourceId: 'simulated-crm',
        sourceKind: 'synthetic',
        status: 'degraded',
        fetchedAt: new Date(BASE_TIME - 30 * 60 * 1000).toISOString(),
        contentHash: 'hash456',
        data: {
          companies: [],
          contacts: [],
          deals: [],
          activities: [],
          audit: {
            companiesLoaded: 10,
            companiesValid: 8,
            companiesErrors: 2,
            contactsLoaded: 20,
            contactsValid: 20,
            contactsMatched: 20,
            contactsErrors: 0,
            dealsLoaded: 5,
            dealsValid: 5,
            dealsErrors: 0,
          },
        },
      };

      const state = deriveProvenanceState(degradedEnvelope, undefined, BASE_TIME);
      expect(state.sourceKind).toBe('synthetic');
      expect(state.isSynthetic).toBe(true);
      expect(state.status).toBe('degraded');
      expect(state.statusLabel).toBe('Eingeschränkt (degraded)');
      expect(state.freshness).toBe('stale');
      expect(state.freshnessLabel).toBe('Veraltet');
      expect(state.statusDescription).toContain('2 Audit-Fehler');
    });

    it('derives unavailable state when error or no envelope is present', () => {
      const stateFromError = deriveProvenanceState(
        null,
        new Error('DATA_SOURCE_UNAVAILABLE'),
        BASE_TIME,
      );
      expect(stateFromError.status).toBe('unavailable');
      expect(stateFromError.statusLabel).toBe('Nicht verfügbar');
      expect(stateFromError.freshness).toBe('expired');
      expect(stateFromError.errorCode).toBe('DATA_SOURCE_UNAVAILABLE');
    });
  });

  describe('Domain-specific provenance builders (P1-1)', () => {
    it('derives executive cockpit provenance (Ebene A Baseline)', () => {
      const execState = deriveExecutiveProvenanceState();
      expect(execState.sourceKind).toBe('file');
      expect(execState.sourceLabel).toBe('LeadPilot Baseline (Ebene A)');
      expect(execState.isSynthetic).toBe(false);
      expect(execState.status).toBe('healthy');
      expect(execState.freshness).toBe('fresh');
      expect(execState.ageText).toBe('Stand 31.12.2025');
    });

    it('derives crm list provenance for healthy and unavailable states', () => {
      const healthyCrm = deriveCrmProvenanceState('healthy', undefined, BASE_TIME, BASE_TIME);
      expect(healthyCrm.sourceKind).toBe('supabase');
      expect(healthyCrm.sourceLabel).toBe('Supabase CRM');
      expect(healthyCrm.status).toBe('healthy');
      expect(healthyCrm.isSynthetic).toBe(false);

      const errorCrm = deriveCrmProvenanceState('unavailable', new Error('AUTH_REQUIRED'));
      expect(errorCrm.status).toBe('unavailable');
      expect(errorCrm.errorCode).toBe('AUTH_REQUIRED');
      expect(errorCrm.freshness).toBe('expired');
      expect(errorCrm.statusDescription).toBe(
        'Authentifizierung erforderlich. Bitte melden Sie sich erneut an.',
      );
    });

    it('derives simulation engine provenance', () => {
      const simState = deriveSimulationProvenanceState(
        {
          runId: 'run-abcdef123456',
          createdAt: new Date(BASE_TIME).toISOString(),
          status: 'completed',
        },
        'idle',
        BASE_TIME,
      );
      expect(simState.sourceKind).toBe('simulation');
      expect(simState.sourceLabel).toBe('Simulations-Engine');
      expect(simState.status).toBe('healthy');
      expect(simState.isSynthetic).toBe(true);
      expect(simState.statusDescription).toContain('run-abcd');
    });
  });
});
