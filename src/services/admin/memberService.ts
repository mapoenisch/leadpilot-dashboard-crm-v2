// G59 (Auftrag 067M, Step 3): Frontend-Service für Mitglieder- und Einladungsverwaltung.
// Ruft die Edge Function /functions/v1/manage-members mit dem Bearer-Token des Nutzers auf.
// Verwendet niemals Service-Role-Schlüssel im Browser.
import { supabase, isSupabaseConfigured } from '@/services/db/supabaseClient';

export type OrganizationRole = 'admin' | 'manager' | 'viewer';
export type MemberStatus = 'active' | 'suspended';
export type InvitationStatus = 'pending' | 'revoked' | 'accepted' | 'expired';

export interface OrganizationMember {
  userId: string;
  email: string;
  role: OrganizationRole;
  status: MemberStatus;
  createdAt: string;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  invitedBy: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
}

export type MemberServiceErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'LAST_ACTIVE_ADMIN'
  | 'INVITATION_NOT_PENDING'
  | 'CANNOT_CHANGE_ORGANIZATION'
  | 'NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'UNKNOWN';

export class MemberServiceError extends Error {
  constructor(
    public readonly code: MemberServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MemberServiceError';
  }
}

async function callManageMembers<T = Record<string, unknown>>(
  payload: Record<string, unknown>,
): Promise<T> {
  if (!isSupabaseConfigured || !supabase) {
    throw new MemberServiceError('UNAUTHORIZED', 'Supabase ist nicht konfiguriert.');
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new MemberServiceError('UNAUTHORIZED', 'Keine aktive Sitzung vorhanden.');
  }

  const token = data.session.access_token;
  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
  const anonKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';
  const url = `${baseUrl}/functions/v1/manage-members`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new MemberServiceError(
      'UNKNOWN',
      err instanceof Error ? err.message : 'Netzwerkfehler bei der Mitgliederverwaltung.',
    );
  }

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const rawCode = body.code as string | undefined;
    let code: MemberServiceErrorCode = 'UNKNOWN';
    if (
      rawCode === 'UNAUTHORIZED' ||
      rawCode === 'FORBIDDEN' ||
      rawCode === 'LAST_ACTIVE_ADMIN' ||
      rawCode === 'INVITATION_NOT_PENDING' ||
      rawCode === 'CANNOT_CHANGE_ORGANIZATION' ||
      rawCode === 'NOT_FOUND' ||
      rawCode === 'INVALID_REQUEST'
    ) {
      code = rawCode;
    } else if (response.status === 401) {
      code = 'UNAUTHORIZED';
    } else if (response.status === 403) {
      code = 'FORBIDDEN';
    }

    const message =
      typeof body.message === 'string'
        ? body.message
        : `Fehler bei der Mitgliederverwaltung (${response.status}).`;

    throw new MemberServiceError(code, message);
  }

  return body as T;
}

export const memberService = {
  async listMembersAndInvitations(): Promise<{
    members: OrganizationMember[];
    invitations: OrganizationInvitation[];
  }> {
    return callManageMembers<{
      members: OrganizationMember[];
      invitations: OrganizationInvitation[];
    }>({ action: 'list' });
  },

  async inviteMember(email: string, role: OrganizationRole): Promise<OrganizationInvitation> {
    const res = await callManageMembers<{ invitation: OrganizationInvitation }>({
      action: 'invite',
      email,
      role,
    });
    return res.invitation;
  },

  async revokeInvitation(invitationId: string): Promise<void> {
    await callManageMembers<{ status: string }>({
      action: 'revokeInvitation',
      invitationId,
    });
  },

  async changeMemberRole(memberUserId: string, newRole: OrganizationRole): Promise<void> {
    await callManageMembers<{ status: string; role: string }>({
      action: 'changeRole',
      memberUserId,
      newRole,
    });
  },

  async deactivateMember(memberUserId: string): Promise<void> {
    await callManageMembers<{ status: string }>({
      action: 'deactivateMember',
      memberUserId,
    });
  },

  async acceptInvitation(): Promise<{ organizationId: string; role: OrganizationRole }> {
    return callManageMembers<{
      status: string;
      organizationId: string;
      role: OrganizationRole;
    }>({ action: 'acceptInvitation' });
  },
};
