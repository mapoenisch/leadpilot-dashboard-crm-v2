export type EntityType = 'LEAD' | 'DEAL' | 'CUSTOMER';

export interface RejectedTransitionEntry {
  id: string;
  entityId: string;
  entityType: EntityType;
  fromState: string;
  toState: string;
  action: string;
  reason: string;
  rejectedAtTick: number;
  simulatedDate: string;
}

export interface InvariantViolationReport {
  tick: number;
  hasViolation: boolean;
  violations: string[];
  verifiedAtDate: string;
}

export interface StateTransitionResult<T> {
  success: boolean;
  updatedEntity?: T;
  rejectedEntry?: RejectedTransitionEntry;
}
