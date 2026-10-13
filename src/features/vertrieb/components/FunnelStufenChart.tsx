import { AlertTriangle } from 'lucide-react';
import { formatAnzahl, formatQuote } from '@/domain/funnelQuote';
import { cn } from '@/lib/utils';

// Auftrag 093 (Paket G1): Trichter wie im Original-WebP (01-sales-funnel-2025) – Stufe mit
// „Stufe n“, Verlaufsbalken mit Wert, Conversion-Chip zwischen den Stufen, Hebelstufe orange
// mit orange umrandetem Hinweis. Balken als 3D-Quader in derselben Bauform wie GroupedDepthColumns.
export interface FunnelStufe {
  name: string;
  count: number;
  /** Einheit je Stufe (Auftrag 085: Leads, MQL, SQL, Angebote, Neukunden). */
  einheit: string;
  /** Hervorgehobene Stufe mit Hinweis (orange Balken + orange umrandeter Chip). */
  hebel?: string;
}

export function FunnelStufenChart({ stufen }: { stufen: FunnelStufe[] }) {
  if (stufen.length === 0) return null;
  const max = Math.max(...stufen.map((s) => s.count), 1);
  return (
    <ol className="m-0 flex list-none flex-col gap-1 p-0" data-testid="funnel-stufen-chart">
      {stufen.map((stufe, index) => {
        const naechste = stufen[index + 1];
        const letzte = index === stufen.length - 1;
        // Breite exakt proportional zum Wert (keine Mindestbreite, die Stufen gleich lang wirken
        // ließe). Passt der Wert nicht in den Balken, steht er direkt rechts daneben.
        const breite = Math.max(0, (stufe.count / max) * 100);
        const innen = breite >= 22;
        const wert = (
          <span
            className={cn(
              'whitespace-nowrap text-[12.5px] font-bold',
              innen
                ? 'text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]'
                : 'text-[var(--color-text-primary)]',
            )}
          >
            {formatAnzahl(stufe.count)} {stufe.einheit}
          </span>
        );
        return (
          <li key={stufe.name} className="flex flex-col gap-1">
            <div className="grid grid-cols-1 items-center gap-x-3 gap-y-1 sm:grid-cols-[120px_minmax(0,1fr)]">
              <div className="flex min-w-0 flex-col text-[12px] leading-tight">
                <strong className="break-words text-[var(--color-text-primary)]">
                  {stufe.name}
                </strong>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  Stufe {index + 1}
                </span>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                <div
                  data-leer={breite === 0 ? 'true' : undefined}
                  className={cn(
                    'funnel-stufe box-border flex h-[22px] shrink-0 items-center',
                    innen ? 'px-3' : 'px-0',
                    stufe.hebel
                      ? 'funnel-stufe--hebel'
                      : letzte
                        ? 'funnel-stufe--ziel'
                        : 'funnel-stufe--normal',
                  )}
                  // Stufenbreite aus den Funnel-Daten; per ref gesetzt statt style-Prop (Qualitätsbudget).
                  ref={(el) => el?.style.setProperty('width', `${breite.toFixed(2)}%`)}
                >
                  {innen ? wert : null}
                </div>
                {innen ? null : wert}
                {stufe.hebel ? (
                  <span className="funnel-hebel inline-flex items-center gap-1.5 rounded-full border border-solid px-2.5 py-0.5 text-[11.5px] font-semibold">
                    <AlertTriangle size={12} aria-hidden="true" />
                    {stufe.hebel}
                  </span>
                ) : null}
              </div>
            </div>
            {naechste ? (
              <div className="flex items-center gap-2 sm:pl-[132px]">
                <span className="text-[10px] text-primary opacity-70" aria-hidden="true">
                  •
                </span>
                <span className="rounded-[4px] border border-solid border-border-soft bg-background-deep px-1.5 py-px text-[11px] text-[var(--color-text-muted)]">
                  Conversion:{' '}
                  <strong className="funnel-quote">
                    {formatQuote(naechste.count, stufe.count)}
                  </strong>
                </span>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
