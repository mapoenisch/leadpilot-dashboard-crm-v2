import {
  CSQueueEntry,
  CSQueueMetrics,
  CSQueueProjection,
  CustomerHealthFactors,
  CustomerHealthMetrics,
  ChurnCause,
} from '../types/csQueue';
import { SimulationDeal } from '../types/simulation';

export class CSQueueManager {
  /**
   * Technical Implementation Assumption:
   * availableCSCapacity = max(0, floor(csRepCount))
   * 1 FTE = 1 active CS engagement slot per tick.
   */
  public static calculateCSCapacity(csRepCount: number): number {
    return Math.max(0, Math.floor(csRepCount));
  }

  /**
   * Calculate Customer Health Score (0 - 100)
   * Formula:
   * Base = 0.25 * Onboarding + 0.25 * Support + 0.25 * Engagement + 0.25 * OpenIssues
   * Penalty = min(20, csQueueTimePenalty)
   * Final = clamp(Base - Penalty, 0, 100)
   */
  public static calculateHealthScore(factors: CustomerHealthFactors): number {
    const base =
      factors.onboardingScore * 0.25 +
      factors.supportScore * 0.25 +
      factors.engagementScore * 0.25 +
      factors.openIssuesScore * 0.25;

    const penalty = Math.min(20, factors.csQueueTimePenalty || 0);
    return Math.min(100, Math.max(0, Math.round(base - penalty)));
  }

  /**
   * Calculate Churn Risk (0.0 - 1.0 probability per tick)
   * Derived from healthScore, csQueueTicks, and monthly churn rate parameter.
   */
  public static calculateChurnRisk(
    healthScore: number,
    csQueueTicks: number,
    churnRateMonthly: number
  ): number {
    const baseDailyRisk = (churnRateMonthly / 100) / 30;
    const healthRiskFactor = (100 - healthScore) / 100; // 0 (100 health) to 1.0 (0 health)
    const queueRiskFactor = Math.min(1.0, csQueueTicks * 0.05);

    // Risk multiplier ranges from ~1.0 to 4.0 based on health and queue delay
    const multiplier = 1.0 + healthRiskFactor * 2.0 + queueRiskFactor * 1.0;
    return Math.min(1.0, baseDailyRisk * multiplier);
  }

  /**
   * Calculate CS Entry Priority
   * Priority incorporates:
   * 1. Health (low health boosts priority)
   * 2. Churn Risk (high risk boosts priority)
   * 3. Customer Value (arr / 10000)
   * 4. Queue Age (queueAgeTicks * 2)
   */
  public static calculateCSPriority(
    healthScore: number,
    churnRisk: number,
    customerValue: number,
    queueAgeTicks: number
  ): number {
    const healthPrio = (100 - healthScore) * 5;
    const riskPrio = Math.round(churnRisk * 300);
    const valuePrio = Math.floor(customerValue / 10000);
    const agePrio = queueAgeTicks * 2;

    return Math.max(0, Math.round(healthPrio + riskPrio + valuePrio + agePrio));
  }

  /**
   * Classify Churn Cause
   * - HEALTH_PROBLEM: if healthScore < 40
   * - CS_CAPACITY: if healthScore >= 40 && queueTicks > 3
   * - BASELINE_CHURN: otherwise
   */
  public static classifyChurnCause(
    healthScore: number,
    queueTicks: number
  ): ChurnCause {
    if (healthScore < 40) {
      return 'HEALTH_PROBLEM';
    }
    if (queueTicks > 3) {
      return 'CS_CAPACITY';
    }
    return 'BASELINE_CHURN';
  }

  /**
   * Process 1 Tick of CS Queue Execution
   * Respects Decision 1381 (NON-PREEMPTION GUARANTEE):
   * Active IN_PROGRESS entries are NEVER preempted.
   */
  public static processTick(
    existingEntries: CSQueueEntry[],
    csRepCount: number,
    currentTick: number,
    activeDeals: SimulationDeal[]
  ): { updatedEntries: CSQueueEntry[]; projection: CSQueueProjection } {
    const capacity = this.calculateCSCapacity(csRepCount);
    const nextEntries: CSQueueEntry[] = [];

    // 1. Separate IN_PROGRESS and WAITING entries
    const inProgressList = existingEntries.filter((e) => e.status === 'IN_PROGRESS');
    const waitingList = existingEntries.filter((e) => e.status === 'WAITING');

    let usedCapacity = 0;

    // Advance IN_PROGRESS items first (NON-PREEMPTION)
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
          totalCSTimeTicks: newTotal,
          status: isFinished ? 'COMPLETED' : 'IN_PROGRESS',
          lastUpdatedTick: currentTick,
        });
      } else {
        // Capacity dropped below in-progress count
        const newQueue = entry.queueTicks + 1;
        nextEntries.push({
          ...entry,
          queueTicks: newQueue,
          totalCSTimeTicks: entry.processTicks + newQueue,
          status: 'WAITING',
          lastUpdatedTick: currentTick,
        });
      }
    }

    // Update priorities of WAITING items and sort deterministically
    const updatedWaiting = waitingList.map((e) => {
      const queueAge = currentTick - e.enteredQueueTick;
      const deal = activeDeals.find((d) => d.id === e.customerId || d.companyName === e.companyName);
      const val = deal ? deal.arr : 10000;
      const health = e.healthScoreAtQueue;
      const risk = e.churnRiskAtQueue;
      const newPriority = deal
        ? this.calculateCSPriority(health, risk, val, queueAge)
        : e.priority + 2;

      const newQueueTicks = e.queueTicks + 1;

      return {
        ...e,
        priority: newPriority,
        queueTicks: newQueueTicks,
        totalCSTimeTicks: e.processTicks + newQueueTicks,
        lastUpdatedTick: currentTick,
      };
    });

    // Deterministic sort: Priority DESC -> Queue Age DESC -> Entry ID ASC
    updatedWaiting.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      if (a.enteredQueueTick !== b.enteredQueueTick) {
        return a.enteredQueueTick - b.enteredQueueTick;
      }
      return a.id.localeCompare(b.id);
    });

    // Promote WAITING items to IN_PROGRESS if capacity permits
    for (const entry of updatedWaiting) {
      if (usedCapacity < capacity) {
        usedCapacity += 1;
        const newProcess = 1;
        const isFinished = newProcess >= entry.workloadPoints;

        if (isFinished) {
          usedCapacity -= 1;
        }

        nextEntries.push({
          ...entry,
          processTicks: newProcess,
          totalCSTimeTicks: newProcess + entry.queueTicks,
          status: isFinished ? 'COMPLETED' : 'IN_PROGRESS',
          lastUpdatedTick: currentTick,
        });
      } else {
        // Remains WAITING
        nextEntries.push(entry);
      }
    }

    // Re-include any completed or cancelled entries
    for (const entry of existingEntries) {
      if (entry.status === 'COMPLETED' || entry.status === 'CANCELLED') {
        nextEntries.push(entry);
      }
    }

    const projection = this.buildProjection(nextEntries, capacity, currentTick);
    return { updatedEntries: nextEntries, projection };
  }

  /**
   * Build CS Queue Analytics Projection
   */
  public static buildProjection(
    entries: CSQueueEntry[],
    capacity: number,
    currentTick: number,
    dayIndex = 0,
    simulatedDate = '2026-01-01'
  ): CSQueueProjection {
    const waiting = entries.filter((e) => e.status === 'WAITING');
    const inProgress = entries.filter((e) => e.status === 'IN_PROGRESS');
    const completed = entries.filter((e) => e.status === 'COMPLETED');

    const usedCapacity = inProgress.length;
    const freeCapacity = Math.max(0, capacity - usedCapacity);

    let totalQueueTicks = 0;
    let maxQueueTicks = 0;
    let totalProcessTicks = 0;

    for (const e of entries) {
      totalQueueTicks += e.queueTicks;
      if (e.queueTicks > maxQueueTicks) {
        maxQueueTicks = e.queueTicks;
      }
      totalProcessTicks += e.processTicks;
    }

    const totalCount = entries.length;
    const avgQueueTicks = totalCount > 0 ? Math.round((totalQueueTicks / totalCount) * 10) / 10 : 0;
    const avgProcessTicks = totalCount > 0 ? Math.round((totalProcessTicks / totalCount) * 10) / 10 : 0;
    const capacityUtilization = capacity > 0 ? Math.round((usedCapacity / capacity) * 100) : 0;

    const isCSBottleneck = avgQueueTicks > 0 || (waiting.length > 0 && freeCapacity === 0);

    return {
      tick: currentTick,
      dayIndex,
      simulatedDate,
      totalQueueEntries: totalCount,
      waitingCount: waiting.length,
      inProgressCount: inProgress.length,
      completedCount: completed.length,
      availableCapacity: capacity,
      usedCapacity,
      freeCapacity,
      avgQueueTicks,
      maxQueueTicks,
      avgProcessTicks,
      capacityUtilization,
      isCSBottleneck,
      entries: entries.slice(-20), // Keep latest 20 entries in snapshot projection
    };
  }

  /**
   * Build aggregated CS & Customer Health Metrics
   */
  public static calculateMetrics(
    entries: CSQueueEntry[],
    deals: SimulationDeal[],
    capacity: number
  ): { csQueueMetrics: CSQueueMetrics; customerHealthMetrics: CustomerHealthMetrics } {
    const proj = this.buildProjection(entries, capacity, 0);

    let sumHealth = 0;
    let minHealth = 100;
    let maxHealth = 0;
    let atRiskCount = 0;
    let churnedCount = 0;

    const causesBreakdown: Record<ChurnCause, number> = {
      HEALTH_PROBLEM: 0,
      CS_CAPACITY: 0,
      BASELINE_CHURN: 0,
    };

    const activeDeals = deals.filter((d) => !d.isChurned);

    for (const d of deals) {
      const h = d.healthScore ?? 75;
      sumHealth += h;
      if (h < minHealth) minHealth = h;
      if (h > maxHealth) maxHealth = h;
      if (h < 50) atRiskCount += 1;
      if (d.isChurned) {
        churnedCount += 1;
        if (d.churnCause) {
          causesBreakdown[d.churnCause] += 1;
        } else {
          causesBreakdown.BASELINE_CHURN += 1;
        }
      }
    }

    const avgHealthScore = deals.length > 0 ? Math.round((sumHealth / deals.length) * 10) / 10 : 75;

    return {
      csQueueMetrics: {
        waitingCount: proj.waitingCount,
        inProgressCount: proj.inProgressCount,
        completedCount: proj.completedCount,
        availableCapacity: capacity,
        avgQueueTicks: proj.avgQueueTicks,
        maxQueueTicks: proj.maxQueueTicks,
        avgProcessTicks: proj.avgProcessTicks,
        capacityUtilization: proj.capacityUtilization,
        isCSBottleneck: proj.isCSBottleneck,
      },
      customerHealthMetrics: {
        avgHealthScore,
        minHealthScore: deals.length > 0 ? minHealth : 75,
        maxHealthScore: deals.length > 0 ? maxHealth : 75,
        atRiskCustomerCount: atRiskCount,
        churnedCustomerCount: churnedCount,
        churnCausesBreakdown: causesBreakdown,
      },
    };
  }
}
