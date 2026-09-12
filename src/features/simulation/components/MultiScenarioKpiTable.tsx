import React from 'react';
import { Card } from '../../../components/ui/Card';
import { MultiVersionComparisonResult } from '../../../types/scenario';

interface MultiScenarioKpiTableProps {
  comparisonResult: MultiVersionComparisonResult;
  effectiveRefId: string;
}

export const MultiScenarioKpiTable: React.FC<MultiScenarioKpiTableProps> = ({
  comparisonResult,
  effectiveRefId,
}) => {
  return (
    <div>
      <h5 className="text-[14px] font-semibold text-text mt-0 mb-[var(--space-2)] mr-0 ml-0">
        KPI-Ergebnismatrix (P50 Median & Deltas zur Referenz)
      </h5>
      <Card padding="0">
        <div className="w-full overflow-x-auto [touch-action:pan-x_pan-y]">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr className="border-0 border-b border-solid border-border bg-background-deep">
                <th className="text-left whitespace-nowrap p-[var(--space-3)]">Metrik (KPI)</th>
                <th className="text-right whitespace-nowrap p-[var(--space-3)]">Baseline 2026</th>
                {comparisonResult.versions.map((v) => (
                  <th
                    key={v.id}
                    className={`text-right whitespace-nowrap p-[var(--space-3)] ${v.id === effectiveRefId ? 'bg-primary-soft' : 'bg-transparent'}`}
                  >
                    v{v.versionNumber} {v.id === effectiveRefId && '(Ref)'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonResult.kpiMatrix.map((row) => (
                <tr key={row.kpiId} className="border-0 border-b border-solid border-border-soft">
                  <td className="font-bold whitespace-nowrap p-[var(--space-3)]">
                    {row.label} ({row.unit})
                  </td>
                  <td className="text-right whitespace-nowrap p-[var(--space-3)]">
                    {row.baselineValue.toLocaleString('de-DE')} {row.unit}
                  </td>
                  {comparisonResult.versions.map((v) => {
                    const kVal = row.valuesByVersionId[v.id];
                    const delta = row.deltasAgainstRef[v.id];
                    const pct = row.percentAgainstRef[v.id];
                    const isFav = row.isFavorableAgainstRef[v.id];
                    const isRef = v.id === effectiveRefId;

                    if (!kVal) {
                      return (
                        <td key={v.id} className="text-right p-[var(--space-3)] text-[var(--color-text-muted)]">
                          – (keine Runs)
                        </td>
                      );
                    }

                    return (
                      <td
                        key={v.id}
                        className={`text-right whitespace-nowrap p-[var(--space-3)] ${isRef ? 'bg-primary-soft' : 'bg-transparent'}`}
                      >
                        <div className={isRef ? 'font-bold' : 'font-normal'}>
                          {kVal.median.toLocaleString('de-DE')} {row.unit}
                        </div>
                        {!isRef && delta !== undefined && (
                          <div className={`${isFav ? 'text-success' : 'text-accent'}`}>
                            {delta >= 0 ? '+' : ''}
                            {delta.toLocaleString('de-DE')} {row.unit} ({pct && pct >= 0 ? '+' : ''}{pct}%)
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
