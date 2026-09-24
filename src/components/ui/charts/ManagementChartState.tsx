import React from 'react';
import { AlertTriangle, Database } from 'lucide-react';

export interface ManagementChartStateProps {
  type: 'empty' | 'error' | 'loading';
  message?: string;
  sourceLabel?: string;
  height?: number;
}

export const ManagementChartState: React.FC<ManagementChartStateProps> = ({
  type,
  message,
  sourceLabel = 'Ebene A Baseline',
  height = 240,
}) => {
  const isError = type === 'error';
  const defaultMessage = isError
    ? 'Fehler beim Laden der Zeitreihendaten'
    : 'Keine validen Messdaten für diesen Zeitraum verfügbar';

  return (
    <div
      data-testid={`management-chart-${type}`}
      className="box-border flex w-full flex-col items-center justify-center rounded-[6px] border border-dashed border-[rgba(0,217,198,0.15)] bg-[rgba(5,20,19,0.4)] p-[24px] text-center font-[family-name:var(--font-sans,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif)] text-[#8FA3A1]"
      // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (height-Prop des Aufrufers)
      style={{ height: `${height}px` }}
    >
      <div
        className={
          isError
            ? 'mb-[10px] flex h-[36px] w-[36px] items-center justify-center rounded-[50%] bg-[rgba(255,122,61,0.12)] text-[#FF7A3D]'
            : 'mb-[10px] flex h-[36px] w-[36px] items-center justify-center rounded-[50%] bg-[rgba(0,217,198,0.08)] text-[#00D9C6]'
        }
      >
        {isError ? <AlertTriangle size={18} /> : <Database size={18} />}
      </div>

      <div
        className={`mb-[4px] text-[13px] font-semibold ${isError ? 'text-[#FFD4C2]' : 'text-[#E2E8F0]'}`}
      >
        {message || defaultMessage}
      </div>

      <div className="text-[11px] text-[rgba(143,163,161,0.8)]">
        Ehrlicher Systemzustand ({sourceLabel}) — keine synthetischen Ersatzwerte
      </div>
    </div>
  );
};
