export type CSQueueStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type ChurnCause = 'HEALTH_PROBLEM' | 'CS_CAPACITY' | 'BASELINE_CHURN';

export interface CustomerHealthFactors {
  onboardingScore: number;     // 0 - 100
  supportScore: number;        // 0 - 100
  engagementScore: number;     // 0 - 100
  openIssuesScore: number;     // 0 - 100
  csQueueTimePenalty?: number; // 0 - 20 pts penalty
}

export interface CustomerHealthMetrics {
  avgHealthScore: number;
  minHealthScore: number;
  maxHealthScore: number;
  atRiskCustomerCount: number;
  churnedCustomerCount: number;
  churnCausesBreakdown: Record<ChurnCause, number>;
}

export interface CSQueueEntry {
  id: string;
  customerId: string;
  companyName: string;
  workloadPoints: number;
  priority: number;
  enteredQueueTick: number;
  dueAtTick: number;
  status: CSQueueStatus;
  processTicks: number;
  queueTicks: number;
  totalCSTimeTicks: number;
  lastUpdatedTick: number;
  healthScoreAtQueue: number;
  churnRiskAtQueue: number;
}

export interface CSQueueProjection {
  tick: number;
  dayIndex: number;
  simulatedDate: string;
  totalQueueEntries: number;
  waitingCount: number;
  inProgressCount: number;
  completedCount: number;
  availableCapacity: number;
  usedCapacity: number;
  freeCapacity: number;
  avgQueueTicks: number;
  maxQueueTicks: number;
  avgProcessTicks: number;
  capacityUtilization: number; // 0 - 100%
  isCSBottleneck: boolean;
  entries: CSQueueEntry[];
}

export interface CSQueueMetrics {
  waitingCount: number;
  inProgressCount: number;
  completedCount: number;
  availableCapacity: number;
  avgQueueTicks: number;
  maxQueueTicks: number;
  avgProcessTicks: number;
  capacityUtilization: number;
  isCSBottleneck: boolean;
}
