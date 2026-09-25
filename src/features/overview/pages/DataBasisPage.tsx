import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ManagementChartState } from '@/components/ui/charts/ManagementChartState';
import { useCrmReadModelEnvelope } from '@/hooks/queries/useCrmQueries';
import type { CrmSourceHealth } from '@/types/dataSource';
import { DataSourceStatus } from '@/components/data/DataSourceStatus';
import {
  deriveProvenanceState,
  formatDataAge,
  formatStatusLabel,
  classifyFreshness,
  formatFreshnessLabel,
} from '@/services/data/sourceFreshness';

function statusBadgeVariant(status: CrmSourceHealth): 'mint' | 'cyan' | 'orange' | 'red' {
  switch (status) {
    case 'healthy':
      return 'mint';
    case 'empty':
      return 'cyan';
    case 'degraded':
      return 'orange';
    case 'unavailable':
      return 'red';
  }
}

// Gate G47 (Auftrag 067D): echte Datenbasis-Seite statt WebP-Platzhalter.
// Quelle, Modus, letzter Abruf, Datenalter, Hash und Status sind sichtbar;
// `unavailable` sieht niemals wie ein erfolgreicher Live-Zustand aus.
// 067R / G64 (PR-SEMANTIC-11): Die Seitenhülle ist ein benannter
// Inhaltsabschnitt (`section` + `aria-labelledby`); `section` ist wie das
// frühere `div` ein Blockelement ohne Eigenstil — die Darstellung bleibt gleich.
function DataBasisShell({ children, testId }: { children: React.ReactNode; testId?: string }) {
  return (
    <section data-testid={testId} aria-labelledby="data-basis-title">
      <h1 id="data-basis-title">Datenbasis</h1>
      {children}
    </section>
  );
}

export function DataBasisPage() {
  const { data: envelope, isLoading, isError, error } = useCrmReadModelEnvelope();
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // 067J / G56: Genau eine h1 im Quelltext — alle Zustände (loading,
  // error, ready) teilen sich dieselbe Seitenhülle.
  if (isLoading) {
    return (
      <DataBasisShell>
        <ManagementChartState
          type="loading"
          message="Lade CRM-Envelope…"
          sourceLabel="CRM-Quellenwahrheit (G47)"
        />
      </DataBasisShell>
    );
  }

  // 067O / G61 Nacharbeit (P2-1 & P2-2): Im Fehlerfall / Ausfall (isError, kein Envelope oder unavailable)
  // standardisierte DataSourceStatus-Komponenten rendern (inkl. role="alert") und sichere Fehlertexte anzeigen.
  // Es werden niemals Counts, Hashes oder Ersatzdaten ausgegeben (Fail-Closed).
  if (isError || !envelope || envelope.status === 'unavailable') {
    const provenance = deriveProvenanceState(envelope, error, now);
    return (
      <DataBasisShell testId="data-basis-page">
        <SectionHeader
          eyebrow="CRM-Quellenwahrheit (G47)"
          title="Quelle und Zustand"
          description="Herkunft und Zustand der CRM-Daten aus genau einer Quelle"
          actions={<DataSourceStatus variant="compact" provenance={provenance} />}
        />

        <div className="my-3">
          <DataSourceStatus variant="banner" provenance={provenance} />
        </div>

        <ManagementChartState
          type="error"
          message={`Datenquelle nicht verfügbar: ${provenance.statusDescription} Es werden keine Ersatzdaten angezeigt.`}
          sourceLabel="CRM-Quellenwahrheit (G47)"
        />
      </DataBasisShell>
    );
  }

  const provenance = deriveProvenanceState(envelope, null, now);
  const counts = [
    { label: 'Unternehmen', value: envelope.data.companies.length },
    { label: 'Kontakte', value: envelope.data.contacts.length },
    { label: 'Deals', value: envelope.data.deals.length },
    { label: 'Aktivitäten', value: envelope.data.activities.length },
  ];

  return (
    <DataBasisShell testId="data-basis-page">
      <SectionHeader
        eyebrow="CRM-Quellenwahrheit (G47)"
        title="Quelle und Zustand"
        description="Herkunft und Zustand der CRM-Daten aus genau einer Quelle"
        actions={<DataSourceStatus variant="compact" provenance={provenance} envelope={envelope} />}
      />

      {/* Auftrag 067O / Gate G61: Ausführlicher Provenienz- und Frischekasten */}
      <div className="my-3">
        <DataSourceStatus variant="banner" provenance={provenance} envelope={envelope} />
      </div>

      <p>
        <Badge variant={statusBadgeVariant(envelope.status)}>
          {formatStatusLabel(envelope.status)}
        </Badge>
      </p>
      <Card>
        <dl data-testid="data-basis-provenance">
          <div>
            <dt>Quelle</dt>
            <dd>{envelope.sourceId}</dd>
          </div>
          <div>
            <dt>Modus</dt>
            <dd>{envelope.sourceKind}</dd>
          </div>
          <div>
            <dt>Letzter Abruf</dt>
            <dd>
              <time dateTime={envelope.fetchedAt}>{envelope.fetchedAt}</time>
            </dd>
          </div>
          <div>
            <dt>Datenalter</dt>
            <dd>{formatDataAge(envelope.fetchedAt, now)}</dd>
          </div>
          <div>
            <dt>Frische</dt>
            <dd>{formatFreshnessLabel(classifyFreshness(envelope.fetchedAt, now))}</dd>
          </div>
          <div>
            <dt>Inhalts-Hash</dt>
            <dd>
              <code>{envelope.contentHash}</code>
            </dd>
          </div>
          <div>
            <dt>Organisation</dt>
            <dd>
              <code>{envelope.organizationId}</code>
            </dd>
          </div>
        </dl>
      </Card>
      <Card>
        <h2>Geladene Datensätze</h2>
        <dl data-testid="data-basis-counts">
          {counts.map((c) => (
            <div key={c.label}>
              <dt>{c.label}</dt>
              <dd>{c.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      {envelope.status === 'empty' && (
        <Card>
          <p>Die Quelle ist leer — das ist ein gültiges Ergebnis, keine Störung.</p>
        </Card>
      )}
      {envelope.status === 'degraded' && (
        <Card>
          <h2>Hinweise zur Datenqualität (degraded)</h2>
          <p>
            Die Quelle meldet Importfehler — die vorhandenen Daten sind sichtbar, aber als
            eingeschränkt gekennzeichnet.
          </p>
        </Card>
      )}
    </DataBasisShell>
  );
}
