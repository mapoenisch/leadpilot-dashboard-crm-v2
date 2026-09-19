import { SalesQueueEntry, SalesQueueMetrics, SalesQueueProjection } from '../types/salesQueue';
import { SimulationLead } from '../types/simulation';

/**
 * Technical Implementation Assumptions for Sales Queue Domain:
 *
 * 1. Sales Capacity Derivation:
 *    availableCapacity = Math.max(1, salesRepCount)
 *    Each sales rep (1 FTE) provides capacity to actively process 1 sales item per tick (1 day).
 *
 * 2. Workload Points Derivation:
 *    workloadPoints = 1 tick per stage progression step (Qualification, Pitch/Demo, Proposal, Closing).
 *
 * 3. Priority Scoring Formula:
 *    priority = (leadQualityScore * 10) + Math.floor(estimatedValue / 10000) + (queueAgeTicks * 2)
 *    Deterministic multi-factor score incorporating lead score, deal value, and waiting age.
 *
 * 4. Non-Preemption Rule (Decision 1367):
 *    Entries with status 'IN_PROGRESS' are NEVER preempted by higher priority 'WAITING' entries.
 *    They remain active until their current stage processing completes.
 */
export class SalesQueueManager {
  /**
   * Derives available sales processing capacity from salesRepCount (FTE).
   * Technical Implementation Assumption: 1 FTE = 1 active item capacity per tick.
   */
  public static calculateSalesCapacity(salesRepCount: number): number {
    return Math.max(0, Math.floor(salesRepCount));
  }

  /**
   * Calculates required workload points for a stage transition.
   * Technical Implementation Assumption: 1 workload point per stage.
   */
  public static calculateWorkload(stage: SalesQueueEntry['stage']): number {
    switch (stage) {
      case 'QUALIFICATION':
        return 1;
      case 'PITCH_DEMO':
        return 1;
      case 'PROPOSAL':
        return 1;
      case 'CLOSING':
        return 1;
      default:
        return 1;
    }
  }

  /**
   * Dynamically calculates priority score for a queue entry.
   * Higher score = higher priority.
   */
  public static calculatePriority(
    leadScore: number,
    estimatedValue: number,
    queueAgeTicks: number,
  ): number {
    const qualityWeight = leadScore * 10;
    const valueWeight = Math.floor(estimatedValue / 10000);
    const ageWeight = queueAgeTicks * 2;
    return qualityWeight + valueWeight + ageWeight;
  }

  /**
   * Synchronously advances the Sales Queue for 1 tick in accordance with Decisions 1349–1373.
   */
  public static processTick(
    currentEntries: SalesQueueEntry[],
    salesRepCount: number,
    currentTick: number,
    activeLeads: SimulationLead[],
  ): {
    updatedEntries: SalesQueueEntry[];
    projection: SalesQueueProjection;
  } {
    const capacity = SalesQueueManager.calculateSalesCapacity(salesRepCount);

    // 1. Sync new active leads into SalesQueue entries
    const entries: SalesQueueEntry[] = [...currentEntries];

    for (const lead of activeLeads) {
      if (lead.status === 'Won' || lead.status === 'Lost' || lead.status === 'Disqualified') {
        continue;
      }
      const existing = entries.find(
        (e) => e.leadId === lead.id && e.status !== 'COMPLETED' && e.status !== 'CANCELLED',
      );
      if (!existing) {
        let stage: SalesQueueEntry['stage'] = 'QUALIFICATION';
        if (lead.status === 'MQL') stage = 'PITCH_DEMO';
        else if (lead.status === 'SQL') stage = 'PROPOSAL';
        else if (lead.status === 'Hot') stage = 'CLOSING';

        const workload = SalesQueueManager.calculateWorkload(stage);
        const dueAtTick = lead.createdAtTick + 1; // dueAt = tick after creation (dueAt Semantik: Decisions 1360/1361)
        const priority = SalesQueueManager.calculatePriority(lead.score, lead.estimatedValue, 0);

        const newEntry: SalesQueueEntry = {
          id: `sqe-${lead.id}-t${currentTick}`,
          leadId: lead.id,
          companyName: lead.companyName,
          stage,
          workloadPoints: workload,
          priority,
          enteredQueueTick: currentTick,
          dueAtTick,
          status: 'WAITING',
          processTicks: 0,
          queueTicks: 0,
          totalSalesCycleTicks: 0,
          lastUpdatedTick: currentTick,
        };
        entries.push(newEntry);
      }
    }

    // 2. Process active entries (NON-PREEMPTION: IN_PROGRESS items stay active)
    let usedCapacity = 0;
    const nextEntries: SalesQueueEntry[] = [];

    // Separate into in-progress and waiting
    const inProgressList = entries.filter((e) => e.status === 'IN_PROGRESS');
    const waitingList = entries.filter((e) => e.status === 'WAITING');
    const completedOrCancelled = entries.filter(
      (e) => e.status === 'COMPLETED' || e.status === 'CANCELLED',
    );

    // Advance IN_PROGRESS items first
    for (const entry of inProgressList) {
      if (usedCapacity < capacity) {
        const newProcess = entry.processTicks + 1;
        const newTotal = newProcess + entry.queueTicks;
        const isFinished = newProcess >= entry.workloadPoints;

        if (!isFinished) {
          usedCapacity += 1;
        }

        nextEntries.push({
          ...entry,
          processTicks: newProcess,
          totalSalesCycleTicks: newTotal,
          status: isFinished ? 'COMPLETED' : 'IN_PROGRESS',
          lastUpdatedTick: currentTick,
        });
      } else {
        // Capacity dropped below in-progress count (e.g. parameter salesRepCount decreased)
        const newQueue = entry.queueTicks + 1;
        nextEntries.push({
          ...entry,
          queueTicks: newQueue,
          totalSalesCycleTicks: entry.processTicks + newQueue,
          status: 'WAITING',
          lastUpdatedTick: currentTick,
        });
      }
    }

    // Update priorities of WAITING items and sort deterministically
    const updatedWaiting = waitingList.map((e) => {
      const queueAge = currentTick - e.enteredQueueTick;
      const lead = activeLeads.find((l) => l.id === e.leadId);
      const newPriority = lead
        ? SalesQueueManager.calculatePriority(lead.score, lead.estimatedValue, queueAge)
        : e.priority + 2; // Retain base priority + age boost per tick
      const newQueueTicks = e.queueTicks + 1;

      return {
        ...e,
        priority: newPriority,
        queueTicks: newQueueTicks,
        totalSalesCycleTicks: e.processTicks + newQueueTicks,
        lastUpdatedTick: currentTick,
      };
    });

    // Deterministic priority sort: Higher priority score first. Tie-breaker: Earlier enteredQueueTick first.
    updatedWaiting.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.enteredQueueTick - b.enteredQueueTick;
    });

    // Assign remaining capacity to highest priority WAITING items
    let freeCapacity = capacity - usedCapacity;

    for (const entry of updatedWaiting) {
      if (freeCapacity > 0) {
        freeCapacity -= 1;
        usedCapacity += 1;

        nextEntries.push({
          ...entry,
          processTicks: 1,
          totalSalesCycleTicks: 1 + entry.queueTicks,
          status: 'IN_PROGRESS',
          lastUpdatedTick: currentTick,
        });
      } else {
        // Remains WAITING
        nextEntries.push(entry);
      }
    }

    // Recombine all entries
    const finalEntries = [...completedOrCancelled, ...nextEntries];

    // Compute projection
    const projection = SalesQueueManager.buildProjection(finalEntries, capacity, currentTick);

    return {
      updatedEntries: finalEntries,
      projection,
    };
  }

  /**
   * Builds the persistent projection for the current tick.
   */
  public static buildProjection(
    entries: SalesQueueEntry[],
    capacity: number,
    currentTick: number,
  ): SalesQueueProjection {
    const waitingList = entries.filter((e) => e.status === 'WAITING');
    const inProgressList = entries.filter((e) => e.status === 'IN_PROGRESS');
    const completedList = entries.filter((e) => e.status === 'COMPLETED');

    const totalQueueEntries = waitingList.length + inProgressList.length;
    const availableCapacity = capacity;
    const usedCapacity = inProgressList.length;
    const freeCapacity = Math.max(0, capacity - usedCapacity);

    let totalQueueTicks = 0;
    let maxQueueTicks = 0;
    for (const e of waitingList) {
      totalQueueTicks += e.queueTicks;
      if (e.queueTicks > maxQueueTicks) {
        maxQueueTicks = e.queueTicks;
      }
    }
    const avgQueueTicks =
      waitingList.length > 0 ? Math.round((totalQueueTicks / waitingList.length) * 10) / 10 : 0;

    let totalProcessTicks = 0;
    const activeAndCompleted = [...inProgressList, ...completedList];
    for (const e of activeAndCompleted) {
      totalProcessTicks += e.processTicks;
    }
    const avgProcessTicks =
      activeAndCompleted.length > 0
        ? Math.round((totalProcessTicks / activeAndCompleted.length) * 10) / 10
        : 0;

    // Bottleneck condition: avgQueueTicks > 0 OR (waitingCount > 0 AND freeCapacity === 0)
    const isSalesBottleneck = avgQueueTicks > 0 || (waitingList.length > 0 && freeCapacity === 0);

    const simulatedDate = `${currentTick}.01.2026`;

    return {
      tick: currentTick,
      dayIndex: currentTick,
      simulatedDate,
      totalQueueEntries,
      waitingCount: waitingList.length,
      inProgressCount: inProgressList.length,
      completedCount: completedList.length,
      availableCapacity,
      usedCapacity,
      freeCapacity,
      avgQueueTicks,
      maxQueueTicks,
      avgProcessTicks,
      isSalesBottleneck,
      entries: entries.slice(-20), // Keep last 20 entries in projection
    };
  }

  /**
   * Computes summary metrics for real-time analytics.
   */
  public static calculateMetrics(projection: SalesQueueProjection): SalesQueueMetrics {
    const capacityUtilization =
      projection.availableCapacity > 0
        ? Math.min(100, Math.round((projection.usedCapacity / projection.availableCapacity) * 100))
        : 0;

    return {
      waitingCount: projection.waitingCount,
      inProgressCount: projection.inProgressCount,
      avgQueueTicks: projection.avgQueueTicks,
      maxQueueTicks: projection.maxQueueTicks,
      avgProcessTicks: projection.avgProcessTicks,
      totalCycleTicks: projection.avgProcessTicks + projection.avgQueueTicks,
      isSalesBottleneck: projection.isSalesBottleneck,
      capacityUtilization,
    };
  }
}
