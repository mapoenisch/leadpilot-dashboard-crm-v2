// G62 (Auftrag 067P, Nacharbeit P0 + P1, Scope-Erweiterung 2026-09-22):
// Unit-Tests fuer auditService (NUR LESEPFAD).
// Es existiert kein schreibender RPC-Einstieg mehr (`log_audit_event` ersatzlos
// entfernt) — echte Ereignisse erzeugt der DB-Trigger
// `trg_audit_log_member_changes`. Tests sichern den PII-freien Lesevertrag und
// die Abwesenheit jeder Client-Schreib-API.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------- Mocks
vi.mock('@/services/db/supabaseClient', () => {
  const mockFrom = vi.fn();
  const mockAuth = {
    getSession: vi.fn(),
  };

  return {
    isSupabaseConfigured: true,
    supabase: {
      auth: mockAuth,
      from: mockFrom,
    },
    _mocks: { mockFrom, mockAuth },
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

  describe('kein Browser-Schreibpfad (P0)', () => {
    it('exportiert keine Client-Schreib-API (kein logAuditEvent)', () => {
      expect('logAuditEvent' in auditService).toBe(false);
    });

    it('ruft niemals rpc auf dem Lesepfad auf', async () => {
      const db = await mockAuthedSession();
      (db!.from as ReturnType<typeof vi.fn>).mockReturnValue({
        select: mockSelectChain([]),
      });

      await auditService.listAuditLogs('org-1');

      expect(db!.rpc).toBeUndefined();
      expect(db!.from).toHaveBeenCalled();
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
