import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  LineChart,
  BarChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { MANAGEMENT_CHART_THEME, formatManagementMetric } from './managementChartTheme';
import { ManagementChartTooltip } from './ManagementChartTooltip';
import { ManagementChartState } from './ManagementChartState';

export interface ManagementChartSeries {
  key: string;
  name: string;
  type?: 'area' | 'line' | 'bar';
  color?: string;
  unit?: string;
  isNegativeAlert?: boolean;
}

export interface ManagementChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  series: ManagementChartSeries[];
  type?: 'area' | 'line' | 'bar';
  height?: number;
  sourceLabel?: string;
  yAxisFormatter?: (val: number) => string;
  tooltipValueFormatter?: (val: number) => string;
  emptyMessage?: string;
  showLegend?: boolean;
}

export const ManagementChart: React.FC<ManagementChartProps> = ({
  data,
  xKey,
  series,
  type = 'area',
  height = 240,
  sourceLabel = 'Ebene A Baseline',
  yAxisFormatter = (val) => formatManagementMetric(val),
  tooltipValueFormatter,
  emptyMessage,
  showLegend = false,
}) => {
  // Ehrlicher Empty State bei fehlenden oder unvollständigen Daten
  if (!data || data.length === 0 || !series || series.length === 0) {
    return (
      <ManagementChartState
        type="empty"
        message={emptyMessage}
        sourceLabel={sourceLabel}
        height={height}
      />
    );
  }

  // Gradient IDs für Areas
  const cyanGradId = 'mgmtCyanAreaGrad';
  const orangeGradId = 'mgmtOrangeAreaGrad';

  const renderChart = () => {
    // 1. BAR CHART
    if (type === 'bar') {
      return (
        <BarChart data={data} margin={{ top: 12, right: 12, left: -14, bottom: 4 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={MANAGEMENT_CHART_THEME.colors.grid}
          />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={{ stroke: MANAGEMENT_CHART_THEME.colors.gridStrong }}
            tick={{
              fill: MANAGEMENT_CHART_THEME.colors.neutral,
              fontSize: MANAGEMENT_CHART_THEME.typography.fontSizeSm,
              fontFamily: MANAGEMENT_CHART_THEME.typography.fontFamily,
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={yAxisFormatter}
            tick={{
              fill: MANAGEMENT_CHART_THEME.colors.neutral,
              fontSize: MANAGEMENT_CHART_THEME.typography.fontSizeXs,
              fontFamily: MANAGEMENT_CHART_THEME.typography.fontFamily,
            }}
          />
          <Tooltip
            content={
              <ManagementChartTooltip
                sourceLabel={sourceLabel}
                valueFormatter={tooltipValueFormatter}
              />
            }
          />
          {showLegend && (
            <Legend
              wrapperStyle={{
                paddingTop: '8px',
                fontSize: '11px',
                fontFamily: MANAGEMENT_CHART_THEME.typography.fontFamily,
              }}
            />
          )}
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={
                s.color ||
                (s.isNegativeAlert
                  ? MANAGEMENT_CHART_THEME.colors.warning
                  : MANAGEMENT_CHART_THEME.colors.primary)
              }
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      );
    }

    // 2. LINE CHART
    if (type === 'line') {
      return (
        <LineChart data={data} margin={{ top: 12, right: 12, left: -14, bottom: 4 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={MANAGEMENT_CHART_THEME.colors.grid}
          />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={{ stroke: MANAGEMENT_CHART_THEME.colors.gridStrong }}
            tick={{
              fill: MANAGEMENT_CHART_THEME.colors.neutral,
              fontSize: MANAGEMENT_CHART_THEME.typography.fontSizeSm,
              fontFamily: MANAGEMENT_CHART_THEME.typography.fontFamily,
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={yAxisFormatter}
            tick={{
              fill: MANAGEMENT_CHART_THEME.colors.neutral,
              fontSize: MANAGEMENT_CHART_THEME.typography.fontSizeXs,
              fontFamily: MANAGEMENT_CHART_THEME.typography.fontFamily,
            }}
          />
          <Tooltip
            content={
              <ManagementChartTooltip
                sourceLabel={sourceLabel}
                valueFormatter={tooltipValueFormatter}
              />
            }
          />
          {showLegend && (
            <Legend
              wrapperStyle={{
                paddingTop: '8px',
                fontSize: '11px',
                fontFamily: MANAGEMENT_CHART_THEME.typography.fontFamily,
              }}
            />
          )}
          {series.map((s) => (
            <Line
              key={s.key}
              type="linear" // Strikte lineare Verbindung, keine künstliche Glättung
              dataKey={s.key}
              name={s.name}
              stroke={
                s.color ||
                (s.isNegativeAlert
                  ? MANAGEMENT_CHART_THEME.colors.warning
                  : MANAGEMENT_CHART_THEME.colors.primary)
              }
              strokeWidth={2}
              dot={{ r: 3, fill: s.color || MANAGEMENT_CHART_THEME.colors.primary, strokeWidth: 0 }}
              activeDot={{
                r: 5,
                fill: '#FFFFFF',
                stroke: s.color || MANAGEMENT_CHART_THEME.colors.primary,
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      );
    }

    // 3. AREA CHART (Default: Tiefenwirkung mit Lichtkante)
    return (
      <AreaChart data={data} margin={{ top: 12, right: 12, left: -14, bottom: 4 }}>
        <defs>
          <linearGradient id={cyanGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00D9C6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00D9C6" stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id={orangeGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FF7A3D" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#FF7A3D" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke={MANAGEMENT_CHART_THEME.colors.grid}
        />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={{ stroke: MANAGEMENT_CHART_THEME.colors.gridStrong }}
          tick={{
            fill: MANAGEMENT_CHART_THEME.colors.neutral,
            fontSize: MANAGEMENT_CHART_THEME.typography.fontSizeSm,
            fontFamily: MANAGEMENT_CHART_THEME.typography.fontFamily,
          }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={yAxisFormatter}
          tick={{
            fill: MANAGEMENT_CHART_THEME.colors.neutral,
            fontSize: MANAGEMENT_CHART_THEME.typography.fontSizeXs,
            fontFamily: MANAGEMENT_CHART_THEME.typography.fontFamily,
          }}
        />
        <Tooltip
          content={
            <ManagementChartTooltip
              sourceLabel={sourceLabel}
              valueFormatter={tooltipValueFormatter}
            />
          }
        />
        {showLegend && (
          <Legend
            wrapperStyle={{
              paddingTop: '8px',
              fontSize: '11px',
              fontFamily: MANAGEMENT_CHART_THEME.typography.fontFamily,
            }}
          />
        )}
        {series.map((s) => {
          const color =
            s.color ||
            (s.isNegativeAlert
              ? MANAGEMENT_CHART_THEME.colors.warning
              : MANAGEMENT_CHART_THEME.colors.primary);
          const grad = s.isNegativeAlert ? `url(#${orangeGradId})` : `url(#${cyanGradId})`;
          return (
            <Area
              key={s.key}
              type="linear" // Strikte lineare Verbindung, keine Glättung
              dataKey={s.key}
              name={s.name}
              stroke={color}
              strokeWidth={2}
              fill={grad}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#FFFFFF', stroke: color, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          );
        })}
      </AreaChart>
    );
  };

  return (
    <div
      data-testid="management-chart-container"
      className="relative w-full"
      // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (height-Prop des Aufrufers)
      style={{ height: `${height}px` }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};
