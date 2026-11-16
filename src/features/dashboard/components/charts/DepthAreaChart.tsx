import { DepthLineChart } from './DepthLineChart';
import type { DepthLineChartProps } from './DepthLineChart';

export function DepthAreaChart(props: DepthLineChartProps) {
  return <DepthLineChart {...props} filled />;
}
