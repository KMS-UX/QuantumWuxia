import type { SimulationState, StateEvent } from './types';
import { chainPace } from './jianghu';
import type { JianghuState, CausalChainState, LocationConditionState } from './jianghu';

export type V5Branch = 'escalate' | 'deescalate' | 'suppress' | 'confirm' | 'false' | 'react';
export interface V5Result { jianghu: JianghuState; events: StateEvent[]; }
const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

function eligible(j: JianghuState, chain: CausalChainState, simulation: SimulationState): boolean {
  if (!chain.active || chain.nextCheckTurn > simulation.world.turn) return false;
  const event = j.worldEvents.find(e => e.id === chain.rootEventId);
  if (!event || !event.active || event.severity <= 0) return false;
  if (event.locationId && event.locationId !== simulation.character.locationId && chain.step > 0) return false;
  return true;
}
function ensureLocationCondition(j: JianghuState, locationId: string, sourceId: string, label: string, severity: number, turn: number): LocationConditionState {
  j.locationConditions = j.locationConditions ?? [];
  let c = j.locationConditions.find(x => x.locationId === locationId && x.sourceId === sourceId);
  if (!c) {
    c = { id: 'loccond-' + sourceId + '-' + locationId, locationId, sourceId, label, severity: clamp(severity, 1, 5), createdTurn: turn, expiresTurn: turn + 3, active: true };
    j.locationConditions.push(c);
  } else {
    c.severity = clamp(c.severity + severity, 1, 5);
    c.expiresTurn = Math.max(c.expiresTurn, turn + 2);
    c.active = true;
  }
  return c;
}
function factionReaction(j: JianghuState, factionIds: string[], branch: V5Branch, severity: number, events: StateEvent[]): void {
  for (const id of factionIds) {
    const faction = j.factions.find(f => f.id === id);
    if (!faction) continue;
    if (branch === 'escalate') faction.internalTension = clamp(faction.internalTension + severity * 3);
    if (branch === 'deescalate' || branch === 'suppress') faction.internalTension = clamp(faction.internalTension - severity * 2);
    if (branch === 'confirm') faction.influence = clamp(faction.influence + 1);
    events.push({ type: 'world.faction_reaction', causes: [`causal-branch:${branch}`, `faction:${id}:reaction`], witnesses: [id], payload: { factionId: id, branch, tension: faction.internalTension } });
  }
}
function marketReaction(j: JianghuState, locationId: string | undefined, branch: V5Branch, severity: number, turn: number, events: StateEvent[]): void {
  if (!locationId) return;
  const market = j.markets?.find(m => m.locationId === locationId);
  if (!market) return;
  for (const good of Object.keys(market.scarcity)) {
    if (branch === 'escalate') market.scarcity[good] = clamp(market.scarcity[good] + severity * 2);
    if (branch === 'deescalate') market.scarcity[good] = clamp(market.scarcity[good] - severity * 2);
    market.priceMultipliers[good] = Number((1 + market.scarcity[good] / 100).toFixed(2));
  }
  market.lastUpdatedTurn = turn;
  events.push({ type: 'world.market_changed', causes: [`causal-branch:${branch}`, `location:${locationId}:market`], payload: { locationId, turn, branch } });
}
function verifyKnowledge(j: JianghuState, simulation: SimulationState, eventId: string, branch: V5Branch): void {
  for (const record of j.knowledgeRecords ?? []) {
    if (record.sourceId !== eventId) continue;
    if (branch === 'confirm') {
      record.trueState = 'true'; record.confidence = Math.max(record.confidence, 90); record.lastVerifiedTurn = simulation.world.turn;
    } else if (branch === 'false') {
      record.trueState = 'false'; record.confidence = Math.max(record.confidence, 90); record.lastVerifiedTurn = simulation.world.turn;
    }
  }
}
function chooseBranch(j: JianghuState, chain: CausalChainState): V5Branch {
  const event = j.worldEvents.find(e => e.id === chain.rootEventId);
  if (!event) return 'deescalate';
  if (chain.kind === 'information') {
    const rumor = j.rumors.find(r => r.id === event.id || r.text === event.description);
    if (rumor?.status === 'false') return 'false';
    if (rumor?.status === 'confirmed' || (rumor?.credibility ?? 0) >= 80) return 'confirm';
    if (rumor && (rumor.credibility ?? 0) < 30) return 'suppress';
    return event.severity >= 4 ? 'escalate' : 'react';
  }
  if (chain.kind === 'faction') {
    const hostile = event.factionIds.some(id => (j.factionRelations ?? []).some(r =>
      (r.factionAId === id || r.factionBId === id) && r.hostility >= 70));
    return hostile || event.severity >= 4 ? 'escalate' : 'deescalate';
  }
  if (chain.kind === 'economic') return event.severity >= 4 ? 'escalate' : 'deescalate';
  return event.severity >= 4 ? 'escalate' : 'react';
}
function reactNpcs(j: JianghuState, simulation: SimulationState, branch: V5Branch, severity: number): void {
  for (const npc of j.npcs) {
    if (!npc.alive || npc.locationId !== simulation.character.locationId) continue;
    if (branch === 'escalate') npc.disposition = clamp(npc.disposition - Math.max(1, severity), -100, 100);
    if (branch === 'deescalate') npc.disposition = clamp(npc.disposition + 1, -100, 100);
    if (branch === 'suppress') npc.disposition = clamp(npc.disposition - 1, -100, 100);
  }
}
export function advanceCausalityV5(input: JianghuState, simulation: SimulationState): V5Result {
  const j: JianghuState = JSON.parse(JSON.stringify(input));
  const events: StateEvent[] = [];
  const turn = simulation.world.turn;
  j.locationConditions = (j.locationConditions ?? []).filter(c => c.active && c.expiresTurn >= turn);

  for (const chain of j.causalChains ?? []) {
    if (!eligible(j, chain, simulation)) continue;
    const root = j.worldEvents.find(e => e.id === chain.rootEventId);
    if (!root) continue;
    const branch = chooseBranch(j, chain);
    const pace = chainPace(root);
    chain.step += 1;
    chain.nextCheckTurn = turn + pace.interval;
    chain.sourceIds.push('v5-' + branch + '-turn-' + turn);
    if (branch === 'escalate') root.severity = clamp(root.severity + 1, 1, 5);
    if (branch === 'deescalate' || branch === 'suppress') root.severity = Math.max(1, root.severity - 1);
    factionReaction(j, root.factionIds, branch, root.severity, events);
    marketReaction(j, root.locationId, branch, root.severity, turn, events);
    reactNpcs(j, simulation, branch, root.severity);
    if (root.locationId) {
      const label = branch === 'escalate' ? 'heightened tension' : branch === 'deescalate' ? 'calmer conditions' : 'unsettled conditions';
      const condition = ensureLocationCondition(j, root.locationId, root.id, label, root.severity, turn);
      events.push({ type: 'world.location_reaction', causes: [`causal-branch:${branch}`, `root-event:${root.id}`], causalLinks: [root.id], payload: { locationId: condition.locationId, conditionId: condition.id, branch, severity: condition.severity } });
    }
    verifyKnowledge(j, simulation, root.id, branch);
    events.push({ type: 'world.causal_branch_selected', causes: [`causal-chain:${chain.id}`, `root-event:${root.id}`], causalLinks: [root.id], payload: { chainId: chain.id, rootEventId: root.id, branch, step: chain.step } });
    if (chain.step >= pace.steps || (root.severity <= 1 && (branch === 'deescalate' || branch === 'suppress'))) {
      chain.active = false; root.active = false;
      events.push({ type: 'world.causal_chain_completed', causes: [`causal-chain:${chain.id}:completion`, `root-event:${root.id}`], causalLinks: [root.id], payload: { chainId: chain.id, rootEventId: root.id, branch } });
    }
  }
  return { jianghu: j, events };
}
