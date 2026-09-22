// G62 (Auftrag 067P): Unit-Tests fuer auditService.
// Prueft Sanitizer-Logik, Row-Mapper und Fehler-Handling ohne echte DB.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------- Mocks
vi.mock('@/services/db/supabaseClient', () => {
  const mockFrom = vi.fn();
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockOrder = vi.fn();
  const mockLimit = vi.fn();
  const mockRange = vi.fn();
  const mockAuth = {
    getSession: vi.fn(),
  };

  const chainBase = {
    eq: mockEq,
    order: mockOrder,
    limit: mockLimit,
    range: mockRange,
  };

  mockRange.mockReturnValue({ data: null, error: null });
  mockLimit.mockReturnValue({ range: mockRange });
  mockOrder.mockReturnValue({ limit: mockLimit, eq: mockEq, gte: mockEq, lte: mockEq });
  mockEq.mockReturnValue({ ...chainBase, gte: mockEq, lte: mockEq, data: null, error: null });
  mockSelect.mockReturnValue({ ...chainBase, eq: mockEq });
  mockInsert.mockReturnValue({ data: null, error: null });
  mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert });

  return {
    isSupabaseConfigured: true,
    supabase: {
      auth: mockAuth,
      from: mockFrom,
    },
    _mocks: { mockFrom, mockInsert, mockSelect, mockEq, mockOrder, mockLimit, mockRange, mockAuth },
  };
});

// Importiere nach Mock-Setup
import { auditService, AuditServiceError, type AuditEntry } from '../auditService';

// ---------------------------------------------------------------- Hilfsfunktionen
function makeSession() {
  return { session: { user: { id: 'user-123' }, access_token: 'tok' } };
}

// ---------------------------------------------------------------- Tests
describe('auditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logAuditEvent', () => {
    it('wirft AuditServiceError wenn nicht konfiguriert', async () => {
      const { supabase: db } = await import('@/services/db/supabaseClient');
      (db!.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(
        auditService.logAuditEvent({
          action: 'auth.login',
          organizationId: 'org-1',
        }),
      ).rejects.toBeInstanceOf(AuditServiceError);
    });

    it('sanitiert sensible Felder in details', async () => {
      const { supabase: db } = await import('@/services/db/supabaseClient');
      (db!.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: makeSession(),
        error: null,
      });
      const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
      (db!.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: insertMock });

      await auditService.logAuditEvent({
        action: 'auth.login',
        organizationId: 'org-1',
        details: { password: 'secret123', source: 'hubspot' },
      });

      const callArg = (insertMock.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
      const details = callArg['details'] as Record<string, unknown>;
      expect(details['password']).toBe('REDACTED');
      expect(details['source']).toBe('hubspot');
    });

    it('sanitiert verschachtelte sensible Felder', async () => {
      const { supabase: db } = await import('@/services/db/supabaseClient');
      (db!.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: makeSession(),
        error: null,
      });
      const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
      (db!.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: insertMock });

      await auditService.logAuditEvent({
        action: 'data_source.switch',
        organizationId: 'org-1',
        details: { nested: { api_key: 'key-abc', name: 'hubspot' } },
      });

      const callArg = (insertMock.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
      const details = callArg['details'] as Record<string, unknown>;
      const nested = details['nested'] as Record<string, unknown>;
      expect(nested['api_key']).toBe('REDACTED');
      expect(nested['name']).toBe('hubspot');
    });

    it('wirft AuditServiceError bei DB-Fehler', async () => {
      const { supabase: db } = await import('@/services/db/supabaseClient');
      (db!.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: makeSession(),
        error: null,
      });
      const insertMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'DB-Fehler', code: '42501' },
      });
      (db!.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: insertMock });

      await expect(
        auditService.logAuditEvent({ action: 'auth.login', organizationId: 'org-1' }),
      ).rejects.toBeInstanceOf(AuditServiceError);
    });

    it('setzt actor_email auf REDACTED', async () => {
      const { supabase: db } = await import('@/services/db/supabaseClient');
      (db!.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: makeSession(),
        error: null,
      });
      const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
      (db!.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert: insertMock });

      await auditService.logAuditEvent({ action: 'auth.login', organizationId: 'org-1' });

      const callArg = (insertMock.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
      expect(callArg['actor_email']).toBe('REDACTED');
    });
  });

  describe('listAuditLogs', () => {
    it('gibt leere Liste zurueck wenn keine Daten', async () => {
      const { supabase: db } = await import('@/services/db/supabaseClient');
      (db!.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: makeSession(),
        error: null,
      });

      const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null });
      const limitMock = vi.fn().mockReturnValue({ range: rangeMock });
      const orderMock = vi.fn().mockReturnValue({
        limit: limitMock,
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
      });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      (db!.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: selectMock });

      const result = await auditService.listAuditLogs('org-1');
      expect(result).toEqual([]);
    });

    it('mappt DB-Zeilen auf AuditEntry', async () => {
      const { supabase: db } = await import('@/services/db/supabaseClient');
      (db!.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: makeSession(),
        error: null,
      });

      const dbRow = {
        id: 'entry-1',
        organization_id: 'org-1',
        actor_id: 'user-1',
        actor_email: 'REDACTED',
        action: 'auth.login',
        target_type: null,
        target_id: null,
        details: { source: 'hubspot' },
        correlation_id: 'corr-abc',
        ip_address: null,
        created_at: '2026-09-22T10:00:00Z',
      };

      const rangeMock = vi.fn().mockResolvedValue({ data: [dbRow], error: null });
      const limitMock = vi.fn().mockReturnValue({ range: rangeMock });
      const orderMock = vi.fn().mockReturnValue({
        limit: limitMock,
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
      });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      (db!.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: selectMock });

      const result = await auditService.listAuditLogs('org-1');
      expect(result).toHaveLength(1);
      const entry = result[0] as AuditEntry;
      expect(entry.id).toBe('entry-1');
      expect(entry.organizationId).toBe('org-1');
      expect(entry.action).toBe('auth.login');
      expect(entry.correlationId).toBe('corr-abc');
    });

    it('wirft FORBIDDEN bei 42501-Fehler', async () => {
      const { supabase: db } = await import('@/services/db/supabaseClient');
      (db!.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: makeSession(),
        error: null,
      });

      const rangeMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'permission denied', code: '42501' },
      });
      const limitMock = vi.fn().mockReturnValue({ range: rangeMock });
      const orderMock = vi.fn().mockReturnValue({
        limit: limitMock,
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
      });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      (db!.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: selectMock });

      let err: AuditServiceError | null = null;
      try {
        await auditService.listAuditLogs('org-1');
      } catch (e: unknown) {
        err = e as AuditServiceError;
      }
      expect(err).toBeInstanceOf(AuditServiceError);
      expect((err as AuditServiceError).code).toBe('FORBIDDEN');
    });
  });
});
