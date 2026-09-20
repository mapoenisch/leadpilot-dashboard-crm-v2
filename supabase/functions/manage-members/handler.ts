// G59 (Auftrag 067M, Step 2): Reiner Logik-Handler für manage-members Edge Function.
// Frei von Netzwerk- und Supabase-Client-Bindungen, vollständig unit-testbar.
// Sicherheitsinvarianten:
// - Bearer-Token Prüfung
// - Striktes RBAC: nur aktive Admins dürfen eigene Mitglieder und Einladungen verwalten
// - Fehlercodes: FORBIDDEN, LAST_ACTIVE_ADMIN, INVITATION_NOT_PENDING, NOT_FOUND, UNAUTHORIZED, INVALID_REQUEST
// - Niemals Service-Role-Tokens, E-Mail-Inhalte fremder Orgs oder Secrets im Output

export type MemberRole = 'admin' | 'manager' | 'viewer';
export type MemberStatus = 'active' | 'suspended';
export type InvitationStatus = 'pending' | 'revoked' | 'accepted' | 'expired';

export interface MemberUser {
  id: string;
  email: string;
}

export interface OrganizationMember {
  userId: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  createdAt: string;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: MemberRole;
  invitedBy: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
}

export interface ManageMembersDb {
  getUserFromToken(token: string): Promise<MemberUser | null>;
  getMembership(userId: string): Promise<{
    organizationId: string;
    role: MemberRole;
    status: MemberStatus;
  } | null>;
  listMembersAndInvitations(organizationId: string): Promise<{
    members: OrganizationMember[];
    invitations: OrganizationInvitation[];
  }>;
  createInvitation(
    organizationId: string,
    email: string,
    role: MemberRole,
    invitedBy: string,
  ): Promise<OrganizationInvitation>;
  revokeInvitation(
    organizationId: string,
    invitationId: string,
  ): Promise<{ success?: boolean; error?: 'NOT_FOUND' | 'INVITATION_NOT_PENDING' }>;
  changeMemberRole(
    organizationId: string,
    memberUserId: string,
    newRole: MemberRole,
  ): Promise<{ success?: boolean; error?: 'NOT_FOUND' | 'LAST_ACTIVE_ADMIN' }>;
  deactivateMember(
    organizationId: string,
    memberUserId: string,
  ): Promise<{ success?: boolean; error?: 'NOT_FOUND' | 'LAST_ACTIVE_ADMIN' }>;
  acceptInvitation(
    userId: string,
    userEmail: string,
  ): Promise<{
    success?: boolean;
    organizationId?: string;
    role?: MemberRole;
    error?: 'NOT_FOUND' | 'INVITATION_NOT_PENDING';
  }>;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export async function handleManageMembers(
  req: Request,
  db: ManageMembersDb,
): Promise<Response> {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // 1. Authorization Header prüfen
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse(
      { code: 'UNAUTHORIZED', message: 'Authentifizierung erforderlich (Bearer Token fehlt).' },
      401,
    );
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return jsonResponse({ code: 'UNAUTHORIZED', message: 'Ungültiger Authentifizierungs-Token.' }, 401);
  }

  // 2. Benutzer authentifizieren
  const user = await db.getUserFromToken(token);
  if (!user) {
    return jsonResponse({ code: 'UNAUTHORIZED', message: 'Benutzersitzung ungültig oder abgelaufen.' }, 401);
  }

  // 3. Payload parsen
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ code: 'INVALID_REQUEST', message: 'Ungültiges JSON-Format.' }, 400);
  }

  const action = String(payload['action'] ?? '');

  // 4. Sonderfall: acceptInvitation (keine bestehende Admin-Mitgliedschaft nötig)
  if (action === 'acceptInvitation') {
    const result = await db.acceptInvitation(user.id, user.email);
    if (result.error === 'NOT_FOUND') {
      return jsonResponse(
        { code: 'NOT_FOUND', message: 'Keine offene Einladung für diese E-Mail-Adresse gefunden.' },
        404,
      );
    }
    if (result.error === 'INVITATION_NOT_PENDING') {
      return jsonResponse(
        { code: 'INVITATION_NOT_PENDING', message: 'Einladung ist nicht mehr gültig.' },
        422,
      );
    }
    return jsonResponse(
      {
        status: 'accepted',
        organizationId: result.organizationId,
        role: result.role,
      },
      200,
    );
  }

  // 5. RBAC: Alle anderen Operationen verlangen Admin-Rolle in einer aktiven Organisation
  const membership = await db.getMembership(user.id);
  if (!membership || membership.status !== 'active' || membership.role !== 'admin') {
    return jsonResponse(
      { code: 'FORBIDDEN', message: 'Zugriff verweigert: Nur aktive Administratoren dürfen Mitglieder verwalten.' },
      403,
    );
  }

  const orgId = membership.organizationId;

  // 6. Aktionen ausführen
  switch (action) {
    case 'list': {
      const data = await db.listMembersAndInvitations(orgId);
      return jsonResponse({ members: data.members, invitations: data.invitations }, 200);
    }

    case 'invite': {
      const rawEmail = String(payload['email'] ?? '').trim();
      const rawRole = String(payload['role'] ?? '');

      if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
        return jsonResponse(
          { code: 'INVALID_REQUEST', message: 'Ungültige E-Mail-Adresse.' },
          422,
        );
      }
      if (rawRole !== 'admin' && rawRole !== 'manager' && rawRole !== 'viewer') {
        return jsonResponse(
          { code: 'INVALID_REQUEST', message: 'Ungültige Rolle (nur admin, manager, viewer erlaubt).' },
          422,
        );
      }

      const invitation = await db.createInvitation(
        orgId,
        rawEmail.toLowerCase(),
        rawRole as MemberRole,
        user.id,
      );
      return jsonResponse({ invitation }, 201);
    }

    case 'revokeInvitation': {
      const invitationId = String(payload['invitationId'] ?? '').trim();
      if (!invitationId) {
        return jsonResponse(
          { code: 'INVALID_REQUEST', message: 'invitationId fehlt.' },
          422,
        );
      }

      const result = await db.revokeInvitation(orgId, invitationId);
      if (result.error === 'NOT_FOUND') {
        return jsonResponse({ code: 'NOT_FOUND', message: 'Einladung nicht gefunden.' }, 404);
      }
      if (result.error === 'INVITATION_NOT_PENDING') {
        return jsonResponse(
          { code: 'INVITATION_NOT_PENDING', message: 'Nur ausstehende Einladungen können widerrufen werden.' },
          422,
        );
      }

      return jsonResponse({ status: 'revoked' }, 200);
    }

    case 'changeRole': {
      const memberUserId = String(payload['memberUserId'] ?? '').trim();
      const newRole = String(payload['newRole'] ?? '');

      if (!memberUserId) {
        return jsonResponse({ code: 'INVALID_REQUEST', message: 'memberUserId fehlt.' }, 422);
      }
      if (newRole !== 'admin' && newRole !== 'manager' && newRole !== 'viewer') {
        return jsonResponse(
          { code: 'INVALID_REQUEST', message: 'Ungültige Zielrolle.' },
          422,
        );
      }

      const result = await db.changeMemberRole(orgId, memberUserId, newRole as MemberRole);
      if (result.error === 'NOT_FOUND') {
        return jsonResponse({ code: 'NOT_FOUND', message: 'Mitglied nicht gefunden.' }, 404);
      }
      if (result.error === 'LAST_ACTIVE_ADMIN') {
        return jsonResponse(
          { code: 'LAST_ACTIVE_ADMIN', message: 'Der letzte aktive Administrator kann nicht herabgestuft werden.' },
          422,
        );
      }

      return jsonResponse({ status: 'updated', role: newRole }, 200);
    }

    case 'deactivateMember': {
      const memberUserId = String(payload['memberUserId'] ?? '').trim();
      if (!memberUserId) {
        return jsonResponse({ code: 'INVALID_REQUEST', message: 'memberUserId fehlt.' }, 422);
      }

      const result = await db.deactivateMember(orgId, memberUserId);
      if (result.error === 'NOT_FOUND') {
        return jsonResponse({ code: 'NOT_FOUND', message: 'Mitglied nicht gefunden.' }, 404);
      }
      if (result.error === 'LAST_ACTIVE_ADMIN') {
        return jsonResponse(
          { code: 'LAST_ACTIVE_ADMIN', message: 'Der letzte aktive Administrator kann nicht deaktiviert werden.' },
          422,
        );
      }

      return jsonResponse({ status: 'suspended' }, 200);
    }

    default:
      return jsonResponse(
        { code: 'INVALID_REQUEST', message: `Unbekannte Aktion: ${action}` },
        400,
      );
  }
}
