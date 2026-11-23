// @vitest-environment jsdom
// Auftrag 173 (P16a §2.1 Nr. 3, §2.3): Admin-Ansicht „Umstellung vorbereiten“.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('@/auth/organizationContext', () => ({ useOrganization: vi.fn() }));
vi.mock('@/services/db/supabaseClient', () => ({ isSupabaseConfigured: false, supabase: null }));

import { useOrganization } from '@/auth/organizationContext';
import { RolloutPrepPage } from '../RolloutPrepPage';
import { createInMemoryRolloutService } from '@/features/dashboard/services/dashboardRolloutService';
import { buildRolloutPreviewRows } from '@/features/dashboard/preview/RolloutPrepPreview';

const mockOrg = vi.mocked(useOrganization);

function asRole(role: 'admin' | 'manager' | 'viewer') {
  mockOrg.mockReturnValue({
    session: { role, organizationId: 'o', userId: 'me' },
    isLoading: false,
  } as unknown as ReturnType<typeof useOrganization>);
}

describe('RolloutPrepPage', () => {
  beforeEach(() => asRole('admin'));

  it('nur Admin: Manager und Viewer sehen die Sperrseite und laden nichts', async () => {
    for (const role of ['manager', 'viewer'] as const) {
      asRole(role);
      const service = createInMemoryRolloutService(buildRolloutPreviewRows());
      const list = vi.spyOn(service, 'list');
      const { unmount } = render(<RolloutPrepPage service={service} />);
      expect(screen.queryByTestId('rollout-prep-page')).toBeNull();
      expect(list).not.toHaveBeenCalled();
      unmount();
    }
  });

  it('zeigt jede Klasse, offene Entscheidungen und verfallene Entscheidung', async () => {
    render(<RolloutPrepPage service={createInMemoryRolloutService(buildRolloutPreviewRows())} />);
    await screen.findByTestId('rollout-list');
    expect(screen.getByTestId('rollout-class-u-gleich')).toHaveTextContent('Gleich');
    expect(screen.getByTestId('rollout-class-u-v1')).toHaveTextContent('Alter Editor geändert');
    expect(screen.getByTestId('rollout-class-u-beide')).toHaveTextContent('Beide geändert');
    expect(screen.getByTestId('rollout-class-u-ohne')).toHaveTextContent('Noch keine Pilotkopie');
    expect(screen.getByTestId('rollout-class-u-nurv2')).toHaveTextContent('Nur neuer Editor');
    expect(screen.getByTestId('rollout-open-count')).toHaveTextContent('2 Entscheidungen offen.');
    expect(screen.getByTestId('rollout-decision-stale-u-beide')).toBeInTheDocument();
    // Nur entscheidbare Klassen haben Aktionen
    expect(screen.queryByTestId('rollout-adopt-u-gleich')).toBeNull();
    expect(screen.queryByTestId('rollout-adopt-u-ohne')).toBeNull();
    expect(screen.queryByTestId('rollout-adopt-u-nurv2')).toBeNull();
  });

  it('Unterschiede sind aufklappbar (aria-expanded) und nennen die Änderungen', async () => {
    render(<RolloutPrepPage service={createInMemoryRolloutService(buildRolloutPreviewRows())} />);
    const toggle = await screen.findByTestId('rollout-diff-toggle-u-v1');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const diff = screen.getByTestId('rollout-diff-u-v1');
    expect(diff).toBeVisible();
    expect(within(diff).getByText('Reihenfolge der Kacheln geändert')).toBeInTheDocument();
  });

  it('Übernehmen fragt nach, erzeugt neue Revision und zeigt danach „Gleich“', async () => {
    const service = createInMemoryRolloutService(buildRolloutPreviewRows());
    const adopt = vi.spyOn(service, 'adoptV1');
    render(<RolloutPrepPage service={service} />);
    fireEvent.click(await screen.findByTestId('rollout-adopt-u-v1'));
    const dialog = screen.getByTestId('rollout-adopt-dialog');
    expect(dialog).toHaveTextContent('Revision 5');
    expect(dialog).toHaveTextContent('neue Pilot-Revision 2');
    expect(adopt).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('rollout-adopt-confirm'));
    await waitFor(() =>
      expect(screen.getByTestId('rollout-class-u-v1')).toHaveTextContent('Gleich'),
    );
    expect(adopt).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('rollout-announcement')).toHaveTextContent(
      'Pilot-Revision 2 übernommen',
    );
    expect(screen.getByTestId('rollout-open-count')).toHaveTextContent('1 Entscheidung offen.');
  });

  it('Abbrechen im Dialog ändert nichts', async () => {
    const service = createInMemoryRolloutService(buildRolloutPreviewRows());
    const adopt = vi.spyOn(service, 'adoptV1');
    render(<RolloutPrepPage service={service} />);
    fireEvent.click(await screen.findByTestId('rollout-adopt-u-v1'));
    fireEvent.click(screen.getByText('Abbrechen'));
    expect(screen.queryByTestId('rollout-adopt-dialog')).toBeNull();
    expect(adopt).not.toHaveBeenCalled();
    expect(screen.getByTestId('rollout-class-u-v1')).toHaveTextContent('Alter Editor geändert');
  });

  it('Pilot behalten speichert die Entscheidung mit Revisionsbindung', async () => {
    render(<RolloutPrepPage service={createInMemoryRolloutService(buildRolloutPreviewRows())} />);
    fireEvent.click(await screen.findByTestId('rollout-keep-u-beide'));
    await waitFor(() =>
      expect(screen.getByTestId('rollout-decision-u-beide')).toHaveTextContent('Pilot behalten'),
    );
    expect(screen.queryByTestId('rollout-decision-stale-u-beide')).toBeNull();
  });

  it('veralteter Stand: verständliche Meldung und Neuladen statt stiller Übernahme', async () => {
    const service = createInMemoryRolloutService(buildRolloutPreviewRows());
    render(<RolloutPrepPage service={service} />);
    await screen.findByTestId('rollout-keep-u-v1');
    service.bumpV1('u-v1');
    fireEvent.click(screen.getByTestId('rollout-keep-u-v1'));
    const error = await screen.findByTestId('rollout-error-u-v1');
    expect(error).toHaveTextContent('Der Stand hat sich seit dem Laden geändert');
    expect(screen.queryByTestId('rollout-decision-u-v1')).toBeNull();
  });

  it('Ladefehler zeigt Meldung mit erneutem Laden', async () => {
    const service = createInMemoryRolloutService([]);
    vi.spyOn(service, 'list').mockResolvedValueOnce({ ok: false, error: 'server_funktion_fehlt' });
    render(<RolloutPrepPage service={service} />);
    expect(await screen.findByTestId('rollout-load-error')).toHaveTextContent(
      'Migration für Auftrag 173',
    );
    fireEvent.click(screen.getByText('Erneut laden'));
    expect(await screen.findByTestId('rollout-empty')).toBeInTheDocument();
  });
});

describe('RolloutPrepPage – Codex PR #219', () => {
  beforeEach(() => asRole('admin'));

  it('zeigt bei verfallener Entscheidung in Klasse „gleich“ wieder Aktionen und zählt sie als offen', async () => {
    const service = createInMemoryRolloutService(buildRolloutPreviewRows());
    render(<RolloutPrepPage service={service} />);
    fireEvent.click(await screen.findByTestId('rollout-adopt-u-v1'));
    fireEvent.click(screen.getByTestId('rollout-adopt-confirm'));
    await waitFor(() =>
      expect(screen.getByTestId('rollout-class-u-v1')).toHaveTextContent('Gleich'),
    );
    expect(screen.queryByTestId('rollout-keep-u-v1')).toBeNull();
    service.bumpV2('u-v1');
    fireEvent.click(screen.getByTestId('rollout-keep-u-beide'));
    await waitFor(() =>
      expect(screen.getByTestId('rollout-decision-stale-u-v1')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('rollout-keep-u-v1')).toBeInTheDocument();
    expect(screen.getByTestId('rollout-open-count')).toHaveTextContent('1 Entscheidung offen.');
  });
});
