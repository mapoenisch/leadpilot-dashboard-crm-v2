// G59 (Auftrag 067M, Step 2): Supabase Edge Function manage-members.
// Bindet handleManageMembers an den Supabase-Client mit interner Service-Role.
// Der Service-Role-Schlüssel gelangt zu keinem Zeitpunkt an den Client oder in Logs.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  handleManageMembers,
  type ManageMembersDb,
  type MemberRole,
  type MemberStatus,
  type OrganizationMember,
  type OrganizationInvitation,
} from './handler.ts';

function readSecret(name: string): string {
  const value = Deno.env.get(name) ?? '';
  if (!value) {
    throw new Error(`Function-Secret ${name} fehlt.`);
  }
  return value;
}

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
      const { data, error } = await supabase
        .from('organization_invitations')
        .insert({
          organization_id: organizationId,
          email,
          role,
          invited_by: invitedBy,
          status: 'pending',
        })
        .select()
        .single();

      if (error || !data) {
        throw error ?? new Error('Fehler beim Erstellen der Einladung.');
      }

      return {
        id: data.id,
        organizationId: data.organization_id,
        email: data.email,
        role: data.role as MemberRole,
        invitedBy: data.invited_by,
        status: data.status,
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

    acceptInvitation: async (userId: string, userEmail: string) => {
      const normalizedEmail = userEmail.toLowerCase().trim();
      const now = new Date().toISOString();

      const { data: inv, error: invErr } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('status', 'pending')
        .gt('expires_at', now)
        .maybeSingle();

      if (invErr || !inv) return { error: 'NOT_FOUND' };

      // Einladung als akzeptiert markieren
      await supabase
        .from('organization_invitations')
        .update({ status: 'accepted' })
        .eq('id', inv.id);

      // Neue Mitgliedschaft in gebundener Organisation anlegen
      const { error: memErr } = await supabase.from('organization_members').insert({
        user_id: userId,
        organization_id: inv.organization_id,
        role: inv.role,
        status: 'active',
      });

      if (memErr) throw memErr;

      return {
        success: true,
        organizationId: inv.organization_id,
        role: inv.role as MemberRole,
      };
    },
  };

  return handleManageMembers(req, db);
});
