import type { ProposedAction, SimulationState, StateEvent } from './types';
import { isHonourableBout } from './bout';
import { advanceRoutines } from './routine';
import type { FinaleSpec } from './finale';

export type MemoryValence = 'positive' | 'negative' | 'neutral';
export type RumorStatus = 'unverified' | 'plausible' | 'confirmed' | 'false';
export type GoalKind = 'travel' | 'trade' | 'investigate' | 'protect' | 'collect_debt' | 'train' | 'social' | 'rest';

export interface NPCMemory {
  id: string;
  event: string;
  interpretation: string;
  valence: MemoryValence;
  confidence: number;
  turn: number;
}

export interface NPCGoal {
  id: string;
  kind: GoalKind;
  description: string;
  targetId?: string;
  priority: number;
  progress: number;
  active: boolean;
  /** The goal only becomes pursuable from this tick on ("before the autumn moon", not today). */
  notBefore?: number;
  /** On reaching a travel goal's destination the NPC makes it their new home and drops their old routine. */
  settle?: boolean;
}

export interface NPCState {
  id: string;
  name: string;
  role: string;
  locationId: string;
  factionId?: string;
  disposition: number;
  goals: NPCGoal[];
  fears: string[];
  secrets: string[];
  skills: string[];
  resources: number;
  memories: NPCMemory[];
  alive: boolean;
  /** Combat strength 0..100; when absent it is derived from resources and skills. */
  power?: number;
  /** Martial art ids this NPC practises (used for counters). */
  arts?: string[];
  /** Where they sleep and belong; with no `routine`, they return here after dark. */
  homeId?: string;
  /** Daily routine by time of day (see routine.ts). */
  routine?: import('./routine').RoutineEntry[];
  /** Set while walking between places; their `locationId` is the transit sentinel until they arrive. */
  transit?: import('./routine').NpcTransit;
}

export interface FactionState {
  id: string;
  name: string;
  type: 'sect' | 'clan' | 'guild' | 'court' | 'bandit' | 'religious' | 'other';
  description: string;
  territory: string[];
  resources: number;
  influence: number;
  goals: string[];
  allies: string[];
  enemies: string[];
  internalTension: number;
  playerReputation: number;
}

export interface RumorState {
  id: string;
  text: string;
  origin: string;
  currentLocationId: string;
  status: RumorStatus;
  credibility: number;
  knownBy: string[];
  createdTurn: number;
  spreadRate: number;
}

export interface RelationshipState {
  id: string;
  subjectId: string;
  targetId: string;
  trust: number;
  respect: number;
  fear: number;
  affection: number;
  debt: number;
  grudge: number;
  lastInteractionTurn?: number;
}

export interface ObligationState {
  id: string;
  debtorId: string;
  creditorId: string;
  description: string;
  kind: 'debt' | 'promise' | 'favor' | 'oath' | 'duty';
  severity: number;
  fulfilled: boolean;
  createdTurn: number;
  dueTurn?: number;
}

export interface WorldEventState {
  id: string;
  kind: 'conflict' | 'migration' | 'market' | 'rumor' | 'political' | 'natural' | 'personal';
  title: string;
  description: string;
  locationId?: string;
  factionIds: string[];
  severity: number;
  active: boolean;
  createdTurn: number;
  expiresTurn?: number;
  /**
   * Optional slow-burn pacing for this event's causal chain. `steps` is how many
   * stages the chain has; `interval` is how many turns pass between stages.
   * Omitted means the original behaviour: 3 stages, one per turn.
   */
  pace?: { steps: number; interval: number };
  /** Payoff applied when this event's causal chain completes (see finale.ts). The event ends with it. */
  finale?: FinaleSpec;
}

/** Normalised, bounded chain pacing for a world event. */
export function chainPace(event: Pick<WorldEventState, 'pace'>): { steps: number; interval: number; custom: boolean } {
  if (!event.pace) return { steps: 3, interval: 1, custom: false };
  const steps = Math.max(1, Math.min(12, Math.floor(event.pace.steps)));
  const interval = Math.max(1, Math.min(20, Math.floor(event.pace.interval)));
  return { steps, interval, custom: true };
}


export interface FactionRelationState {
  id: string;
  factionAId: string;
  factionBId: string;
  trust: number;
  hostility: number;
  trade: number;
}

export interface MarketState {
  locationId: string;
  goods: Record<string, number>;
  basePrices: Record<string, number>;
  priceMultipliers: Record<string, number>;
  scarcity: Record<string, number>;
  lastUpdatedTurn: number;
}


export interface LocationConditionState {
  id: string;
  locationId: string;
  sourceId: string;
  label: string;
  severity: number;
  createdTurn: number;
  expiresTurn: number;
  active: boolean;
}

export type KnowledgeSourceKind = 'direct' | 'npc' | 'rumor' | 'document' | 'observation' | 'faction';

export interface KnowledgeRecord {
  id: string;
  subjectId: string;
  fact: string;
  sourceId: string;
  sourceKind: KnowledgeSourceKind;
  confidence: number;
  discoveredTurn: number;
  lastVerifiedTurn?: number;
  trueState?: 'true' | 'false' | 'unknown';
}

export interface CausalChainState {
  id: string;
  rootEventId: string;
  step: number;
  kind: 'information' | 'social' | 'faction' | 'economic' | 'personal';
  description: string;
  sourceIds: string[];
  active: boolean;
  createdTurn: number;
  nextCheckTurn: number;
}

export interface JianghuState {
  schemaVersion: 1;
  npcs: NPCState[];
  factions: FactionState[];
  relationships: RelationshipState[];
  rumors: RumorState[];
  obligations: ObligationState[];
  worldEvents: WorldEventState[];
  knowledgeVersion: number;
  factionRelations?: FactionRelationState[];
  markets?: MarketState[];
  knowledgeRecords?: KnowledgeRecord[];
  causalChains?: CausalChainState[];
  locationConditions?: LocationConditionState[];
}

export const DEFAULT_JIANGHU: JianghuState = {
  schemaVersion: 1,
  npcs: [
    {
      id: 'npc-teahouse-keeper',
      name: 'Old Tea Keeper',
      role: 'tea house keeper',
      locationId: 'The Crossroads',
      disposition: 0,
      goals: [{ id: 'goal-tea-open', kind: 'rest', description: 'Keep the tea house open', priority: 80, progress: 0, active: true }, { id: 'goal-avoid-trouble', kind: 'protect', description: 'Avoid sect trouble', priority: 70, progress: 0, active: true }],
      fears: ['bandits', 'war between sects'],
      secrets: [],
      factionId: 'faction-jade-hall',
      skills: ['tea', 'local gossip', 'basic first aid'],
      resources: 20,
      memories: [],
      alive: true,
    },
    {
      id: 'npc-wandering-swordsman',
      name: 'Wandering Swordsman',
      role: 'wandering martial artist',
      locationId: 'The Crossroads',
      disposition: 0,
      goals: [{ id: 'goal-worthy-opponent', kind: 'train', description: 'Find a worthy opponent', priority: 70, progress: 0, active: true }, { id: 'goal-repay-debt', kind: 'collect_debt', description: 'Repay an old debt', priority: 90, progress: 0, active: true }],
      fears: ['dishonor', 'betrayal'],
      secrets: [],
      skills: ['swordsmanship', 'tracking'],
      resources: 10,
      memories: [],
      alive: true,
    },
  ],
  factions: [
    {
      id: 'faction-jade-hall',
      name: 'Jade Hall',
      type: 'sect',
      description: 'A disciplined orthodox martial sect that values reputation and sworn obligations.',
      territory: ['The Crossroads'],
      resources: 60,
      influence: 40,
      goals: ['protect travelers', 'preserve martial traditions'],
      allies: [],
      enemies: [],
      internalTension: 10,
      playerReputation: 0,
    },
    {
      id: 'faction-black-river',
      name: 'Black River Brotherhood',
      type: 'guild',
      description: 'A loose network of smugglers, informants, and river traders.',
      territory: [],
      resources: 55,
      influence: 30,
      goals: ['control river trade', 'collect debts'],
      allies: [],
      enemies: [],
      internalTension: 20,
      playerReputation: 0,
    },
  ],
  relationships: [],
  rumors: [],
  obligations: [],
  worldEvents: [],
  knowledgeVersion: 1,
  knowledgeRecords: [],
  causalChains: [],
  locationConditions: [],
  factionRelations: [{ id: 'frel-jade-black', factionAId: 'faction-jade-hall', factionBId: 'faction-black-river', trust: 0, hostility: 15, trade: 30 }],
  markets: [{ locationId: 'The Crossroads', goods: { tea: 20, rice: 15, medicine: 8 }, basePrices: { tea: 4, rice: 3, medicine: 12 }, priceMultipliers: { tea: 1, rice: 1, medicine: 1 }, scarcity: { tea: 0, rice: 0, medicine: 20 }, lastUpdatedTurn: 0 }],
};

function cloneJianghu(j: JianghuState): JianghuState {
  return {
    schemaVersion: 1,
    npcs: j.npcs.map(n => ({ ...n, goals: n.goals.map(goal => ({ ...goal })), fears: [...n.fears], secrets: [...n.secrets], skills: [...n.skills], memories: n.memories.map(m => ({ ...m })) })),
    factions: j.factions.map(f => ({ ...f, territory: [...f.territory], goals: [...f.goals], allies: [...f.allies], enemies: [...f.enemies] })),
    relationships: j.relationships.map(r => ({ ...r })),
    rumors: j.rumors.map(r => ({ ...r, knownBy: [...r.knownBy] })),
    obligations: j.obligations.map(o => ({ ...o })),
    worldEvents: j.worldEvents.map(e => ({ ...e, factionIds: [...e.factionIds] })),
    knowledgeVersion: j.knowledgeVersion,
    factionRelations: (j.factionRelations ?? []).map(r => ({ ...r })),
    markets: (j.markets ?? []).map(m => ({ ...m, goods: { ...m.goods }, basePrices: { ...m.basePrices }, priceMultipliers: { ...m.priceMultipliers }, scarcity: { ...m.scarcity } })),
    knowledgeRecords: (j.knowledgeRecords ?? []).map(k => ({ ...k })),
    causalChains: (j.causalChains ?? []).map(chain => ({ ...chain, sourceIds: [...chain.sourceIds] })),
    locationConditions: (j.locationConditions ?? []).map(condition => ({ ...condition })),
  };
}

export function createDefaultJianghu(startingLocationId = 'The Crossroads'): JianghuState {
  const jianghu = cloneJianghu(DEFAULT_JIANGHU);
  for (const npc of jianghu.npcs) npc.locationId = startingLocationId;
  for (const faction of jianghu.factions) {
    if (faction.territory.includes('The Crossroads')) faction.territory = [startingLocationId];
  }
  for (const market of jianghu.markets ?? []) market.locationId = startingLocationId;
  return jianghu;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function upsertRelationship(
  relationships: RelationshipState[],
  subjectId: string,
  targetId: string,
  turn: number,
): RelationshipState {
  let relationship = relationships.find(r => r.subjectId === subjectId && r.targetId === targetId);
  if (!relationship) {
    relationship = {
      id: `rel-${subjectId}-${targetId}`,
      subjectId,
      targetId,
      trust: 0,
      respect: 0,
      fear: 0,
      affection: 0,
      debt: 0,
      grudge: 0,
      lastInteractionTurn: turn,
    };
    relationships.push(relationship);
  }
  return relationship;
}

export function applyJianghuAction(
  input: JianghuState,
  simulation: SimulationState,
  action: ProposedAction,
): { jianghu: JianghuState; events: StateEvent[] } {
  const jianghu = cloneJianghu(input);
  const events: StateEvent[] = [];
  const turn = simulation.world.turn;

  if (action.kind === 'talk' && action.targetId) {
    const npc = jianghu.npcs.find(n => n.id === action.targetId);
    if (npc && npc.alive) {
      const relationship = upsertRelationship(jianghu.relationships, simulation.character.id, npc.id, turn);
      relationship.lastInteractionTurn = turn;
      const delta = 1;
      relationship.trust = clamp(relationship.trust + delta, -100, 100);
      relationship.respect = clamp(relationship.respect + delta, -100, 100);
      npc.memories.push({
        id: `memory-${npc.id}-${turn}`,
        event: `Spoke with ${simulation.character.name}`,
        interpretation: action.description,
        valence: 'positive',
        confidence: 60,
        turn,
      });
      npc.disposition = clamp(npc.disposition + delta, -100, 100);
      if (npc.factionId) {
        const faction = jianghu.factions.find(f => f.id === npc.factionId);
        if (faction) faction.playerReputation = clamp(faction.playerReputation + 1, -100, 100);
      }
      events.push({
        type: 'world.relationship_changed',
        causes: [`player:interaction`, `npc:${npc.id}:response`], witnesses: [npc.id], payload: { subjectId: simulation.character.id, targetId: npc.id, trust: relationship.trust, respect: relationship.respect },
      });
      events.push({
        type: 'world.npc_memory_added',
        causes: [`player:interaction`, `npc:${npc.id}:memory-formation`], witnesses: [npc.id], knowledgeConsequences: [`npc:${npc.id}:memory:${npc.memories[npc.memories.length - 1].id}`], payload: { npcId: npc.id, memoryId: npc.memories[npc.memories.length - 1].id },
      });
    }
  }

  // A friendly bout is not an assault: combat.ts applies its own, gentler consequences.
  if (action.kind === 'attack' && action.targetId && !isHonourableBout(action.description)) {
    const npc = jianghu.npcs.find(n => n.id === action.targetId);
    if (npc && npc.alive) {
      const relationship = upsertRelationship(jianghu.relationships, simulation.character.id, npc.id, turn);
      relationship.grudge = clamp(relationship.grudge + 5, 0, 100);
      relationship.trust = clamp(relationship.trust - 10, -100, 100);
      relationship.fear = clamp(relationship.fear + 3, 0, 100);
      npc.disposition = clamp(npc.disposition - 5, -100, 100);
      if (npc.factionId) {
        const faction = jianghu.factions.find(f => f.id === npc.factionId);
        if (faction) faction.playerReputation = clamp(faction.playerReputation - 5, -100, 100);
      }
      npc.memories.push({
        id: `memory-${npc.id}-${turn}`,
        event: `Was attacked by ${simulation.character.name}`,
        interpretation: 'The player is a threat.',
        valence: 'negative',
        confidence: 90,
        turn,
      });
      events.push({
        type: 'world.relationship_changed',
        causes: [`player:interaction`, `npc:${npc.id}:relationship-update`], witnesses: [npc.id], payload: { subjectId: simulation.character.id, targetId: npc.id, trust: relationship.trust, grudge: relationship.grudge, fear: relationship.fear },
      });
    }
  }

  return { jianghu, events };
}

export function createRumor(
  input: JianghuState,
  text: string,
  origin: string,
  locationId: string,
  turn: number,
  credibility = 50,
): JianghuState {
  const jianghu = cloneJianghu(input);
  jianghu.rumors.push({
    id: `rumor-${turn}-${jianghu.rumors.length + 1}`,
    text,
    origin,
    currentLocationId: locationId,
    status: 'unverified',
    credibility: clamp(credibility, 0, 100),
    knownBy: [origin],
    createdTurn: turn,
    spreadRate: 1,
  });
  jianghu.knowledgeVersion += 1;
  return jianghu;
}

function propagateRumors(jianghu: JianghuState, simulation: SimulationState, events: StateEvent[]): void {
  const localNpcs = jianghu.npcs.filter(npc => npc.alive && npc.locationId === simulation.character.locationId);
  for (const rumor of jianghu.rumors) {
    if (rumor.currentLocationId !== simulation.character.locationId) continue;
    for (const npc of localNpcs) {
      if (rumor.knownBy.includes(npc.id)) continue;
      if ((rumor.credibility + npc.disposition) < 45) continue;
      rumor.knownBy.push(npc.id);
      if (rumor.status === 'unverified' && rumor.credibility >= 60) rumor.status = 'plausible';
      events.push({ type: 'world.rumor_spread', causes: [`rumor:${rumor.id}`, `npc:${npc.id}:transmission`], witnesses: [npc.id], knowledgeConsequences: [`rumor:${rumor.id}:known-by:${npc.id}`], payload: { rumorId: rumor.id, npcId: npc.id } });
    }
    if (rumor.knownBy.includes(simulation.character.id)) {
      simulation.world.knownRumorIds = Array.from(new Set([...(simulation.world.knownRumorIds ?? []), rumor.id]));
    }
  }
}

function advanceNpcGoals(jianghu: JianghuState, simulation: SimulationState, events: StateEvent[]): void {
  for (const npc of jianghu.npcs) {
    if (!npc.alive) continue;
    const goal = npc.goals.filter(g => g.active && (g.notBefore === undefined || simulation.world.turn >= g.notBefore)).sort((a, b) => b.priority - a.priority)[0];
    if (!goal) continue;
    if (goal.kind === 'travel' && goal.targetId && npc.locationId === goal.targetId) goal.progress = 100;
    else if (goal.kind === 'protect' && npc.locationId === simulation.character.locationId) goal.progress = clamp(goal.progress + 2, 0, 100);
    else goal.progress = clamp(goal.progress + 1, 0, 100);
    if (goal.progress >= 100) {
      goal.active = false;
      events.push({ type: 'world.npc_goal_completed', causes: [`npc:${npc.id}:goal:${goal.id}`, `goal:${goal.kind}`], witnesses: [npc.id], knowledgeConsequences: [`npc:${npc.id}:goal-completed:${goal.id}`], payload: { npcId: npc.id, goalId: goal.id } });
    }
  }
}

export function tickJianghu(
  input: JianghuState,
  simulation: SimulationState,
): { jianghu: JianghuState; events: StateEvent[] } {
  const jianghu = cloneJianghu(input);
  const events: StateEvent[] = [];
  const turn = simulation.world.turn;

  advanceNpcGoals(jianghu, simulation, events);
  propagateRumors(jianghu, simulation, events);

  for (const faction of jianghu.factions) {
    const drift = faction.internalTension > 70 ? -1 : faction.resources < 20 ? -1 : 0;
    faction.resources = clamp(faction.resources + drift, 0, 100);
    // Tension used to fall by 1 every turn unconditionally, so it always drained to 0 within ~10-35 turns
    // and slow-burn events could never build pressure. It now cools only every third turn, and not at all
    // while the faction is party to an active world event.
    const inActiveEvent = jianghu.worldEvents.some(e => e.active && e.factionIds.includes(faction.id));
    const cooling = !inActiveEvent && turn % 3 === 0 ? -1 : 0;
    faction.internalTension = clamp(faction.internalTension + (faction.resources < 15 ? 1 : cooling), 0, 100);
  }

  // Movement is routine- and goal-driven and takes time (routine.ts); this replaces a rule that
  // teleported absent NPCs to a random faction territory every fifth turn.
  advanceRoutines(jianghu, simulation, events);

  for (const rumor of jianghu.rumors) {
    rumor.credibility = clamp(rumor.credibility + (rumor.status === 'confirmed' ? 1 : -1), 0, 100);
  }

  jianghu.worldEvents = jianghu.worldEvents.filter(event => event.active && event.expiresTurn !== undefined ? event.expiresTurn >= turn : event.active);

  events.push({
    type: 'world.jianghu_ticked',
    causes: [`world:turn:${turn}:tick`], payload: { turn, npcCount: jianghu.npcs.length, factionCount: jianghu.factions.length },
  });

  return { jianghu, events };
}
