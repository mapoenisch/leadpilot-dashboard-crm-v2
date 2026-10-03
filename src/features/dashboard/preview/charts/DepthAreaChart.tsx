// Designprobe Dashboard-Testkachel (Teilauftrag 0): Fläche = Linie mit ruhigem Verlauf.
import { DepthLineChart } from './DepthLineChart';
import type { DepthChartProps } from './chartTypes';

export function DepthAreaChart(props: DepthChartProps) {
  return <DepthLineChart {...props} filled />;
}
