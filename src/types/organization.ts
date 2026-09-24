// G45 (Auftrag 067B): Mandanten- und Rollentypen (Design §5.1).
// Genau eine Organisation je Benutzer; Rollen admin > manager > viewer.
export type OrganizationRole = 'admin' | 'manager' | 'viewer';

export interface OrganizationSession {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
}

export type OrganizationPermission =
  | 'crm:read'
  | 'crm:write'
  | 'members:manage'
  | 'sources:manage'
  | 'settings:manage'
  | 'simulation:run';

export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return value === 'admin' || value === 'manager' || value === 'viewer';
}
