import { describe, it, expect, vi, beforeEach } from 'vitest';
import { memberService, MemberServiceError } from '../memberService';

vi.mock('@/services/db/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
  isSupabaseConfigured: true,
}));

import { supabase } from '@/services/db/supabaseClient';

describe('memberService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('wirft UNAUTHORIZED wenn keine gültige Sitzung existiert', async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as unknown as Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>);

    await expect(memberService.listMembersAndInvitations()).rejects.toThrow(MemberServiceError);
    await expect(memberService.listMembersAndInvitations()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('listet Mitglieder und Einladungen erfolgreich auf', async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'valid-admin-token' } },
      error: null,
    } as unknown as Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>);

    const mockResponse = {
      members: [
        {
          userId: 'user-1',
          email: 'admin@test.local',
          role: 'admin',
          status: 'active',
          createdAt: '2026-09-01T10:00:00Z',
        },
      ],
      invitations: [
        {
          id: 'inv-1',
          organizationId: 'org-1',
          email: 'new@test.local',
          role: 'viewer',
          invitedBy: 'user-1',
          status: 'pending',
          createdAt: '2026-09-10T10:00:00Z',
          expiresAt: '2026-09-17T10:00:00Z',
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const result = await memberService.listMembersAndInvitations();
    expect(result.members).toHaveLength(1);
    expect(result.invitations).toHaveLength(1);
    expect(result.members[0]?.role).toBe('admin');
  });

  it('mappt HTTP 403 auf FORBIDDEN Fehler', async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'viewer-token' } },
      error: null,
    } as unknown as Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        code: 'FORBIDDEN',
        message: 'Zugriff verweigert.',
      }),
    } as Response);

    await expect(memberService.listMembersAndInvitations()).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('mappt LAST_ACTIVE_ADMIN Fehler beim Rollenwechsel', async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'admin-token' } },
      error: null,
    } as unknown as Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        code: 'LAST_ACTIVE_ADMIN',
        message: 'Der letzte aktive Administrator kann nicht herabgestuft werden.',
      }),
    } as Response);

    await expect(memberService.changeMemberRole('admin-1', 'viewer')).rejects.toMatchObject({
      code: 'LAST_ACTIVE_ADMIN',
    });
  });

  it('lädt neues Mitglied erfolgreich ein', async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'admin-token' } },
      error: null,
    } as unknown as Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>);

    const mockInv = {
      id: 'inv-new',
      organizationId: 'org-1',
      email: 'invited@test.local',
      role: 'manager',
      invitedBy: 'admin-1',
      status: 'pending',
      createdAt: '2026-09-20T10:00:00Z',
      expiresAt: '2026-09-27T10:00:00Z',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ invitation: mockInv }),
    } as Response);

    const inv = await memberService.inviteMember('invited@test.local', 'manager');
    expect(inv.email).toBe('invited@test.local');
    expect(inv.role).toBe('manager');
  });

  it('widerruft eine Einladung erfolgreich', async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'admin-token' } },
      error: null,
    } as unknown as Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'revoked' }),
    } as Response);

    await expect(memberService.revokeInvitation('inv-1')).resolves.toBeUndefined();
  });
});
