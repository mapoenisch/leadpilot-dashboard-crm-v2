// Executive Dashboard, Teilauftrag 7 (Auftrag 077): Kombination auf der Detailseite. Formel, beide
// Operanden mit Zeitbasis und das Ergebnis stammen aus derselben Datenauflösung wie die Kachel
// (`data.combination`), es wird nichts neu berechnet.
import type { ResolvedTileData } from '../../data/dashboardData';
import { formatTileValue } from '../tileFormat';
import { DETAIL_SECTION_TITLE, DETAIL_TABLE } from './detailStyles';

export function CombinationDetails({ data, title }: { data: ResolvedTileData; title: string }) {
  const combination = data.combination;
  if (!combination) return null;
  const result =
    data.state === 'bereit' ? formatTileValue(data.value, data.unit, 'exakt') : 'Nicht berechenbar';
  return (
    <section aria-labelledby="detail-combination" data-testid="detail-combination">
      <h3 id="detail-combination" className={DETAIL_SECTION_TITLE}>
        Berechnung
      </h3>
      <p className="m-0 mt-[6px] text-[14px] text-[var(--color-text-soft,#e6f3f1)] [overflow-wrap:anywhere]">
        Formel: {combination.formula}
      </p>
      <table className={DETAIL_TABLE} data-testid="detail-operands">
        <caption className="sr-only">Bestandteile der Berechnung von {title}</caption>
        <thead>
          <tr className="border-0 border-b border-solid border-border">
            <th scope="col" className="py-[8px] text-left font-semibold">
              Bestandteil
            </th>
            <th scope="col" className="py-[8px] text-left font-semibold">
              Zeitbasis
            </th>
            <th scope="col" className="py-[8px] text-right font-semibold">
              Wert
            </th>
          </tr>
        </thead>
        <tbody>
          {combination.operands.map((operand) => (
            <tr
              key={operand.label}
              className="border-0 border-b border-solid border-[var(--color-border-glass,rgba(0,217,198,0.08))]"
            >
              <th
                scope="row"
                className="py-[8px] text-left font-normal text-[var(--color-text-soft,#e6f3f1)] [overflow-wrap:anywhere]"
              >
                {operand.label}
              </th>
              <td className="py-[8px] pr-[8px] [overflow-wrap:anywhere]">{operand.timeBasis}</td>
              <td className="whitespace-nowrap py-[8px] text-right font-mono text-primary">
                {formatTileValue(operand.value, operand.unit, 'exakt')}
              </td>
            </tr>
          ))}
          <tr>
            <th scope="row" className="py-[8px] text-left font-semibold">
              Ergebnis
            </th>
            <td className="py-[8px] pr-[8px]">{data.timeBasis}</td>
            <td
              className="whitespace-nowrap py-[8px] text-right font-mono font-semibold text-primary"
              data-testid="detail-combination-result"
            >
              {result}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
