export type SalesQueueStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface SalesQueueEntry {
  id: string;
  leadId: string;
  opportunityId?: string;
  companyName: string;
  stage: 'QUALIFICATION' | 'PITCH_DEMO' | 'PROPOSAL' | 'CLOSING';
  workloadPoints: number;
  priority: number;
  enteredQueueTick: number;
  dueAtTick: number;
  status: SalesQueueStatus;
  processTicks: number;
  queueTicks: number;
  totalSalesCycleTicks: number;
  lastUpdatedTick: number;
}

export interface SalesQueueProjection {
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
  isSalesBottleneck: boolean;
  entries?: SalesQueueEntry[];
}

export interface SalesQueueMetrics {
  waitingCount: number;
  inProgressCount: number;
  avgQueueTicks: number;
  maxQueueTicks: number;
  avgProcessTicks: number;
  totalCycleTicks: number;
  isSalesBottleneck: boolean;
  capacityUtilization: number; // 0 - 100 %
}
