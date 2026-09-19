import { useMemo } from 'react';
import { Search } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectOption } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { ManagementChartState } from '@/components/ui/charts/ManagementChartState';
import { useUrlSyncedState } from '@/hooks/useUrlSyncedState';
import { CrmResponsiveList, CrmColumn } from './CrmResponsiveList';
import { useCrmReadModelEnvelope } from '@/hooks/queries/useCrmQueries';
import type { CrmSourceHealth, CrmReadModel } from '@/types/dataSource';

interface ActivityItem {
  id: string;
  date: string;
  type: string;
  actor: string;
  channel: string;
  entityName: string;
  details: string;
  status?: string;
}

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

function formatTimestamp(timestamp: string): string {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return timestamp;
  return new Date(parsed).toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Gate G47 (Auftrag 067D, Nacharbeit zum Review-Befund 2 mit Marcs Freigabe
// zur Matrixerweiterung): Die Historie stammt ausschließlich aus
// `envelope.data.activities` — derselben Quelle wie Companies, Contacts, Deals
// und Audit. Der frühere statische INITIAL-Bestand und der Simulations-Mix
// (Activities/Events aus dem Simulations-Store) sind ersatzlos entfallen:
// kein Mischzustand mehr. Unavailable ist Fehler ohne Ersatzdaten.
export function ActivitiesView() {
  const { data: envelope, isLoading, isError, error } = useCrmReadModelEnvelope();
  // 067J / G56: Filterzustand ist über die URL wiederherstellbar.
  const [searchTerm, setSearchTerm] = useUrlSyncedState('suche', '');
  const [typeFilter, setTypeFilter] = useUrlSyncedState('typ', 'ALL');

  const combinedActivities: ActivityItem[] = useMemo(() => {
    if (!envelope) return [];
    const companiesById = new Map(envelope.data.companies.map((c) => [c.id, c.name]));
    const contactsById = new Map(envelope.data.contacts.map((p) => [p.id, p.email]));
    const dealsById = new Map(envelope.data.deals.map((d) => [d.id, d.dealName]));
    const resolveEntity = (a: CrmReadModel['activities'][number]): string => {
      if (a.companyId && companiesById.has(a.companyId)) return companiesById.get(a.companyId)!;
      if (a.contactId && contactsById.has(a.contactId)) return contactsById.get(a.contactId)!;
      if (a.dealId && dealsById.has(a.dealId)) return dealsById.get(a.dealId)!;
      return a.companyId || a.contactId || a.dealId || a.id;
    };
    return envelope.data.activities.map((a) => ({
      id: a.id,
      date: formatTimestamp(a.timestamp),
      type: a.type,
      actor: a.performedBy,
      channel: a.channel,
      entityName: resolveEntity(a),
      details: a.description,
      status: a.status,
    }));
  }, [envelope]);

  const typeOptions: SelectOption[] = useMemo(() => {
    const set = new Set(combinedActivities.map((a) => a.type));
    return [
      { value: 'ALL', label: 'Alle Aktivitäten' },
      ...Array.from(set).map((t) => ({ value: t, label: t })),
    ];
  }, [combinedActivities]);

  const topChannel = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of combinedActivities) counts.set(a.channel, (counts.get(a.channel) ?? 0) + 1);
    let top = '–';
    let topCount = 0;
    for (const [channel, count] of counts) {
      if (count > topCount) {
        top = channel;
        topCount = count;
      }
    }
    return top;
  }, [combinedActivities]);

  const filteredActivities = useMemo(() => {
    return combinedActivities.filter((a) => {
      const matchSearch =
        a.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.actor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'ALL' || a.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [combinedActivities, searchTerm, typeFilter]);

  const columns: CrmColumn<ActivityItem>[] = [
    {
      key: 'date',
      label: 'Zeitpunkt / Datum',
      render: (r) => (
        <span className="font-mono text-[12px] text-[var(--color-text-muted)]">{r.date}</span>
      ),
    },
    {
      key: 'type',
      label: 'Aktivitätstyp',
      render: (r) => {
        const isWon = r.type.includes('Won') || r.type === 'DEAL_WON';
        const isCall =
          r.type.includes('Meeting') || r.type.includes('Qualification') || r.type.includes('Call');
        return <Badge variant={isWon ? 'cyan' : isCall ? 'orange' : 'neutral'}>{r.type}</Badge>;
      },
    },
    {
      key: 'entityName',
      label: 'Betroffenes Projekt / Lead',
      render: (r) => <strong className="text-text">{r.entityName}</strong>,
    },
    {
      key: 'details',
      label: 'Beschreibung & Details',
      render: (r) => <span className="text-[13px] text-text">{r.details}</span>,
    },
    {
      key: 'actor',
      label: 'Ausgeführt durch',
      render: (r) => (
        <span className="text-[12px] text-[var(--color-text-muted)]">
          {r.actor} · {r.channel}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <Badge variant={r.status === 'COMPLETED' ? 'cyan' : 'neutral'}>{r.status || 'OK'}</Badge>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-[var(--space-6)] max-w-full min-w-0">
        <SectionHeader
          eyebrow="CRM & Pipeline"
          title="Aktivitäten-Historie"
          description="Lückenloser Aktivitäten- und Ereignisstrom für Lead-Interaktionen, Statusübergänge und Vertriebsaktivitäten."
        />
        <ManagementChartState
          type="loading"
          message="Lade Aktivitäten aus dem CRM-Envelope…"
          sourceLabel="CRM-Quellenwahrheit (G47)"
        />
      </div>
    );
  }

  if (isError || !envelope) {
    return (
      <div className="flex flex-col gap-[var(--space-6)] max-w-full min-w-0">
        <SectionHeader
          eyebrow="CRM & Pipeline"
          title="Aktivitäten-Historie"
          description="Lückenloser Aktivitäten- und Ereignisstrom für Lead-Interaktionen, Statusübergänge und Vertriebsaktivitäten."
        />
        <ManagementChartState
          type="error"
          message={`Aktivitäten nicht verfügbar: ${error instanceof Error ? error.message : 'unbekannter Fehler'}. Es werden keine Ersatzdaten angezeigt.`}
          sourceLabel="CRM-Quellenwahrheit (G47)"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--space-6)] max-w-full min-w-0">
      {/* 1. Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-[var(--space-3)]">
        <SectionHeader
          eyebrow="CRM & Pipeline"
          title="Aktivitäten-Historie"
          description="Lückenloser Aktivitäten- und Ereignisstrom für Lead-Interaktionen, Statusübergänge und Vertriebsaktivitäten."
        />
        <div className="flex gap-[var(--space-2)] flex-wrap">
          <Badge variant="cyan">Quelle: {envelope.sourceId}</Badge>
          <Badge variant={statusBadgeVariant(envelope.status)}>{envelope.status}</Badge>
        </div>
      </div>

      {envelope.status === 'empty' && (
        <p>Die Quelle ist leer — das ist ein gültiges Ergebnis, keine Störung.</p>
      )}
      {envelope.status === 'degraded' && (
        <p>
          Die Quelle meldet Importfehler — die vorhandenen Aktivitäten sind sichtbar, aber als
          eingeschränkt gekennzeichnet.
        </p>
      )}

      {/* 2. KPI Cards */}
      <div className="crm-v2-kpi-grid">
        <Card variant="glass" featured>
          <div className="text-[13px] text-[var(--color-text-muted)]">Aktivitäten erfasst</div>
          <div className="font-display text-[28px] font-bold my-[4px] text-primary">
            {combinedActivities.length}
          </div>
          <div className="text-[12px] text-success">Aus dem CRM-Envelope</div>
        </Card>

        <Card variant="glass">
          <div className="text-[13px] text-[var(--color-text-muted)]">Aktivster Kanal</div>
          <div className="font-display text-[24px] font-semibold my-[4px] text-text">
            {topChannel}
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">Aus dem CRM-Envelope</div>
        </Card>

        <Card variant="glass">
          <div className="text-[13px] text-[var(--color-text-muted)]">Aktivitätstypen</div>
          <div className="font-display text-[28px] font-semibold my-[4px] text-text">
            {typeOptions.length - 1} Typen
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">Aus dem CRM-Envelope</div>
        </Card>

        <Card variant="glass">
          <div className="text-[13px] text-[var(--color-text-muted)]">Compliance & Log</div>
          <div className="font-display text-[18px] font-bold mt-[8px] mb-[4px] text-success">
            100 % DSGVO-konform
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            Hosting in Frankfurt am Main
          </div>
        </Card>
      </div>

      {/* 3. Filter & Search Bar */}
      <div className="crm-v2-filter-bar">
        <div className="flex-[1_1_280px] max-w-full">
          <Input
            type="search"
            aria-label="Aktivitäten suchen"
            placeholder="Projekt, Aktivität oder Bearbeiter suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leadingIcon={<Search size={16} />}
            sizeVariant="sm"
          />
        </div>

        <div className="flex items-center gap-[var(--space-4)] flex-wrap flex-[0_1_auto]">
          <div className="min-w-[180px] w-full max-w-[240px]">
            <Select
              label="Typ:"
              options={typeOptions}
              value={typeFilter}
              onChange={setTypeFilter}
              sizeVariant="sm"
              fullWidth
            />
          </div>
          <div className="crm-v2-result-count" aria-live="polite">
            {filteredActivities.length} von {combinedActivities.length} Aktivitäten
          </div>
        </div>
      </div>

      {/* 4. Table & Cards */}
      <Card variant="glass" padding="0">
        <CrmResponsiveList
          caption="Aktivitäten-Historie Tabelle"
          columns={columns}
          rows={filteredActivities}
          keyExtractor={(r) => r.id}
          renderMobileCard={(r) => {
            const isWon = r.type.includes('Won') || r.type === 'DEAL_WON';
            const isCall =
              r.type.includes('Meeting') ||
              r.type.includes('Qualification') ||
              r.type.includes('Call');
            return (
              <div className="crm-v2-mobile-card">
                {/* Priorisierung gemäß Spezifikation: Zeitpunkt & Typ, Bezug/Akteur, Details, Status */}
                <div className="crm-v2-mobile-card-header">
                  <span className="crm-v2-mobile-card-title font-mono text-[12.5px] text-primary">
                    {r.date}
                  </span>
                  <Badge variant={isWon ? 'cyan' : isCall ? 'orange' : 'neutral'}>{r.type}</Badge>
                </div>
                <div className="crm-v2-mobile-card-row">
                  <span className="crm-v2-mobile-card-label">Projekt / Lead</span>
                  <strong className="crm-v2-mobile-card-value text-text">{r.entityName}</strong>
                </div>
                <div className="crm-v2-mobile-card-row">
                  <span className="crm-v2-mobile-card-label">Akteur</span>
                  <span className="crm-v2-mobile-card-value">
                    {r.actor} · {r.channel}
                  </span>
                </div>
                <div className="border-0 border-t border-dashed border-border-soft text-[12.5px] text-text px-0 py-[4px]">
                  {r.details}
                </div>
                <div className="crm-v2-mobile-card-row">
                  <span className="crm-v2-mobile-card-label">Status</span>
                  <span className="crm-v2-mobile-card-value">
                    <Badge variant={r.status === 'COMPLETED' ? 'cyan' : 'neutral'}>
                      {r.status || 'OK'}
                    </Badge>
                  </span>
                </div>
              </div>
            );
          }}
        />
      </Card>
    </div>
  );
}
