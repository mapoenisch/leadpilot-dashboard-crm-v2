import { useContext, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { QueryClient, QueryClientProvider, QueryClientContext } from '@tanstack/react-query';
import { FUNNEL } from '@/domain/vertriebData';
import { DataState } from '@/components/ui/DataState';
import { Callout, ChartFigure, PageHero, Panel } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import { useUrlSyncedState } from '@/hooks/useUrlSyncedState';
import { useOrganization } from '@/auth/organizationContext';
import { useAllCrmEntitiesQuery } from '../services/funnelCrmDataService';
import { ImportedFunnelDeal, Contact } from '@/types/crm';
import { useQualifiedContactIds } from '@/features/crm/hooks/useLeadQualifications';
import { FunnelStufenChart } from '../components/FunnelStufenChart';
import { GroupedDepthColumns } from '../components/GroupedDepthColumns';
import { FunnelSourceToggle } from '../components/FunnelSourceToggle';
import { FunnelBottleneckAlert } from '../components/FunnelBottleneckAlert';
import { FunnelDeltaTable } from '../components/FunnelDeltaTable';
import {
  calculateFunnelAnalytics,
  FunnelSourceMode,
  PLAN_FUNNEL_COUNTS,
} from '../services/funnelAnalyticsService';

// Auftrag 067I / 068 / 093 / Auftrag 131: Vertriebs-Funnel mit Unterstützung für
// Plan 2025, operative Live-CRM Pipeline und Gegenüberstellung im Vergleichsmodus mit Deltas.
let fallbackClient: QueryClient | null = null;
function getFallbackClient(): QueryClient {
  if (!fallbackClient) {
    fallbackClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  }
  return fallbackClient;
}

function FunnelQueryBoundary({ children }: { children: React.ReactNode }) {
  const existingClient = useContext(QueryClientContext);

  if (existingClient) {
    return <>{children}</>;
  }

  return <QueryClientProvider client={getFallbackClient()}>{children}</QueryClientProvider>;
}

const zahl = (text: string | undefined): number =>
  Number((text ?? '0').replace(/\./g, '').replace(',', '.'));

const stufenEinheit = ['Leads', 'MQL', 'SQL', 'Angebote', 'Neukunden'];
const stufenName = ['Leads gesamt', 'MQL', 'SQL', 'Angebote', 'Neukunden (Won)'];
const HEBEL_STUFE = 2;
const QUELLE_PLAN = 'Faktenblatt v1.2 · Stand FY 2025 · fester Stand';
const QUARTAL_FARBEN = ['var(--funnel-silber)', '#00D9C6', '#62EDE2', '#FF7A3D'];

function FunnelPageHtml() {
  const { session } = useOrganization();
  const [datenQuelle, setDatenQuelle] = useUrlSyncedState('daten', 'plan');
  const mode = (
    datenQuelle === 'live' || datenQuelle === 'vergleich' ? datenQuelle : 'plan'
  ) as FunnelSourceMode;
  const isLiveOrVergleich = mode === 'live' || mode === 'vergleich';

  // Live-CRM Daten laden (Backend-konform mit pageSize <= 100 über alle Seiten paginiert)
  const {
    data: deals = [],
    isLoading: isDealsLoading,
    isError: isDealsError,
  } = useAllCrmEntitiesQuery<ImportedFunnelDeal>('deals', session?.organizationId, {
    enabled: isLiveOrVergleich,
  });

  const {
    data: contacts = [],
    isLoading: isContactsLoading,
    isError: isContactsError,
  } = useAllCrmEntitiesQuery<Contact>('contacts', session?.organizationId, {
    enabled: isLiveOrVergleich,
  });

  // Qualifizierte Kontakte kommen serverseitig aus lead_qualifications (RLS)
  const { data: qualifiedLeadIds } = useQualifiedContactIds(isLiveOrVergleich);

  // Funnel Analytics berechnen; die Phase kommt ausschließlich aus der Datenbank.
  const analytics = useMemo(() => {
    return calculateFunnelAnalytics({
      contacts,
      deals,
      qualifiedLeadIds,
      mode,
    });
  }, [contacts, deals, qualifiedLeadIds, mode]);

  // Trichterstufen für Chart je nach Modus konfigurieren
  const chartStufen = useMemo(() => {
    if (mode === 'live') {
      return analytics.stages.map((s, index) => {
        const next = analytics.stages[index + 1];
        return {
          name: s.name,
          count: s.liveCount,
          einheit: s.einheit,
          amountEuro: s.liveAmountEuro,
          hebel: index === HEBEL_STUFE ? 'Trial-Conversion Hebel' : undefined,
          conversionText:
            next && next.liveConversionQuote !== null
              ? `${next.liveConversionQuote.toLocaleString('de-DE', { minimumFractionDigits: 1 })} %`
              : undefined,
        };
      });
    }

    if (mode === 'vergleich') {
      return analytics.stages.map((s, index) => {
        const next = analytics.stages[index + 1];
        return {
          name: s.name,
          count: s.liveCount,
          einheit: s.einheit,
          planCount: s.planCount,
          liveCount: s.liveCount,
          deltaQuote: next ? next.deltaQuote : null,
          hebel: index === HEBEL_STUFE ? 'Trial-Conversion Hebel' : undefined,
          conversionText:
            next && next.liveConversionQuote !== null && next.planConversionQuote !== null
              ? `Live: ${next.liveConversionQuote.toLocaleString('de-DE', { minimumFractionDigits: 1 })} % (Plan: ${next.planConversionQuote.toLocaleString('de-DE', { minimumFractionDigits: 1 })} %)`
              : undefined,
        };
      });
    }

    // Plan-Modus (Original)
    const stufenRows = FUNNEL.rows.filter((row) => !row[0]?.startsWith('Testversionen'));
    return stufenRows.map((row, index) => ({
      name: stufenName[index] ?? row[0] ?? '',
      count: zahl(row[5]),
      einheit: stufenEinheit[index] ?? '',
      hebel: index === HEBEL_STUFE ? 'Trial-Conversion Hebel' : undefined,
    }));
  }, [mode, analytics.stages]);

  const leadsFy = FUNNEL.rows[0]?.[5] ?? '';
  const mqlFy = FUNNEL.rows[1]?.[5] ?? '';
  const sqlFy = FUNNEL.rows[2]?.[5] ?? '';
  const kundenFy = FUNNEL.rows[5]?.[5] ?? '';

  const summary = useMemo(() => {
    if (mode === 'live') {
      return `Operative Pipeline: ${analytics.totalLeadsLive} Leads, ${analytics.totalMqlLive} MQLs, ${analytics.totalSqlLive} SQLs und ${analytics.totalWonLive} gewonnene Neukunden.`;
    }
    if (mode === 'vergleich') {
      const deltaSign = (analytics.overallDeltaQuote ?? 0) >= 0 ? '+' : '';
      const deltaStr =
        analytics.overallDeltaQuote !== null
          ? ` (Δ ${deltaSign}${analytics.overallDeltaQuote.toLocaleString('de-DE', { minimumFractionDigits: 1 })} % Win-Rate)`
          : '';
      return `Vergleich Plan vs. Live: Plan ${PLAN_FUNNEL_COUNTS.neukunden} Neukunden (${analytics.overallQuotePlan} %) gegenüber Live ${analytics.totalWonLive} Neukunden (${analytics.overallQuoteLive} %)${deltaStr}.`;
    }
    return `Aus ${leadsFy} Leads werden ${mqlFy} MQLs und ${sqlFy} SQLs bis zu ${kundenFy} Neukunden im Geschäftsjahr.`;
  }, [mode, analytics, leadsFy, mqlFy, sqlFy, kundenFy]);

  const heroSubtitle = useMemo(() => {
    if (mode === 'live') {
      return (
        <>
          Operative Conversion-Raten und Engpässe der aktuellen CRM-Pipeline.
          <span className="funnel-quelle">Live CRM-Datenbank · Stand heute</span>
        </>
      );
    }
    if (mode === 'vergleich') {
      return (
        <>
          Parallele Gegenüberstellung: Plan 2025 vs. operative CRM-Pipeline mit Delta-Pills.
          <span className="funnel-quelle">Faktenblatt v1.2 vs. Live-CRM</span>
        </>
      );
    }
    return (
      <>
        Conversion-Raten über alle Trichterstufen.
        <span className="funnel-quelle">{QUELLE_PLAN}</span>
      </>
    );
  }, [mode]);

  const heroPills = useMemo(() => {
    if (mode === 'live') {
      return [
        'Live-Pipeline',
        `${analytics.totalLeadsLive} Leads`,
        `${analytics.totalWonLive} Neukunden`,
      ];
    }
    if (mode === 'vergleich') {
      const deltaText =
        analytics.overallDeltaQuote !== null
          ? `${analytics.overallDeltaQuote >= 0 ? '+' : ''}${analytics.overallDeltaQuote.toLocaleString('de-DE', { minimumFractionDigits: 1 })} % Win-Rate`
          : 'Gesamt-Delta';
      return ['Plan vs. Live', 'Delta-Analyse', deltaText];
    }
    return ['CRM Funnel 2025', 'Trichterstufen'];
  }, [mode, analytics]);

  const isDataLoading =
    (mode === 'live' || mode === 'vergleich') && (isDealsLoading || isContactsLoading);
  const isDataError =
    (mode === 'live' || mode === 'vergleich') && (isDealsError || isContactsError);
  const isPlanEmpty = mode === 'plan' && FUNNEL.rows.length === 0;
  const dataStatus: 'loading' | 'empty' | 'error' | 'ready' = isDataLoading
    ? 'loading'
    : isDataError
      ? 'error'
      : isPlanEmpty
        ? 'empty'
        : 'ready';

  return (
    <div
      className="pk-page funnel-seite"
      data-ruhig="true"
      data-page-key="sales-funnel"
      data-funnel-mode={mode}
    >
      <PageHero
        eyebrow="Vertrieb & Marketing"
        title={
          mode === 'live'
            ? 'Live Sales Pipeline'
            : mode === 'vergleich'
              ? 'Sales Funnel: Plan vs. Live'
              : 'Sales Funnel 2025'
        }
        subtitle={heroSubtitle}
        pills={heroPills}
      />

      {/* Datenquellen-Umschalter */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FunnelSourceToggle mode={mode} onChange={(newMode) => setDatenQuelle(newMode)} />
      </div>

      {/* Bottleneck-Alert bei erkannten Verzögerungen */}
      {mode !== 'plan' && analytics.bottlenecks.length > 0 && (
        <div className="mb-4">
          <FunnelBottleneckAlert bottlenecks={analytics.bottlenecks} />
        </div>
      )}

      <DataState
        status={dataStatus}
        emptyText="Keine Funnel-Daten erfasst."
        errorText="Live-CRM-Daten konnten nicht geladen werden. Bitte versuchen Sie es später erneut oder überprüfen Sie Ihre Verbindung."
      >
        <Panel
          title={
            mode === 'live'
              ? 'Operative Pipeline Funnel Stufen (Live-CRM)'
              : mode === 'vergleich'
                ? 'Sales Pipeline Funnel: Plan vs. Live-Ist'
                : 'Sales Pipeline Funnel Stufen (FY 2025)'
          }
          badge={
            mode === 'live' ? 'CRM Live' : mode === 'vergleich' ? 'Plan vs. Ist' : 'CRM Funnel 2025'
          }
          subtitle="Durchlaufende Leads, Stufen-Conversion und Engpass-Erkennung"
        >
          <ChartFigure title="Trichterstufen" summary={summary}>
            <FunnelStufenChart stufen={chartStufen} mode={mode} />
          </ChartFigure>
        </Panel>

        <Panel
          title="Quartalsverlauf Funnel-Stufen 2025"
          badge="Quartalsbericht 2025"
          subtitle="Verteilung nach Leads, MQL, SQL und Neukunden je Quartal (Benchmark)"
        >
          <ChartFigure
            title="Quartalsverlauf je Stufe"
            summary={`Leads steigen von ${FUNNEL.rows[0]?.[1] ?? ''} in Q1 auf ${FUNNEL.rows[0]?.[4] ?? ''} in Q4, Neukunden von ${FUNNEL.rows[5]?.[1] ?? ''} auf ${FUNNEL.rows[5]?.[4] ?? ''}.`}
          >
            <GroupedDepthColumns
              idPrefix="funnel-quartale"
              labels={FUNNEL.chart.labels}
              series={FUNNEL.chart.datasets.map((dataset, index) => ({
                name: dataset.label,
                values: dataset.data,
                color: QUARTAL_FARBEN[index] ?? dataset.color,
              }))}
            />
          </ChartFigure>
        </Panel>

        <Panel
          title={
            mode === 'live'
              ? 'Operative Pipeline-Tabelle (Live-CRM)'
              : mode === 'vergleich'
                ? 'Gegenüberstellung: Plan FY 2025 vs. Live-CRM'
                : 'Trichtertabelle'
          }
          flush
        >
          <FunnelDeltaTable mode={mode} analytics={analytics} />
        </Panel>

        <Callout
          title={FUNNEL.note.title}
          icon={TrendingUp}
          headingLevel={2}
          paragraphs={FUNNEL.note.paragraphs}
        />
      </DataState>
    </div>
  );
}

export function FunnelPage() {
  return (
    <FunnelQueryBoundary>
      <ImagePage page="sales-funnel">
        <FunnelPageHtml />
      </ImagePage>
    </FunnelQueryBoundary>
  );
}
