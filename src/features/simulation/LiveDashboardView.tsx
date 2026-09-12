import React, { useState } from 'react';
import { useSimulationDeals, useSimulationEvents, useSimulationLeads } from '../../store/hooks';
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
  const leads = useSimulationLeads();
  const deals = useSimulationDeals();
  const events = useSimulationEvents();

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
    <div className="flex flex-col gap-[var(--space-5)]">
      {/* Primary 3-Tier Navigation Header */}
      <Card padding="var(--space-3)">
        <div className="flex items-center justify-between flex-wrap gap-[var(--space-3)]">
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
        <div className="flex flex-col gap-[var(--space-5)]">
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
              <div className="flex items-center justify-between flex-wrap gap-[var(--space-3)] mb-[var(--space-4)]">
                <div>
                  <h3 className="m-0 text-[16px] text-text">Simulierte Operative Leads (Ebene B)</h3>
                  <p className="text-[12.5px] text-[var(--color-text-muted)] mt-[2px] mb-0 mr-0 ml-0">
                    Alle in Ebene B generierten Leads und deren automatischer Qualifizierungsfortschritt
                  </p>
                </div>

                <div className="flex gap-[6px] rounded-md bg-background-deep p-[4px]">
                  {['ALL', 'New', 'MQL', 'SQL', 'Hot', 'Won', 'Lost'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`border-0 rounded cursor-pointer outline-none text-[12px] font-semibold px-[10px] py-[4px] ${statusFilter === st ? 'bg-surface text-primary' : 'bg-transparent text-[var(--color-text-muted)]'}`}
                    >
                      {st === 'ALL' ? 'Alle' : st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px] text-left">
                  <thead>
                    <tr className="border-0 border-b border-solid border-border text-[var(--color-text-muted)]">
                      <th className="p-[10px]">Unternehmen</th>
                      <th className="p-[10px]">Kontaktperson</th>
                      <th className="p-[10px]">Quelle</th>
                      <th className="p-[10px]">ICP Score</th>
                      <th className="p-[10px]">Status</th>
                      <th className="p-[10px]">Geschätzter Wert</th>
                      <th className="p-[10px]">Owner</th>
                      <th className="p-[10px]">Erstellt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="border-0 border-b border-solid border-border-soft">
                        <td className="font-semibold text-text p-[10px]">{lead.companyName}</td>
                        <td className="text-[var(--color-text-muted)] p-[10px]">
                          <div>{lead.contactName}</div>
                          <div className="text-[11px] text-[var(--color-text-dim)]">{lead.email}</div>
                        </td>
                        <td className="text-[var(--color-text-muted)] p-[10px]">{lead.source}</td>
                        <td className="p-[10px]">
                          <span
                            className="font-bold"
                            // G39 Welle 3: Score-Farbe aus Schwellenwerten des
                            // Simulations-Datums (kontinuierlich) — als Klasse
                            // nicht darstellbar (Entscheidung 2).
                            // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Score-Schwellen aus Daten), siehe Auftrag 056 Entscheidung 2
                            style={{
                              color: lead.score >= 80 ? 'var(--color-primary)' : lead.score >= 65 ? '#e5c07b' : 'var(--color-text-muted)',
                            }}
                          >
                            {lead.score} / 100
                          </span>
                        </td>
                        <td className="p-[10px]">
                          <Badge variant={getStatusBadgeVariant(lead.status)}>{lead.status}</Badge>
                        </td>
                        <td className="font-semibold text-accent p-[10px]">
                          {lead.estimatedValue.toLocaleString('de-DE')} €/J.
                        </td>
                        <td className="text-[var(--color-text-muted)] p-[10px]">{lead.owner}</td>
                        <td className="text-[11.5px] text-[var(--color-text-muted)] p-[10px]">Tick #{lead.createdAtTick}</td>
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
              <h3 className="text-[16px] text-text mt-0 mb-[var(--space-4)] mr-0 ml-0">
                Echtzeit-Gewonnene Deals (Simulations-Abschlüsse)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px] text-left">
                  <thead>
                    <tr className="border-0 border-b border-solid border-border text-[var(--color-text-muted)]">
                      <th className="p-[10px]">Deal Name</th>
                      <th className="p-[10px]">Kunde</th>
                      <th className="p-[10px]">Gewähltes Paket</th>
                      <th className="p-[10px]">Simulierter ARR</th>
                      <th className="p-[10px]">Simulierter MRR</th>
                      <th className="p-[10px]">Abschlussdatum</th>
                      <th className="p-[10px]">Gewonnen bei</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.map((deal) => (
                      <tr key={deal.id} className="border-0 border-b border-solid border-border-soft">
                        <td className="font-semibold text-primary p-[10px]">{deal.dealName}</td>
                        <td className="text-text p-[10px]">{deal.companyName}</td>
                        <td className="p-[10px]">
                          <Badge variant="cyan">{deal.packageName}</Badge>
                        </td>
                        <td className="font-bold text-accent p-[10px]">
                          {deal.arr.toLocaleString('de-DE')} €
                        </td>
                        <td className="text-[var(--color-text-muted)] p-[10px]">{deal.mrr.toLocaleString('de-DE')} €</td>
                        <td className="text-[var(--color-text-muted)] p-[10px]">{deal.closeDate}</td>
                        <td className="text-[var(--color-text-muted)] p-[10px]">Tick #{deal.wonAtTick}</td>
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
              <h3 className="text-[16px] text-text mt-0 mb-[var(--space-4)] mr-0 ml-0">
                Simulations-Event Ticker & Aktivitätsstream
              </h3>
              <div className="flex flex-col gap-[var(--space-3)]">
                {events.slice(0, 50).map((evt) => (
                  <div
                    key={evt.id}
                    className={`rounded-md bg-background-deep flex items-center justify-between gap-[var(--space-3)] border-0 border-l-[3px] border-solid px-[14px] py-[10px] ${evt.type === 'DEAL_WON' ? 'border-l-primary' : evt.type === 'NEW_LEAD' ? 'border-l-[#e5c07b]' : 'border-l-border'}`}
                  >
                    <div>
                      <div className="flex items-center gap-[8px] mb-[2px]">
                        <span className="text-[11px] font-bold text-primary">Tick #{evt.tick}</span>
                        <span className="text-[13px] font-semibold text-text">{evt.title}</span>
                      </div>
                      <div className="text-[12.5px] text-[var(--color-text-muted)]">{evt.details}</div>
                    </div>
                    <div className="text-[11.5px] whitespace-nowrap text-[var(--color-text-dim)]">{evt.timestamp}</div>
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
