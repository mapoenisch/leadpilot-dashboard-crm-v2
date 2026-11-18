import { describe, it, expect } from 'vitest';
import {
  getDashboardTeamErrorMessage,
  DASHBOARD_TEAM_LIMITS,
} from '../model/dashboardTeamMessages';

describe('dashboardTeamMessages', () => {
  it('returns default fallback when error is null or undefined', () => {
    expect(getDashboardTeamErrorMessage(null)).toBe('Die Aktion konnte nicht ausgeführt werden.');
    expect(getDashboardTeamErrorMessage(undefined)).toBe(
      'Die Aktion konnte nicht ausgeführt werden.',
    );
  });

  it('handles known error kinds correctly', () => {
    expect(getDashboardTeamErrorMessage({ kind: 'team_zugriff_entzogen' })).toContain(
      'Bearbeitungsrechte',
    );
    expect(getDashboardTeamErrorMessage({ kind: 'team_nicht_gefunden' })).toContain(
      'nicht gefunden',
    );
    expect(getDashboardTeamErrorMessage({ kind: 'team_hat_dashboards' })).toContain(
      'noch Dashboards enthält',
    );
    expect(getDashboardTeamErrorMessage({ kind: 'team_name_vergeben' })).toContain(
      'existiert bereits',
    );
    expect(getDashboardTeamErrorMessage({ kind: 'mitglied_nicht_in_org' })).toContain(
      'gehört nicht zu dieser Organisation',
    );
    expect(getDashboardTeamErrorMessage({ kind: 'server_funktion_fehlt' })).toContain(
      'Server noch nicht eingerichtet',
    );
    expect(getDashboardTeamErrorMessage({ kind: 'nicht_berechtigt' })).toContain(
      'keine Berechtigung',
    );
    expect(getDashboardTeamErrorMessage({ kind: 'nicht_verfuegbar' })).toContain(
      'Server-Verbindung',
    );
    expect(getDashboardTeamErrorMessage({ kind: 'konflikt' })).toContain('Revisionskonflikt');
    expect(getDashboardTeamErrorMessage({ kind: 'nicht_gefunden' })).toContain(
      'angeforderte Dashboard wurde nicht gefunden',
    );
    expect(getDashboardTeamErrorMessage({ kind: 'obergrenze_erreicht' })).toContain(
      'persönlichen Dashboards wurde erreicht',
    );
    expect(getDashboardTeamErrorMessage({ kind: 'letztes_dashboard' })).toContain(
      'letzte persönliche Dashboard',
    );
    expect(getDashboardTeamErrorMessage({ kind: 'keine_mitgliedschaft' })).toContain(
      'Keine gültige Organisations-Mitgliedschaft',
    );
    expect(getDashboardTeamErrorMessage({ kind: 'sitzung_abgelaufen' })).toContain(
      'Sitzung ist abgelaufen',
    );
  });

  it('handles team_grenze for all contexts', () => {
    expect(getDashboardTeamErrorMessage({ kind: 'team_grenze' }, 'team')).toBe(
      `Eine Organisation kann höchstens ${DASHBOARD_TEAM_LIMITS.maxTeamsPerOrg} Teams haben.`,
    );
    expect(getDashboardTeamErrorMessage({ kind: 'team_grenze' }, 'member')).toBe(
      `Ein Team kann höchstens ${DASHBOARD_TEAM_LIMITS.maxMembersPerTeam} Mitglieder haben.`,
    );
    expect(getDashboardTeamErrorMessage({ kind: 'team_grenze' }, 'dashboard')).toBe(
      `Ein Team kann höchstens ${DASHBOARD_TEAM_LIMITS.maxDashboardsPerTeam} Dashboards haben.`,
    );
  });

  it('handles custom / generic errors with default message', () => {
    expect(getDashboardTeamErrorMessage({ kind: 'technisch' })).toBe(
      'Die Aktion konnte nicht ausgeführt werden.',
    );
  });
});
