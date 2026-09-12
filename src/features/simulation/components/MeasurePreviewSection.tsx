import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Alert } from '../../../components/ui/Alert';
import { Table, Column } from '../../../components/ui/Table';
import { MeasureConflict, MeasureKpiDelta } from '../../../types/measure';

interface MeasurePreviewSectionProps {
  isPreviewing: boolean;
  draftMeasuresCount: number;
  onSimulatePreview: () => void;
  previewError: string | null;
  previewConflicts: MeasureConflict[];
  previewDeltas: MeasureKpiDelta[] | null;
}

const previewColumns: Column<MeasureKpiDelta>[] = [
  {
    key: 'kpiId',
    label: 'KPI (Kennzahl)',
    render: (row) => <strong>{row.label}</strong>,
  },
  {
    key: 'baseValue',
    label: 'Ohne Maßnahmen',
    render: (row) => (
      <span className="font-mono">
        {row.baseValue.toLocaleString('de-DE')} {row.unit}
      </span>
    ),
  },
  {
    key: 'withMeasuresValue',
    label: 'Mit Maßnahmen',
    render: (row) => (
      <span className="font-mono font-semibold text-primary">
        {row.withMeasuresValue.toLocaleString('de-DE')} {row.unit}
      </span>
    ),
  },
  {
    key: 'delta',
    label: 'Delta (Wirkung)',
    render: (row) => {
      const isPos = row.delta >= 0;
      const sign = row.delta > 0 ? '+' : '';
      return (
        <div className="flex items-center gap-[6px]">
          <Badge variant={isPos ? 'cyan' : 'orange'}>
            {sign}
            {row.delta.toLocaleString('de-DE')} {row.unit}
          </Badge>
          <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
            ({sign}
            {row.deltaPercent}%)
          </span>
        </div>
      );
    },
  },
];

export const MeasurePreviewSection: React.FC<MeasurePreviewSectionProps> = ({
  isPreviewing,
  draftMeasuresCount,
  onSimulatePreview,
  previewError,
  previewConflicts,
  previewDeltas,
}) => {
  return (
    <Card padding="var(--space-3)">
      <div className="text-[12px] font-semibold uppercase mb-[8px] text-primary">
        5. Side-Effect-Freie Wirkungsvorschau
      </div>
      <div className="flex gap-[var(--space-3)] items-center flex-wrap">
        <Button
          type="button"
          variant="primary"
          onClick={onSimulatePreview}
          disabled={isPreviewing || draftMeasuresCount === 0}
          size="sm"
        >
          {isPreviewing ? 'Simuliere Wirkungsvorschau...' : '⚡ Wirkungsvorschau simulieren'}
        </Button>
        <span className="text-[12px] text-[var(--color-text-muted)]">
          (Führt 2 identische Seed-Läufe aus, vergleicht KPI-Deltas, speichert 0 Runs/Versionen)
        </span>
      </div>

      {previewError && (
        <div className="mt-[var(--space-3)]">
          <Alert variant="error" title="Fehler bei Wirkungsvorschau">
            {previewError}
          </Alert>
        </div>
      )}

      {previewConflicts.length > 0 && (
        <div className="mt-[var(--space-3)]">
          <Alert variant="warning" title="Konfliktwarnungen erkannt">
            <ul className="m-0 pl-[var(--space-4)]">
              {previewConflicts.map((conf, idx) => (
                <li key={idx} className="text-[12px]">
                  {conf.message}
                </li>
              ))}
            </ul>
          </Alert>
        </div>
      )}

      {previewDeltas && (
        <div data-testid="measure-preview-delta-table" className="mt-[var(--space-3)]">
          <Table columns={previewColumns} rows={previewDeltas} minWidth="550px" />
        </div>
      )}
    </Card>
  );
};
