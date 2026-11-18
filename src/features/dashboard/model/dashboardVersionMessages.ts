// Executive Dashboard V2 (Auftrag 165 / P12):
// Zentrale deutschsprachige Meldungen für Versionshistorie, Vergleich, Wiederherstellen und Import/Export.

import type { DashboardV2StorageError } from '../services/dashboardStorageV2Types';
import { getDashboardTeamErrorMessage } from './dashboardTeamMessages';

export const DASHBOARD_EXCHANGE_LIMITS = {
  maxFileSizeKiB: 128,
  maxFileSizeBytes: 128 * 1024,
  maxTitleLength: 80,
  maxSlugLength: 60,
} as const;

export const DASHBOARD_VERSION_MESSAGES = {
  // Versionen & Rückfall
  serverUpdateNeeded: 'Versionsvergleich ist nach dem nächsten Server-Update verfügbar.',
  noVersionsFound: 'Keine früheren Versionen vorhanden.',
  currentBadge: 'aktuell',
  deletedUser: 'Gelöschtes Konto',
  formerMemberSuffix: '(ehemalig)',
  youPrefix: 'Du',

  // Wiederherstellen & Entwurfsschutz
  restoreConfirmTitle: 'Version wiederherstellen',
  restoreNotice: (sourceRevision: number, nextRevision: number) =>
    `Revision ${sourceRevision} wird als neue Version ${nextRevision} gespeichert. Ältere Versionen bleiben erhalten.`,
  restoreTeamNotice: (teamName: string) =>
    `Alle Mitglieder von „${teamName}“ sehen danach diesen Stand.`,
  restoreDraftWarning:
    'Du hast ungespeicherte Änderungen. Beim Wiederherstellen gehen sie verloren.',
  restoreDraftSaveAsCopy: 'Entwurf als persönliche Kopie sichern und wiederherstellen',
  restoreDraftDiscard: 'Verwerfen und wiederherstellen',
  restoreCancel: 'Abbrechen',

  // Vergleich
  noDiff: 'Keine inhaltlichen Unterschiede.',
  compareDraft: 'Mit meinem Entwurf vergleichen',
  compareCurrent: 'Mit aktuellem Stand vergleichen',
  compareTwo: 'Zwei Versionen vergleichen',

  // Import
  importTitle: 'Dashboard importieren',
  fileTooLarge: `Datei ist zu groß (maximal ${DASHBOARD_EXCHANGE_LIMITS.maxFileSizeKiB} KiB).`,
  invalidJson: 'Die ausgewählte Datei enthält kein gültiges JSON.',
  invalidFormat: 'Ungültiges Dateiformat. Es werden nur LeadPilot-Dashboard-Dateien unterstützt.',
  invalidFormatVersion: 'Nicht unterstützte Formatversion.',
  prototypePollution: 'Die Datei enthält unzulässige Objekteigenschaften und wurde abgelehnt.',
  missingDashboard: 'Die Datei enthält keine Dashboard-Konfiguration.',
  invalidConfig: (detail?: string) =>
    detail ? `Ungültige Dashboard-Konfiguration: ${detail}` : 'Ungültige Dashboard-Konfiguration.',
  unsupportedTiles: (tileNames: string[]) =>
    `Diese Datei enthält Kacheln, die es in dieser App nicht gibt: ${tileNames.join(', ')}.`,
  singleUnsupportedTile: 'Diese Datei enthält Kacheln, die es in dieser App nicht gibt.',
  importSuccess: (title: string) => `Dashboard „${title}“ erfolgreich importiert.`,
} as const;

export function getDashboardVersionErrorMessage(error?: DashboardV2StorageError | null): string {
  if (!error) return 'Die Aktion konnte nicht ausgeführt werden.';
  if (error.kind === 'server_funktion_fehlt') {
    return DASHBOARD_VERSION_MESSAGES.serverUpdateNeeded;
  }
  if (error.kind === 'nicht_gefunden') {
    return 'Die angeforderte Revision oder das Dashboard wurde nicht gefunden.';
  }
  return getDashboardTeamErrorMessage(error, 'dashboard');
}
