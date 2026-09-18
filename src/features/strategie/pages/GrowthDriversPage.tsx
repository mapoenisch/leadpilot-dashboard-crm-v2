import { TREIBER, CHART_TREIBER } from '@/domain/strategieData';
import { DataState } from '@/components/ui/DataState';
import { AccessibleChartSummary, ChartBarList } from '@/components/ui/AccessibleChartSummary';

// 067I / G52: Echte Wachstumstreiber-Seite statt WebP — genau eine h1,
// Hebel als Liste, ARR-Wachstumseffekte mit Summary.
export function GrowthDriversPage() {
  const effekte = CHART_TREIBER.labels.map((label, index) => ({
    label,
    value: CHART_TREIBER.datasets[0]?.data[index] ?? 0,
    display: `${(CHART_TREIBER.datasets[0]?.data[index] ?? 0).toLocaleString('de-DE')} €`,
  }));
  return (
    <div>
      <h1>Wachstumstreiber</h1>
      <p>{TREIBER.title}: Die fünf Hebel für das ARR-Wachstum ab 2026.</p>
      <DataState status={TREIBER.drivers.length > 0 ? 'ready' : 'empty'} emptyText="Keine Wachstumstreiber erfasst.">
        <ul>
          {TREIBER.drivers.map((driver) => (
            <li key={driver}>{driver}</li>
          ))}
        </ul>
        <AccessibleChartSummary
          title={CHART_TREIBER.datasets[0]?.label ?? 'ARR-Wachstumseffekt'}
          summary="Der größte Effekt kommt aus Trial-to-Paid mit 72.000 Euro, gefolgt von Churn-Senkung mit 58.000 Euro und Partnerprogramm mit 34.000 Euro."
        >
          <ChartBarList items={effekte} />
        </AccessibleChartSummary>
      </DataState>
    </div>
  );
}
