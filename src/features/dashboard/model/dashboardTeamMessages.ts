// Executive Dashboard V2 (Auftrag 163 / P11b):
// Zentrale deutschsprachige Fehlermeldungen für alle Team-Fehlerarten (§2.4 Nr. 23).
// Keine technischen Abkürzungen/Codes, klare Obergrenzen in Texten.

import type { DashboardV2StorageError } from '../services/dashboardStorageV2Types';

export const DASHBOARD_TEAM_LIMITS = {
  maxTeamsPerOrg: 50,
  maxDashboardsPerTeam: 50,
  maxMembersPerTeam: 200,
  maxPersonalDashboards: 20,
} as const;

export type DashboardTeamErrorContext = 'dashboard' | 'team' | 'member';

export function getDashboardTeamErrorMessage(
  error?: DashboardV2StorageError | null,
  context: DashboardTeamErrorContext = 'dashboard',
): string {
  if (!error) return 'Die Aktion konnte nicht ausgeführt werden.';

  switch (error.kind) {
    case 'team_zugriff_entzogen':
      return 'Deine Bearbeitungsrechte für dieses Team-Dashboard wurden entzogen.';

    case 'team_nicht_gefunden':
      return 'Das angegebene Team wurde nicht gefunden oder existiert nicht mehr.';

    case 'team_hat_dashboards':
      return 'Das Team kann nicht gelöscht werden, da es noch Dashboards enthält. Erst löschen oder als persönliche Kopie sichern.';

    case 'team_name_vergeben':
      return 'Ein Team mit diesem Namen existiert bereits in deiner Organisation.';

    case 'team_grenze':
      if (context === 'team') {
        return `Eine Organisation kann höchstens ${DASHBOARD_TEAM_LIMITS.maxTeamsPerOrg} Teams haben.`;
      }
      if (context === 'member') {
        return `Ein Team kann höchstens ${DASHBOARD_TEAM_LIMITS.maxMembersPerTeam} Mitglieder haben.`;
      }
      return `Ein Team kann höchstens ${DASHBOARD_TEAM_LIMITS.maxDashboardsPerTeam} Dashboards haben.`;

    case 'mitglied_nicht_in_org':
      return 'Der ausgewählte Nutzer gehört nicht zu dieser Organisation.';

    case 'server_funktion_fehlt':
      return 'Team-Freigaben sind auf dem Server noch nicht eingerichtet.';

    case 'nicht_berechtigt':
      return 'Du hast keine Berechtigung für diese Team-Aktion.';

    case 'nicht_verfuegbar':
      return 'Team-Freigaben brauchen eine Server-Verbindung.';

    case 'konflikt':
      return 'Revisionskonflikt: Ein anderes Teammitglied hat dieses Dashboard inzwischen gespeichert.';

    case 'nicht_gefunden':
      return 'Das angeforderte Dashboard wurde nicht gefunden.';

    case 'obergrenze_erreicht':
      return `Die Obergrenze von ${DASHBOARD_TEAM_LIMITS.maxPersonalDashboards} persönlichen Dashboards wurde erreicht.`;

    case 'letztes_dashboard':
      return 'Das letzte persönliche Dashboard kann nicht gelöscht werden.';

    case 'keine_mitgliedschaft':
      return 'Keine gültige Organisations-Mitgliedschaft gefunden.';

    case 'sitzung_abgelaufen':
      return 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.';

    default:
      return 'Die Aktion konnte nicht ausgeführt werden.';
  }
}
