import type { StateEvent } from './types';
import type { EventLedgerEntry } from './eventLedger';
import { getNpcKnowledgeContext } from './npcKnowledge';
import type { JianghuState, NPCGoal, NPCState } from './jianghu';

export type NPCPlanKind = NPCGoal['kind'];

export interface NPCPlan {
  npcId: string;
  goalId: string;
  kind: NPCPlanKind;
  targetId?: string;
  description: string;
}

export interface NPCOpportunity {
  available: boolean;
  reason: string;
}

export interface NPCAgencyResult {
  plan: NPCPlan;
  opportunity: NPCOpportunity;
  acted: boolean;
}

const clamp = (value: number, min = -100, max = 100) => Math.max(min, Math.min(max, value));

export function selectNpcGoal(npc: NPCState): NPCGoal | undefined {
  return npc.goals
    .filter(goal => goal.active)
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))[0];
}

export function createNpcPlan(npc: NPCState, goal: NPCGoal): NPCPlan {
  return {
    npcId: npc.id,
    goalId: goal.id,
    kind: goal.kind,
    targetId: goal.targetId,
    description: goal.description,
  };
}

export function evaluateNpcOpportunity(
  j: JianghuState,
  npc: NPCState,
  plan: NPCPlan,
  ledger: EventLedgerEntry[] = [],
): NPCOpportunity {
  switch (plan.kind) {
    case 'travel':
      return plan.targetId && npc.locationId !== plan.targetId
        ? { available: true, reason: 'destination-differs-from-current-location' }
        : { available: false, reason: 'already-at-destination-or-no-destination' };
    case 'trade': {
      const market = j.markets?.find(market => market.locationId === npc.locationId);
      return market && Object.keys(market.goods).length > 0 && npc.resources > 0
        ? { available: true, reason: 'local-market-and-resources-available' }
        : { available: false, reason: 'no-local-market-or-resources' };
    }
    case 'collect_debt': {
      const knowledge = getNpcKnowledgeContext(j, ledger, npc.id);
      const knownObligation = j.obligations.some(obligation =>
        !obligation.fulfilled &&
        obligation.creditorId === npc.id &&
        knowledge.knownLedgerEntries.some(entry =>
          entry.knowledgeConsequences.includes(`obligation:${obligation.id}:overdue`),
        ),
      );
      return knownObligation
        ? { available: true, reason: 'known-unfulfilled-obligation' }
        : { available: false, reason: 'no-known-unfulfilled-obligation' };
    }
    case 'investigate': {
      const knowledge = getNpcKnowledgeContext(j, ledger, npc.id);
      return knowledge.knownRumors.some(rumor => rumor.currentLocationId === npc.locationId)
        ? { available: true, reason: 'known-local-rumor-available' }
        : { available: false, reason: 'no-known-local-rumor' };
    }
    case 'protect':
      return j.worldEvents.some(event => event.active && event.locationId === npc.locationId)
        ? { available: true, reason: 'active-local-event' }
        : { available: false, reason: 'no-active-local-event' };
    default:
      return { available: false, reason: 'goal-kind-has-no-agency-action-yet' };
  }
}

export function executeNpcPlan(
  j: JianghuState,
  npc: NPCState,
  plan: NPCPlan,
  opportunity: NPCOpportunity,
  turn: number,
  relation: (state: JianghuState, subjectId: string, targetId: string, turn: number) => { debt: number; grudge: number },
  ensureMarket: (state: JianghuState, locationId: string, turn: number) => { goods: Record<string, number> },
): NPCAgencyResult {
  if (!opportunity.available) return { plan, opportunity, acted: false };

  switch (plan.kind) {
    case 'travel': {
      npc.locationId = plan.targetId!;
      const goal = npc.goals.find(goal => goal.id === plan.goalId);
      if (goal) {
        goal.progress = 100;
        goal.active = false;
      }
      return { plan, opportunity, acted: true };
    }
    case 'trade': {
      const market = ensureMarket(j, npc.locationId, turn);
      const good = Object.keys(market.goods)[0];
      if (!good || npc.resources <= 0) return { plan, opportunity: { available: false, reason: 'trade-resource-race-failed' }, acted: false };
      market.goods[good] += 1;
      npc.resources = Math.max(0, npc.resources - 1);
      return { plan, opportunity, acted: true };
    }
    case 'collect_debt': {
      const debt = j.obligations.find(o => !o.fulfilled && o.creditorId === npc.id);
      if (!debt) return { plan, opportunity: { available: false, reason: 'obligation-no-longer-available' }, acted: false };
      const relationship = relation(j, debt.debtorId, npc.id, turn);
      relationship.debt = clamp(relationship.debt + debt.severity, 0, 100);
      relationship.grudge = clamp(relationship.grudge + Math.ceil(debt.severity / 2), 0, 100);
      return { plan, opportunity, acted: true };
    }
    case 'investigate': {
      const rumor = j.rumors.find(rumor => rumor.currentLocationId === npc.locationId && rumor.knownBy.includes(npc.id));
      if (!rumor) return { plan, opportunity: { available: false, reason: 'rumor-no-longer-available' }, acted: false };
      rumor.credibility = clamp(rumor.credibility + 2, 0, 100);
      return { plan, opportunity, acted: true };
    }
    case 'protect': {
      const localEvent = j.worldEvents.find(event => event.active && event.locationId === npc.locationId);
      if (!localEvent) return { plan, opportunity: { available: false, reason: 'event-no-longer-available' }, acted: false };
      localEvent.severity = Math.max(1, localEvent.severity - 1);
      return { plan, opportunity, acted: true };
    }
    default:
      return { plan, opportunity, acted: false };
  }
}

export function emitNpcAgencyEvent(
  result: NPCAgencyResult,
  npc: NPCState,
  turn: number,
): StateEvent | undefined {
  if (!result.acted) return undefined;
  return {
    type: 'world.npc_action',
    causes: [`npc:${npc.id}:goal:${result.plan.goalId}`, `npc:${npc.id}:opportunity`],
    witnesses: [npc.id],
    knowledgeConsequences: [`npc:${npc.id}:action:${result.plan.kind}`],
    payload: {
      npcId: npc.id,
      goalId: result.plan.goalId,
      kind: result.plan.kind,
      turn,
    },
  };
}
