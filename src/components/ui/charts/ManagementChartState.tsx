import React from 'react';
import { AlertTriangle, Database } from 'lucide-react';
import { MANAGEMENT_CHART_THEME } from './managementChartTheme';

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
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: `${height}px`,
        width: '100%',
        padding: '24px',
        boxSizing: 'border-box',
        background: 'rgba(5, 20, 19, 0.4)',
        border: '1px dashed rgba(0, 217, 198, 0.15)',
        borderRadius: '6px',
        color: MANAGEMENT_CHART_THEME.colors.neutral,
        textAlign: 'center',
        fontFamily: MANAGEMENT_CHART_THEME.typography.fontFamily,
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isError ? 'rgba(255, 122, 61, 0.12)' : 'rgba(0, 217, 198, 0.08)',
          color: isError
            ? MANAGEMENT_CHART_THEME.colors.warning
            : MANAGEMENT_CHART_THEME.colors.primary,
          marginBottom: '10px',
        }}
      >
        {isError ? <AlertTriangle size={18} /> : <Database size={18} />}
      </div>

      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: isError ? '#FFD4C2' : '#E2E8F0',
          marginBottom: '4px',
        }}
      >
        {message || defaultMessage}
      </div>

      <div style={{ fontSize: '11px', color: 'rgba(143, 163, 161, 0.8)' }}>
        Ehrlicher Systemzustand ({sourceLabel}) — keine synthetischen Ersatzwerte
      </div>
    </div>
  );
};
