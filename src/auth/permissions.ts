// G45 (Auftrag 067B): Zentrale Rollenmatrix (Design §5.1).
// admin verwaltet Mitglieder, Quellen und Einstellungen; manager liest CRM
// und führt Simulationen aus; viewer liest ausschließlich.
import type { OrganizationPermission, OrganizationRole } from '../types/organization';

const PERMISSION_MATRIX: Record<OrganizationRole, readonly OrganizationPermission[]> = {
  admin: [
    'crm:read',
    'crm:write',
    'members:manage',
    'sources:manage',
    'settings:manage',
    'simulation:run',
  ],
  manager: ['crm:read', 'simulation:run'],
  viewer: ['crm:read'],
};

export function permissionsFor(role: OrganizationRole): readonly OrganizationPermission[] {
  return PERMISSION_MATRIX[role];
}

export function can(permission: OrganizationPermission, role: OrganizationRole): boolean {
  return PERMISSION_MATRIX[role].includes(permission);
}
