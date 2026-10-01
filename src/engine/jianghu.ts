import type { ProposedAction, SimulationState, StateEvent } from './types';

export type MemoryValence = 'positive' | 'negative' | 'neutral';
export type RumorStatus = 'unverified' | 'plausible' | 'confirmed' | 'false';\nexport type GoalKind = 'travel' | 'trade' | 'investigate' | 'protect' | 'collect_debt' | 'train' | 'social' | 'rest';

export interface NPCMemory {
  id: string;
  event: string;
  interpretation: string;
  valence: MemoryValence;
  confidence: number;
  turn: number;
}

export interface NPCGoal {\n  id: string;\n  kind: GoalKind;\n  description: string;\n  targetId?: string;\n  priority: number;\n  progress: number;\n  active: boolean;\n}\n\nexport interface NPCState {
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
}

export interface JianghuState {
  schemaVersion: 1;
  npcs: NPCState[];
  factions: FactionState[];
  relationships: RelationshipState[];
  rumors: RumorState[];
  obligations: ObligationState[];
  worldEvents: WorldEventState[];\n  knowledgeVersion: number;
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
  };
}

export function createDefaultJianghu(): JianghuState {
  return cloneJianghu(DEFAULT_JIANGHU);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function upsertRelationship(
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
      events.push({
        type: 'world.relationship_changed',
        payload: { subjectId: simulation.character.id, targetId: npc.id, trust: relationship.trust, respect: relationship.respect },
      });
      events.push({
        type: 'world.npc_memory_added',
        payload: { npcId: npc.id, memoryId: npc.memories[npc.memories.length - 1].id },
      });
    }
  }

  if (action.kind === 'attack' && action.targetId) {
    const npc = jianghu.npcs.find(n => n.id === action.targetId);
    if (npc && npc.alive) {
      const relationship = upsertRelationship(jianghu.relationships, simulation.character.id, npc.id, turn);
      relationship.grudge = clamp(relationship.grudge + 5, 0, 100);
      relationship.trust = clamp(relationship.trust - 10, -100, 100);
      relationship.fear = clamp(relationship.fear + 3, 0, 100);
      npc.disposition = clamp(npc.disposition - 5, -100, 100);
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
        payload: { subjectId: simulation.character.id, targetId: npc.id, trust: relationship.trust, grudge: relationship.grudge, fear: relationship.fear },
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
      events.push({ type: 'world.rumor_spread', payload: { rumorId: rumor.id, npcId: npc.id } });
    }
    if (rumor.knownBy.includes(simulation.character.id)) {
      simulation.world.knownRumorIds = Array.from(new Set([...(simulation.world.knownRumorIds ?? []), rumor.id]));
    }
  }
}

function advanceNpcGoals(jianghu: JianghuState, simulation: SimulationState, events: StateEvent[]): void {
  for (const npc of jianghu.npcs) {
    if (!npc.alive) continue;
    const goal = npc.goals.filter(g => g.active).sort((a, b) => b.priority - a.priority)[0];
    if (!goal) continue;
    if (goal.kind === 'travel' && goal.targetId && npc.locationId === goal.targetId) goal.progress = 100;
    else if (goal.kind === 'protect' && npc.locationId === simulation.character.locationId) goal.progress = clamp(goal.progress + 2, 0, 100);
    else goal.progress = clamp(goal.progress + 1, 0, 100);
    if (goal.progress >= 100) {
      goal.active = false;
      events.push({ type: 'world.npc_goal_completed', payload: { npcId: npc.id, goalId: goal.id } });
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

  advanceNpcGoals(jianghu, simulation, events);\n  propagateRumors(jianghu, simulation, events);\n\n  for (const faction of jianghu.factions) {
    const drift = faction.internalTension > 70 ? -1 : faction.resources < 20 ? -1 : 0;
    faction.resources = clamp(faction.resources + drift, 0, 100);
    faction.internalTension = clamp(faction.internalTension + (faction.resources < 15 ? 1 : -1), 0, 100);
  }

  for (const npc of jianghu.npcs) {
    if (!npc.alive) continue;
    if (npc.locationId !== simulation.character.locationId && turn % 5 === 0) {
      const faction = npc.factionId ? jianghu.factions.find(f => f.id === npc.factionId) : undefined;
      if (faction && faction.territory.length > 0) npc.locationId = faction.territory[turn % faction.territory.length];
    }
  }

  for (const rumor of jianghu.rumors) {
    rumor.credibility = clamp(rumor.credibility + (rumor.status === 'confirmed' ? 1 : -1), 0, 100);
  }

  jianghu.worldEvents = jianghu.worldEvents.filter(event => event.active && event.expiresTurn !== undefined ? event.expiresTurn >= turn : event.active);

  events.push({
    type: 'world.jianghu_ticked',
    payload: { turn, npcCount: jianghu.npcs.length, factionCount: jianghu.factions.length },
  });

  return { jianghu, events };
}
