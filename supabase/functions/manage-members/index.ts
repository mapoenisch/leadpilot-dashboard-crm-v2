// G59 (Auftrag 067M, Step 2): Supabase Edge Function manage-members.
// Bindet handleManageMembers an den Supabase-Client mit interner Service-Role.
// Der Service-Role-Schlüssel gelangt zu keinem Zeitpunkt an den Client oder in Logs.
// Invarianten:
// - Fail-closed Auth-Einladung (keine verwaiste pending-Einladung ohne Auth-Link)
// - Atomare Einladungsannahme via PostgreSQL Function accept_organization_invitation
import { createClient } from 'jsr:@supabase/supabase-js@2';

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
    invitationId?: string,
  ): Promise<{
    success?: boolean;
    organizationId?: string;
    role?: MemberRole;
    error?:
      | 'NOT_FOUND'
      | 'INVITATION_NOT_PENDING'
      | 'CANNOT_CHANGE_ORGANIZATION'
      | 'FORBIDDEN'
      | 'AMBIGUOUS_INVITATION';
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

  if (req.method !== 'POST') {
    return jsonResponse({ code: 'INVALID_REQUEST', message: 'Nur POST-Anfragen erlaubt.' }, 405);
  }

  // 1. Authentifizierung: Bearer-Token extrahieren
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse(
      { code: 'UNAUTHORIZED', message: 'Fehlender oder ungültiger Authorization-Header.' },
      401,
    );
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return jsonResponse({ code: 'UNAUTHORIZED', message: 'Leerer Bearer-Token.' }, 401);
  }

  const user = await db.getUserFromToken(token);
  if (!user) {
    return jsonResponse(
      { code: 'UNAUTHORIZED', message: 'Ungültiger oder abgelaufener Authentifizierungs-Token.' },
      401,
    );
  }

  // 2. Request-Body parsen
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ code: 'INVALID_REQUEST', message: 'Ungültiger JSON-Body.' }, 400);
  }

  const action = body.action as string | undefined;
  if (!action) {
    return jsonResponse({ code: 'INVALID_REQUEST', message: 'Feld action ist erforderlich.' }, 400);
  }

  // 3. Sonderaktion: acceptInvitation (kann von jedem authentifizierten Nutzer aufgerufen werden)
  if (action === 'acceptInvitation') {
    const invitationId = typeof body.invitationId === 'string' ? body.invitationId : undefined;
    const result = await db.acceptInvitation(user.id, user.email, invitationId);
    if (result.error === 'AMBIGUOUS_INVITATION') {
      return jsonResponse(
        {
          code: 'AMBIGUOUS_INVITATION',
          message: 'Mehrere offene Einladungen vorhanden. invitationId ist erforderlich.',
        },
        400,
      );
    }
    if (result.error === 'NOT_FOUND') {
      return jsonResponse(
        { code: 'NOT_FOUND', message: 'Keine passende Einladung gefunden.' },
        404,
      );
    }
    if (result.error === 'INVITATION_NOT_PENDING') {
      return jsonResponse(
        {
          code: 'INVITATION_NOT_PENDING',
          message: 'Die Einladung ist nicht mehr gültig oder bereits angenommen/abgelaufen.',
        },
        422,
      );
    }
    if (result.error === 'CANNOT_CHANGE_ORGANIZATION') {
      return jsonResponse(
        {
          code: 'CANNOT_CHANGE_ORGANIZATION',
          message: 'Benutzer besitzt bereits eine Mitgliedschaft in einer anderen Organisation.',
        },
        409,
      );
    }
    if (result.error === 'FORBIDDEN') {
      return jsonResponse(
        { code: 'FORBIDDEN', message: 'E-Mail der Einladung stimmt nicht überein.' },
        403,
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

  // 4. Autorisierung für Verwaltungsaktionen: Der Nutzer MUSS aktiver Admin seiner Organisation sein
  const membership = await db.getMembership(user.id);
  if (!membership || membership.status !== 'active') {
    return jsonResponse(
      {
        code: 'FORBIDDEN',
        message: 'Keine aktive Organisationsmitgliedschaft vorhanden.',
      },
      403,
    );
  }

  if (membership.role !== 'admin') {
    return jsonResponse(
      {
        code: 'FORBIDDEN',
        message: 'Nur Administratoren dürfen Mitglieder und Einladungen verwalten.',
      },
      403,
    );
  }

  const organizationId = membership.organizationId;

  // 5. Aktionen für Administratoren ausführen
  switch (action) {
    case 'list': {
      const data = await db.listMembersAndInvitations(organizationId);
      return jsonResponse(data, 200);
    }

    case 'invite': {
      const rawEmail = body.email;
      const rawRole = body.role;

      if (typeof rawEmail !== 'string' || !EMAIL_REGEX.test(rawEmail.trim())) {
        return jsonResponse(
          { code: 'INVALID_REQUEST', message: 'Ungültige oder fehlende E-Mail-Adresse.' },
          400,
        );
      }

      if (rawRole !== 'admin' && rawRole !== 'manager' && rawRole !== 'viewer') {
        return jsonResponse(
          {
            code: 'INVALID_REQUEST',
            message: 'Ungültige Rolle. Erlaubt: admin, manager, viewer.',
          },
          400,
        );
      }

      const email = rawEmail.trim().toLowerCase();
      const role = rawRole as MemberRole;

      try {
        const invitation = await db.createInvitation(organizationId, email, role, user.id);
        return jsonResponse({ invitation }, 201);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Fehler beim Erstellen der Einladung.';
        return jsonResponse({ code: 'AUTH_INVITE_FAILED', message }, 422);
      }
    }

    case 'revokeInvitation': {
      const invitationId = body.invitationId;
      if (typeof invitationId !== 'string' || !invitationId.trim()) {
        return jsonResponse(
          { code: 'INVALID_REQUEST', message: 'invitationId ist erforderlich.' },
          400,
        );
      }

      const result = await db.revokeInvitation(organizationId, invitationId.trim());
      if (result.error === 'NOT_FOUND') {
        return jsonResponse({ code: 'NOT_FOUND', message: 'Einladung nicht gefunden.' }, 404);
      }
      if (result.error === 'INVITATION_NOT_PENDING') {
        return jsonResponse(
          {
            code: 'INVITATION_NOT_PENDING',
            message: 'Nur offene (pending) Einladungen können widerrufen werden.',
          },
          422,
        );
      }

      return jsonResponse({ status: 'revoked' }, 200);
    }

    case 'changeRole': {
      const memberUserId = body.memberUserId;
      const rawNewRole = body.newRole;

      if (typeof memberUserId !== 'string' || !memberUserId.trim()) {
        return jsonResponse(
          { code: 'INVALID_REQUEST', message: 'memberUserId ist erforderlich.' },
          400,
        );
      }

      if (rawNewRole !== 'admin' && rawNewRole !== 'manager' && rawNewRole !== 'viewer') {
        return jsonResponse(
          { code: 'INVALID_REQUEST', message: 'Ungültige neue Rolle angegeben.' },
          400,
        );
      }

      const result = await db.changeMemberRole(
        organizationId,
        memberUserId.trim(),
        rawNewRole as MemberRole,
      );

      if (result.error === 'NOT_FOUND') {
        return jsonResponse(
          { code: 'NOT_FOUND', message: 'Mitglied in dieser Organisation nicht gefunden.' },
          404,
        );
      }
      if (result.error === 'LAST_ACTIVE_ADMIN') {
        return jsonResponse(
          {
            code: 'LAST_ACTIVE_ADMIN',
            message: 'Der letzte aktive Administrator kann nicht herabgestuft werden.',
          },
          422,
        );
      }

      return jsonResponse({ status: 'updated', role: rawNewRole }, 200);
    }

    case 'deactivateMember': {
      const memberUserId = body.memberUserId;
      if (typeof memberUserId !== 'string' || !memberUserId.trim()) {
        return jsonResponse(
          { code: 'INVALID_REQUEST', message: 'memberUserId ist erforderlich.' },
          400,
        );
      }

      const result = await db.deactivateMember(organizationId, memberUserId.trim());

      if (result.error === 'NOT_FOUND') {
        return jsonResponse(
          { code: 'NOT_FOUND', message: 'Mitglied in dieser Organisation nicht gefunden.' },
          404,
        );
      }
      if (result.error === 'LAST_ACTIVE_ADMIN') {
        return jsonResponse(
          {
            code: 'LAST_ACTIVE_ADMIN',
            message: 'Der letzte aktive Administrator kann nicht deaktiviert werden.',
          },
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

function readSecret(name: string): string {
  const value = Deno.env.get(name) ?? '';
  if (!value) {
    throw new Error(`Function-Secret ${name} fehlt.`);
  }
  return value;
}

if (import.meta.main) {
  Deno.serve(async (req: Request): Promise<Response> => {
  let supabaseUrl = '';
  let serviceKey = '';
  try {
    supabaseUrl = readSecret('SUPABASE_URL');
    serviceKey = readSecret('SUPABASE_SERVICE_ROLE_KEY');
  } catch {
    return new Response(
      JSON.stringify({ code: 'SERVER_ERROR', message: 'Edge Function nicht konfiguriert.' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }

  // Service-Role-Client: ausschließlich serverseitig in der Function verwendet!
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const db: ManageMembersDb = {
    getUserFromToken: async (token: string) => {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        return null;
      }
      return {
        id: data.user.id,
        email: data.user.email ?? '',
      };
    },

    getMembership: async (userId: string) => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id, role, status, organizations!inner(status)')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;
      const orgStatus = (data as { organizations?: { status?: unknown } }).organizations?.status;
      if (orgStatus !== 'active') return null;

      return {
        organizationId: data.organization_id as string,
        role: data.role as MemberRole,
        status: data.status as MemberStatus,
      };
    },

    listMembersAndInvitations: async (organizationId: string) => {
      // 1. Mitglieder der Organisation laden
      const { data: membersData, error: memErr } = await supabase
        .from('organization_members')
        .select('user_id, role, status, created_at')
        .eq('organization_id', organizationId);

      if (memErr) throw memErr;

      // 2. E-Mails der Auth-User über Admin API auflösen
      let userEmailMap = new Map<string, string>();
      try {
        const { data: userData } = await supabase.auth.admin.listUsers();
        if (userData?.users) {
          userEmailMap = new Map(
            userData.users.map((u: { id: string; email?: string }) => [u.id, u.email ?? '']),
          );
        }
      } catch {
        // Fallback falls listUsers fehlschlägt
      }

      const members: OrganizationMember[] = (membersData ?? []).map(
        (m: { user_id: string; role: string; status: string; created_at: string }) => ({
          userId: m.user_id,
          email: userEmailMap.get(m.user_id) || 'unbekannt',
          role: m.role as MemberRole,
          status: m.status as MemberStatus,
          createdAt: m.created_at,
        }),
      );

      // 3. Ausstehende Einladungen der Organisation laden
      const { data: invData, error: invErr } = await supabase
        .from('organization_invitations')
        .select('id, organization_id, email, role, invited_by, status, created_at, expires_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (invErr) throw invErr;

      const invitations: OrganizationInvitation[] = (invData ?? []).map(
        (i: {
          id: string;
          organization_id: string;
          email: string;
          role: string;
          invited_by: string;
          status: string;
          created_at: string;
          expires_at: string;
        }) => ({
          id: i.id,
          organizationId: i.organization_id,
          email: i.email,
          role: i.role as MemberRole,
          invitedBy: i.invited_by,
          status: i.status as OrganizationInvitation['status'],
          createdAt: i.created_at,
          expiresAt: i.expires_at,
        }),
      );

      return { members, invitations };
    },

    createInvitation: async (
      organizationId: string,
      email: string,
      role: MemberRole,
      invitedBy: string,
    ) => {
      const normalizedEmail = email.toLowerCase().trim();

      // Prüfe, ob es bereits eine offene Einladung für diese Organisation und E-Mail gibt
      const { data: existingPending } = await supabase
        .from('organization_invitations')
        .select('id, expires_at')
        .eq('organization_id', organizationId)
        .eq('email', normalizedEmail)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingPending && new Date(existingPending.expires_at) > new Date()) {
        throw new Error('Für diese E-Mail-Adresse existiert bereits eine offene Einladung.');
      }

      // Supabase-Auth-Einladung / Link-Generierung (FAIL-CLOSED)
      const invitationId = crypto.randomUUID();
      const siteUrl = Deno.env.get('SITE_URL') || 'http://127.0.0.1:4321';
      const redirectTo = `${siteUrl}/login?invitation_id=${invitationId}`;
      const authData = {
        invitation_id: invitationId,
        organization_id: organizationId,
        role,
      };
      let authSucceeded = false;

      // 1. Versuch: inviteUserByEmail (funktioniert mit konfiguriertem SMTP)
      try {
        const inviteRes = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
          redirectTo,
          data: authData,
        });
        if (inviteRes.data?.user && !inviteRes.error) {
          authSucceeded = true;
        }
      } catch {
        // Lokale Testumgebung ohne SMTP
      }

      // 2. Versuch: generateLink({ type: 'invite' })
      if (!authSucceeded) {
        try {
          const linkRes = await supabase.auth.admin.generateLink({
            type: 'invite',
            email: normalizedEmail,
            options: {
              redirectTo,
              data: authData,
            },
          });
          if (linkRes.data?.properties?.action_link) {
            authSucceeded = true;
          }
        } catch {
          // ignore
        }
      }

      // 3. Versuch: generateLink({ type: 'magiclink' }) falls User bereits in auth.users existiert
      if (!authSucceeded) {
        try {
          const magicRes = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: normalizedEmail,
            options: {
              redirectTo,
              data: authData,
            },
          });
          if (magicRes.data?.properties?.action_link) {
            authSucceeded = true;
          }
        } catch {
          // ignore
        }
      }

      // FAIL-CLOSED: Konnte kein Auth-User angelegt oder Link generiert werden, wird KEINE DB-Einladung angelegt!
      if (!authSucceeded) {
        throw new Error('Supabase-Auth-Einladung fehlgeschlagen. Es wurde keine Einladung erstellt.');
      }

      // Erst NACH erfolgreicher Auth-Operation wird die DB-Einladung persistiert
      const { data, error } = await supabase
        .from('organization_invitations')
        .insert({
          id: invitationId,
          organization_id: organizationId,
          email: normalizedEmail,
          role,
          invited_by: invitedBy,
          status: 'pending',
        })
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Fehler beim Speichern der Einladung in der Datenbank.');
      }

      return {
        id: data.id,
        organizationId: data.organization_id,
        email: data.email,
        role: data.role as MemberRole,
        invitedBy: data.invited_by,
        status: data.status as OrganizationInvitation['status'],
        createdAt: data.created_at,
        expiresAt: data.expires_at,
      };
    },

    revokeInvitation: async (organizationId: string, invitationId: string) => {
      const { data: inv } = await supabase
        .from('organization_invitations')
        .select('status')
        .eq('id', invitationId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (!inv) return { error: 'NOT_FOUND' };
      if (inv.status !== 'pending') return { error: 'INVITATION_NOT_PENDING' };

      const { error } = await supabase
        .from('organization_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId)
        .eq('organization_id', organizationId);

      if (error) throw error;
      return { success: true };
    },

    changeMemberRole: async (
      organizationId: string,
      memberUserId: string,
      newRole: MemberRole,
    ) => {
      const { data: existing } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', memberUserId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (!existing) return { error: 'NOT_FOUND' };

      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('user_id', memberUserId)
        .eq('organization_id', organizationId);

      if (error) {
        if (error.message?.includes('LAST_ACTIVE_ADMIN') || error.details?.includes('LAST_ACTIVE_ADMIN')) {
          return { error: 'LAST_ACTIVE_ADMIN' };
        }
        throw error;
      }
      return { success: true };
    },

    deactivateMember: async (organizationId: string, memberUserId: string) => {
      const { data: existing } = await supabase
        .from('organization_members')
        .select('status')
        .eq('user_id', memberUserId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (!existing) return { error: 'NOT_FOUND' };

      const { error } = await supabase
        .from('organization_members')
        .update({ status: 'suspended' })
        .eq('user_id', memberUserId)
        .eq('organization_id', organizationId);

      if (error) {
        if (error.message?.includes('LAST_ACTIVE_ADMIN') || error.details?.includes('LAST_ACTIVE_ADMIN')) {
          return { error: 'LAST_ACTIVE_ADMIN' };
        }
        throw error;
      }
      return { success: true };
    },

    acceptInvitation: async (userId: string, userEmail: string, invitationId?: string) => {
      // Atomare Ausführung in PostgreSQL
      const { data, error } = await supabase.rpc('accept_organization_invitation', {
        p_user_id: userId,
        p_user_email: userEmail,
        p_invitation_id: invitationId ?? null,
      });

      if (error) {
        if (
          error.message?.includes('AMBIGUOUS_INVITATION') ||
          error.details?.includes('AMBIGUOUS_INVITATION')
        ) {
          return { error: 'AMBIGUOUS_INVITATION' };
        }
        if (error.message?.includes('NOT_FOUND') || error.code === 'P0002') {
          return { error: 'NOT_FOUND' };
        }
        if (error.message?.includes('INVITATION_NOT_PENDING') || error.code === 'P0003') {
          return { error: 'INVITATION_NOT_PENDING' };
        }
        if (
          error.message?.includes('CANNOT_CHANGE_ORGANIZATION') ||
          error.details?.includes('CANNOT_CHANGE_ORGANIZATION')
        ) {
          return { error: 'CANNOT_CHANGE_ORGANIZATION' };
        }
        if (error.message?.includes('FORBIDDEN') || error.code === '42501') {
          return { error: 'FORBIDDEN' };
        }
        throw error;
      }

      return {
        success: true,
        organizationId: data.organization_id,
        role: data.role as MemberRole,
      };
    },
  };

    return handleManageMembers(req, db);
  });
}
