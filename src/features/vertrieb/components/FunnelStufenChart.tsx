import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { formatAnzahl, formatQuote } from '@/domain/funnelQuote';
import { cn } from '@/lib/utils';
import { FunnelSourceMode } from '../services/funnelAnalyticsService';

// Auftrag 093 / Auftrag 131: Trichter wie im Original-WebP mit voller Unterstützung
// für Plan 2025, Live-Pipeline und parallele Vergleichsansicht mit Delta-Pills.
export interface FunnelStufe {
  name: string;
  count: number;
  /** Einheit je Stufe (Leads, MQL, SQL, Angebote, Neukunden). */
  einheit: string;
  /** Hervorgehobene Stufe mit Hinweis (orange Balken + orange umrandeter Chip). */
  hebel?: string;
  /** Plan-Wert im Vergleichsmodus */
  planCount?: number;
  /** Live-Wert im Vergleichsmodus */
  liveCount?: number;
  /** Delta-Quote in Prozentpunkten (z. B. +4.2 oder -3.1) */
  deltaQuote?: number | null;
  /** Pipeline-Volumen in Euro */
  amountEuro?: number;
  /** Benutzerdefinierter Conversion-Text */
  conversionText?: string;
}

export interface FunnelStufenChartProps {
  stufen: FunnelStufe[];
  mode?: FunnelSourceMode;
}

export function FunnelStufenChart({ stufen, mode = 'plan' }: FunnelStufenChartProps) {
  if (stufen.length === 0) return null;
  const max = Math.max(...stufen.map((s) => s.count), 1);

  return (
    <ol
      className="m-0 flex list-none flex-col gap-1.5 p-0"
      data-testid="funnel-stufen-chart"
      data-funnel-mode={mode}
    >
      {stufen.map((stufe, index) => {
        const naechste = stufen[index + 1];
        const letzte = index === stufen.length - 1;
        // Breite exakt proportional zum Wert (keine künstliche Mindestbreite).
        const breite = Math.max(0, (stufe.count / max) * 100);
        const innen = breite >= 22;

        const deltaQuote = stufe.deltaQuote;
        const hasDelta = typeof deltaQuote === 'number';
        const isPositive = hasDelta && deltaQuote > 0;
        const isNegative = hasDelta && deltaQuote < 0;

        const renderWert = () => {
          if (
            mode === 'vergleich' &&
            typeof stufe.planCount === 'number' &&
            typeof stufe.liveCount === 'number'
          ) {
            return (
              <div
                className={cn(
                  'flex flex-wrap items-center gap-1.5 text-[12px] font-bold leading-tight',
                  innen
                    ? 'text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]'
                    : 'text-[var(--color-text-primary)]',
                )}
              >
                <span>
                  Ist: {formatAnzahl(stufe.liveCount)} {stufe.einheit}
                </span>
                <span className="opacity-75 text-[11px] font-normal">
                  (Plan: {formatAnzahl(stufe.planCount)})
                </span>
              </div>
            );
          }

          return (
            <span
              className={cn(
                'whitespace-nowrap text-[12.5px] font-bold',
                innen
                  ? 'text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]'
                  : 'text-[var(--color-text-primary)]',
              )}
            >
              {formatAnzahl(stufe.count)} {stufe.einheit}
              {mode === 'live' && stufe.amountEuro && stufe.amountEuro > 0 ? (
                <span className="ml-1.5 text-[11px] font-semibold opacity-90">
                  ({stufe.amountEuro.toLocaleString('de-DE')} €)
                </span>
              ) : null}
            </span>
          );
        };

        return (
          <li key={stufe.name} className="flex flex-col gap-1">
            <div className="grid grid-cols-1 items-center gap-x-3 gap-y-1 sm:grid-cols-[130px_minmax(0,1fr)]">
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
                    'funnel-stufe box-border flex h-[24px] shrink-0 items-center transition-all duration-300',
                    innen ? 'px-3' : 'px-0',
                    stufe.hebel
                      ? 'funnel-stufe--hebel'
                      : letzte
                        ? 'funnel-stufe--ziel'
                        : 'funnel-stufe--normal',
                    mode === 'live' && 'border-l-2 border-emerald-400',
                  )}
                  ref={(el) => el?.style.setProperty('width', `${breite.toFixed(2)}%`)}
                >
                  {innen ? renderWert() : null}
                </div>
                {innen ? null : renderWert()}
                {stufe.hebel ? (
                  <span className="funnel-hebel inline-flex items-center gap-1.5 rounded-full border border-solid px-2.5 py-0.5 text-[11.5px] font-semibold">
                    <AlertTriangle size={12} aria-hidden="true" />
                    {stufe.hebel}
                  </span>
                ) : null}
              </div>
            </div>

            {naechste ? (
              <div className="flex flex-wrap items-center gap-2 sm:pl-[142px]">
                <span className="text-[10px] text-primary opacity-70" aria-hidden="true">
                  •
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-[4px] border border-solid border-border-soft bg-background-deep px-2 py-0.5 text-[11px] text-[var(--color-text-muted)]">
                  <span>Conversion: </span>
                  <strong className="funnel-quote text-text">
                    {stufe.conversionText ?? formatQuote(naechste.count, stufe.count)}
                  </strong>
                </span>

                {mode === 'vergleich' && hasDelta && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[10.5px] font-bold',
                      isPositive &&
                        'border border-emerald-500/30 bg-emerald-500/15 text-emerald-400',
                      isNegative && 'border border-[#FF7A3D]/30 bg-[#FF7A3D]/15 text-[#FF7A3D]',
                      !isPositive &&
                        !isNegative &&
                        'border border-border-subtle bg-surface-elevated text-text-muted',
                    )}
                  >
                    {isPositive ? (
                      <TrendingUp size={11} aria-hidden="true" />
                    ) : isNegative ? (
                      <TrendingDown size={11} aria-hidden="true" />
                    ) : null}
                    {isPositive ? '+' : ''}
                    {deltaQuote.toLocaleString('de-DE', { minimumFractionDigits: 1 })} %
                  </span>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
