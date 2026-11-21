// Auftrag 171 (P15a §2.2 Nr. 10): Einstieg „Im Kiosk anzeigen“ und Badge bei veralteten Werten.
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KioskLaunchButton } from '../components/kiosk/KioskLaunchButton';
import { TileThresholdBadge } from '../components/TileThresholdBadge';
import { THRESHOLD_MESSAGES } from '../model/thresholdMessages';
import type { AccessibleDashboardListItemV2 } from '../services/dashboardStorageV2Types';

const item = (id: string, title: string, teamName: string | null = null) =>
  ({
    id,
    title,
    scope: teamName ? 'team' : 'personal',
    revision: 1,
    tileCount: 3,
    sectionCount: 0,
    updatedAt: '2026-11-21T07:00:00Z',
    teamId: teamName ? 't1' : null,
    teamName,
    canWrite: false,
  }) satisfies AccessibleDashboardListItemV2;

describe('KioskLaunchButton', () => {
  const dashboards = [item('d1', 'Mein Vertrieb'), item('d2', 'Team Nord', 'Nord')];

  it('öffnet den Kiosk mit den gewählten Dashboards in Listenreihenfolge und Intervall', () => {
    const push = vi.spyOn(window.history, 'pushState');
    render(<KioskLaunchButton currentDashboardId="d2" dashboards={dashboards} />);
    fireEvent.click(screen.getByTestId('kiosk-launch-button'));
    expect(screen.getByTestId('kiosk-launch-option-d2')).toBeChecked();
    expect(screen.getByTestId('kiosk-launch-option-d1')).not.toBeChecked();
    fireEvent.click(screen.getByTestId('kiosk-launch-option-d1'));
    fireEvent.change(screen.getByTestId('kiosk-launch-interval'), { target: { value: '120' } });
    fireEvent.click(screen.getByTestId('kiosk-launch-submit'));
    expect(push).toHaveBeenCalledWith({}, '', '/dashboard/kiosk?ids=d1,d2&intervall=120');
    push.mockRestore();
  });

  it('sperrt Start bei ungültigem Intervall oder leerer Auswahl', () => {
    render(<KioskLaunchButton currentDashboardId="d1" dashboards={dashboards} />);
    fireEvent.click(screen.getByTestId('kiosk-launch-button'));
    fireEvent.change(screen.getByTestId('kiosk-launch-interval'), { target: { value: '10' } });
    expect(screen.getByTestId('kiosk-launch-submit')).toBeDisabled();
    fireEvent.change(screen.getByTestId('kiosk-launch-interval'), { target: { value: '60' } });
    fireEvent.click(screen.getByTestId('kiosk-launch-option-d1'));
    expect(screen.getByTestId('kiosk-launch-submit')).toBeDisabled();
  });

  it('ist bei ungespeicherten Änderungen mit Begründung gesperrt', () => {
    render(
      <KioskLaunchButton
        currentDashboardId="d1"
        dashboards={dashboards}
        disabledReason="Erst speichern"
      />,
    );
    const button = screen.getByTestId('kiosk-launch-button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Erst speichern');
  });
});

describe('TileThresholdBadge bei veralteten Werten', () => {
  it('zeigt „Nicht bewertet (veraltet)“ statt einer Bewertung', () => {
    render(
      <TileThresholdBadge
        evaluation={{ stufe: 'nicht_bewertet', text: THRESHOLD_MESSAGES.nichtBewertetVeraltet }}
      />,
    );
    const badge = screen.getByTestId('tile-threshold-badge');
    expect(badge).toHaveTextContent('Nicht bewertet (veraltet)');
    expect(badge).toHaveAttribute('data-threshold-stufe', 'nicht_bewertet');
  });

  it('bleibt bei inaktiver Regel unsichtbar', () => {
    const { container } = render(
      <TileThresholdBadge
        evaluation={{ stufe: 'nicht_bewertet', text: THRESHOLD_MESSAGES.inaktiv }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
