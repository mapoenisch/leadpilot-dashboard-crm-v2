import React from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type {
  OrganizationMember,
  OrganizationInvitation,
  OrganizationRole,
} from '@/services/admin/memberService';

interface MemberModalsProps {
  deactivateTarget: OrganizationMember | null;
  onCloseDeactivate: () => void;
  onConfirmDeactivate: () => void;

  roleChangeTarget: { member: OrganizationMember; newRole: OrganizationRole } | null;
  onCloseRoleChange: () => void;
  onConfirmRoleChange: () => void;

  revokeTarget: OrganizationInvitation | null;
  onCloseRevoke: () => void;
  onConfirmRevoke: () => void;

  isActionPending: boolean;
}

export const MemberModals: React.FC<MemberModalsProps> = ({
  deactivateTarget,
  onCloseDeactivate,
  onConfirmDeactivate,
  roleChangeTarget,
  onCloseRoleChange,
  onConfirmRoleChange,
  revokeTarget,
  onCloseRevoke,
  onConfirmRevoke,
  isActionPending,
}) => {
  return (
    <>
      {/* Bestätigungsdialog: Deaktivieren */}
      <Modal
        open={deactivateTarget !== null}
        onClose={onCloseDeactivate}
        title="Mitglied deaktivieren"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onCloseDeactivate}
              disabled={isActionPending}
            >
              Abbrechen
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={onConfirmDeactivate}
              loading={isActionPending}
              disabled={isActionPending}
            >
              Ja, deaktivieren
            </Button>
          </div>
        }
      >
        <p className="text-sm text-text m-0">
          Möchten Sie das Mitglied{' '}
          <strong className="text-primary">{deactivateTarget?.email}</strong> wirklich deaktivieren?
          Das Mitglied verliert sofort den Zugang zur Organisation.
        </p>
      </Modal>

      {/* Bestätigungsdialog: Rolle ändern */}
      <Modal
        open={roleChangeTarget !== null}
        onClose={onCloseRoleChange}
        title="Rolle ändern"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onCloseRoleChange}
              disabled={isActionPending}
            >
              Abbrechen
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onConfirmRoleChange}
              loading={isActionPending}
              disabled={isActionPending}
            >
              Rolle ändern
            </Button>
          </div>
        }
      >
        <p className="text-sm text-text m-0">
          Möchten Sie die Rolle von{' '}
          <strong className="text-primary">{roleChangeTarget?.member.email}</strong> von{' '}
          <strong className="text-text">{roleChangeTarget?.member.role}</strong> zu{' '}
          <strong className="text-accent">{roleChangeTarget?.newRole}</strong> ändern?
        </p>
      </Modal>

      {/* Bestätigungsdialog: Einladung widerrufen */}
      <Modal
        open={revokeTarget !== null}
        onClose={onCloseRevoke}
        title="Einladung widerrufen"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onCloseRevoke}
              disabled={isActionPending}
            >
              Abbrechen
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={onConfirmRevoke}
              loading={isActionPending}
              disabled={isActionPending}
            >
              Ja, widerrufen
            </Button>
          </div>
        }
      >
        <p className="text-sm text-text m-0">
          Möchten Sie die ausstehende Einladung an{' '}
          <strong className="text-primary">{revokeTarget?.email}</strong> wirklich widerrufen?
        </p>
      </Modal>
    </>
  );
};
