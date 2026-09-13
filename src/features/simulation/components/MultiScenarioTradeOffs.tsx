import React from 'react';
import { Card } from '../../../components/ui/Card';
import { StatusChip } from '../../../components/ui/StatusChip';
import { TradeOffDimension, MultiVersionComparisonResult } from '../../../types/scenario';

interface MultiScenarioTradeOffsProps {
  tradeOffs: MultiVersionComparisonResult['tradeOffs'];
  parameterMatrix: MultiVersionComparisonResult['parameterMatrix'];
  versions: MultiVersionComparisonResult['versions'];
  effectiveRefId: string;
}

const getDimensionIcon = (dim: TradeOffDimension) => {
  switch (dim) {
    case 'GROWTH':
      return '🚀';
    case 'PROFITABILITY':
      return '💰';
    case 'LIQUIDITY':
      return '💧';
    case 'ACQUISITION':
      return '🎯';
    case 'RETENTION':
      return '🛡️';
  }
};

export const MultiScenarioTradeOffs: React.FC<MultiScenarioTradeOffsProps> = ({
  tradeOffs,
  parameterMatrix,
  versions,
  effectiveRefId,
}) => {
  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="flex justify-between items-center flex-wrap gap-[8px]">
        <h4 className="m-0 text-[15px] font-bold text-text">
          ZONE 3: Begründung, Trade-Off-Profile & Treiber-Matrix
        </h4>
        <StatusChip variant="neutral" label="5 Dimensionen (Entscheidungen 864–868)" size="sm" />
      </div>

      {/* 5-Dimension Trade-Off Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[var(--space-3)]">
        {tradeOffs.map((tradeOff) => (
          <Card key={tradeOff.dimension} padding="var(--space-4)">
            <div className="flex flex-col gap-[var(--space-2)]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-[var(--space-2)]">
                  <span className="text-[1.2rem]">{getDimensionIcon(tradeOff.dimension)}</span>
                  <span className="font-bold">{tradeOff.label}</span>
                </div>
              </div>
              <p className="m-0 text-[var(--color-text-muted)]">{tradeOff.description}</p>

              <div className="rounded bg-background-deep mt-[var(--space-1)] px-[var(--space-3)] py-[var(--space-2)]">
                <div className="font-bold text-primary">{tradeOff.tradeOffSummary}</div>
              </div>

              <div className="flex flex-col gap-[var(--space-1)] mt-[var(--space-1)]">
                {versions.map((v) => {
                  const evalObj = tradeOff.evaluations[v.id];
                  if (!evalObj) return null;
                  return (
                    <div
                      key={v.id}
                      className="border-0 border-b border-solid border-border-soft flex justify-between items-center px-0 py-[3px]"
                    >
                      <span>
                        v{v.versionNumber} ({v.description || 'Version'}):
                      </span>
                      <span className={evalObj.isLeader ? 'font-bold text-success' : 'font-normal'}>
                        {evalObj.metricHighlight} {evalObj.isLeader && '⭐'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Parameter Matrix */}
      <div>
        <h5 className="text-[14px] font-semibold text-text mt-0 mb-[var(--space-2)] mr-0 ml-0">
          Treiber- und Parameter-Matrix (Vergleich zur Referenz)
        </h5>
        <Card padding="0">
          <div className="w-full overflow-x-auto [touch-action:pan-x_pan-y]">
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr className="border-0 border-b border-solid border-border bg-background-deep">
                  <th className="text-left whitespace-nowrap p-[var(--space-3)]">
                    Treiber / Parameter
                  </th>
                  <th className="text-left whitespace-nowrap p-[var(--space-3)]">Einheit</th>
                  {versions.map((v) => (
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
                {parameterMatrix.map((pRow) => {
                  const hasAnyChange = Object.values(pRow.hasChangedAgainstRef).some(Boolean);
                  return (
                    <tr
                      key={pRow.key}
                      className={`border-0 border-b border-solid border-border-soft ${hasAnyChange ? 'bg-warning-soft' : 'bg-transparent'}`}
                    >
                      <td
                        className={`whitespace-nowrap p-[var(--space-3)] ${hasAnyChange ? 'font-bold' : 'font-normal'}`}
                      >
                        {pRow.label} {hasAnyChange && '⚡'}
                      </td>
                      <td className="whitespace-nowrap p-[var(--space-3)]">{pRow.unit}</td>
                      {versions.map((v) => {
                        const isChanged = pRow.hasChangedAgainstRef[v.id];
                        return (
                          <td
                            key={v.id}
                            className={`text-right whitespace-nowrap p-[var(--space-3)] ${isChanged ? 'font-bold text-warning' : 'font-normal'} ${v.id === effectiveRefId ? 'bg-primary-soft' : 'bg-transparent'}`}
                          >
                            {pRow.formattedValuesByVersionId[v.id]}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
