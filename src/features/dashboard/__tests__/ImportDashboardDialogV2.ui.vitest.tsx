import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImportDashboardDialogV2 } from '../components/editor/selection/ImportDashboardDialogV2';
import type { ParseImportResult } from '../model/dashboardExchangeV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';

describe('ImportDashboardDialogV2', () => {
  const dummyConfig: DashboardConfigV2 = {
    version: 2,
    id: 'dash_import',
    title: 'Importiertes Dashboard',
    scope: 'personal',
    ownerUserId: 'usr_me',
    organizationId: 'org_1',
    globalTimeframe: 'letzte_30_tage',
    tiles: [],
  };

  it('gibt null zurück wenn isOpen false ist', () => {
    const { container } = render(
      <ImportDashboardDialogV2
        isOpen={false}
        onClose={() => {}}
        file={null}
        parseResult={null}
        title=""
        onTitleChange={() => {}}
        targetScope="personal"
        onTargetChange={() => {}}
        isSubmitting={false}
        submitError={null}
        onFileSelect={() => {}}
        onConfirmImport={async () => true}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('rendert Dropzone und ruft onFileSelect bei Dateiauswahl auf', () => {
    const handleFileSelect = vi.fn();
    render(
      <ImportDashboardDialogV2
        isOpen={true}
        onClose={() => {}}
        file={null}
        parseResult={null}
        title=""
        onTitleChange={() => {}}
        targetScope="personal"
        onTargetChange={() => {}}
        isSubmitting={false}
        submitError={null}
        onFileSelect={handleFileSelect}
        onConfirmImport={async () => true}
      />,
    );

    expect(screen.getByText('Dashboard importieren')).toBeDefined();
    expect(screen.getByText(/JSON-Datei hierher ziehen/)).toBeDefined();

    const fileInput = screen.getByTestId('import-file-input') as HTMLInputElement;
    const testFile = new File(['{}'], 'dashboard.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    expect(handleFileSelect).toHaveBeenCalledWith(testFile);
  });

  it('zeigt Vorschau und Zielauswahl bei erfolgreicher Validierung', () => {
    const parseSuccess: ParseImportResult = {
      ok: true,
      config: dummyConfig,
      warnungen: [],
    };

    const handleTitleChange = vi.fn();
    const handleTargetChange = vi.fn();
    const handleConfirm = vi.fn().mockResolvedValue(true);

    render(
      <ImportDashboardDialogV2
        isOpen={true}
        onClose={() => {}}
        file={new File(['{}'], 'dashboard.json', { type: 'application/json' })}
        parseResult={parseSuccess}
        title="Importiertes Dashboard"
        onTitleChange={handleTitleChange}
        targetScope="personal"
        onTargetChange={handleTargetChange}
        teams={[
          {
            id: 't1',
            name: 'Team Nord',
            canWrite: true,
            description: null,
            memberCount: 1,
            dashboardCount: 1,
            isMember: true,
          },
        ]}
        isSubmitting={false}
        submitError={null}
        onFileSelect={() => {}}
        onConfirmImport={handleConfirm}
      />,
    );

    expect(screen.getByText('Enthaltene Kacheln:')).toBeDefined();
    const submitBtn = screen.getByTestId('confirm-import-button');
    expect(submitBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(submitBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('zeigt Fehler bei ungültiger Datei an', () => {
    const parseError: ParseImportResult = {
      ok: false,
      grund: 'Ungültiges Dateiformat.',
    };

    render(
      <ImportDashboardDialogV2
        isOpen={true}
        onClose={() => {}}
        file={new File(['{}'], 'bad.json', { type: 'application/json' })}
        parseResult={parseError}
        title=""
        onTitleChange={() => {}}
        targetScope="personal"
        onTargetChange={() => {}}
        isSubmitting={false}
        submitError={null}
        onFileSelect={() => {}}
        onConfirmImport={async () => true}
      />,
    );

    expect(screen.getByText('Ungültiges Dateiformat.')).toBeDefined();
    const submitBtn = screen.getByTestId('confirm-import-button');
    expect(submitBtn.hasAttribute('disabled')).toBe(true);
  });
});
