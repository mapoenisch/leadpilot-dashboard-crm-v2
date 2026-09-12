import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { SimulationEvent } from '../../../types/simulation';

export interface TopDriverItem {
  title: string;
  impact: string;
  description: string;
  badgeVariant: 'cyan' | 'mint' | 'orange' | 'neutral';
}

interface KpiTimeSeriesDriversSectionProps {
  topDrivers: TopDriverItem[];
  filteredEvents: SimulationEvent[];
}

export const KpiTimeSeriesDriversSection: React.FC<KpiTimeSeriesDriversSectionProps> = ({
  topDrivers,
  filteredEvents,
}) => {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-[var(--space-5)]">
      {/* Top 3 Drivers */}
      <Card padding="var(--space-5)">
        <h4 className="m-0 mb-[var(--space-4)] text-[15px] text-text">
          Top-3 Einfluss- & Wachstumstreiber (Entscheidungen 1295–1297)
        </h4>
        <div className="flex flex-col gap-[var(--space-3)]">
          {topDrivers.map((d, i) => (
            <div
              key={i}
              className="rounded border border-solid border-border-soft bg-background-deep p-[12px]"
            >
              <div className="flex justify-between items-center mb-[4px]">
                <span className="text-[13px] font-semibold text-text">
                  #{i + 1} {d.title}
                </span>
                <Badge variant={d.badgeVariant}>{d.impact}</Badge>
              </div>
              <p className="m-0 text-[12px] text-[var(--color-text-muted)]">
                {d.description}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Event Drilldown */}
      <Card padding="var(--space-5)">
        <h4 className="m-0 mb-[var(--space-4)] text-[15px] text-text">
          Relevante Simulations-Ereignisse (Drill-Down, Entscheidung 1298)
        </h4>
        {filteredEvents.length > 0 ? (
          <div className="flex flex-col gap-[8px] max-h-[250px] overflow-y-auto">
            {filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className={`rounded bg-background-deep border-0 border-l-[3px] border-solid text-[12px] px-[10px] py-[8px] ${evt.type === 'DEAL_WON' ? 'border-l-success' : 'border-l-primary'}`}
              >
                <div className="flex justify-between font-semibold">
                  <span>{evt.title}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">Tick #{evt.tick}</span>
                </div>
                <div className="text-[11px] mt-[2px] text-[var(--color-text-muted)]">
                  {evt.details}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[12.5px] py-[16px] px-0 text-[var(--color-text-muted)]">
            Keine relevanten Ereignisse für diese Kennzahl im aktuellen Verlauf protokolliert.
          </div>
        )}
      </Card>
    </div>
  );
};
