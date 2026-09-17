import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ManagementChartState } from '@/components/ui/charts/ManagementChartState';
import { useCrmReadModelEnvelope } from '@/hooks/queries/useCrmQueries';
import type { CrmSourceHealth } from '@/types/dataSource';

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

function statusLabel(status: CrmSourceHealth): string {
  switch (status) {
    case 'healthy':
      return 'Gesund';
    case 'empty':
      return 'Leer (gültig)';
    case 'degraded':
      return 'Eingeschränkt (degraded)';
    case 'unavailable':
      return 'Nicht verfügbar';
  }
}

function dataAge(fetchedAt: string, now: number): string {
  const diffMs = now - Date.parse(fetchedAt);
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'unbekannt';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'weniger als eine Minute';
  if (minutes === 1) return '1 Minute';
  if (minutes < 60) return `${minutes} Minuten`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 Stunde';
  return `${hours} Stunden`;
}

// Gate G47 (Auftrag 067D): echte Datenbasis-Seite statt WebP-Platzhalter.
// Quelle, Modus, letzter Abruf, Datenalter, Hash und Status sind sichtbar;
// `unavailable` sieht niemals wie ein erfolgreicher Live-Zustand aus.
export function DataBasisPage() {
  const { data: envelope, isLoading, isError, error } = useCrmReadModelEnvelope();
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <main>
        <h1>Datenbasis</h1>
        <ManagementChartState
          type="loading"
          message="Lade CRM-Envelope…"
          sourceLabel="CRM-Quellenwahrheit (G47)"
        />
      </main>
    );
  }

  if (isError || !envelope) {
    return (
      <main>
        <h1>Datenbasis</h1>
        <ManagementChartState
          type="error"
          message={`Datenquelle nicht verfügbar: ${error instanceof Error ? error.message : 'unbekannter Fehler'}. Es werden keine Ersatzdaten angezeigt.`}
          sourceLabel="CRM-Quellenwahrheit (G47)"
        />
      </main>
    );
  }

  const counts = [
    { label: 'Unternehmen', value: envelope.data.companies.length },
    { label: 'Kontakte', value: envelope.data.contacts.length },
    { label: 'Deals', value: envelope.data.deals.length },
    { label: 'Aktivitäten', value: envelope.data.activities.length },
  ];

  return (
    <main data-testid="data-basis-page">
      <h1>Datenbasis</h1>
      <SectionHeader
        eyebrow="CRM-Quellenwahrheit (G47)"
        title="Quelle und Zustand"
        description="Herkunft und Zustand der CRM-Daten aus genau einer Quelle"
      />
      <p>
        <Badge variant={statusBadgeVariant(envelope.status)}>{statusLabel(envelope.status)}</Badge>
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
            <dd>{dataAge(envelope.fetchedAt, now)}</dd>
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
        <h2>Bestand</h2>
        <ul data-testid="data-basis-counts">
          {counts.map((c) => (
            <li key={c.label}>
              {c.label}: <strong>{c.value}</strong>
            </li>
          ))}
        </ul>
        {envelope.status === 'empty' && (
          <p>Die Quelle ist leer — das ist ein gültiges Ergebnis, keine Störung.</p>
        )}
        {envelope.status === 'degraded' && (
          <p>
            Die Quelle meldet Importfehler — die vorhandenen Daten sind sichtbar, aber als
            eingeschränkt gekennzeichnet.
          </p>
        )}
      </Card>
    </main>
  );
}
