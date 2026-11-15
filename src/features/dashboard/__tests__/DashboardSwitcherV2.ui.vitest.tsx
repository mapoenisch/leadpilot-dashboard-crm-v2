// Auftrag 158: UI-Tests für DashboardSwitcherV2 und useDashboardSelection (P09b).
// Menü, Tastatur, Dialoge, Schutz ungespeicherter Änderungen, Ansagen und Zähltest.

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  DashboardSwitcherV2,
  type DashboardSwitcherV2Props,
} from '../components/editor/selection/DashboardSwitcherV2';
import type {
  PersonalDashboardListItemV2,
  StoredDashboardV2Row,
} from '../services/dashboardStorageV2Types';
import { MAX_PERSONAL_DASHBOARDS } from '../model/dashboardTitles';
import * as dashboardSelectionV2 from '../services/dashboardSelectionV2';
import { useDashboardV2Storage } from '../hooks/useDashboardV2Storage';
import { renderHook } from '@testing-library/react';

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: () => ({
    session: { organizationId: 'test-org', userId: 'test-user' },
    isLoading: false,
  }),
}));

vi.mock('../hooks/useDashboardPreferences', () => ({
  useDashboardPreferences: () => ({
    state: null,
    isLoading: false,
  }),
}));

function createMockDashboard(id: string, title: string, revision = 1): StoredDashboardV2Row {
  return {
    id,
    title,
    scope: 'personal',
    revision,
    config: {
      version: 2,
      id,
      title,
      scope: 'personal',
      ownerUserId: 'u1',
      organizationId: 'o1',
      globalTimeframe: 'letzte_30_tage',
      tiles: [],
    },
    updatedAt: new Date().toISOString(),
  };
}

function createMockList(count: number): PersonalDashboardListItemV2[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `dash-${i + 1}`,
    title: i === 0 ? 'Executive Dashboard' : `Dashboard ${i + 1}`,
    scope: 'personal' as const,
    revision: 1,
    tileCount: 5,
    sectionCount: 1,
    updatedAt: new Date(Date.now() - i * 60000).toISOString(),
  }));
}

function renderSwitcher(props: Partial<DashboardSwitcherV2Props> = {}) {
  const current = props.currentDashboard ?? createMockDashboard('dash-1', 'Executive Dashboard');
  const list = props.dashboards ?? createMockList(2);
  const onOpenDashboard = props.onOpenDashboard ?? vi.fn().mockResolvedValue(true);
  const onCreateFromTemplate =
    props.onCreateFromTemplate ?? vi.fn().mockResolvedValue({ ok: true });
  const onDuplicateCurrent = props.onDuplicateCurrent ?? vi.fn().mockResolvedValue({ ok: true });
  const onDeleteDashboard =
    props.onDeleteDashboard ?? vi.fn().mockResolvedValue({ ok: true, nextDashboardId: 'dash-2' });
  const onSaveCurrent = props.onSaveCurrent ?? vi.fn().mockResolvedValue(true);
  const onRefreshList = props.onRefreshList ?? vi.fn().mockResolvedValue(undefined);

  const fullProps: DashboardSwitcherV2Props = {
    currentDashboard: current,
    dashboards: list,
    isDirty: false,
    isPreviewMode: false,
    onOpenDashboard,
    onCreateFromTemplate,
    onDuplicateCurrent,
    onDeleteDashboard,
    onSaveCurrent,
    onRefreshList,
    ...props,
  };

  const view = render(<DashboardSwitcherV2 {...fullProps} />);
  const rerenderSwitcher = (nextProps: Partial<DashboardSwitcherV2Props> = {}) =>
    view.rerender(<DashboardSwitcherV2 {...fullProps} {...nextProps} />);

  return {
    ...view,
    rerenderSwitcher,
    onOpenDashboard,
    onCreateFromTemplate,
    onDuplicateCurrent,
    onDeleteDashboard,
    onSaveCurrent,
    onRefreshList,
  };
}

describe('DashboardSwitcherV2 UI-Tests', () => {
  it('ruft onRefreshList beim Öffnen des Menüs auf (Codex P2)', () => {
    const onRefreshList = vi.fn().mockResolvedValue(undefined);
    renderSwitcher({ onRefreshList });

    expect(onRefreshList).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('dashboard-switcher-button'));
    expect(onRefreshList).toHaveBeenCalledTimes(1);
  });

  it('rendert Auswahlknopf mit Scope-Badge und aktuellem Titel', () => {
    renderSwitcher();
    const trigger = screen.getByTestId('dashboard-switcher-button');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'true');
    expect(screen.getByTestId('scope-badge')).toHaveTextContent('Persönlich');
    expect(trigger).toHaveTextContent('Executive Dashboard');
  });

  it('öffnet und schließt das Menü per Klick und Escape-Taste', () => {
    renderSwitcher();
    const trigger = screen.getByTestId('dashboard-switcher-button');
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('dashboard-switcher-menu')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-item-dash-1')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-item-dash-2')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('dashboard-switcher-menu')).not.toBeInTheDocument();
  });

  it('unterstützt Tastaturnavigation mit Pfeiltasten, Home und End', () => {
    renderSwitcher();
    fireEvent.click(screen.getByTestId('dashboard-switcher-button'));
    const menu = screen.getByTestId('dashboard-switcher-menu');

    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByTestId('dashboard-item-dash-1'));

    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByTestId('dashboard-item-dash-2'));

    fireEvent.keyDown(menu, { key: 'End' });
    expect(document.activeElement).toBe(screen.getByTestId('delete-dashboard-menu-item'));

    fireEvent.keyDown(menu, { key: 'Home' });
    expect(document.activeElement).toBe(screen.getByTestId('dashboard-item-dash-1'));
  });

  it('überspringt deaktivierte Einträge bei der Tastaturnavigation (Codex P2)', () => {
    // Fall 1: Nur 1 Dashboard -> Löschen ist deaktiviert
    const single = renderSwitcher({ dashboards: createMockList(1) });
    fireEvent.click(single.getByTestId('dashboard-switcher-button'));
    const menuSingle = single.getByTestId('dashboard-switcher-menu');

    // End fokussiert den letzten AKTIVEN Eintrag (Duplizieren), nicht Löschen
    fireEvent.keyDown(menuSingle, { key: 'End' });
    expect(document.activeElement).toBe(single.getByTestId('duplicate-dashboard-menu-item'));

    // ArrowDown auf Duplizieren springt direkt zum ersten Eintrag zurück
    fireEvent.keyDown(menuSingle, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(single.getByTestId('dashboard-item-dash-1'));

    // ArrowUp auf erstem Eintrag springt zum letzten AKTIVEN Eintrag (Duplizieren)
    fireEvent.keyDown(menuSingle, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(single.getByTestId('duplicate-dashboard-menu-item'));
    single.unmount();

    // Fall 2: 20 Dashboards -> Limit erreicht, Neu und Duplizieren deaktiviert
    const maxList = renderSwitcher({ dashboards: createMockList(MAX_PERSONAL_DASHBOARDS) });
    fireEvent.click(maxList.getByTestId('dashboard-switcher-button'));
    const menuMax = maxList.getByTestId('dashboard-switcher-menu');

    // Zu letztem Dashboard navigieren
    const lastDashItem = maxList.getByTestId(`dashboard-item-dash-${MAX_PERSONAL_DASHBOARDS}`);
    lastDashItem.focus();

    // ArrowDown springt über die deaktivierten Neu/Duplizieren direkt zu Löschen
    fireEvent.keyDown(menuMax, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(maxList.getByTestId('delete-dashboard-menu-item'));

    // ArrowUp von Löschen springt zurück zum 20. Dashboard
    fireEvent.keyDown(menuMax, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(lastDashItem);
    maxList.unmount();
  });

  it('wechselt Dashboard direkt, wenn keine ungespeicherten Änderungen vorliegen', async () => {
    const { onOpenDashboard } = renderSwitcher();
    fireEvent.click(screen.getByTestId('dashboard-switcher-button'));
    fireEvent.click(screen.getByTestId('dashboard-item-dash-2'));

    await waitFor(() => {
      expect(onOpenDashboard).toHaveBeenCalledWith('dash-2');
    });
    expect(screen.getByTestId('dashboard-switcher-announcement')).toHaveTextContent(
      'Dashboard ‚Dashboard 2‘ geöffnet',
    );
  });

  it('schützt ungespeicherte Änderungen beim Wechsel und erlaubt Verwerfen', async () => {
    const { onOpenDashboard, onSaveCurrent } = renderSwitcher({ isDirty: true });
    fireEvent.click(screen.getByTestId('dashboard-switcher-button'));
    fireEvent.click(screen.getByTestId('dashboard-item-dash-2'));

    expect(screen.getByRole('dialog', { name: /ungespeicherte änderungen/i })).toBeInTheDocument();
    expect(onOpenDashboard).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /verwerfen und weiter/i }));
    await waitFor(() => {
      expect(onSaveCurrent).not.toHaveBeenCalled();
      expect(onOpenDashboard).toHaveBeenCalledWith('dash-2');
    });
  });

  it('schützt ungespeicherte Änderungen beim Wechsel und speichert vor dem Öffnen', async () => {
    const { onOpenDashboard, onSaveCurrent } = renderSwitcher({ isDirty: true });
    fireEvent.click(screen.getByTestId('dashboard-switcher-button'));
    fireEvent.click(screen.getByTestId('dashboard-item-dash-2'));

    fireEvent.click(screen.getByRole('button', { name: /speichern und weiter/i }));
    await waitFor(() => {
      expect(onSaveCurrent).toHaveBeenCalled();
      expect(onOpenDashboard).toHaveBeenCalledWith('dash-2');
    });
  });

  it('öffnet Neu-Dialog und legt Dashboard aus Vorlage an', async () => {
    const { onCreateFromTemplate } = renderSwitcher();
    fireEvent.click(screen.getByTestId('dashboard-switcher-button'));
    fireEvent.click(screen.getByTestId('new-dashboard-menu-item'));

    expect(screen.getByTestId('new-dashboard-dialog')).toBeInTheDocument();
    const salesCard = await screen.findByTestId('template-card-sales');
    fireEvent.click(salesCard);

    fireEvent.click(screen.getByTestId('create-dashboard-submit-button'));
    await waitFor(() => {
      expect(onCreateFromTemplate).toHaveBeenCalledWith('sales', expect.any(String));
    });
  });

  it('deaktiviert Löschen, wenn nur ein einziges Dashboard existiert', () => {
    renderSwitcher({ dashboards: createMockList(1) });
    fireEvent.click(screen.getByTestId('dashboard-switcher-button'));
    const deleteBtn = screen.getByTestId('delete-dashboard-menu-item');
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn).toHaveAttribute('title', 'Das letzte Dashboard kann nicht gelöscht werden');
  });

  it('öffnet Lösch-Dialog und führt Löschen nach Bestätigung aus', async () => {
    const { onDeleteDashboard } = renderSwitcher();
    fireEvent.click(screen.getByTestId('dashboard-switcher-button'));
    fireEvent.click(screen.getByTestId('delete-dashboard-menu-item'));

    expect(screen.getByTestId('delete-dashboard-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('delete-dashboard-confirm-button'));
    await waitFor(() => {
      expect(onDeleteDashboard).toHaveBeenCalledWith('dash-1');
    });
  });

  it('deaktiviert Neu und Duplizieren bei Erreichen der Obergrenze von 20 Dashboards', () => {
    renderSwitcher({ dashboards: createMockList(MAX_PERSONAL_DASHBOARDS) });
    fireEvent.click(screen.getByTestId('dashboard-switcher-button'));
    expect(screen.getByTestId('new-dashboard-menu-item')).toBeDisabled();
    expect(screen.getByTestId('duplicate-dashboard-menu-item')).toBeDisabled();
  });

  it('öffnet Duplizieren-Dialog und führt Duplizieren aus', async () => {
    const { onDuplicateCurrent } = renderSwitcher();
    fireEvent.click(screen.getByTestId('dashboard-switcher-button'));
    fireEvent.click(screen.getByTestId('duplicate-dashboard-menu-item'));

    expect(screen.getByTestId('duplicate-dashboard-dialog')).toBeInTheDocument();
    const titleInput = screen.getByTestId('duplicate-dashboard-title-input');
    fireEvent.change(titleInput, { target: { value: 'Kopie 1' } });
    fireEvent.click(screen.getByTestId('duplicate-submit-button'));

    await waitFor(() => {
      expect(onDuplicateCurrent).toHaveBeenCalledWith('Kopie 1');
    });
  });

  it('erlaubt Abbrechen in Duplizieren-, Neu- und Löschdialog', async () => {
    renderSwitcher();
    const trigger = screen.getByTestId('dashboard-switcher-button');

    // Lösch-Dialog abbrechen
    fireEvent.click(trigger);
    fireEvent.click(screen.getByTestId('delete-dashboard-menu-item'));
    expect(screen.getByTestId('delete-dashboard-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(screen.queryByTestId('delete-dashboard-dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });

    // Neu-Dialog abbrechen
    fireEvent.click(trigger);
    fireEvent.click(screen.getByTestId('new-dashboard-menu-item'));
    expect(screen.getByTestId('new-dashboard-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(screen.queryByTestId('new-dashboard-dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });

    // Duplizieren-Dialog abbrechen
    fireEvent.click(trigger);
    fireEvent.click(screen.getByTestId('duplicate-dashboard-menu-item'));
    expect(screen.getByTestId('duplicate-dashboard-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(screen.queryByTestId('duplicate-dashboard-dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it('blendet Aktionen im Vorschau-Modus aus', () => {
    renderSwitcher({ isPreviewMode: true });
    fireEvent.click(screen.getByTestId('dashboard-switcher-button'));
    expect(screen.getByTestId('dashboard-item-dash-1')).toBeInTheDocument();
    expect(screen.queryByTestId('new-dashboard-menu-item')).not.toBeInTheDocument();
    expect(screen.queryByTestId('duplicate-dashboard-menu-item')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-dashboard-menu-item')).not.toBeInTheDocument();
  });

  // Task 10 (2.5 Nr. 29): Zähltest - beim Laden des Editors höchstens 1 Aufruf von list_personal_dashboards_v2
  it('Zähltest: beim Laden des Editors findet höchstens ein Aufruf von listPersonalDashboardsV2 statt', async () => {
    const listSpy = vi.spyOn(dashboardSelectionV2, 'listPersonalDashboardsV2');
    listSpy.mockClear();

    const { result } = renderHook(() => useDashboardV2Storage());

    await waitFor(() => {
      expect(result.current.status).toBe('bereit');
    });

    // Genau 1 Aufruf beim initialen Laden; kein Polling, keine doppelten Aufrufe
    expect(listSpy).toHaveBeenCalledTimes(1);
    listSpy.mockRestore();
  });

  it('zeigt Fehlerhinweis im Menü an wenn listError vorliegt (Codex P2)', () => {
    renderSwitcher({
      dashboards: [],
      listError: { kind: 'technisch' },
    });
    fireEvent.click(screen.getByTestId('dashboard-switcher-button'));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Dashboard-Liste konnte nicht geladen werden.',
    );
  });

  it('sperrt Dashboard-Auswahl und schliesst Menue wenn isSaving aktiv ist (Codex P2)', () => {
    const { rerenderSwitcher } = renderSwitcher({ isSaving: false });
    const trigger = screen.getByTestId('dashboard-switcher-button');
    expect(trigger).not.toBeDisabled();

    fireEvent.click(trigger);
    expect(screen.getByTestId('dashboard-switcher-menu')).toBeInTheDocument();

    rerenderSwitcher({ isSaving: true });
    expect(trigger).toBeDisabled();
    expect(screen.queryByTestId('dashboard-switcher-menu')).not.toBeInTheDocument();
  });

  it('uebertraegt Fehlermeldung statt falscher Erfolgsansage wenn Oeffnen fehlschlaegt (Codex P2)', async () => {
    const onOpenDashboard = vi.fn().mockResolvedValue(false);
    renderSwitcher({ onOpenDashboard });
    fireEvent.click(screen.getByTestId('dashboard-switcher-button'));
    fireEvent.click(screen.getByTestId('dashboard-item-dash-2'));

    await waitFor(() => {
      expect(onOpenDashboard).toHaveBeenCalledWith('dash-2');
    });

    expect(screen.getByTestId('dashboard-switcher-announcement')).not.toHaveTextContent(
      'Dashboard ‚Dashboard 2‘ geöffnet',
    );
    fireEvent.click(screen.getByTestId('dashboard-switcher-button'));
    expect(screen.getByRole('alert')).toHaveTextContent('Dashboard konnte nicht geöffnet werden.');
  });
});
