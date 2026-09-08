import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { Alert } from '../../components/ui/Alert';
import { LeadStatus } from '../../types/simulation';
import { ManagementTierView } from './components/ManagementTierView';
import { DetailTierView } from './components/DetailTierView';
import { AuditTierView } from './components/AuditTierView';
import { ScenarioManagerModal } from './components/ScenarioManagerModal';
import { RunActionModal } from './components/RunActionModal';
import { MeasureManagerModal } from './components/MeasureManagerModal';
import { MultiScenarioComparisonModal } from './components/MultiScenarioComparisonModal';

export function LiveDashboardView() {
  const { state, leads, deals, events } = useSimulation();

  // Tier switching: 'management' | 'detail' | 'audit' | 'operativ'
  const [activeTier, setActiveTier] = useState<string>('management');

  // Modals state
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState<boolean>(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState<boolean>(false);
  const [isMeasureModalOpen, setIsMeasureModalOpen] = useState<boolean>(false);
  const [isMultiCompareModalOpen, setIsMultiCompareModalOpen] = useState<boolean>(false);

  // Operative sub-tab filter
  const [activeOperativeTab, setActiveOperativeTab] = useState<string>('leads');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const metrics = state.metrics ?? {
    liveLeads: leads.length,
    liveMQLs: leads.filter((l) => l.status === 'MQL').length,
    liveSQLs: leads.filter((l) => l.status === 'SQL').length,
    liveHotLeads: leads.filter((l) => l.status === 'Hot').length,
    liveOpportunities: leads.filter((l) => l.status === 'SQL' || l.status === 'Hot').length,
    livePipelineValue: leads.filter((l) => l.status !== 'Won' && l.status !== 'Lost').reduce((acc, l) => acc + (l.estimatedValue || 0), 0),
    liveWonDeals: deals.length,
    liveLostDeals: leads.filter((l) => l.status === 'Lost').length,
    liveCustomers: 66 + deals.length,
    liveMRR: 34320 + deals.reduce((sum, d) => sum + d.mrr, 0),
    liveARR: 411840 + deals.reduce((sum, d) => sum + d.arr, 0),
    conversionRate: 67,
  };

  const filteredLeads = leads.filter((l) => {
    if (statusFilter === 'ALL') return true;
    return l.status === statusFilter;
  });

  const getStatusBadgeVariant = (status: LeadStatus): 'cyan' | 'orange' | 'mint' | 'neutral' => {
    switch (status) {
      case 'Hot':
      case 'Won':
        return 'cyan';
      case 'SQL':
      case 'MQL':
        return 'orange';
      case 'New':
        return 'mint';
      default:
        return 'neutral';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Primary 3-Tier Navigation Header */}
      <Card padding="var(--space-3)">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <Tabs
            items={[
              { id: 'management', label: '📊 Management-Ebene (P50 Forecast & Corridor)' },
              { id: 'detail', label: '📈 Detail-Ebene (Treiber & Verteilung)' },
              { id: 'audit', label: '⚙️ Technik & Audit (Run-Historie & Snapshots)' },
              { id: 'operativ', label: '⚡ Operative Simulation (Ebene B Live Logs)' },
            ]}
            activeId={activeTier}
            onChange={setActiveTier}
          />
        </div>
      </Card>

      {/* TIER 1: Management View */}
      {activeTier === 'management' && (
        <ManagementTierView
          onOpenScenarioModal={() => setIsScenarioModalOpen(true)}
          onOpenRunModal={() => setIsRunModalOpen(true)}
          onOpenMeasureModal={() => setIsMeasureModalOpen(true)}
          onOpenMultiCompareModal={() => setIsMultiCompareModalOpen(true)}
        />
      )}

      {/* TIER 2: Detail Analysis View */}
      {activeTier === 'detail' && <DetailTierView />}

      {/* TIER 3: Technik & Audit View */}
      {activeTier === 'audit' && <AuditTierView />}

      {/* TIER 4: Operative Live Simulation Sub-Views */}
      {activeTier === 'operativ' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <Tabs
            items={[
              { id: 'leads', label: 'Live Lead Pipeline', count: leads.length },
              { id: 'deals', label: 'Live Won Deals', count: deals.length },
              { id: 'events', label: 'Live Event Stream', count: events.length },
              { id: 'isolation', label: 'Daten-Isolation (Ebene A vs B)' },
            ]}
            activeId={activeOperativeTab}
            onChange={setActiveOperativeTab}
          />

          {/* TAB: Leads */}
          {activeOperativeTab === 'leads' && (
            <Card padding="var(--space-5)">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--color-text)' }}>Simulierte Operative Leads (Ebene B)</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
                    Alle in Ebene B generierten Leads und deren automatischer Qualifizierungsfortschritt
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '6px', background: 'var(--color-bg-deep)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
                  {['ALL', 'New', 'MQL', 'SQL', 'Hot', 'Won', 'Lost'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      style={{
                        background: statusFilter === st ? 'var(--color-surface)' : 'transparent',
                        color: statusFilter === st ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {st === 'ALL' ? 'Alle' : st}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                      <th style={{ padding: '10px' }}>Unternehmen</th>
                      <th style={{ padding: '10px' }}>Kontaktperson</th>
                      <th style={{ padding: '10px' }}>Quelle</th>
                      <th style={{ padding: '10px' }}>ICP Score</th>
                      <th style={{ padding: '10px' }}>Status</th>
                      <th style={{ padding: '10px' }}>Geschätzter Wert</th>
                      <th style={{ padding: '10px' }}>Owner</th>
                      <th style={{ padding: '10px' }}>Erstellt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                        <td style={{ padding: '10px', fontWeight: 600, color: 'var(--color-text)' }}>{lead.companyName}</td>
                        <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>
                          <div>{lead.contactName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-dim)' }}>{lead.email}</div>
                        </td>
                        <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>{lead.source}</td>
                        <td style={{ padding: '10px' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: lead.score >= 80 ? 'var(--color-primary)' : lead.score >= 65 ? '#e5c07b' : 'var(--color-text-muted)',
                            }}
                          >
                            {lead.score} / 100
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <Badge variant={getStatusBadgeVariant(lead.status)}>{lead.status}</Badge>
                        </td>
                        <td style={{ padding: '10px', fontWeight: 600, color: 'var(--color-accent)' }}>
                          {lead.estimatedValue.toLocaleString('de-DE')} €/J.
                        </td>
                        <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>{lead.owner}</td>
                        <td style={{ padding: '10px', color: 'var(--color-text-muted)', fontSize: '11.5px' }}>Tick #{lead.createdAtTick}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB: Deals */}
          {activeOperativeTab === 'deals' && (
            <Card padding="var(--space-5)">
              <h3 style={{ margin: '0 0 var(--space-4) 0', fontSize: '16px', color: 'var(--color-text)' }}>
                Echtzeit-Gewonnene Deals (Simulations-Abschlüsse)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                      <th style={{ padding: '10px' }}>Deal Name</th>
                      <th style={{ padding: '10px' }}>Kunde</th>
                      <th style={{ padding: '10px' }}>Gewähltes Paket</th>
                      <th style={{ padding: '10px' }}>Simulierter ARR</th>
                      <th style={{ padding: '10px' }}>Simulierter MRR</th>
                      <th style={{ padding: '10px' }}>Abschlussdatum</th>
                      <th style={{ padding: '10px' }}>Gewonnen bei</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.map((deal) => (
                      <tr key={deal.id} style={{ borderBottom: '1px solid var(--color-border-soft)' }}>
                        <td style={{ padding: '10px', fontWeight: 600, color: 'var(--color-primary)' }}>{deal.dealName}</td>
                        <td style={{ padding: '10px', color: 'var(--color-text)' }}>{deal.companyName}</td>
                        <td style={{ padding: '10px' }}>
                          <Badge variant="cyan">{deal.packageName}</Badge>
                        </td>
                        <td style={{ padding: '10px', fontWeight: 700, color: 'var(--color-accent)' }}>
                          {deal.arr.toLocaleString('de-DE')} €
                        </td>
                        <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>{deal.mrr.toLocaleString('de-DE')} €</td>
                        <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>{deal.closeDate}</td>
                        <td style={{ padding: '10px', color: 'var(--color-text-muted)' }}>Tick #{deal.wonAtTick}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB: Event Stream */}
          {activeOperativeTab === 'events' && (
            <Card padding="var(--space-5)">
              <h3 style={{ margin: '0 0 var(--space-4) 0', fontSize: '16px', color: 'var(--color-text)' }}>
                Simulations-Event Ticker & Aktivitätsstream
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {events.slice(0, 50).map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-bg-deep)',
                      borderLeft: `3px solid ${
                        evt.type === 'DEAL_WON' ? 'var(--color-primary)' : evt.type === 'NEW_LEAD' ? '#e5c07b' : 'var(--color-border)'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--space-3)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 700 }}>Tick #{evt.tick}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>{evt.title}</span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>{evt.details}</div>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--color-text-dim)', whiteSpace: 'nowrap' }}>{evt.timestamp}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* TAB: Data Layer Isolation Matrix */}
          {activeOperativeTab === 'isolation' && (
            <Card padding="var(--space-5)">
              <Alert variant="info" title="100% Technische Daten-Isolation Garantiert">
                Die Simulation verarbeitet ausschließlich Daten in Ebene B (In-Memory Simulation State). Ebene A (historische Unternehmens-
                und CRM-Stammdaten 2025 aus Faktenblatt v1.1) bleibt unter allen Bedingungen 100% unveränderlich.
              </Alert>
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      <ScenarioManagerModal isOpen={isScenarioModalOpen} onClose={() => setIsScenarioModalOpen(false)} />
      <RunActionModal isOpen={isRunModalOpen} onClose={() => setIsRunModalOpen(false)} />
      <MeasureManagerModal isOpen={isMeasureModalOpen} onClose={() => setIsMeasureModalOpen(false)} />
      <MultiScenarioComparisonModal isOpen={isMultiCompareModalOpen} onClose={() => setIsMultiCompareModalOpen(false)} />
    </div>
  );
}
