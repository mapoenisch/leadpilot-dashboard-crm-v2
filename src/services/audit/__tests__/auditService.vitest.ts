// G62 (Auftrag 067P, Nacharbeit P0 + P1): Unit-Tests fuer auditService.
// Prueft Serverpfad (RPC statt direktem INSERT), Sanitizer-Logik inkl. Arrays
// und zusammengesetzter Feldnamen sowie die PII-freie Spaltenliste.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------- Mocks
vi.mock('@/services/db/supabaseClient', () => {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  const mockAuth = {
    getSession: vi.fn(),
  };

  return {
    isSupabaseConfigured: true,
    supabase: {
      auth: mockAuth,
      from: mockFrom,
      rpc: mockRpc,
    },
    _mocks: { mockFrom, mockRpc, mockAuth },
  };
});

// Importiere nach Mock-Setup
import { auditService, AuditServiceError, type AuditEntry } from '../auditService';

// ---------------------------------------------------------------- Hilfsfunktionen
function makeSession() {
  return { session: { user: { id: 'user-123' }, access_token: 'tok' } };
}

async function mockAuthedSession() {
  const { supabase: db } = await import('@/services/db/supabaseClient');
  (db!.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: makeSession(),
    error: null,
  });
  return db!;
}

function mockSelectChain(rows: unknown[]) {
  const rangeMock = vi.fn().mockResolvedValue({ data: rows, error: null });
  const limitMock = vi.fn().mockReturnValue({ range: rangeMock });
  const orderMock = vi.fn().mockReturnValue({
    limit: limitMock,
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
  });
  const eqMock = vi.fn().mockReturnValue({ order: orderMock });
  return vi.fn().mockReturnValue({ eq: eqMock });
}

// ---------------------------------------------------------------- Tests
describe('auditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logAuditEvent', () => {
    it('wirft AuditServiceError ohne aktive Sitzung', async () => {
      const { supabase: db } = await import('@/services/db/supabaseClient');
      (db!.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(auditService.logAuditEvent({ action: 'auth.login' })).rejects.toBeInstanceOf(
        AuditServiceError,
      );
    });

    it('schreibt ueber den RPC-Serverpfad statt direktem INSERT', async () => {
      const db = await mockAuthedSession();
      const rpcMock = vi.fn().mockResolvedValue({ data: 'some-uuid', error: null });
      (db!.rpc as ReturnType<typeof vi.fn>).mockImplementation(rpcMock);
      const fromMock = vi.fn();
      (db!.from as ReturnType<typeof vi.fn>).mockImplementation(fromMock);

      await auditService.logAuditEvent({ action: 'auth.login' });

      expect(rpcMock).toHaveBeenCalledTimes(1);
      const firstCall = (rpcMock.mock.calls[0] ?? []) as unknown[];
      expect(firstCall[0]).toBe('log_audit_event');
      expect(fromMock).not.toHaveBeenCalled();
    });

    it('leitet keine Organisations-ID an den Client-Pfad weiter', async () => {
      const db = await mockAuthedSession();
      const rpcMock = vi.fn().mockResolvedValue({ data: 'some-uuid', error: null });
      (db!.rpc as ReturnType<typeof vi.fn>).mockImplementation(rpcMock);

      await auditService.logAuditEvent({ action: 'auth.logout' });

      const args = ((rpcMock.mock.calls[0] ?? []) as unknown[])[1] as Record<string, unknown>;
      expect(args).not.toHaveProperty('p_organization_id');
      expect(args).not.toHaveProperty('organization_id');
      expect(args['p_action']).toBe('auth.logout');
    });

    it('sanitiert sensible Felder in details', async () => {
      const db = await mockAuthedSession();
      const rpcMock = vi.fn().mockResolvedValue({ data: 'some-uuid', error: null });
      (db!.rpc as ReturnType<typeof vi.fn>).mockImplementation(rpcMock);

      await auditService.logAuditEvent({
        action: 'auth.login',
        details: { password: 'secret123', source: 'hubspot' },
      });

      const args = ((rpcMock.mock.calls[0] ?? []) as unknown[])[1] as Record<string, unknown>;
      const details = args['p_details'] as Record<string, unknown>;
      expect(details['password']).toBe('REDACTED');
      expect(details['source']).toBe('hubspot');
    });

    it('sanitiert verschachtelte und zusammengesetzte Feldnamen', async () => {
      const db = await mockAuthedSession();
      const rpcMock = vi.fn().mockResolvedValue({ data: 'some-uuid', error: null });
      (db!.rpc as ReturnType<typeof vi.fn>).mockImplementation(rpcMock);

      await auditService.logAuditEvent({
        action: 'data_source.switch',
        details: {
          nested: { apiKey: 'key-abc', name: 'hubspot' },
          userEmail: 'jemand@example.com',
        },
      });

      const args = ((rpcMock.mock.calls[0] ?? []) as unknown[])[1] as Record<string, unknown>;
      const details = args['p_details'] as Record<string, unknown>;
      const nested = details['nested'] as Record<string, unknown>;
      expect(nested['apiKey']).toBe('REDACTED');
      expect(nested['name']).toBe('hubspot');
      expect(details['userEmail']).toBe('REDACTED');
    });

    it('sanitiert sensible Felder innerhalb von Arrays', async () => {
      const db = await mockAuthedSession();
      const rpcMock = vi.fn().mockResolvedValue({ data: 'some-uuid', error: null });
      (db!.rpc as ReturnType<typeof vi.fn>).mockImplementation(rpcMock);

      await auditService.logAuditEvent({
        action: 'member.invited',
        details: {
          invites: [{ email: 'a@example.com' }, { email: 'b@example.com', role: 'viewer' }],
        },
      });

      const args = ((rpcMock.mock.calls[0] ?? []) as unknown[])[1] as Record<string, unknown>;
      const details = args['p_details'] as Record<string, unknown>;
      const invites = details['invites'] as Record<string, unknown>[];
      expect(invites[0]?.['email']).toBe('REDACTED');
      expect(invites[1]?.['email']).toBe('REDACTED');
      expect(invites[1]?.['role']).toBe('viewer');
    });

    it('wirft AuditServiceError bei RPC-Fehler (z. B. Whitelist-Ablehnung)', async () => {
      const db = await mockAuthedSession();
      const rpcMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'log_audit_event rejected unknown action', code: 'P0001' },
      });
      (db!.rpc as ReturnType<typeof vi.fn>).mockImplementation(rpcMock);

      await expect(
        auditService.logAuditEvent({ action: 'tamper.drop_table' }),
      ).rejects.toBeInstanceOf(AuditServiceError);
    });
  });

  describe('listAuditLogs', () => {
    it('gibt leere Liste zurueck wenn keine Daten', async () => {
      const db = await mockAuthedSession();
      (db!.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelectChain([]),
      });

      const result = await auditService.listAuditLogs('org-1');
      expect(result).toEqual([]);
    });

    it('fragt explizite PII-freie Spaltenliste ab (kein select * mit PII)', async () => {
      const db = await mockAuthedSession();
      const selectMock = mockSelectChain([]);
      (db!.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: selectMock });

      await auditService.listAuditLogs('org-1');

      const columns = ((selectMock.mock.calls[0] ?? []) as unknown[])[0] as string;
      expect(columns).not.toContain('*');
      expect(columns).not.toContain('actor_email');
      expect(columns).not.toContain('ip_address');
      expect(columns).toContain('actor_id');
    });

    it('mappt DB-Zeilen auf AuditEntry ohne PII-Felder', async () => {
      const db = await mockAuthedSession();

      const dbRow = {
        id: 'entry-1',
        organization_id: 'org-1',
        actor_id: 'user-1',
        action: 'auth.login',
        target_type: null,
        target_id: null,
        details: { source: 'hubspot' },
        correlation_id: 'corr-abc',
        created_at: '2026-09-22T10:00:00Z',
      };

      (db!.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelectChain([dbRow]),
      });

      const result = await auditService.listAuditLogs('org-1');
      expect(result).toHaveLength(1);
      const entry = result[0] as AuditEntry;
      expect(entry.id).toBe('entry-1');
      expect(entry.organizationId).toBe('org-1');
      expect(entry.action).toBe('auth.login');
      expect(entry.correlationId).toBe('corr-abc');
      expect(entry).not.toHaveProperty('actorEmail');
      expect(entry).not.toHaveProperty('ipAddress');
    });

    it('wirft FORBIDDEN bei 42501-Fehler', async () => {
      const db = await mockAuthedSession();

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
