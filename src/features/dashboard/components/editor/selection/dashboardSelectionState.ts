import type {
  AccessibleDashboardListItemV2,
  DashboardV2StorageError,
  PersonalDashboardListItemV2,
  StoredDashboardV2Row,
} from '../../../services/dashboardStorageV2Types';

export type ActiveDialogType = null | 'new' | 'duplicate' | 'delete' | 'share';

export type PendingSelectionAction =
  | { type: 'open'; id: string; title: string }
  | { type: 'new' }
  | { type: 'delete'; id: string; title: string }
  | { type: 'import' };

export interface UseDashboardSelectionParams {
  currentDashboard: StoredDashboardV2Row;
  dashboards: (AccessibleDashboardListItemV2 | PersonalDashboardListItemV2)[];
  isDirty: boolean;
  isPreviewMode?: boolean;
  onOpenDashboard: (id: string) => Promise<boolean>;
  onCreateFromTemplate: (
    templateId: string,
    title?: string,
    target?: { scope: 'personal' | 'team'; teamId?: string },
  ) => Promise<{ ok: boolean; error?: unknown }>;
  onDuplicateCurrent: (
    title?: string,
    target?: { scope: 'personal' | 'team'; teamId?: string },
  ) => Promise<{ ok: boolean; error?: unknown }>;
  onDeleteDashboard: (
    id: string,
  ) => Promise<{ ok: boolean; nextDashboardId?: string | null; error?: unknown }>;
  onSaveCurrent: () => Promise<boolean>;
  onShareWithTeam?: (
    teamId: string,
    title: string,
    saveFirst?: boolean,
  ) => Promise<{ ok: boolean; error?: unknown }>;
  onOpenImport?: () => void;
}

// Modulweiter Zwischenspeicher für Folgeaktionen, Ansagen, Fehler und Trigger-Fokus über Shell-Remounts hinweg (P09b / Codex P2)
let pendingFollowUpSelectionAction: PendingSelectionAction | null = null;
let pendingPostSwitchAnnouncement: string | null = null;
let pendingPostSwitchError: string | null = null;
let pendingFocusTriggerOnMount = false;

export function getPendingFollowUpSelectionAction(): PendingSelectionAction | null {
  const act = pendingFollowUpSelectionAction;
  pendingFollowUpSelectionAction = null;
  return act;
}

export function setPendingFollowUpSelectionAction(action: PendingSelectionAction | null): void {
  pendingFollowUpSelectionAction = action;
}

export function getPendingPostSwitchAnnouncement(): string | null {
  const msg = pendingPostSwitchAnnouncement;
  pendingPostSwitchAnnouncement = null;
  return msg;
}

export function setPendingPostSwitchAnnouncement(msg: string | null): void {
  pendingPostSwitchAnnouncement = msg;
}

export function getPendingPostSwitchError(): string | null {
  const err = pendingPostSwitchError;
  pendingPostSwitchError = null;
  return err;
}

export function setPendingPostSwitchError(err: string | null): void {
  pendingPostSwitchError = err;
}

export function getPendingFocusTriggerOnMount(): boolean {
  return pendingFocusTriggerOnMount;
}

export function setPendingFocusTriggerOnMount(val: boolean): void {
  pendingFocusTriggerOnMount = val;
}

export function clearPendingFollowUpSelectionAction(): void {
  pendingFollowUpSelectionAction = null;
  pendingPostSwitchAnnouncement = null;
  pendingPostSwitchError = null;
  pendingFocusTriggerOnMount = false;
}

export async function saveBeforeAction(
  isDirty: boolean,
  onSaveCurrent: () => Promise<boolean>,
  errorDetail: string,
): Promise<{ ok: true } | { ok: false; error: DashboardV2StorageError }> {
  if (!isDirty) return { ok: true };
  const saved = await onSaveCurrent();
  if (saved) return { ok: true };
  return { ok: false, error: { kind: 'konflikt', detail: errorDetail } };
}
