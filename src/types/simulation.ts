import { SalesQueueMetrics, SalesQueueProjection } from './salesQueue';
import { CSQueueMetrics, CSQueueProjection, CustomerHealthMetrics, ChurnCause } from './csQueue';
import { FinancialMetrics } from './financial';
import { RejectedTransitionEntry, InvariantViolationReport } from './stateMachine';

export type SimulationSpeed = 1 | 2 | 5 | 10;

export type LeadStatus = 'New' | 'MQL' | 'SQL' | 'Hot' | 'Won' | 'Lost' | 'Disqualified';

export type OpportunityStage =
  'Discovery' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';

export interface SimulationMetrics {
  liveLeads: number;
  liveMQLs: number;
  liveSQLs: number;
  liveHotLeads: number;
  liveOpportunities: number;
  livePipelineValue: number;
  liveWonDeals: number;
  liveLostDeals: number;
  liveCustomers: number;
  liveMRR: number;
  liveARR: number;
  conversionRate: number; // percentage (0-100)
  salesQueueMetrics?: SalesQueueMetrics;
  csQueueMetrics?: CSQueueMetrics;
  customerHealthMetrics?: CustomerHealthMetrics;
  financialMetrics?: FinancialMetrics;
}

export interface SimulationState {
  isRunning: boolean;
  tickCount: number;
  dayIndex: number;
  simulatedDate: string;
  seed: number;
  speed: SimulationSpeed;
  intervalMs: number; // base 12000ms (12s)
  lastTickTimestamp: string;
  simulatedAt?: string;
  metrics?: SimulationMetrics;
  salesQueueProjection?: SalesQueueProjection;
  csQueueProjection?: CSQueueProjection;
  cumulativeCashFlow?: number;
  rejectedTransitions?: RejectedTransitionEntry[];
  hasInvariantViolation?: boolean;
  invariantReport?: InvariantViolationReport;
  // Legacy stub fields for engine.ts compatibility
  totalLeadsGenerated: number;
  totalDealsWon: number;
  currentARR: number;
}

export interface SimulationLead {
  id: string;
  contactName: string;
  companyName: string;
  email: string;
  industry: string;
  city: string;
  status: LeadStatus;
  score: number;
  source: string;
  estimatedValue: number;
  owner: string;
  createdAtTick: number;
  lastUpdatedTick: number;
}

export interface SimulationOpportunity {
  id: string;
  leadId: string;
  title: string;
  companyName: string;
  stage: OpportunityStage;
  value: number;
  probability: number;
  createdTick: number;
  parentDealId?: string;
}

export interface SimulationDeal {
  id: string;
  companyName: string;
  contactName: string;
  dealName: string;
  amount: number;
  mrr: number;
  arr: number;
  packageName: string;
  wonAtTick: number;
  closeDate: string;
  parentDealId?: string;
  isChurned?: boolean;
  churnedAtTick?: number;
  churnCause?: ChurnCause;
  healthScore?: number;
}

export interface SimulationActivity {
  id: string;
  tick: number;
  type:
    | 'Inbound Ingestion'
    | 'Scoring Update'
    | 'Qualification'
    | 'Meeting Booked'
    | 'Proposal Sent'
    | 'Deal Closed Won'
    | 'Deal Closed Lost'
    | 'Customer Churned'
    | 'Re-Engagement Triggered';
  description: string;
  entityName: string;
  timestamp: string;
}

export type SimulationEventType =
  | 'NEW_LEAD'
  | 'QUALIFIED_MQL'
  | 'QUALIFIED_SQL'
  | 'QUALIFIED_HOT'
  | 'OPPORTUNITY_CREATED'
  | 'DEAL_WON'
  | 'DEAL_LOST'
  | 'STATUS_CHANGE'
  | 'AI_INSIGHT'
  | 'ACTIVITY_LOGGED'
  | 'SYSTEM_INFO'
  | 'CUSTOMER_CHURNED'
  | 'RE_ENGAGEMENT_STARTED';

export interface SimulationEvent {
  id: string;
  tick: number;
  dayIndex: number;
  simulatedDate: string;
  type: SimulationEventType;
  title: string;
  details: string;
  affectedLead?: SimulationLead;
  affectedOpportunity?: SimulationOpportunity;
  affectedDeal?: SimulationDeal;
  churnCause?: ChurnCause;
  timestamp: string;
  correlationId?: string;
}

// 067E / G48 — historische Kennzahlen einer Baseline (Design §7.2). Der
// produktive Run-Pfad bezieht diese Werte ausschließlich hierüber; die
// früheren Literale 66 / 34320 / 411840 existieren nur noch als versionierter
// Demo-Anker in `baselineMapper.DEFAULT_HISTORICAL_METRICS`.
export interface HistoricalSimulationMetrics {
  baseCustomers: number;
  baseMRR: number;
  baseARR: number;
}

// 067E / G48 — kanonischer Engine-Einstieg pro Baseline (Design §7.2).
export interface SimulationBaselineInput {
  baselineId: string;
  baselineHash: string;
  organizationId: string;
  initialState: SimulationState;
  leads: SimulationLead[];
  opportunities: SimulationOpportunity[];
  deals: SimulationDeal[];
  activities: SimulationActivity[];
  historicalMetrics: HistoricalSimulationMetrics;
}
