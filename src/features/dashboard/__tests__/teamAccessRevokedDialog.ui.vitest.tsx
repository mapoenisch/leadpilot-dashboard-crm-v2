import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TeamAccessRevokedDialogV2 } from '../components/editor/TeamAccessRevokedDialogV2';

describe('Auftrag 163 - T1 Rot-Nachweis (c): Vitest Rechteentzug-Dialog sichert Entwurf', () => {
  it('sichert den aktuellen Entwurf als persönliche Kopie bei Klick auf die Sicherungs-Aktion', () => {
    const onSaveAsPersonalCopy = vi.fn();
    const onDiscardAndReload = vi.fn();

    render(
      <TeamAccessRevokedDialogV2
        isOpen={true}
        dashboardTitle="Team KPIs"
        onSaveAsPersonalCopy={onSaveAsPersonalCopy}
        onDiscardAndReload={onDiscardAndReload}
      />,
    );

    // Klick auf "Entwurf als persönliche Kopie sichern"
    const saveButton = screen.getByRole('button', {
      name: /Entwurf als persönliche Kopie sichern|als persönliche kopie/i,
    });
    fireEvent.click(saveButton);

    expect(onSaveAsPersonalCopy).toHaveBeenCalledTimes(1);
  });

  it('verwirft und lädt neu bei Klick auf die Verwerfen-Aktion', () => {
    const onSaveAsPersonalCopy = vi.fn();
    const onDiscardAndReload = vi.fn();

    render(
      <TeamAccessRevokedDialogV2
        isOpen={true}
        dashboardTitle="Team KPIs"
        onSaveAsPersonalCopy={onSaveAsPersonalCopy}
        onDiscardAndReload={onDiscardAndReload}
      />,
    );

    const discardBtn = screen.getByRole('button', {
      name: /Verwerfen und neu laden/i,
    });
    fireEvent.click(discardBtn);

    expect(onDiscardAndReload).toHaveBeenCalledTimes(1);
  });
});
