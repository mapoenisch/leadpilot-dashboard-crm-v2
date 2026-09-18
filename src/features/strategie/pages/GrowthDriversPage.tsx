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
  const effektBetrag = (index: number): string =>
    `${(CHART_TREIBER.datasets[0]?.data[index] ?? 0).toLocaleString('de-DE')} Euro`;
  const treiberSummary =
    `Der größte Effekt kommt aus ${CHART_TREIBER.labels[0]} mit ${effektBetrag(0)}, ` +
    `gefolgt von ${CHART_TREIBER.labels[1]} mit ${effektBetrag(1)} und ` +
    `${CHART_TREIBER.labels[2]} mit ${effektBetrag(2)}.`;
  return (
    <div>
      <h1>Wachstumstreiber</h1>
      <p>
        {TREIBER.title}: Die {TREIBER.drivers.length} Hebel für das ARR-Wachstum ab 2026.
      </p>
      <DataState status={TREIBER.drivers.length > 0 ? 'ready' : 'empty'} emptyText="Keine Wachstumstreiber erfasst.">
        <ul>
          {TREIBER.drivers.map((driver) => (
            <li key={driver}>{driver}</li>
          ))}
        </ul>
        <AccessibleChartSummary
          title={CHART_TREIBER.datasets[0]?.label ?? 'ARR-Wachstumseffekt'}
          summary={treiberSummary}
        >
          <ChartBarList items={effekte} />
        </AccessibleChartSummary>
      </DataState>
    </div>
  );
}
