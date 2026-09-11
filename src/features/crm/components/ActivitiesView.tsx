import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectOption } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { useSimulationActivities, useSimulationEvents } from '@/store/hooks';
import { CrmResponsiveList, CrmColumn } from './CrmResponsiveList';

interface ActivityItem {
  id: string;
  date: string;
  type: string;
  actor: string;
  entityName: string;
  details: string;
  status?: string;
}

// Initial canonical CRM activities derived from real imported baseline accounts & deals
const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    date: '2026-08-26 14:30',
    type: 'Meeting Booked',
    actor: 'Sales Team',
    entityName: 'Auto Vogel – Projekt',
    details: 'Live-Präsentation LeadPilot Connect & KI-Scoring mit Geschäftsführung durchgeführt.',
    status: 'COMPLETED',
  },
  {
    id: 'act-2',
    date: '2026-08-26 11:15',
    type: 'Qualification',
    actor: 'Account Executive',
    entityName: 'Bergmann Handel – Projekt',
    details: 'Erstgespräch zur ICP-Qualifikation & Bedarfsanalyse im Großhandel.',
    status: 'COMPLETED',
  },
  {
    id: 'act-3',
    date: '2026-08-21 09:45',
    type: 'Meeting Booked',
    actor: 'Sales Team',
    entityName: 'Reinigung Klar – Projekt',
    details: 'Online-Termin zur Abstimmung der Lizenzanzahl (Growth-Paket) vereinbart.',
    status: 'SCHEDULED',
  },
  {
    id: 'act-4',
    date: '2026-08-14 16:00',
    type: 'Proposal Sent',
    actor: 'Marc Pönisch (CEO)',
    entityName: 'Sporthaus Degen – Projekt',
    details: 'Vertragsangebot über 12 Lizenzen Growth (89 €/Nutzer/Monat) übermittelt.',
    status: 'COMPLETED',
  },
  {
    id: 'act-5',
    date: '2026-08-07 10:20',
    type: 'Inbound Ingestion',
    actor: 'Marketing / Nurturing',
    entityName: 'Druckerei Pfeil – Projekt',
    details: 'Automatisiertes Nurturing-Whitepaper "Lead-Management im Mittelstand" versendet.',
    status: 'COMPLETED',
  },
  {
    id: 'act-6',
    date: '2026-08-05 15:10',
    type: 'Scoring Update',
    actor: 'System / Scoring v1.5',
    entityName: 'Studio Neun – Projekt',
    details: 'Lead-Score erreichte 82 Punkte ➔ Statuswechsel von MQL zu SQL.',
    status: 'COMPLETED',
  },
  {
    id: 'act-7',
    date: '2026-08-03 13:00',
    type: 'Proposal Sent',
    actor: 'Account Executive',
    entityName: 'Bytewerk Software – Projekt',
    details: 'SLA-Vertragsentwurf für 50 Lizenzen Pro-Paket übermittelt.',
    status: 'COMPLETED',
  },
  {
    id: 'act-8',
    date: '2026-08-02 11:00',
    type: 'Qualification',
    actor: 'Sales Team',
    entityName: 'Nordlicht Logistik – Projekt',
    details: 'Qualifizierungsgespräch mit Abteilungsleiter Logistik geführt.',
    status: 'COMPLETED',
  },
  {
    id: 'act-9',
    date: '2026-06-09 17:30',
    type: 'Deal Closed Won',
    actor: 'Sales Team',
    entityName: 'Hotel Seeblick – Projekt',
    details: 'Vertrag erfolgreich unterzeichnet. ARR: 21.000 € (Closed-Won).',
    status: 'COMPLETED',
  },
  {
    id: 'act-10',
    date: '2026-06-05 16:45',
    type: 'Deal Closed Won',
    actor: 'Sales Team',
    entityName: 'Pflegedienst Aurora – Projekt',
    details: 'Vertrag erfolgreich unterzeichnet. ARR: 43.000 € (Closed-Won).',
    status: 'COMPLETED',
  },
];

export function ActivitiesView() {
  const simActivities = useSimulationActivities();
  const events = useSimulationEvents();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Combine simulation activities (if any) with initial canonical activities
  const combinedActivities: ActivityItem[] = useMemo(() => {
    const list: ActivityItem[] = [];

    // 1. Simulation generated activities
    if (simActivities && simActivities.length > 0) {
      simActivities.forEach((act) => {
        list.push({
          id: act.id,
          date: act.timestamp || `Tick #${act.tick}`,
          type: act.type,
          actor: 'Simulation Engine',
          entityName: act.entityName,
          details: act.description,
          status: 'COMPLETED',
        });
      });
    }

    // 2. Simulation events
    if (events && events.length > 0) {
      events.slice(0, 30).forEach((evt) => {
        list.push({
          id: evt.id,
          date: evt.simulatedDate || `Tick #${evt.tick}`,
          type: evt.type,
          actor: 'System / Event Log',
          entityName: evt.title,
          details: evt.details,
          status: 'COMPLETED',
        });
      });
    }

    // 3. Always include baseline historical activities
    if (list.length === 0) {
      return INITIAL_ACTIVITIES;
    }

    return [...list, ...INITIAL_ACTIVITIES];
  }, [simActivities, events]);

  const typeOptions: SelectOption[] = useMemo(() => {
    const set = new Set(combinedActivities.map((a) => a.type));
    return [
      { value: 'ALL', label: 'Alle Aktivitäten' },
      ...Array.from(set).map((t) => ({ value: t, label: t })),
    ];
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
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          {r.date}
        </span>
      ),
    },
    {
      key: 'type',
      label: 'Aktivitätstyp',
      render: (r) => {
        const isWon = r.type.includes('Won') || r.type === 'DEAL_WON';
        const isCall = r.type.includes('Meeting') || r.type.includes('Qualification') || r.type.includes('Call');
        return (
          <Badge variant={isWon ? 'cyan' : isCall ? 'orange' : 'neutral'}>
            {r.type}
          </Badge>
        );
      },
    },
    {
      key: 'entityName',
      label: 'Betroffenes Projekt / Lead',
      render: (r) => <strong style={{ color: 'var(--color-text)' }}>{r.entityName}</strong>,
    },
    {
      key: 'details',
      label: 'Beschreibung & Details',
      render: (r) => (
        <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>{r.details}</span>
      ),
    },
    {
      key: 'actor',
      label: 'Ausgeführt durch',
      render: (r) => (
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{r.actor}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <Badge variant={r.status === 'COMPLETED' ? 'cyan' : 'neutral'}>
          {r.status || 'OK'}
        </Badge>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '100%', minWidth: 0 }}>
      {/* 1. Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <SectionHeader
          eyebrow="CRM & Pipeline"
          title="Aktivitäten-Historie"
          description="Lückenloser Aktivitäten- und Ereignisstrom für Lead-Interaktionen, Statusübergänge und Vertriebsaktivitäten."
        />
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Badge variant="cyan">Ebene A + Event Log</Badge>
          <Badge variant="neutral">DSGVO-konform</Badge>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="crm-v2-kpi-grid">
        <Card variant="glass" featured>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Aktivitäten erfasst</div>
          <div style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: '4px 0' }}>
            {combinedActivities.length}
          </div>
          <div style={{ color: 'var(--color-success)', fontSize: '12px' }}>Vollständiger Audit-Trail</div>
        </Card>

        <Card variant="glass">
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Aktivste Kanäle</div>
          <div style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600, margin: '4px 0' }}>
            Demo & Calls
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Fokus auf ICP-Qualifizierung</div>
        </Card>

        <Card variant="glass">
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Aktivitätstypen</div>
          <div style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 600, margin: '4px 0' }}>
            {typeOptions.length - 1} Typen
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Demos, Calls, Mails, Deals</div>
        </Card>

        <Card variant="glass">
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Compliance & Log</div>
          <div style={{ color: 'var(--color-success)', fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, margin: '8px 0 4px' }}>
            100 % DSGVO-konform
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Hosting in Frankfurt am Main</div>
        </Card>
      </div>

      {/* 3. Filter & Search Bar */}
      <div className="crm-v2-filter-bar">
        <div style={{ flex: '1 1 280px', maxWidth: '100%' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap', flex: '0 1 auto' }}>
          <div style={{ minWidth: '180px', width: '100%', maxWidth: '240px' }}>
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
            const isCall = r.type.includes('Meeting') || r.type.includes('Qualification') || r.type.includes('Call');
            return (
              <div className="crm-v2-mobile-card">
                {/* Priorisierung gemäß Spezifikation: Zeitpunkt & Typ, Bezug/Akteur, Details, Status */}
                <div className="crm-v2-mobile-card-header">
                  <span
                    className="crm-v2-mobile-card-title"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--color-primary)' }}
                  >
                    {r.date}
                  </span>
                  <Badge variant={isWon ? 'cyan' : isCall ? 'orange' : 'neutral'}>
                    {r.type}
                  </Badge>
                </div>
                <div className="crm-v2-mobile-card-row">
                  <span className="crm-v2-mobile-card-label">Projekt / Lead</span>
                  <strong className="crm-v2-mobile-card-value" style={{ color: 'var(--color-text)' }}>
                    {r.entityName}
                  </strong>
                </div>
                <div className="crm-v2-mobile-card-row">
                  <span className="crm-v2-mobile-card-label">Akteur</span>
                  <span className="crm-v2-mobile-card-value">{r.actor}</span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--color-text)', padding: '4px 0', borderTop: '1px dashed var(--color-border-soft)' }}>
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
