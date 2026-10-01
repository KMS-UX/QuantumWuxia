import type { SimulationState, StateEvent } from './types';
import type { JianghuState, NPCState, NPCGoal, RelationshipState, ObligationState, FactionRelationState, MarketState } from './jianghu';

export interface V3Result {
  jianghu: JianghuState;
  events: StateEvent[];
}

const clamp = (v: number, min = -100, max = 100) => Math.max(min, Math.min(max, v));

function relation(j: JianghuState, subjectId: string, targetId: string, turn: number): RelationshipState {
  let r = j.relationships.find(x => x.subjectId === subjectId && x.targetId === targetId);
  if (!r) {
    r = { id: `rel-${subjectId}-${targetId}`, subjectId, targetId, trust: 0, respect: 0, fear: 0, affection: 0, debt: 0, grudge: 0, lastInteractionTurn: turn };
    j.relationships.push(r);
  }
  return r;
}

function findFactionPair(j: JianghuState, a: string, b: string): FactionRelationState | undefined {
  return j.factionRelations?.find(r => (r.factionAId === a && r.factionBId === b) || (r.factionAId === b && r.factionBId === a));
}

function ensureMarket(j: JianghuState, locationId: string, turn: number): MarketState {
  let market = j.markets?.find(m => m.locationId === locationId);
  if (!market) {
    market = { locationId, goods: { tea: 10, rice: 10, medicine: 5 }, basePrices: { tea: 4, rice: 3, medicine: 12 }, priceMultipliers: { tea: 1, rice: 1, medicine: 1 }, scarcity: { tea: 0, rice: 0, medicine: 20 }, lastUpdatedTurn: turn };
    j.markets = [...(j.markets ?? []), market];
  }
  return market;
}

function updateMarket(market: MarketState, turn: number): void {
  for (const good of Object.keys(market.goods)) {
    const stock = market.goods[good];
    const scarcity = clamp(Math.round((20 - stock) * 3), 0, 100);
    market.scarcity[good] = scarcity;
    market.priceMultipliers[good] = Number((1 + scarcity / 100).toFixed(2));
  }
  market.lastUpdatedTurn = turn;
}

function advanceObligations(j: JianghuState, simulation: SimulationState, events: StateEvent[]): void {
  for (const o of j.obligations) {
    if (o.fulfilled) continue;
    const due = o.dueTurn !== undefined && simulation.world.turn >= o.dueTurn;
    if (due) {
      const debtorToCreditor = relation(j, o.debtorId, o.creditorId, simulation.world.turn);
      debtorToCreditor.trust = clamp(debtorToCreditor.trust - Math.max(1, o.severity));
      debtorToCreditor.grudge = clamp(debtorToCreditor.grudge + Math.max(1, Math.floor(o.severity / 2)), 0, 100);
      events.push({ type: 'world.obligation_changed', payload: { obligationId: o.id, status: 'overdue', debtorId: o.debtorId, creditorId: o.creditorId } });
      o.dueTurn = simulation.world.turn + 3;
    }
  }
}

function buildNpcRelations(j: JianghuState, simulation: SimulationState, events: StateEvent[]): void {
  const npcs = j.npcs.filter(n => n.alive);
  for (const a of npcs) {
    for (const b of npcs) {
      if (a.id >= b.id || a.locationId !== b.locationId) continue;
      const existing = j.relationships.find(r => r.subjectId === a.id && r.targetId === b.id);
      if (existing) continue;
      const sameFaction = !!a.factionId && a.factionId === b.factionId;
      const r = relation(j, a.id, b.id, simulation.world.turn);
      r.trust = sameFaction ? 5 : 0;
      r.respect = sameFaction ? 3 : 0;
      events.push({ type: 'world.relationship_changed', payload: { subjectId: a.id, targetId: b.id, trust: r.trust, respect: r.respect } });
    }
  }
}

function applyFactionPressure(j: JianghuState, simulation: SimulationState, events: StateEvent[]): void {
  for (const rel of j.factionRelations ?? []) {
    const a = j.factions.find(f => f.id === rel.factionAId);
    const b = j.factions.find(f => f.id === rel.factionBId);
    if (!a || !b) continue;
    const pressure = Math.max(0, Math.floor((a.internalTension + b.internalTension) / 20));
    if (a.resources < 15 || b.resources < 15) rel.hostility = clamp(rel.hostility + 1, 0, 100);
    rel.trade = clamp(rel.trade - (rel.hostility > 70 ? 1 : 0), 0, 100);
    if (rel.hostility >= 70 && pressure >= 4) {
      const id = `event-faction-conflict-${simulation.world.turn}-${rel.id}`;
      if (!j.worldEvents.some(e => e.id === id)) {
        j.worldEvents.push({ id, kind: 'conflict', title: `${a.name} and ${b.name} tensions erupt`, description: 'Faction hostility has created a local conflict that can alter travel, trade, and NPC goals.', factionIds: [a.id, b.id], severity: Math.min(5, Math.ceil(rel.hostility / 20)), active: true, createdTurn: simulation.world.turn, expiresTurn: simulation.world.turn + 5 });
        events.push({ type: 'world.faction_conflict', payload: { eventId: id, factionAId: a.id, factionBId: b.id } });
      }
    }
  }
}

function autonomousNpcActions(j: JianghuState, simulation: SimulationState, events: StateEvent[]): void {
  let budget = 3;
  const ordered = j.npcs.filter(n => n.alive).sort((a, b) => {
    const pa = Math.max(...a.goals.filter(g => g.active).map(g => g.priority), 0);
    const pb = Math.max(...b.goals.filter(g => g.active).map(g => g.priority), 0);
    return pb - pa;
  });
  for (const npc of ordered) {
    if (budget <= 0) break;
    const goal: NPCGoal | undefined = npc.goals.filter(g => g.active).sort((a, b) => b.priority - a.priority)[0];
    if (!goal) continue;
    let acted = false;
    if (goal.kind === 'travel' && goal.targetId && npc.locationId !== goal.targetId) {
      npc.locationId = goal.targetId;
      goal.progress = 100;
      goal.active = false;
      acted = true;
    } else if (goal.kind === 'trade') {
      const market = ensureMarket(j, npc.locationId, simulation.world.turn);
      const good = Object.keys(market.goods)[0];
      if (good && npc.resources > 0) {
        market.goods[good] += 1;
        npc.resources = Math.max(0, npc.resources - 1);
        acted = true;
      }
    } else if (goal.kind === 'collect_debt') {
      const debt = j.obligations.find(o => !o.fulfilled && o.creditorId === npc.id);
      if (debt) {
        const r = relation(j, debt.debtorId, npc.id, simulation.world.turn);
        r.debt = clamp(r.debt + debt.severity, 0, 100);
        r.grudge = clamp(r.grudge + Math.ceil(debt.severity / 2), 0, 100);
        acted = true;
      }
    } else if (goal.kind === 'investigate') {
      const rumor = j.rumors.find(r => r.currentLocationId === npc.locationId && r.knownBy.includes(npc.id));
      if (rumor) {
        rumor.credibility = clamp(rumor.credibility + 2, 0, 100);
        acted = true;
      }
    } else if (goal.kind === 'protect') {
      const localEvent = j.worldEvents.find(e => e.active && e.locationId === npc.locationId);
      if (localEvent) {
        localEvent.severity = Math.max(1, localEvent.severity - 1);
        acted = true;
      }
    }
    if (acted) {
      budget--;
      events.push({ type: 'world.npc_action', payload: { npcId: npc.id, goalId: goal.id, kind: goal.kind, turn: simulation.world.turn } });
    }
  }
}

export function applyCausalityV3(input: JianghuState, simulation: SimulationState): V3Result {
  const j: JianghuState = JSON.parse(JSON.stringify(input));
  const events: StateEvent[] = [];
  buildNpcRelations(j, simulation, events);
  advanceObligations(j, simulation, events);
  applyFactionPressure(j, simulation, events);
  autonomousNpcActions(j, simulation, events);
  const market = ensureMarket(j, simulation.character.locationId, simulation.world.turn);
  updateMarket(market, simulation.world.turn);
  events.push({ type: 'world.market_changed', payload: { locationId: market.locationId, turn: market.lastUpdatedTurn } });
  return { jianghu: j, events };
}

export function createObligation(input: JianghuState, obligation: Omit<ObligationState, 'id'>): JianghuState {
  const j: JianghuState = JSON.parse(JSON.stringify(input));
  j.obligations.push({ ...obligation, id: `obligation-${obligation.createdTurn}-${j.obligations.length + 1}` });
  j.knowledgeVersion += 1;
  return j;
}
