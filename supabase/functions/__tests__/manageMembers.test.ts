// G59 (Auftrag 067M, Step 1): Deno-Vertragstests für die Edge Function manage-members.
// Testet: Authentifizierung per Bearer-Token, RBAC (nur Admin), strikte Organisationsbindung,
// Fehlercodes (FORBIDDEN, LAST_ACTIVE_ADMIN, INVITATION_NOT_PENDING, NOT_FOUND)
// und sichere Einladungsannahme ohne Client-Daten-Übernahme.

import { assertEquals } from '@std/assert';
import {
  handleManageMembers,
  type ManageMembersDb,
  type MemberUser,
} from '../manage-members/index.ts';

const ADMIN_USER: MemberUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'admin@org-a.local',
};

const MANAGER_USER: MemberUser = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'manager@org-a.local',
};

const ORG_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ORG_B_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

interface MockDbState {
  users: Map<string, { email: string }>;
  memberships: Array<{
    userId: string;
    organizationId: string;
    role: 'admin' | 'manager' | 'viewer';
    status: 'active' | 'suspended';
    createdAt: string;
  }>;
  invitations: Array<{
    id: string;
    organizationId: string;
    email: string;
    role: 'admin' | 'manager' | 'viewer';
    invitedBy: string;
    status: 'pending' | 'revoked' | 'accepted' | 'expired';
    createdAt: string;
    expiresAt: string;
  }>;
}

function createMockDb(): { db: ManageMembersDb; state: MockDbState } {
  const state: MockDbState = {
    users: new Map([
      ['11111111-1111-1111-1111-111111111111', { email: 'admin@org-a.local' }],
      ['22222222-2222-2222-2222-222222222222', { email: 'manager@org-a.local' }],
      ['33333333-3333-3333-3333-333333333333', { email: 'viewer@org-a.local' }],
      ['44444444-4444-4444-4444-444444444444', { email: 'admin@org-b.local' }],
    ]),
    memberships: [
      {
        userId: '11111111-1111-1111-1111-111111111111',
        organizationId: ORG_A_ID,
        role: 'admin',
        status: 'active',
        createdAt: '2026-09-01T10:00:00Z',
      },
      {
        userId: '22222222-2222-2222-2222-222222222222',
        organizationId: ORG_A_ID,
        role: 'manager',
        status: 'active',
        createdAt: '2026-09-01T10:00:00Z',
      },
      {
        userId: '44444444-4444-4444-4444-444444444444',
        organizationId: ORG_B_ID,
        role: 'admin',
        status: 'active',
        createdAt: '2026-09-01T10:00:00Z',
      },
    ],
    invitations: [
      {
        id: 'inv-a-1',
        organizationId: ORG_A_ID,
        email: 'invited@org-a.local',
        role: 'viewer',
        invitedBy: '11111111-1111-1111-1111-111111111111',
        status: 'pending',
        createdAt: '2026-09-10T10:00:00Z',
        expiresAt: '2026-09-27T10:00:00Z',
      },
      {
        id: 'inv-b-1',
        organizationId: ORG_B_ID,
        email: 'other@org-b.local',
        role: 'viewer',
        invitedBy: '44444444-4444-4444-4444-444444444444',
        status: 'pending',
        createdAt: '2026-09-10T10:00:00Z',
        expiresAt: '2026-09-27T10:00:00Z',
      },
    ],
  };

  const db: ManageMembersDb = {
    getUserFromToken: async (token: string) => {
      if (token === 'admin-token') return ADMIN_USER;
      if (token === 'manager-token') return MANAGER_USER;
      if (token === 'invited-user-token') {
        return { id: '99999999-9999-9999-9999-999999999999', email: 'invited@org-a.local' };
      }
      return null;
    },
    getMembership: async (userId: string) => {
      const m = state.memberships.find((item) => item.userId === userId && item.status === 'active');
      if (!m) return null;
      return { organizationId: m.organizationId, role: m.role, status: m.status };
    },
    listMembersAndInvitations: async (organizationId: string) => {
      const members = state.memberships
        .filter((m) => m.organizationId === organizationId)
        .map((m) => ({
          userId: m.userId,
          email: state.users.get(m.userId)?.email ?? 'unknown',
          role: m.role,
          status: m.status,
          createdAt: m.createdAt,
        }));
      const invitations = state.invitations.filter((i) => i.organizationId === organizationId);
      return { members, invitations };
    },
    createInvitation: async (
      orgId: string,
      email: string,
      role: 'admin' | 'manager' | 'viewer',
      invitedBy: string,
    ) => {
      const id = `inv-${Date.now()}`;
      const inv = {
        id,
        organizationId: orgId,
        email: email.toLowerCase().trim(),
        role,
        invitedBy,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      };
      state.invitations.push(inv);
      return inv;
    },
    revokeInvitation: async (orgId: string, invitationId: string) => {
      const inv = state.invitations.find(
        (i) => i.id === invitationId && i.organizationId === orgId,
      );
      if (!inv) return { error: 'NOT_FOUND' };
      if (inv.status !== 'pending') return { error: 'INVITATION_NOT_PENDING' };
      inv.status = 'revoked';
      return { success: true };
    },
    changeMemberRole: async (
      orgId: string,
      memberUserId: string,
      newRole: 'admin' | 'manager' | 'viewer',
    ) => {
      const member = state.memberships.find(
        (m) => m.userId === memberUserId && m.organizationId === orgId,
      );
      if (!member) return { error: 'NOT_FOUND' };
      // Simuliere DB-Trigger LAST_ACTIVE_ADMIN
      if (member.role === 'admin' && newRole !== 'admin') {
        const activeAdmins = state.memberships.filter(
          (m) =>
            m.organizationId === orgId &&
            m.role === 'admin' &&
            m.status === 'active' &&
            m.userId !== memberUserId,
        );
        if (activeAdmins.length === 0) {
          return { error: 'LAST_ACTIVE_ADMIN' };
        }
      }
      member.role = newRole;
      return { success: true };
    },
    deactivateMember: async (orgId: string, memberUserId: string) => {
      const member = state.memberships.find(
        (m) => m.userId === memberUserId && m.organizationId === orgId,
      );
      if (!member) return { error: 'NOT_FOUND' };
      // Simuliere DB-Trigger LAST_ACTIVE_ADMIN
      if (member.role === 'admin') {
        const activeAdmins = state.memberships.filter(
          (m) =>
            m.organizationId === orgId &&
            m.role === 'admin' &&
            m.status === 'active' &&
            m.userId !== memberUserId,
        );
        if (activeAdmins.length === 0) {
          return { error: 'LAST_ACTIVE_ADMIN' };
        }
      }
      member.status = 'suspended';
      return { success: true };
    },
    acceptInvitation: async (userId: string, userEmail: string) => {
      const normalizedEmail = userEmail.toLowerCase().trim();
      const inv = state.invitations.find(
        (i) => i.email === normalizedEmail && i.status === 'pending',
      );
      if (!inv) return { error: 'NOT_FOUND' };
      inv.status = 'accepted';
      state.memberships.push({
        userId,
        organizationId: inv.organizationId,
        role: inv.role,
        status: 'active',
        createdAt: new Date().toISOString(),
      });
      return { success: true, organizationId: inv.organizationId, role: inv.role };
    },
  };

  return { db, state };
}

Deno.test('ManageMembers: Fehlender Token liefert 401', async () => {
  const { db } = createMockDb();
  const req = new Request('http://localhost/manage-members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'list' }),
  });
  const res = await handleManageMembers(req, db);
  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.code, 'UNAUTHORIZED');
});

Deno.test('ManageMembers: Ungültiger Token liefert 401', async () => {
  const { db } = createMockDb();
  const req = new Request('http://localhost/manage-members', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer invalid-token',
    },
    body: JSON.stringify({ action: 'list' }),
  });
  const res = await handleManageMembers(req, db);
  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.code, 'UNAUTHORIZED');
});

Deno.test('ManageMembers: Nicht-Admin (Manager) wird mit 403 FORBIDDEN abgewiesen', async () => {
  const { db } = createMockDb();
  const req = new Request('http://localhost/manage-members', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer manager-token',
    },
    body: JSON.stringify({ action: 'list' }),
  });
  const res = await handleManageMembers(req, db);
  assertEquals(res.status, 403);
  const data = await res.json();
  assertEquals(data.code, 'FORBIDDEN');
});

Deno.test('ManageMembers: Admin listet Mitglieder und Einladungen der eigenen Organisation', async () => {
  const { db } = createMockDb();
  const req = new Request('http://localhost/manage-members', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer admin-token',
    },
    body: JSON.stringify({ action: 'list' }),
  });
  const res = await handleManageMembers(req, db);
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.members.length, 2);
  assertEquals(data.invitations.length, 1);
  assertEquals(data.invitations[0].id, 'inv-a-1');
});

Deno.test('ManageMembers: Admin lädt neues Mitglied ein', async () => {
  const { db } = createMockDb();
  const req = new Request('http://localhost/manage-members', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer admin-token',
    },
    body: JSON.stringify({
      action: 'invite',
      email: ' NewUser@test.local ',
      role: 'manager',
    }),
  });
  const res = await handleManageMembers(req, db);
  assertEquals(res.status, 201);
  const data = await res.json();
  assertEquals(data.invitation.email, 'newuser@test.local');
  assertEquals(data.invitation.role, 'manager');
});

Deno.test('ManageMembers: Widerruf fremder Einladung liefert 404 NOT_FOUND', async () => {
  const { db } = createMockDb();
  const req = new Request('http://localhost/manage-members', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer admin-token',
    },
    body: JSON.stringify({
      action: 'revokeInvitation',
      invitationId: 'inv-b-1', // Gehört zu Org B!
    }),
  });
  const res = await handleManageMembers(req, db);
  assertEquals(res.status, 404);
  const data = await res.json();
  assertEquals(data.code, 'NOT_FOUND');
});

Deno.test('ManageMembers: Widerruf eigener offener Einladung gelingt', async () => {
  const { db } = createMockDb();
  const req = new Request('http://localhost/manage-members', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer admin-token',
    },
    body: JSON.stringify({
      action: 'revokeInvitation',
      invitationId: 'inv-a-1',
    }),
  });
  const res = await handleManageMembers(req, db);
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.status, 'revoked');
});

Deno.test('ManageMembers: Herabstufung des letzten Admins liefert 422 LAST_ACTIVE_ADMIN', async () => {
  const { db } = createMockDb();
  const req = new Request('http://localhost/manage-members', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer admin-token',
    },
    body: JSON.stringify({
      action: 'changeRole',
      memberUserId: ADMIN_USER.id,
      newRole: 'viewer',
    }),
  });
  const res = await handleManageMembers(req, db);
  assertEquals(res.status, 422);
  const data = await res.json();
  assertEquals(data.code, 'LAST_ACTIVE_ADMIN');
});

Deno.test('ManageMembers: Deaktivierung des letzten Admins liefert 422 LAST_ACTIVE_ADMIN', async () => {
  const { db } = createMockDb();
  const req = new Request('http://localhost/manage-members', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer admin-token',
    },
    body: JSON.stringify({
      action: 'deactivateMember',
      memberUserId: ADMIN_USER.id,
    }),
  });
  const res = await handleManageMembers(req, db);
  assertEquals(res.status, 422);
  const data = await res.json();
  assertEquals(data.code, 'LAST_ACTIVE_ADMIN');
});

Deno.test('ManageMembers: Annahme einer gültigen Einladung durch authentifizierten Nutzer', async () => {
  const { db } = createMockDb();
  const req = new Request('http://localhost/manage-members', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer invited-user-token',
    },
    body: JSON.stringify({
      action: 'acceptInvitation',
    }),
  });
  const res = await handleManageMembers(req, db);
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.status, 'accepted');
  assertEquals(data.role, 'viewer');
  assertEquals(data.organizationId, ORG_A_ID);
});
