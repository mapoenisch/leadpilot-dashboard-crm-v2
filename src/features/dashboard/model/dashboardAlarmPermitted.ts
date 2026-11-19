// Executive Dashboard V2 (Auftrag 168 / P13c):
// Fachregeln für Schalter-Sperrgründe, Quittierungsprüfung, Zähler-Formatierung & Tab-Sichtbarkeit.

export interface CheckAlarmTogglePermittedParams {
  userRole?: string | null;
  canWriteDashboard?: boolean;
  isDashboardSaved?: boolean;
  isTileDraft?: boolean;
  hasValidV2Rule?: boolean;
  isAlarmCapable?: boolean;
  hasSupportedFiltersOnly?: boolean;
}

export interface AlarmTogglePermittedResult {
  permitted: boolean;
  reason?: string;
}

export function checkAlarmTogglePermitted(
  params: CheckAlarmTogglePermittedParams,
): AlarmTogglePermittedResult {
  const {
    userRole,
    canWriteDashboard = true,
    isDashboardSaved = true,
    isTileDraft = false,
    hasValidV2Rule = true,
    isAlarmCapable = true,
    hasSupportedFiltersOnly = true,
  } = params;

  if (userRole !== 'manager' && userRole !== 'admin') {
    return { permitted: false, reason: 'Alarme verwalten nur Manager und Admins.' };
  }

  if (!canWriteDashboard) {
    return { permitted: false, reason: 'Keine Schreibrechte für dieses Dashboard.' };
  }

  if (!isDashboardSaved || isTileDraft) {
    return { permitted: false, reason: 'Speichere das Dashboard zuerst.' };
  }

  if (!isAlarmCapable) {
    return { permitted: false, reason: 'Für diese Kennzahl gibt es noch keinen Server-Alarm.' };
  }

  if (!hasValidV2Rule) {
    return {
      permitted: false,
      reason: 'Schwellenwert-Regel ist noch nicht vollständig oder ungültig.',
    };
  }

  if (!hasSupportedFiltersOnly) {
    return {
      permitted: false,
      reason: 'Diese Kachel nutzt Filter, die vom Server-Alarm nicht unterstützt werden.',
    };
  }

  return { permitted: true };
}

export function canAcknowledgeAlarmEvent(neuerZustand: string): boolean {
  return neuerZustand === 'warnung' || neuerZustand === 'kritisch';
}

export function validateAcknowledgementComment(comment?: string | null): {
  ok: boolean;
  error?: string;
} {
  if (comment && comment.length > 280) {
    return { ok: false, error: 'Der Kommentar darf maximal 280 Zeichen lang sein.' };
  }
  return { ok: true };
}

export interface UnreadAlarmCountFormat {
  display: string;
  ariaLabel: string;
  hasUnread: boolean;
}

export function formatUnreadAlarmCount(count: number): UnreadAlarmCountFormat {
  if (count <= 0) {
    return { display: '', ariaLabel: 'Keine ungelesenen Alarme', hasUnread: false };
  }
  if (count === 1) {
    return { display: '1', ariaLabel: '1 ungelesener Alarm', hasUnread: true };
  }
  if (count <= 99) {
    return { display: String(count), ariaLabel: `${count} ungelesene Alarme`, hasUnread: true };
  }
  return { display: '99+', ariaLabel: 'Mehr als 99 ungelesene Alarme', hasUnread: true };
}

export function shouldPollAlarmCount(params: {
  isTabVisible: boolean;
  isAuthenticated: boolean;
}): boolean {
  return Boolean(params.isTabVisible && params.isAuthenticated);
}

export function getRevisionRetentionNotice(
  retentionInfo: { entfernt: boolean; letzteBereinigung?: string | null } | null | undefined,
): string | null {
  if (retentionInfo?.entfernt) {
    return 'Ältere Versionen wurden nach der Aufbewahrungsregel entfernt.';
  }
  return null;
}
