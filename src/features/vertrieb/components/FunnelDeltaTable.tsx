import { memo, useMemo } from 'react';
import { FUNNEL } from '@/domain/vertriebData';
import { formatAnzahl } from '@/domain/funnelQuote';
import { Chip, KitTable } from '@/components/pageKit';
import {
  FunnelAnalyticsResult,
  FunnelSourceMode,
  FunnelStageMetric,
} from '../services/funnelAnalyticsService';
import { cn } from '@/lib/utils';

export interface FunnelDeltaTableProps {
  mode: FunnelSourceMode;
  analytics: FunnelAnalyticsResult;
}

function renderDeltaPill(delta: number | null) {
  if (delta === null) return <span className="text-text-muted">—</span>;
  const isPositive = delta > 0;
  const isZero = delta === 0;
  const sign = isPositive ? '+' : '';
  const text = `${sign}${delta.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tracking-tight',
        isPositive && 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        !isPositive && !isZero && 'bg-[#FF7A3D]/15 text-[#FF7A3D] border border-[#FF7A3D]/30',
        isZero && 'bg-surface-elevated text-text-muted border border-border-subtle',
      )}
    >
      {text}
    </span>
  );
}

function renderDeltaCount(delta: number) {
  const isPositive = delta > 0;
  const sign = isPositive ? '+' : '';
  return (
    <span
      className={cn(
        'font-mono text-xs font-semibold',
        isPositive ? 'text-emerald-400' : delta < 0 ? 'text-[#FF7A3D]' : 'text-text-muted',
      )}
    >
      {sign}
      {formatAnzahl(delta)}
    </span>
  );
}

export const FunnelDeltaTable = memo(function FunnelDeltaTable({
  mode,
  analytics,
}: FunnelDeltaTableProps) {
  // 1. Modus: PLAN (Original-Faktenblatt-Ansicht)
  const planRows = useMemo(() => {
    return FUNNEL.rows.map((row) => ({
      stufe: row[0] ?? '',
      q1: row[1] ?? '',
      q2: row[2] ?? '',
      q3: row[3] ?? '',
      q4: row[4] ?? '',
      fy: <strong>{row[5] ?? ''}</strong>,
      schnitt: <Chip strong>{row[6] ?? ''}</Chip>,
      conversion: <Chip strong>{row[7] ?? ''}</Chip>,
    }));
  }, []);

  // 2. Modus: LIVE-PIPELINE (CRM Echtzeit)
  const liveRows = useMemo(() => {
    return analytics.stages.map((s: FunnelStageMetric) => {
      const liveQuoteStr =
        s.liveConversionQuote !== null
          ? `${s.liveConversionQuote.toLocaleString('de-DE', { minimumFractionDigits: 1 })} %`
          : '—';
      const euroStr = s.liveAmountEuro > 0 ? `${s.liveAmountEuro.toLocaleString('de-DE')} €` : '—';

      return {
        stufe: s.name,
        count: (
          <strong>
            {formatAnzahl(s.liveCount)} {s.einheit}
          </strong>
        ),
        wert: <span className="font-mono text-xs text-text">{euroStr}</span>,
        conversion: <Chip strong>{liveQuoteStr}</Chip>,
        hebel: s.hebel ? (
          <span className="text-[11px] font-semibold text-[#FF7A3D]">{s.hebel}</span>
        ) : (
          <span className="text-text-muted">—</span>
        ),
      };
    });
  }, [analytics.stages]);

  // 3. Modus: VERGLEICH (Plan vs. Live-Ist mit Deltas)
  const vergleichRows = useMemo(() => {
    return analytics.stages.map((s: FunnelStageMetric) => {
      const planQuoteStr =
        s.planConversionQuote !== null
          ? `${s.planConversionQuote.toLocaleString('de-DE', { minimumFractionDigits: 1 })} %`
          : '—';
      const liveQuoteStr =
        s.liveConversionQuote !== null
          ? `${s.liveConversionQuote.toLocaleString('de-DE', { minimumFractionDigits: 1 })} %`
          : '—';

      return {
        stufe: s.name,
        planCount: `${formatAnzahl(s.planCount)} ${s.einheit}`,
        liveCount: (
          <strong>
            {formatAnzahl(s.liveCount)} {s.einheit}
          </strong>
        ),
        deltaCount: renderDeltaCount(s.deltaCount),
        planConversion: <span className="text-text-muted">{planQuoteStr}</span>,
        liveConversion: <strong className="text-text">{liveQuoteStr}</strong>,
        deltaQuote: renderDeltaPill(s.deltaQuote),
      };
    });
  }, [analytics.stages]);

  if (mode === 'live') {
    return (
      <KitTable
        caption="Operative CRM-Pipeline: Durchlaufende Leads, Stufen-Conversion und Pipeline-Werte"
        leadColumn
        columns={[
          { key: 'stufe', label: 'Funnel-Stufe' },
          { key: 'count', label: 'CRM Bestand' },
          { key: 'wert', label: 'Pipeline-Volumen' },
          { key: 'conversion', label: 'Live-Conversion' },
          { key: 'hebel', label: 'Hebel & Fokus' },
        ]}
        rows={liveRows}
      />
    );
  }

  if (mode === 'vergleich') {
    return (
      <KitTable
        caption="Gegenüberstellung Vertriebs-Funnel: Plan FY 2025 vs. Operative CRM-Pipeline mit Deltas"
        leadColumn
        columns={[
          { key: 'stufe', label: 'Funnel-Stufe' },
          { key: 'planCount', label: 'Plan 2025' },
          { key: 'liveCount', label: 'Live Ist' },
          { key: 'deltaCount', label: 'Δ Einheiten' },
          { key: 'planConversion', label: 'Plan %' },
          { key: 'liveConversion', label: 'Live %' },
          { key: 'deltaQuote', label: 'Δ Quote' },
        ]}
        rows={vergleichRows}
      />
    );
  }

  // Fallback / Plan-Modus
  return (
    <KitTable
      caption="Trichterstufen je Quartal mit Jahreswert, Monatsschnitt und Conversion (Faktenblatt v1.2)"
      leadColumn
      columns={[
        { key: 'stufe', label: FUNNEL.headers[0] ?? 'Stufe' },
        { key: 'q1', label: FUNNEL.headers[1] ?? 'Q1' },
        { key: 'q2', label: FUNNEL.headers[2] ?? 'Q2' },
        { key: 'q3', label: FUNNEL.headers[3] ?? 'Q3' },
        { key: 'q4', label: FUNNEL.headers[4] ?? 'Q4' },
        { key: 'fy', label: FUNNEL.headers[5] ?? 'FY' },
        { key: 'schnitt', label: FUNNEL.headers[6] ?? 'Schnitt' },
        { key: 'conversion', label: FUNNEL.headers[7] ?? 'Conversion' },
      ]}
      rows={planRows}
    />
  );
});
