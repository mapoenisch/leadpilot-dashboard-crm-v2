// Executive Dashboard V2 (Auftrag 165 / P12):
// Import-Dialog für Dashboards (Datei-Auswahl, Drag & Drop, Vorschau, Zielauswahl).

import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Upload, FileText, AlertTriangle, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { DashboardTeamV2 } from '../../../services/dashboardStorageV2Types';
import type { ParseImportResult } from '../../../model/dashboardExchangeV2';
import { DASHBOARD_VERSION_MESSAGES } from '../../../model/dashboardVersionMessages';

export interface ImportDashboardDialogV2Props {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  parseResult: ParseImportResult | null;
  title: string;
  onTitleChange: (title: string) => void;
  targetScope: 'personal' | 'team';
  targetTeamId?: string;
  onTargetChange: (scope: 'personal' | 'team', teamId?: string) => void;
  teams?: DashboardTeamV2[];
  isSubmitting: boolean;
  submitError: string | null;
  onFileSelect: (file: File) => void;
  onConfirmImport: () => Promise<boolean>;
}

export function ImportDashboardDialogV2({
  isOpen,
  onClose,
  file,
  parseResult,
  title,
  onTitleChange,
  targetScope,
  targetTeamId,
  onTargetChange,
  teams = [],
  isSubmitting,
  submitError,
  onFileSelect,
  onConfirmImport,
}: ImportDashboardDialogV2Props) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const writableTeams = teams.filter((t) => t.canWrite);

  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      onFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      onFileSelect(selected);
    }
  };

  const isFormValid = parseResult?.ok === true && title.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-dialog-title"
      data-testid="import-dashboard-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-lg border border-[var(--color-border,#1b3d39)] bg-[var(--color-bg-deep,#051413)] p-6 shadow-2xl text-[var(--color-text-soft,#e6f3f1)] space-y-4">
        {/* Kopfzeile */}
        <div className="flex items-center justify-between border-b border-[var(--color-border,#1b3d39)] pb-3">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <h2 id="import-dialog-title" className="text-base font-semibold text-white">
              {DASHBOARD_VERSION_MESSAGES.importTitle}
            </h2>
          </div>
          <button
            type="button"
            data-testid="close-import-dialog"
            onClick={onClose}
            className="rounded p-1 text-[var(--color-text-muted)] hover:text-white transition-colors"
            aria-label="Dialog schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Datei-Upload / Drag & Drop Bereich */}
        {!file || !parseResult ? (
          <button
            type="button"
            data-testid="import-dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'w-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors',
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-[var(--color-border,#1b3d39)] bg-black/20 hover:border-primary/50 hover:bg-black/30',
            )}
          >
            <Upload className="h-8 w-8 text-[var(--color-text-muted)] mb-2" />
            <p className="text-sm font-medium text-white mb-1">
              JSON-Datei hierher ziehen oder klicken zum Auswählen
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Unterstützt LeadPilot-Dashboard-Exporte bis zu 128 KiB
            </p>
            <input
              ref={fileInputRef}
              data-testid="import-file-input"
              type="file"
              accept=".json,application/json"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </button>
        ) : (
          <div className="space-y-4">
            {/* Gewählte Datei */}
            <div className="flex items-center justify-between rounded border border-[var(--color-border,#1b3d39)] bg-black/20 p-2.5 text-xs">
              <div className="flex items-center gap-2 text-white">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-medium truncate max-w-[280px]">{file.name}</span>
              </div>
              <button
                type="button"
                data-testid="change-file-button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-primary hover:underline ml-2"
              >
                Andere Datei wählen
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            {/* Fehler beim Parsen / Prüfung */}
            {!parseResult.ok ? (
              <div
                data-testid="import-error-banner"
                className="flex items-start gap-2 rounded border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{parseResult.grund}</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Titel bearbeiten */}
                <div className="space-y-1">
                  <label htmlFor="import-title-input" className="text-xs font-medium text-white">
                    Dashboard-Titel
                  </label>
                  <input
                    id="import-title-input"
                    data-testid="import-title-input"
                    type="text"
                    maxLength={80}
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    className="w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-primary"
                  />
                </div>

                {/* Vorschau-Details */}
                <div
                  data-testid="import-preview-details"
                  className="rounded border border-[var(--color-border,#1b3d39)] bg-black/30 p-3 text-xs text-[var(--color-text-soft)] space-y-1"
                >
                  <div className="flex justify-between">
                    <span>Enthaltene Kacheln:</span>
                    <span className="font-semibold text-white">
                      {parseResult.config.tiles?.length ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Enthaltene Sektionen:</span>
                    <span className="font-semibold text-white">
                      {parseResult.config.sections?.length ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Standard-Zeitraum:</span>
                    <span className="font-semibold text-white">
                      {parseResult.config.globalTimeframe}
                    </span>
                  </div>
                </div>

                {/* Zielbereich wählen */}
                <div className="space-y-1">
                  <label htmlFor="import-target-select" className="text-xs font-medium text-white">
                    Zielbereich
                  </label>
                  <select
                    id="import-target-select"
                    data-testid="import-target-select"
                    value={
                      targetScope === 'team' && targetTeamId ? `team:${targetTeamId}` : 'personal'
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith('team:')) {
                        onTargetChange('team', val.slice(5));
                      } else {
                        onTargetChange('personal');
                      }
                    }}
                    className="w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-primary"
                  >
                    <option value="personal">Persönlich (nur für dich)</option>
                    {writableTeams.map((t) => (
                      <option key={t.id} value={`team:${t.id}`}>
                        Team: {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Globaler Fehlerhinweis (z. B. Obergrenze erreicht) */}
        {submitError && (
          <div
            data-testid="import-submit-error"
            className="flex items-center gap-2 rounded border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-300"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Aktionen Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border,#1b3d39)] pt-3">
          <Button
            type="button"
            data-testid="cancel-import-button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Abbrechen
          </Button>

          <Button
            type="button"
            data-testid="confirm-import-button"
            variant="primary"
            size="sm"
            disabled={!isFormValid || isSubmitting}
            onClick={onConfirmImport}
            className="gap-1.5 text-xs font-semibold"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{isSubmitting ? 'Importieren…' : 'Importieren'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
